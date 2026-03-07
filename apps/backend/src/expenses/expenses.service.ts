import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, month?: string, categoryId?: string) {
    const where: Record<string, unknown> = { userId };

    if (month) {
      const start = new Date(`${month}-01`);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      where.date = { gte: start, lt: end };
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    return this.prisma.expense.findMany({
      where,
      include: { category: true },
      orderBy: { date: 'desc' },
    });
  }

  async getMonthlySummary(userId: string, month: string) {
    const start = new Date(`${month}-01`);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);

    const result = await this.prisma.expense.groupBy({
      by: ['categoryId'],
      where: { userId, date: { gte: start, lt: end } },
      _sum: { amount: true },
      _count: true,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const total = result.reduce((sum: number, r: any) => sum + ((r._sum?.amount as number) ?? 0), 0);
    return { month, total, byCategory: result };
  }

  async getMonthlyReport(userId: string, months: number) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    const [expenses, categories] = await Promise.all([
      this.prisma.expense.findMany({
        where: { userId, date: { gte: start } },
        include: { category: true },
        orderBy: { date: 'asc' },
      }),
      this.prisma.expenseCategory.findMany({ where: { userId } }),
    ]);

    // Group by month → category
    const monthMap = new Map<string, Map<string, { total: number; count: number; categoryName: string; categoryColor: string | null; categoryType: string }>>();

    for (const exp of expenses) {
      const monthKey = `${exp.date.getFullYear()}-${String(exp.date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap.has(monthKey)) monthMap.set(monthKey, new Map());
      const catMap = monthMap.get(monthKey)!;
      if (!catMap.has(exp.categoryId)) {
        catMap.set(exp.categoryId, {
          total: 0, count: 0,
          categoryName: exp.category?.name ?? 'Unknown',
          categoryColor: exp.category?.color ?? null,
          categoryType: exp.category?.type ?? 'expense',
        });
      }
      const entry = catMap.get(exp.categoryId)!;
      entry.total += exp.amount;
      entry.count += 1;
    }

    // Build sorted month array
    const sortedMonths = Array.from(monthMap.keys()).sort();
    const monthlyData = sortedMonths.map((month) => {
      const catMap = monthMap.get(month)!;
      const byCategory = Array.from(catMap.entries()).map(([categoryId, data]) => ({
        categoryId, ...data, total: Math.round(data.total * 100) / 100,
      }));
      const totalExpenses = byCategory.filter((c) => c.categoryType !== 'income').reduce((s, c) => s + c.total, 0);
      const totalIncome = byCategory.filter((c) => c.categoryType === 'income').reduce((s, c) => s + c.total, 0);
      return { month, totalExpenses: Math.round(totalExpenses * 100) / 100, totalIncome: Math.round(totalIncome * 100) / 100, byCategory };
    });

    // Category averages across all months (expenses only)
    const catTotals = new Map<string, { total: number; months: number; name: string; color: string | null; type: string }>();
    for (const md of monthlyData) {
      for (const c of md.byCategory) {
        if (c.categoryType === 'income') continue;
        if (!catTotals.has(c.categoryId)) catTotals.set(c.categoryId, { total: 0, months: 0, name: c.categoryName, color: c.categoryColor, type: c.categoryType });
        const entry = catTotals.get(c.categoryId)!;
        entry.total += c.total;
        entry.months += 1;
      }
    }
    const categoryAverages = Array.from(catTotals.entries())
      .map(([categoryId, data]) => ({
        categoryId, name: data.name, color: data.color, type: data.type,
        average: Math.round((data.total / Math.max(data.months, 1)) * 100) / 100,
        total: Math.round(data.total * 100) / 100,
      }))
      .sort((a, b) => b.average - a.average);

    return {
      months: monthlyData,
      categoryAverages,
      categories: categories.map((c) => ({ id: c.id, name: c.name, color: c.color, type: c.type })),
    };
  }

  async create(userId: string, dto: CreateExpenseDto) {
    return this.prisma.expense.create({
      data: {
        userId,
        amount: dto.amount,
        categoryId: dto.categoryId,
        date: new Date(dto.date),
        merchant: dto.merchant,
        description: dto.description,
        documentId: dto.documentId,
        source: dto.documentId ? 'imported' : 'manual',
      },
      include: { category: true },
    });
  }

  async update(userId: string, id: string, dto: Partial<CreateExpenseDto>) {
    await this.assertOwner(userId, id);
    return this.prisma.expense.update({
      where: { id },
      data: {
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.date !== undefined && { date: new Date(dto.date) }),
        ...(dto.merchant !== undefined && { merchant: dto.merchant }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
      include: { category: true },
    });
  }

  async remove(userId: string, id: string) {
    await this.assertOwner(userId, id);
    await this.prisma.expense.delete({ where: { id } });
  }

  // Categories
  async findCategories(userId: string) {
    return this.prisma.expenseCategory.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(userId: string, dto: CreateCategoryDto) {
    return this.prisma.expenseCategory.create({ data: { userId, ...dto } });
  }

  private async assertOwner(userId: string, expenseId: string) {
    const expense = await this.prisma.expense.findUnique({ where: { id: expenseId } });
    if (!expense) throw new NotFoundException('Expense not found');
    if (expense.userId !== userId) throw new ForbiddenException();
    return expense;
  }
}
