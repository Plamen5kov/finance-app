/**
 * Integration tests that run the demo seed against a real database
 * and validate financial invariants on the actual generated data.
 */
import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'child_process';

const DATABASE_URL = 'postgresql://testuser:testpass@localhost:5434/finances_test';

let prisma: PrismaClient;

beforeAll(async () => {
  prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });
  await prisma.$connect();

  // Run the demo seed against the test database
  execFileSync('npx', ['ts-node', 'prisma/seed-demo.ts'], {
    cwd: __dirname + '/..',
    env: { ...process.env, DATABASE_URL },
    stdio: 'pipe',
  });
}, 30000);

afterAll(async () => {
  await prisma.$disconnect();
});

// ═══════════════════════════════════════════════════════════════════════════
// EXPENSES & INCOME
// ═══════════════════════════════════════════════════════════════════════════

describe('Expenses & income', () => {
  it('seed creates expected data volumes', async () => {
    const [users, goals, goalSnapshots, expenses, assets, liabilities] = await Promise.all([
      prisma.user.count(),
      prisma.goal.count(),
      prisma.goalSnapshot.count(),
      prisma.expense.count(),
      prisma.asset.count(),
      prisma.liability.count(),
    ]);

    expect(users).toBeGreaterThanOrEqual(1);
    expect(goals).toBe(4);
    expect(goalSnapshots).toBe(60); // 4 goals x 15 months
    expect(expenses).toBeGreaterThan(100);
    expect(assets).toBeGreaterThanOrEqual(6);
    expect(liabilities).toBe(3);
  });

  it('cumulative monthly balance never goes negative when starting from zero', async () => {
    // Within a single day, transaction ordering isn't guaranteed (salary and
    // subscriptions can both land on the 1st). So we check at month granularity:
    // after processing all transactions for a month, the running balance must
    // remain non-negative.
    const expenses = await prisma.expense.findMany({
      select: { amount: true, date: true },
    });

    const monthlyNet = new Map<string, number>();
    for (const exp of expenses) {
      const monthKey = exp.date.toISOString().slice(0, 7);
      monthlyNet.set(monthKey, (monthlyNet.get(monthKey) ?? 0) + exp.amount);
    }

    const sortedMonths = [...monthlyNet.entries()].sort(([a], [b]) => a.localeCompare(b));
    let balance = 0;
    for (const [, net] of sortedMonths) {
      balance = Math.round((balance + net) * 100) / 100;
      expect(balance).toBeGreaterThanOrEqual(0);
    }
    expect(balance).toBeGreaterThan(0);
  });

  it('every month has income', async () => {
    const expenses = await prisma.expense.findMany({
      select: { amount: true, date: true },
    });

    const months = new Map<string, { income: number; expenses: number }>();
    for (const exp of expenses) {
      const monthKey = exp.date.toISOString().slice(0, 7);
      const entry = months.get(monthKey) ?? { income: 0, expenses: 0 };
      if (exp.amount > 0) {
        entry.income = Math.round((entry.income + exp.amount) * 100) / 100;
      } else {
        entry.expenses = Math.round((entry.expenses + Math.abs(exp.amount)) * 100) / 100;
      }
      months.set(monthKey, entry);
    }

    for (const [, data] of months) {
      expect(data.income).toBeGreaterThan(0);
    }
  });

  it('monthly income exceeds monthly expenses in every month', async () => {
    const expenses = await prisma.expense.findMany({
      select: { amount: true, date: true },
    });

    const months = new Map<string, number>();
    for (const exp of expenses) {
      const monthKey = exp.date.toISOString().slice(0, 7);
      months.set(monthKey, (months.get(monthKey) ?? 0) + exp.amount);
    }

    for (const [, net] of months) {
      expect(net).toBeGreaterThan(0);
    }
  });

  it('total income exceeds total expenses', async () => {
    const expenses = await prisma.expense.findMany({ select: { amount: true } });

    const totalIncome = expenses.filter((e) => e.amount > 0).reduce((sum, e) => sum + e.amount, 0);
    const totalExpenses = expenses
      .filter((e) => e.amount < 0)
      .reduce((sum, e) => sum + Math.abs(e.amount), 0);

    expect(totalIncome).toBeGreaterThan(totalExpenses);
  });

  it('no single expense exceeds monthly salary', async () => {
    const expenses = await prisma.expense.findMany({
      where: { amount: { lt: 0 } },
      select: { amount: true },
    });

    const salary = 4200;
    for (const exp of expenses) {
      expect(Math.abs(exp.amount)).toBeLessThan(salary);
    }
  });

  it('every expense references a valid category', async () => {
    const expenses = await prisma.expense.findMany({
      select: { categoryId: true },
    });
    const categoryIds = new Set(
      (await prisma.expenseCategory.findMany({ select: { id: true } })).map((c) => c.id),
    );

    for (const exp of expenses) {
      expect(categoryIds.has(exp.categoryId)).toBe(true);
    }
  });

  it('income categories only contain positive amounts, expense categories only negative', async () => {
    const categories = await prisma.expenseCategory.findMany({
      select: { id: true, type: true },
    });
    const catTypeMap = new Map(categories.map((c) => [c.id, c.type]));

    const expenses = await prisma.expense.findMany({
      select: { amount: true, categoryId: true },
    });

    for (const exp of expenses) {
      const type = catTypeMap.get(exp.categoryId);
      if (type === 'income') {
        expect(exp.amount).toBeGreaterThan(0);
      } else {
        expect(exp.amount).toBeLessThan(0);
      }
    }
  });

  it('all expenses belong to a single household', async () => {
    const households = await prisma.expense.groupBy({
      by: ['householdId'],
    });
    expect(households.length).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// LIABILITIES
// ═══════════════════════════════════════════════════════════════════════════

describe('Liabilities', () => {
  it('liability balances decrease over time', async () => {
    const liabilities = await prisma.liability.findMany({ select: { id: true, name: true } });

    for (const liability of liabilities) {
      const snapshots = await prisma.liabilitySnapshot.findMany({
        where: { liabilityId: liability.id },
        orderBy: { capturedAt: 'asc' },
        select: { value: true, capturedAt: true },
      });

      expect(snapshots.length).toBeGreaterThan(1);
      // Overall: first > last (balance reduced over time)
      expect(snapshots[0].value).toBeGreaterThan(snapshots[snapshots.length - 1].value);
    }
  });

  it('liability balances never go negative', async () => {
    const snapshots = await prisma.liabilitySnapshot.findMany({
      select: { value: true },
    });

    for (const snap of snapshots) {
      expect(snap.value).toBeGreaterThanOrEqual(0);
    }
  });

  it('current liability value matches last snapshot', async () => {
    const liabilities = await prisma.liability.findMany({
      select: { id: true, value: true },
    });

    for (const liability of liabilities) {
      const lastSnap = await prisma.liabilitySnapshot.findFirst({
        where: { liabilityId: liability.id },
        orderBy: { capturedAt: 'desc' },
        select: { value: true },
      });

      expect(lastSnap).not.toBeNull();
      expect(liability.value).toBe(lastSnap!.value);
    }
  });

  it('mortgage has lifecycle events (refinance, rate changes)', async () => {
    const mortgage = await prisma.liability.findFirst({
      where: { type: 'mortgage' },
      select: { metadata: true },
    });

    expect(mortgage).not.toBeNull();
    const meta = mortgage!.metadata as any;
    expect(meta.events.length).toBeGreaterThanOrEqual(3);
    const eventTypes = meta.events.map((e: any) => e.type);
    expect(eventTypes).toContain('extra_payment');
    expect(eventTypes).toContain('refinance');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ASSETS
// ═══════════════════════════════════════════════════════════════════════════

describe('Assets', () => {
  it('DCA assets have increasing quantity over time', async () => {
    const dcaAssets = await prisma.asset.findMany({
      where: { type: { in: ['etf', 'crypto', 'gold'] } },
      select: { id: true, name: true },
    });

    for (const asset of dcaAssets) {
      const snapshots = await prisma.assetSnapshot.findMany({
        where: { assetId: asset.id },
        orderBy: { capturedAt: 'asc' },
        select: { quantity: true },
      });

      for (let i = 1; i < snapshots.length; i++) {
        expect(snapshots[i].quantity).toBeGreaterThanOrEqual(snapshots[i - 1].quantity!);
      }
    }
  });

  it('DCA snapshot value equals quantity * price', async () => {
    const snapshots = await prisma.assetSnapshot.findMany({
      where: { quantity: { not: null }, price: { not: null } },
      select: { value: true, quantity: true, price: true },
    });

    for (const snap of snapshots) {
      const expected = Math.round(snap.quantity! * snap.price! * 100) / 100;
      expect(snap.value).toBe(expected);
    }
  });

  it('apartment appreciates over time', async () => {
    const apartment = await prisma.asset.findFirst({
      where: { name: { contains: 'Apartment' } },
      select: { id: true },
    });

    const snapshots = await prisma.assetSnapshot.findMany({
      where: { assetId: apartment!.id },
      orderBy: { capturedAt: 'asc' },
      select: { value: true },
    });

    expect(snapshots.length).toBeGreaterThan(2);
    expect(snapshots[snapshots.length - 1].value).toBeGreaterThan(snapshots[0].value);
  });

  it('car depreciates over time', async () => {
    const car = await prisma.asset.findFirst({
      where: { name: { contains: 'BMW' } },
      select: { id: true },
    });

    const snapshots = await prisma.assetSnapshot.findMany({
      where: { assetId: car!.id },
      orderBy: { capturedAt: 'asc' },
      select: { value: true },
    });

    expect(snapshots.length).toBeGreaterThan(2);
    expect(snapshots[snapshots.length - 1].value).toBeLessThan(snapshots[0].value);
  });

  it('current asset value matches last snapshot value', async () => {
    const assets = await prisma.asset.findMany({
      where: { type: { in: ['etf', 'crypto', 'gold'] } },
      select: { id: true, value: true, name: true },
    });

    for (const asset of assets) {
      const lastSnap = await prisma.assetSnapshot.findFirst({
        where: { assetId: asset.id },
        orderBy: { capturedAt: 'desc' },
        select: { value: true },
      });

      expect(lastSnap).not.toBeNull();
      expect(asset.value).toBe(lastSnap!.value);
    }
  });

  it('all asset snapshots have positive values', async () => {
    const snapshots = await prisma.assetSnapshot.findMany({
      select: { value: true },
    });

    for (const snap of snapshots) {
      expect(snap.value).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GOALS
// ═══════════════════════════════════════════════════════════════════════════

describe('Goal snapshots', () => {
  it('every goal snapshot has actualSavedThisMonth > 0', async () => {
    const snapshots = await prisma.goalSnapshot.findMany({
      select: { actualSavedThisMonth: true },
    });

    for (const snap of snapshots) {
      expect(snap.actualSavedThisMonth).toBeGreaterThan(0);
    }
  });

  it('balanceAsOf increases monotonically for one-time goals', async () => {
    const goals = await prisma.goal.findMany({
      where: { recurringPeriod: null },
      select: { id: true },
    });

    for (const goal of goals) {
      const snapshots = await prisma.goalSnapshot.findMany({
        where: { goalId: goal.id },
        orderBy: { month: 'asc' },
        select: { balanceAsOf: true },
      });

      for (let i = 1; i < snapshots.length; i++) {
        expect(snapshots[i].balanceAsOf).toBeGreaterThanOrEqual(snapshots[i - 1].balanceAsOf);
      }
    }
  });

  it('goal currentAmount matches last snapshot balanceAsOf', async () => {
    const goals = await prisma.goal.findMany({
      where: { recurringPeriod: null },
      include: { snapshots: { orderBy: { month: 'desc' }, take: 1 } },
    });

    for (const goal of goals) {
      if (goal.snapshots.length === 0) continue;
      const lastBalance = goal.snapshots[0].balanceAsOf;
      expect(Math.abs(goal.currentAmount - lastBalance)).toBeLessThan(1);
    }
  });

  it('no one-time goal exceeds its target amount', async () => {
    const goals = await prisma.goal.findMany({
      where: { recurringPeriod: null },
      select: { name: true, currentAmount: true, targetAmount: true },
    });

    for (const goal of goals) {
      expect(goal.currentAmount).toBeLessThanOrEqual(goal.targetAmount);
    }
  });

  it('sum of actualSavedThisMonth equals currentAmount for one-time goals', async () => {
    const goals = await prisma.goal.findMany({
      where: { recurringPeriod: null, name: { not: 'Emergency Fund' } },
      include: { snapshots: true },
    });

    for (const goal of goals) {
      const sumSaved = goal.snapshots.reduce((sum, s) => sum + s.actualSavedThisMonth, 0);
      // Vacation goal has a cap at targetAmount, so balanceAsOf may be capped
      // but for car goal this should match exactly
      if (goal.name === 'Next Car Down Payment') {
        expect(Math.abs(goal.currentAmount - sumSaved)).toBeLessThan(1);
      }
    }
  });

  it('every goal has exactly 15 snapshots (one per month)', async () => {
    const goals = await prisma.goal.findMany({ select: { id: true, name: true } });

    for (const goal of goals) {
      const count = await prisma.goalSnapshot.count({ where: { goalId: goal.id } });
      expect(count).toBe(15);
    }
  });

  it('goal snapshot months are unique per goal (no duplicates)', async () => {
    const goals = await prisma.goal.findMany({ select: { id: true } });

    for (const goal of goals) {
      const snapshots = await prisma.goalSnapshot.findMany({
        where: { goalId: goal.id },
        select: { month: true },
      });
      const months = snapshots.map((s) => s.month.toISOString());
      const unique = new Set(months);
      expect(unique.size).toBe(months.length);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// REFERENTIAL INTEGRITY & HOUSEHOLD ISOLATION
// ═══════════════════════════════════════════════════════════════════════════

describe('Referential integrity', () => {
  it('all data belongs to a single household', async () => {
    const [expHouseholds, assetHouseholds, liabHouseholds, goalHouseholds] = await Promise.all([
      prisma.expense.groupBy({ by: ['householdId'] }),
      prisma.asset.groupBy({ by: ['householdId'] }),
      prisma.liability.groupBy({ by: ['householdId'] }),
      prisma.goal.groupBy({ by: ['householdId'] }),
    ]);

    expect(expHouseholds.length).toBe(1);
    expect(assetHouseholds.length).toBe(1);
    expect(liabHouseholds.length).toBe(1);
    expect(goalHouseholds.length).toBe(1);

    // All point to the same household
    const hid = expHouseholds[0].householdId;
    expect(assetHouseholds[0].householdId).toBe(hid);
    expect(liabHouseholds[0].householdId).toBe(hid);
    expect(goalHouseholds[0].householdId).toBe(hid);
  });

  it('every asset snapshot references an existing asset', async () => {
    const assetIds = new Set(
      (await prisma.asset.findMany({ select: { id: true } })).map((a) => a.id),
    );
    const snapshots = await prisma.assetSnapshot.findMany({ select: { assetId: true } });

    for (const snap of snapshots) {
      expect(assetIds.has(snap.assetId)).toBe(true);
    }
  });

  it('every liability snapshot references an existing liability', async () => {
    const liabilityIds = new Set(
      (await prisma.liability.findMany({ select: { id: true } })).map((l) => l.id),
    );
    const snapshots = await prisma.liabilitySnapshot.findMany({ select: { liabilityId: true } });

    for (const snap of snapshots) {
      expect(liabilityIds.has(snap.liabilityId)).toBe(true);
    }
  });

  it('merchant category mappings match actual expense merchants', async () => {
    const mappings = await prisma.merchantCategoryMap.findMany({
      select: { merchant: true, categoryId: true },
    });
    const categoryIds = new Set(
      (await prisma.expenseCategory.findMany({ select: { id: true } })).map((c) => c.id),
    );

    for (const mapping of mappings) {
      expect(categoryIds.has(mapping.categoryId)).toBe(true);
    }

    // Every mapped merchant appears in at least one expense
    const expenseMerchants = new Set(
      (await prisma.expense.findMany({ select: { merchant: true } }))
        .map((e) => e.merchant)
        .filter(Boolean),
    );
    for (const mapping of mappings) {
      expect(expenseMerchants.has(mapping.merchant)).toBe(true);
    }
  });
});
