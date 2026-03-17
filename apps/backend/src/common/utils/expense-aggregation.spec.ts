import {
  aggregateExpensesByMonth,
  computeCategoryAverages,
  ExpenseInput,
} from './expense-aggregation';

function makeExpense(
  overrides: Partial<ExpenseInput> & { date: Date; amount: number; categoryId: string },
): ExpenseInput {
  return {
    category: { name: 'Test', color: null, type: 'expense' },
    ...overrides,
  };
}

describe('aggregateExpensesByMonth', () => {
  it('groups expenses by month', () => {
    const expenses: ExpenseInput[] = [
      makeExpense({ date: new Date('2024-01-15'), amount: -100, categoryId: 'cat1' }),
      makeExpense({ date: new Date('2024-01-20'), amount: -50, categoryId: 'cat1' }),
      makeExpense({ date: new Date('2024-02-10'), amount: -200, categoryId: 'cat1' }),
    ];
    const result = aggregateExpensesByMonth(expenses);
    expect(result).toHaveLength(2);
    expect(result[0].month).toBe('2024-01');
    expect(result[1].month).toBe('2024-02');
  });

  it('separates income from expenses', () => {
    const expenses: ExpenseInput[] = [
      makeExpense({
        date: new Date('2024-01-15'),
        amount: -100,
        categoryId: 'exp1',
        category: { name: 'Rent', color: null, type: 'required' },
      }),
      makeExpense({
        date: new Date('2024-01-15'),
        amount: 3000,
        categoryId: 'inc1',
        category: { name: 'Salary', color: null, type: 'income' },
      }),
    ];
    const result = aggregateExpensesByMonth(expenses);
    expect(result[0].totalExpenses).toBe(100);
    expect(result[0].totalIncome).toBe(3000);
  });

  it('returns sorted months', () => {
    const expenses: ExpenseInput[] = [
      makeExpense({ date: new Date('2024-03-01'), amount: -10, categoryId: 'c1' }),
      makeExpense({ date: new Date('2024-01-01'), amount: -10, categoryId: 'c1' }),
      makeExpense({ date: new Date('2024-02-01'), amount: -10, categoryId: 'c1' }),
    ];
    const result = aggregateExpensesByMonth(expenses);
    expect(result.map((m) => m.month)).toEqual(['2024-01', '2024-02', '2024-03']);
  });

  it('handles empty array', () => {
    expect(aggregateExpensesByMonth([])).toEqual([]);
  });

  it('counts category entries', () => {
    const expenses: ExpenseInput[] = [
      makeExpense({ date: new Date('2024-01-10'), amount: -50, categoryId: 'cat1' }),
      makeExpense({ date: new Date('2024-01-20'), amount: -30, categoryId: 'cat1' }),
      makeExpense({ date: new Date('2024-01-15'), amount: -100, categoryId: 'cat2' }),
    ];
    const result = aggregateExpensesByMonth(expenses);
    const cat1 = result[0].byCategory.find((c) => c.categoryId === 'cat1');
    const cat2 = result[0].byCategory.find((c) => c.categoryId === 'cat2');
    expect(cat1?.count).toBe(2);
    expect(cat2?.count).toBe(1);
  });
});

describe('computeCategoryAverages', () => {
  it('computes correct averages', () => {
    const monthlyData = [
      {
        month: '2024-01',
        totalExpenses: 300,
        totalIncome: 0,
        byCategory: [
          {
            categoryId: 'c1',
            total: 200,
            count: 2,
            categoryName: 'Rent',
            categoryColor: null,
            categoryType: 'required',
          },
          {
            categoryId: 'c2',
            total: 100,
            count: 1,
            categoryName: 'Food',
            categoryColor: null,
            categoryType: 'expense',
          },
        ],
      },
      {
        month: '2024-02',
        totalExpenses: 400,
        totalIncome: 0,
        byCategory: [
          {
            categoryId: 'c1',
            total: 200,
            count: 1,
            categoryName: 'Rent',
            categoryColor: null,
            categoryType: 'required',
          },
          {
            categoryId: 'c2',
            total: 200,
            count: 3,
            categoryName: 'Food',
            categoryColor: null,
            categoryType: 'expense',
          },
        ],
      },
    ];
    const result = computeCategoryAverages(monthlyData);
    expect(result).toHaveLength(2);
    // Rent: 400 total / 2 months = 200 avg
    const rent = result.find((c) => c.categoryId === 'c1');
    expect(rent?.average).toBe(200);
    // Food: 300 total / 2 months = 150 avg
    const food = result.find((c) => c.categoryId === 'c2');
    expect(food?.average).toBe(150);
  });

  it('excludes income categories', () => {
    const monthlyData = [
      {
        month: '2024-01',
        totalExpenses: 100,
        totalIncome: 3000,
        byCategory: [
          {
            categoryId: 'c1',
            total: 100,
            count: 1,
            categoryName: 'Rent',
            categoryColor: null,
            categoryType: 'required',
          },
          {
            categoryId: 'inc',
            total: 3000,
            count: 1,
            categoryName: 'Salary',
            categoryColor: null,
            categoryType: 'income',
          },
        ],
      },
    ];
    const result = computeCategoryAverages(monthlyData);
    expect(result).toHaveLength(1);
    expect(result[0].categoryId).toBe('c1');
  });

  it('sorts by average descending', () => {
    const monthlyData = [
      {
        month: '2024-01',
        totalExpenses: 500,
        totalIncome: 0,
        byCategory: [
          {
            categoryId: 'c1',
            total: 100,
            count: 1,
            categoryName: 'Small',
            categoryColor: null,
            categoryType: 'expense',
          },
          {
            categoryId: 'c2',
            total: 400,
            count: 1,
            categoryName: 'Big',
            categoryColor: null,
            categoryType: 'expense',
          },
        ],
      },
    ];
    const result = computeCategoryAverages(monthlyData);
    expect(result[0].name).toBe('Big');
    expect(result[1].name).toBe('Small');
  });
});
