import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ExpensesService } from '../expenses/expenses.service';
import { LiabilitiesService } from '../liabilities/liabilities.service';
import { assertHouseholdAccess } from '../common/utils/assert-household-access';
import { round2 } from '../common/utils/money';
import { MortgageMetadata, LeasingMetadata } from '@finances/shared';
import {
  computeEmergencyBadge,
  computeGoalMetrics,
  sortGoalMetrics,
  allocateByPriorityTier,
  classifyGoals,
  computeFinancialSnapshot,
} from '../common/utils/goal-calculations';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto, UpdateGoalStatusDto } from './dto/update-goal.dto';

@Injectable()
export class GoalsService {
  constructor(
    private prisma: PrismaService,
    private expensesService: ExpensesService,
    private liabilitiesService: LiabilitiesService,
  ) {}

  async findAll(householdId: string, recurringPeriod?: string | null) {
    const where: Record<string, unknown> = { householdId };

    if (recurringPeriod !== undefined) {
      where.recurringPeriod = recurringPeriod === 'null' ? null : recurringPeriod;
    }

    const goals = await this.prisma.goal.findMany({
      where,
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });

    return goals.map((g) => ({
      ...g,
      emergencyBadge: computeEmergencyBadge(g),
    }));
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

    const avgProgress =
      active.length > 0
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
    const [report, existingGoal, liabilities] = await Promise.all([
      this.expensesService.getMonthlyReport(householdId, 12),
      this.prisma.goal.findFirst({
        where: { householdId, category: 'emergency' },
      }),
      this.liabilitiesService.findAll(householdId),
    ]);

    const categories = report.categoryAverages
      .filter((c) => c.type !== 'income')
      .map((c) => ({
        id: c.categoryId,
        name: c.name,
        avgMonthly: c.average,
        type: c.type,
      }));

    const fixedPayments = liabilities.map((l) => ({
      id: l.id,
      name: l.name,
      type: l.type,
      monthlyPayment: this.liabilitiesService.getCurrentMonthlyPayment(
        l.type,
        l.metadata as unknown as MortgageMetadata | LeasingMetadata,
      ),
    }));

    return { categories, fixedPayments, existingGoal };
  }

  async getBudgetAdvice(householdId: string) {
    const [report, goals] = await Promise.all([
      this.expensesService.getMonthlyReport(householdId, 6),
      this.findAll(householdId),
    ]);

    const snapshot = computeFinancialSnapshot(report.months, report.categoryAverages);

    // Filter to active goals with remaining > 0
    const activeGoals = goals.filter(
      (g) => (g.status === 'active' || g.status === 'at_risk') && g.currentAmount < g.targetAmount,
    );

    // Compute, sort, allocate, classify
    const metrics = computeGoalMetrics(activeGoals);
    const sorted = sortGoalMetrics(metrics);
    const allocated = allocateByPriorityTier(sorted, snapshot.freeMoney);
    const classified = classifyGoals(allocated, snapshot.maxSavings);

    return {
      snapshot,
      suggestions: classified.map(({ targetDate: _td, createdAt: _ca, ...s }) => ({
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
    return assertHouseholdAccess(
      this.prisma.goal.findUnique.bind(this.prisma.goal),
      householdId,
      goalId,
      'Goal',
    );
  }
}
