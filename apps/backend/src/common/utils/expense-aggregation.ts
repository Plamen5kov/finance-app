import { round2 } from './money';

export interface ExpenseInput {
  date: Date;
  amount: number;
  categoryId: string;
  category?: { name: string; color: string | null; type: string } | null;
}

export interface MonthlyCategoryEntry {
  categoryId: string;
  total: number;
  count: number;
  categoryName: string;
  categoryColor: string | null;
  categoryType: string;
}

export interface MonthlyData {
  month: string;
  totalExpenses: number;
  totalIncome: number;
  byCategory: MonthlyCategoryEntry[];
}

export interface CategoryAverage {
  categoryId: string;
  name: string;
  color: string | null;
  type: string;
  average: number;
  total: number;
}

/** Group expenses by month and category, computing totals. */
export function aggregateExpensesByMonth(expenses: ExpenseInput[]): MonthlyData[] {
  const monthMap = new Map<
    string,
    Map<
      string,
      {
        total: number;
        count: number;
        categoryName: string;
        categoryColor: string | null;
        categoryType: string;
      }
    >
  >();

  for (const exp of expenses) {
    const monthKey = `${exp.date.getFullYear()}-${String(exp.date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthMap.has(monthKey)) monthMap.set(monthKey, new Map());
    const catMap = monthMap.get(monthKey)!;
    if (!catMap.has(exp.categoryId)) {
      catMap.set(exp.categoryId, {
        total: 0,
        count: 0,
        categoryName: exp.category?.name ?? 'Unknown',
        categoryColor: exp.category?.color ?? null,
        categoryType: exp.category?.type ?? 'expense',
      });
    }
    const entry = catMap.get(exp.categoryId)!;
    entry.total += exp.amount;
    entry.count += 1;
  }

  const sortedMonths = Array.from(monthMap.keys()).sort();
  return sortedMonths.map((month) => {
    const catMap = monthMap.get(month)!;
    const byCategory = Array.from(catMap.entries()).map(([categoryId, data]) => ({
      categoryId,
      ...data,
      total: round2(Math.abs(data.total)),
    }));
    const totalExpenses = byCategory
      .filter((c) => c.categoryType !== 'income')
      .reduce((s, c) => s + Math.abs(c.total), 0);
    const totalIncome = byCategory
      .filter((c) => c.categoryType === 'income')
      .reduce((s, c) => s + c.total, 0);
    return {
      month,
      totalExpenses: round2(totalExpenses),
      totalIncome: round2(totalIncome),
      byCategory,
    };
  });
}

/** Compute per-category averages across months (expenses only, not income). */
export function computeCategoryAverages(monthlyData: MonthlyData[]): CategoryAverage[] {
  const catTotals = new Map<
    string,
    { total: number; months: number; name: string; color: string | null; type: string }
  >();

  for (const md of monthlyData) {
    for (const c of md.byCategory) {
      if (c.categoryType === 'income') continue;
      if (!catTotals.has(c.categoryId)) {
        catTotals.set(c.categoryId, {
          total: 0,
          months: 0,
          name: c.categoryName,
          color: c.categoryColor,
          type: c.categoryType,
        });
      }
      const entry = catTotals.get(c.categoryId)!;
      entry.total += Math.abs(c.total);
      entry.months += 1;
    }
  }

  return Array.from(catTotals.entries())
    .map(([categoryId, data]) => ({
      categoryId,
      name: data.name,
      color: data.color,
      type: data.type,
      average: round2(data.total / Math.max(data.months, 1)),
      total: round2(data.total),
    }))
    .sort((a, b) => b.average - a.average);
}
