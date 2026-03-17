import { round2 } from './money';

export interface GoalInput {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date | string | null;
  recurringPeriod: string | null;
  priority: number;
  status: string;
  category: string | null;
  description: string | null;
  createdAt: Date | string;
}

export interface GoalMetric {
  goalId: string;
  goalName: string;
  priority: number;
  category: string | null;
  remaining: number;
  monthsLeft: number | null;
  idealMonthly: number;
  suggestedAmount: number;
  pctComplete: number;
  type: string;
  targetDate?: Date | string | null;
  createdAt?: Date | string;
}

export interface FinancialSnapshot {
  avgMonthlyIncome: number;
  avgMonthlyExpenses: number;
  essentialExpenses: number;
  maxSavings: number;
  freeMoney: number;
  monthsAnalyzed: number;
}

/** Compute emergency fund coverage badge from goal description. */
export function computeEmergencyBadge(goal: {
  category: string | null;
  targetAmount: number;
  currentAmount: number;
  description: string | null;
}): { covered: number; target: number } | null {
  if (goal.category !== 'emergency' || goal.targetAmount <= 0) return null;
  const match = goal.description?.match(/^(\d+)\s/);
  if (!match) return null;
  const targetMonths = Number(match[1]);
  const coveredMonths = round2((goal.currentAmount / goal.targetAmount) * targetMonths);
  return { covered: coveredMonths, target: targetMonths };
}

/** Compute per-goal metrics (remaining, months left, ideal monthly, pct complete). */
export function computeGoalMetrics(goals: GoalInput[], now: Date = new Date()): GoalMetric[] {
  return goals.map((g) => {
    const remaining = round2(g.targetAmount - g.currentAmount);
    let monthsLeft: number | null = null;

    if (g.recurringPeriod === 'monthly') {
      monthsLeft = 1;
    } else if (g.recurringPeriod === 'annual') {
      const nextYearEnd = new Date(now.getFullYear(), 11, 31);
      monthsLeft =
        (nextYearEnd.getFullYear() - now.getFullYear()) * 12 +
        (nextYearEnd.getMonth() - now.getMonth());
      if (monthsLeft <= 0) monthsLeft = 12;
    } else if (g.targetDate) {
      const target = new Date(g.targetDate);
      monthsLeft =
        (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
    }

    const effectiveMonths = monthsLeft !== null ? Math.max(monthsLeft, 1) : 12;
    const idealMonthly = round2(remaining / effectiveMonths);
    const pctComplete =
      g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 1000) / 10 : 0;

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
}

/** Sort goal metrics by priority (asc) then urgency (fewer months left first). */
export function sortGoalMetrics(metrics: GoalMetric[]): GoalMetric[] {
  return metrics.slice().sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const aUrgency = a.monthsLeft ?? 999;
    const bUrgency = b.monthsLeft ?? 999;
    return aUrgency - bUrgency;
  });
}

/** Allocate a budget across goals by priority tier (1=highest, 2, 3). */
export function allocateByPriorityTier(metrics: GoalMetric[], freeMoney: number): GoalMetric[] {
  const result = metrics.map((m) => ({ ...m }));
  let budget = Math.max(freeMoney, 0);

  for (const tier of [1, 2, 3]) {
    const tierGoals = result.filter((g) => g.priority === tier);
    const tierDemand = tierGoals.reduce((s, g) => s + g.idealMonthly, 0);

    if (tierDemand <= budget) {
      for (const g of tierGoals) {
        g.suggestedAmount = g.idealMonthly;
      }
      budget -= tierDemand;
    } else {
      for (const g of tierGoals) {
        g.suggestedAmount = tierDemand > 0 ? round2((g.idealMonthly / tierDemand) * budget) : 0;
      }
      budget = 0;
    }
  }

  return result;
}

/** Classify each goal as on_track, behind, ahead, overdue, or completed_soon. */
export function classifyGoals(
  metrics: GoalMetric[],
  maxSavings: number,
  now: Date = new Date(),
): GoalMetric[] {
  return metrics.map((g) => {
    const classified = { ...g };

    if (g.monthsLeft !== null && g.monthsLeft <= 0 && g.remaining > 0) {
      classified.type = 'overdue';
    } else if (g.remaining <= g.idealMonthly * 2 && g.remaining > 0) {
      classified.type = 'completed_soon';
    } else if (g.idealMonthly > maxSavings && maxSavings > 0) {
      classified.type = 'behind';
    } else if (g.suggestedAmount < g.idealMonthly && g.idealMonthly > 0) {
      classified.type = 'behind';
    } else if (g.targetDate) {
      const created = new Date(g.createdAt!);
      const target = new Date(g.targetDate);
      const totalSpan = target.getTime() - created.getTime();
      const elapsed = now.getTime() - created.getTime();
      if (totalSpan > 0 && elapsed > 0) {
        const expectedPct = (elapsed / totalSpan) * 100;
        if (g.pctComplete > 0 && g.pctComplete >= expectedPct + 5) classified.type = 'ahead';
        else if (g.pctComplete < expectedPct - 10) classified.type = 'behind';
      }
    } else if (g.pctComplete === 0 && g.remaining > 0) {
      classified.type = 'behind';
    }

    return classified;
  });
}

/** Compute financial snapshot from monthly report data. */
export function computeFinancialSnapshot(
  monthlyData: Array<{ totalIncome: number; totalExpenses: number }>,
  categoryAverages: Array<{ type: string; average: number }>,
): FinancialSnapshot {
  const monthsWithData = monthlyData.filter((m) => m.totalIncome > 0 || m.totalExpenses > 0);
  const monthCount = Math.max(monthsWithData.length, 1);

  const avgMonthlyIncome = round2(
    monthsWithData.reduce((s, m) => s + m.totalIncome, 0) / monthCount,
  );
  const avgMonthlyExpenses = round2(
    monthsWithData.reduce((s, m) => s + m.totalExpenses, 0) / monthCount,
  );
  const freeMoney = round2(avgMonthlyIncome - avgMonthlyExpenses);

  const essentialExpenses = round2(
    categoryAverages.filter((c) => c.type === 'required').reduce((s, c) => s + c.average, 0),
  );
  const maxSavings = round2(avgMonthlyIncome - essentialExpenses);

  return {
    avgMonthlyIncome,
    avgMonthlyExpenses,
    essentialExpenses,
    maxSavings,
    freeMoney,
    monthsAnalyzed: monthCount,
  };
}
