import {
  computeEmergencyBadge,
  computeGoalMetrics,
  allocateByPriorityTier,
  classifyGoals,
  computeFinancialSnapshot,
  GoalInput,
  GoalMetric,
} from './goal-calculations';

describe('computeEmergencyBadge', () => {
  it('returns null for non-emergency goals', () => {
    expect(
      computeEmergencyBadge({
        category: 'travel',
        targetAmount: 1000,
        currentAmount: 500,
        description: '6 months',
      }),
    ).toBeNull();
  });

  it('returns null for zero targetAmount', () => {
    expect(
      computeEmergencyBadge({
        category: 'emergency',
        targetAmount: 0,
        currentAmount: 0,
        description: '6 months',
      }),
    ).toBeNull();
  });

  it('returns null when description does not start with a number', () => {
    expect(
      computeEmergencyBadge({
        category: 'emergency',
        targetAmount: 6000,
        currentAmount: 3000,
        description: 'some text',
      }),
    ).toBeNull();
  });

  it('computes covered months correctly', () => {
    const result = computeEmergencyBadge({
      category: 'emergency',
      targetAmount: 6000,
      currentAmount: 3000,
      description: '6 months of expenses',
    });
    expect(result).toEqual({ covered: 3, target: 6 });
  });

  it('handles 100% funded', () => {
    const result = computeEmergencyBadge({
      category: 'emergency',
      targetAmount: 6000,
      currentAmount: 6000,
      description: '6 months',
    });
    expect(result).toEqual({ covered: 6, target: 6 });
  });
});

describe('computeGoalMetrics', () => {
  const now = new Date('2024-06-15');

  const baseGoal: GoalInput = {
    id: 'g1',
    name: 'Test',
    targetAmount: 1000,
    currentAmount: 200,
    targetDate: null,
    recurringPeriod: null,
    priority: 2,
    status: 'active',
    category: null,
    description: null,
    createdAt: '2024-01-01',
  };

  it('monthly recurring goal has monthsLeft = 1', () => {
    const result = computeGoalMetrics([{ ...baseGoal, recurringPeriod: 'monthly' }], now);
    expect(result[0].monthsLeft).toBe(1);
  });

  it('annual recurring goal computes months to end of year', () => {
    const result = computeGoalMetrics([{ ...baseGoal, recurringPeriod: 'annual' }], now);
    // June to December = 6 months
    expect(result[0].monthsLeft).toBe(6);
  });

  it('target date goal computes months correctly', () => {
    const result = computeGoalMetrics([{ ...baseGoal, targetDate: '2025-01-15' }], now);
    // June 2024 to Jan 2025 = 7 months
    expect(result[0].monthsLeft).toBe(7);
  });

  it('no target date, no recurring = 12 months default', () => {
    const result = computeGoalMetrics([baseGoal], now);
    expect(result[0].monthsLeft).toBeNull();
    // effectiveMonths = 12
    expect(result[0].idealMonthly).toBeCloseTo(800 / 12, 1);
  });

  it('computes remaining correctly', () => {
    const result = computeGoalMetrics([baseGoal], now);
    expect(result[0].remaining).toBe(800);
  });

  it('computes pctComplete', () => {
    const result = computeGoalMetrics([baseGoal], now);
    expect(result[0].pctComplete).toBe(20);
  });
});

describe('allocateByPriorityTier', () => {
  function makeMetric(overrides: Partial<GoalMetric>): GoalMetric {
    return {
      goalId: 'g1',
      goalName: 'Test',
      priority: 2,
      category: null,
      remaining: 1000,
      monthsLeft: 10,
      idealMonthly: 100,
      suggestedAmount: 0,
      pctComplete: 0,
      type: 'on_track',
      ...overrides,
    };
  }

  it('budget covers all goals in one tier', () => {
    const metrics = [
      makeMetric({ goalId: 'a', priority: 1, idealMonthly: 100 }),
      makeMetric({ goalId: 'b', priority: 1, idealMonthly: 200 }),
    ];
    const result = allocateByPriorityTier(metrics, 500);
    expect(result[0].suggestedAmount).toBe(100);
    expect(result[1].suggestedAmount).toBe(200);
  });

  it('pro-rata when budget insufficient for tier', () => {
    const metrics = [
      makeMetric({ goalId: 'a', priority: 1, idealMonthly: 200 }),
      makeMetric({ goalId: 'b', priority: 1, idealMonthly: 300 }),
    ];
    const result = allocateByPriorityTier(metrics, 250);
    // 200/500 * 250 = 100, 300/500 * 250 = 150
    expect(result[0].suggestedAmount).toBe(100);
    expect(result[1].suggestedAmount).toBe(150);
  });

  it('tier 1 exhausts budget, tier 2 gets nothing', () => {
    const metrics = [
      makeMetric({ goalId: 'a', priority: 1, idealMonthly: 500 }),
      makeMetric({ goalId: 'b', priority: 2, idealMonthly: 200 }),
    ];
    const result = allocateByPriorityTier(metrics, 500);
    expect(result[0].suggestedAmount).toBe(500);
    expect(result[1].suggestedAmount).toBe(0);
  });

  it('zero freeMoney gives everyone 0', () => {
    const metrics = [makeMetric({ goalId: 'a', priority: 1, idealMonthly: 100 })];
    const result = allocateByPriorityTier(metrics, 0);
    expect(result[0].suggestedAmount).toBe(0);
  });

  it('empty goals returns empty', () => {
    expect(allocateByPriorityTier([], 1000)).toEqual([]);
  });
});

describe('classifyGoals', () => {
  function makeMetric(overrides: Partial<GoalMetric> = {}): GoalMetric {
    return {
      goalId: 'g1',
      goalName: 'Test',
      priority: 2,
      category: null,
      remaining: 1000,
      monthsLeft: 10,
      idealMonthly: 100,
      suggestedAmount: 100,
      pctComplete: 50,
      type: 'on_track',
      ...overrides,
    };
  }

  it('overdue when monthsLeft <= 0 and remaining > 0', () => {
    const result = classifyGoals([makeMetric({ monthsLeft: 0, remaining: 500 })], 1000);
    expect(result[0].type).toBe('overdue');
  });

  it('completed_soon when remaining <= 2 * idealMonthly', () => {
    const result = classifyGoals([makeMetric({ remaining: 150, idealMonthly: 100 })], 1000);
    expect(result[0].type).toBe('completed_soon');
  });

  it('behind when idealMonthly > maxSavings', () => {
    // remaining must be > 2 * idealMonthly to avoid completed_soon taking priority
    const result = classifyGoals([makeMetric({ idealMonthly: 500, remaining: 5000 })], 200);
    expect(result[0].type).toBe('behind');
  });

  it('behind when suggestedAmount < idealMonthly', () => {
    const result = classifyGoals([makeMetric({ idealMonthly: 100, suggestedAmount: 50 })], 1000);
    expect(result[0].type).toBe('behind');
  });

  it('behind when zero progress', () => {
    const result = classifyGoals(
      [makeMetric({ pctComplete: 0, remaining: 1000, idealMonthly: 100, suggestedAmount: 100 })],
      1000,
    );
    expect(result[0].type).toBe('behind');
  });

  it('on_track is default', () => {
    const result = classifyGoals([makeMetric()], 1000);
    expect(result[0].type).toBe('on_track');
  });
});

describe('computeFinancialSnapshot', () => {
  it('computes correct averages', () => {
    const monthlyData = [
      { totalIncome: 4000, totalExpenses: 2500 },
      { totalIncome: 4200, totalExpenses: 2700 },
    ];
    const categoryAverages = [
      { type: 'required', average: 1500 },
      { type: 'expense', average: 800 },
    ];
    const result = computeFinancialSnapshot(monthlyData, categoryAverages);
    expect(result.avgMonthlyIncome).toBe(4100);
    expect(result.avgMonthlyExpenses).toBe(2600);
    expect(result.freeMoney).toBe(1500);
    expect(result.essentialExpenses).toBe(1500);
    expect(result.maxSavings).toBe(2600);
    expect(result.monthsAnalyzed).toBe(2);
  });

  it('returns zeros for empty data', () => {
    const result = computeFinancialSnapshot([], []);
    expect(result.avgMonthlyIncome).toBe(0);
    expect(result.avgMonthlyExpenses).toBe(0);
    expect(result.freeMoney).toBe(0);
    expect(result.monthsAnalyzed).toBe(1); // Math.max(0, 1)
  });

  it('skips months with no data for averaging', () => {
    const monthlyData = [
      { totalIncome: 4000, totalExpenses: 2000 },
      { totalIncome: 0, totalExpenses: 0 }, // skipped
    ];
    const result = computeFinancialSnapshot(monthlyData, []);
    expect(result.monthsAnalyzed).toBe(1);
    expect(result.avgMonthlyIncome).toBe(4000);
  });
});
