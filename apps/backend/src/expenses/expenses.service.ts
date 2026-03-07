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
