import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ExpensesService } from '../expenses/expenses.service';
import { assertHouseholdAccess } from '../common/utils/assert-household-access';
import { round2 } from '../common/utils/money';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto, UpdateGoalStatusDto } from './dto/update-goal.dto';

@Injectable()
export class GoalsService {
  constructor(
    private prisma: PrismaService,
    private expensesService: ExpensesService,
  ) {}

  async findAll(householdId: string, recurringPeriod?: string | null) {
    const where: Record<string, unknown> = { householdId };

    if (recurringPeriod !== undefined) {
      // query param 'null' string → actual null
      where.recurringPeriod = recurringPeriod === 'null' ? null : recurringPeriod;
    }

    const goals = await this.prisma.goal.findMany({
      where,
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });

    return goals.map((g) => ({
      ...g,
      emergencyBadge: this.computeEmergencyBadge(g),
    }));
  }

  /** Compute emergency fund coverage badge from goal description */
  private computeEmergencyBadge(
    goal: { category: string | null; targetAmount: number; currentAmount: number; description: string | null },
  ): { covered: number; target: number } | null {
    if (goal.category !== 'emergency' || goal.targetAmount <= 0) return null;
    const match = goal.description?.match(/^(\d+)\s/);
    if (!match) return null;
    const targetMonths = Number(match[1]);
    const coveredMonths = round2((goal.currentAmount / goal.targetAmount) * targetMonths);
    return { covered: coveredMonths, target: targetMonths };
  }

  async getHistory(householdId: string) {
    return this.prisma.goal.findMany({
      where: { householdId },
      include: { snapshots: { orderBy: { month: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(householdId: string, id: string) {
    const goal = await this.prisma.goal.findUnique({
      where: { id },
      include: { snapshots: { orderBy: { month: 'desc' }, take: 12 } },
    });
    if (!goal) throw new NotFoundException('Goal not found');
    if (goal.householdId !== householdId) throw new ForbiddenException();
    return goal;
  }

  async create(householdId: string, userId: string, dto: CreateGoalDto) {
    return this.prisma.goal.create({
      data: {
        userId,
        householdId,
        name: dto.name,
        targetAmount: round2(dto.targetAmount),
        targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
        recurringPeriod: dto.recurringPeriod ?? null,
        priority: dto.priority ?? 2,
        description: dto.description,
        category: dto.category,
      },
    });
  }

  async update(householdId: string, id: string, dto: UpdateGoalDto) {
    await this.assertHouseholdAccess(householdId, id);
    return this.prisma.goal.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.targetAmount !== undefined && { targetAmount: round2(dto.targetAmount) }),
        ...(dto.targetDate !== undefined && {
          targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
        }),
        ...(dto.recurringPeriod !== undefined && { recurringPeriod: dto.recurringPeriod }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.currentAmount !== undefined && { currentAmount: round2(dto.currentAmount) }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.category !== undefined && { category: dto.category }),
      },
    });
  }

  async updateStatus(householdId: string, id: string, dto: UpdateGoalStatusDto) {
    await this.assertHouseholdAccess(householdId, id);
    return this.prisma.goal.update({ where: { id }, data: { status: dto.status } });
  }

  async remove(householdId: string, id: string) {
    await this.assertHouseholdAccess(householdId, id);
    await this.prisma.goal.delete({ where: { id } });
  }

  async getSummary(householdId: string) {
    const goals = await this.prisma.goal.findMany({ where: { householdId } });

    const completed = goals.filter(
      (g) => g.status === 'completed' || g.currentAmount >= g.targetAmount,
    );
    const completedIds = new Set(completed.map((g) => g.id));
    const active = goals.filter(
      (g) => !completedIds.has(g.id) && (g.status === 'active' || g.status === 'at_risk'),
    );

    const avgProgress = active.length > 0
      ? round2(
          active.reduce(
            (s, g) => s + (g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0),
            0,
          ) / active.length,
        )
      : 0;

    return {
      activeCount: active.length,
      completedCount: completed.length,
      avgProgress: Math.round(avgProgress),
    };
  }

  async getEmergencyFundAdvice(householdId: string) {
    const [report, existingGoal] = await Promise.all([
      this.expensesService.getMonthlyReport(householdId, 12),
      this.prisma.goal.findFirst({
        where: { householdId, category: 'emergency' },
      }),
    ]);

    // Return non-income categories with their monthly averages
    const categories = report.categoryAverages
      .filter((c) => c.type !== 'income')
      .map((c) => ({
        id: c.categoryId,
        name: c.name,
        avgMonthly: c.average,
        type: c.type,
      }));

    return { categories, existingGoal };
  }

  async getBudgetAdvice(householdId: string) {
    const [report, goals] = await Promise.all([
      this.expensesService.getMonthlyReport(householdId, 6),
      this.findAll(householdId),
    ]);

    // Compute financial snapshot
    const monthsWithData = report.months.filter((m) => m.totalIncome > 0 || m.totalExpenses > 0);
    const monthCount = Math.max(monthsWithData.length, 1);
    const avgMonthlyIncome = round2(monthsWithData.reduce((s, m) => s + m.totalIncome, 0) / monthCount);
    const avgMonthlyExpenses = round2(monthsWithData.reduce((s, m) => s + m.totalExpenses, 0) / monthCount);
    const freeMoney = round2(avgMonthlyIncome - avgMonthlyExpenses);

    // Essential expenses = categories with type 'required' (rent, utilities, groceries, etc.)
    const essentialExpenses = round2(
      report.categoryAverages
        .filter((c) => c.type === 'required')
        .reduce((s, c) => s + c.average, 0),
    );
    // Max realistic savings = income minus essential expenses only
    const maxSavings = round2(avgMonthlyIncome - essentialExpenses);

    // Filter to active goals with remaining > 0
    const now = new Date();
    const activeGoals = goals.filter(
      (g) => (g.status === 'active' || g.status === 'at_risk') && g.currentAmount < g.targetAmount,
    );

    // Compute per-goal metrics (type assigned after allocation)
    const goalMetrics = activeGoals.map((g) => {
      const remaining = round2(g.targetAmount - g.currentAmount);
      let monthsLeft: number | null = null;

      if (g.recurringPeriod === 'monthly') {
        monthsLeft = 1;
      } else if (g.recurringPeriod === 'annual') {
        const nextYearEnd = new Date(now.getFullYear(), 11, 31);
        monthsLeft = (nextYearEnd.getFullYear() - now.getFullYear()) * 12 + (nextYearEnd.getMonth() - now.getMonth());
        if (monthsLeft <= 0) monthsLeft = 12;
      } else if (g.targetDate) {
        const target = new Date(g.targetDate);
        monthsLeft = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
      }

      const effectiveMonths = monthsLeft !== null ? Math.max(monthsLeft, 1) : 12;
      const idealMonthly = round2(remaining / effectiveMonths);
      const pctComplete = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 1000) / 10 : 0;

      return {
        goalId: g.id,
        goalName: g.name,
        priority: g.priority,
        category: g.category ?? null,
        remaining,
        monthsLeft,
        idealMonthly,
        suggestedAmount: 0,
        pctComplete,
        type: 'on_track' as string,
        targetDate: g.targetDate,
        createdAt: g.createdAt,
      };
    });

    // Sort by priority asc, then by urgency (fewer months left first)
    goalMetrics.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      const aUrgency = a.monthsLeft ?? 999;
      const bUrgency = b.monthsLeft ?? 999;
      return aUrgency - bUrgency;
    });

    // Allocate freeMoney by priority tiers
    let budget = Math.max(freeMoney, 0);

    for (const tier of [1, 2, 3]) {
      const tierGoals = goalMetrics.filter((g) => g.priority === tier);
      const tierDemand = tierGoals.reduce((s, g) => s + g.idealMonthly, 0);

      if (tierDemand <= budget) {
        for (const g of tierGoals) {
          g.suggestedAmount = g.idealMonthly;
        }
        budget -= tierDemand;
      } else {
        for (const g of tierGoals) {
          g.suggestedAmount = tierDemand > 0
            ? round2((g.idealMonthly / tierDemand) * budget)
            : 0;
        }
        budget = 0;
      }
    }

    // Classify AFTER allocation so we know what each goal actually gets
    for (const g of goalMetrics) {
      if (g.monthsLeft !== null && g.monthsLeft <= 0 && g.remaining > 0) {
        g.type = 'overdue';
      } else if (g.remaining <= g.idealMonthly * 2 && g.remaining > 0) {
        g.type = 'completed_soon';
      } else if (g.idealMonthly > maxSavings && maxSavings > 0) {
        // Needs more per month than all non-essential income — impossible
        g.type = 'behind';
      } else if (g.suggestedAmount < g.idealMonthly && g.idealMonthly > 0) {
        // Can't get full allocation due to competition from other goals
        g.type = 'behind';
      } else if (g.targetDate) {
        const created = new Date(g.createdAt);
        const target = new Date(g.targetDate);
        const totalSpan = target.getTime() - created.getTime();
        const elapsed = now.getTime() - created.getTime();
        if (totalSpan > 0 && elapsed > 0) {
          const expectedPct = (elapsed / totalSpan) * 100;
          if (g.pctComplete > 0 && g.pctComplete >= expectedPct + 5) g.type = 'ahead';
          else if (g.pctComplete < expectedPct - 10) g.type = 'behind';
        }
      } else if (g.pctComplete === 0 && g.remaining > 0) {
        g.type = 'behind';
      }
    }

    return {
      snapshot: {
        avgMonthlyIncome,
        avgMonthlyExpenses,
        essentialExpenses,
        maxSavings,
        freeMoney,
        monthsAnalyzed: monthCount,
      },
      suggestions: goalMetrics.map(({ targetDate: _td, createdAt: _ca, ...s }) => ({
        goalId: s.goalId,
        goalName: s.goalName,
        priority: s.priority,
        category: s.category,
        remaining: s.remaining,
        monthsLeft: s.monthsLeft,
        idealMonthly: s.idealMonthly,
        suggestedAmount: s.suggestedAmount,
        pctComplete: s.pctComplete,
        type: s.type,
      })),
    };
  }

  private assertHouseholdAccess(householdId: string, goalId: string) {
    return assertHouseholdAccess(this.prisma.goal.findUnique.bind(this.prisma.goal), householdId, goalId, 'Goal');
  }
}
