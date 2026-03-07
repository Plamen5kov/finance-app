import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto, UpdateGoalStatusDto } from './dto/update-goal.dto';

@Injectable()
export class GoalsService {
  constructor(private prisma: PrismaService) {}

  async findAll(householdId: string, recurringPeriod?: string | null) {
    const where: Record<string, unknown> = { householdId };

    if (recurringPeriod !== undefined) {
      // query param 'null' string → actual null
      where.recurringPeriod = recurringPeriod === 'null' ? null : recurringPeriod;
    }

    return this.prisma.goal.findMany({
      where,
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });
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
        targetAmount: dto.targetAmount,
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
        ...(dto.targetAmount !== undefined && { targetAmount: dto.targetAmount }),
        ...(dto.targetDate !== undefined && {
          targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
        }),
        ...(dto.recurringPeriod !== undefined && { recurringPeriod: dto.recurringPeriod }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
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

  private async assertHouseholdAccess(householdId: string, goalId: string) {
    const goal = await this.prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal) throw new NotFoundException('Goal not found');
    if (goal.householdId !== householdId) throw new ForbiddenException();
    return goal;
  }
}
