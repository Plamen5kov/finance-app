import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async findAll(householdId: string, month?: string, categoryId?: string) {
    const where: Record<string, unknown> = { householdId };

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

  async getMonthlySummary(householdId: string, month: string) {
    const start = new Date(`${month}-01`);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);

    const [result, categories] = await Promise.all([
      this.prisma.expense.groupBy({
        by: ['categoryId'],
        where: { householdId, date: { gte: start, lt: end }, amount: { lt: 0 } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.expenseCategory.findMany({ where: { householdId } }),
    ]);

    const catMap = new Map(categories.map((c) => [c.id, c.name]));
    const byCategory = result.map((r) => ({
      categoryId: r.categoryId,
      name: catMap.get(r.categoryId) ?? 'Unknown',
      total: Math.abs(r._sum?.amount ?? 0),
    }));
    byCategory.sort((a, b) => b.total - a.total);
    const total = byCategory.reduce((sum, c) => sum + c.total, 0);
    return { month, total, byCategory };
  }

  async getMonthlyReport(householdId: string, months: number) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    const [expenses, categories] = await Promise.all([
      this.prisma.expense.findMany({
        where: { householdId, date: { gte: start } },
        include: { category: true },
        orderBy: { date: 'asc' },
      }),
      this.prisma.expenseCategory.findMany({ where: { householdId } }),
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
        categoryId, ...data, total: Math.round(Math.abs(data.total) * 100) / 100,
      }));
      const totalExpenses = byCategory.filter((c) => c.categoryType !== 'income').reduce((s, c) => s + Math.abs(c.total), 0);
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
        entry.total += Math.abs(c.total);
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

  async create(householdId: string, userId: string, dto: CreateExpenseDto) {
    return this.prisma.expense.create({
      data: {
        householdId,
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

  async update(householdId: string, id: string, dto: Partial<CreateExpenseDto>) {
    await this.assertHouseholdAccess(householdId, id);
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

  async remove(householdId: string, id: string) {
    await this.assertHouseholdAccess(householdId, id);
    await this.prisma.expense.delete({ where: { id } });
  }

  // Categories
  async findCategories(householdId: string) {
    return this.prisma.expenseCategory.findMany({
      where: { householdId },
      orderBy: { name: 'asc' },
    });
  }

  private static readonly CATEGORY_COLORS = [
    '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#10B981',
    '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
    '#8B5CF6', '#A855F7', '#EC4899', '#DC2626', '#D97706',
  ];

  async createCategory(householdId: string, userId: string, dto: CreateCategoryDto) {
    const color = dto.color ?? await this.pickColor(householdId);
    return this.prisma.expenseCategory.create({ data: { householdId, userId, ...dto, color } });
  }

  private async pickColor(householdId: string): Promise<string> {
    const existing = await this.prisma.expenseCategory.findMany({
      where: { householdId },
      select: { color: true },
    });
    const used = new Set(existing.map((c) => c.color));
    const available = ExpensesService.CATEGORY_COLORS.find((c) => !used.has(c));
    return available ?? ExpensesService.CATEGORY_COLORS[existing.length % ExpensesService.CATEGORY_COLORS.length];
  }

  async reassignMerchant(householdId: string, userId: string, merchant: string, categoryId: string) {
    const [result] = await Promise.all([
      this.prisma.expense.updateMany({
        where: { householdId, merchant },
        data: { categoryId },
      }),
      this.prisma.merchantCategoryMap.upsert({
        where: { householdId_merchant: { householdId, merchant } },
        create: { householdId, userId, merchant, categoryId },
        update: { categoryId },
      }),
    ]);
    return { updated: result.count };
  }

  private async assertHouseholdAccess(householdId: string, expenseId: string) {
    const expense = await this.prisma.expense.findUnique({ where: { id: expenseId } });
    if (!expense) throw new NotFoundException('Expense not found');
    if (expense.householdId !== householdId) throw new ForbiddenException();
    return expense;
  }
}
