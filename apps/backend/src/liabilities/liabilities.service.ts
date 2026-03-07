import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateLiabilityDto } from './dto/create-liability.dto';

@Injectable()
export class LiabilitiesService {
  constructor(private prisma: PrismaService) {}

  async findAll(householdId: string) {
    return this.prisma.liability.findMany({
      where: { householdId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(householdId: string, id: string) {
    const liability = await this.prisma.liability.findUnique({
      where: { id },
      include: { snapshots: { orderBy: { capturedAt: 'desc' }, take: 24 } },
    });
    if (!liability) throw new NotFoundException('Liability not found');
    if (liability.householdId !== householdId) throw new ForbiddenException();
    return liability;
  }

  async create(householdId: string, userId: string, dto: CreateLiabilityDto) {
    return this.prisma.liability.create({ data: { userId, householdId, ...dto } });
  }

  async update(householdId: string, id: string, dto: Partial<CreateLiabilityDto>) {
    await this.assertHouseholdAccess(householdId, id);
    return this.prisma.liability.update({ where: { id }, data: dto });
  }

  async remove(householdId: string, id: string) {
    await this.assertHouseholdAccess(householdId, id);
    await this.prisma.liability.delete({ where: { id } });
  }

  async getHistory(householdId: string) {
    return this.prisma.liability.findMany({
      where: { householdId },
      include: { snapshots: { orderBy: { capturedAt: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getTotal(householdId: string) {
    const liabilities = await this.prisma.liability.findMany({ where: { householdId } });
    const total = liabilities.reduce((sum, l) => sum + l.value, 0);
    return { total, liabilities };
  }

  private async assertHouseholdAccess(householdId: string, liabilityId: string) {
    const liability = await this.prisma.liability.findUnique({ where: { id: liabilityId } });
    if (!liability) throw new NotFoundException('Liability not found');
    if (liability.householdId !== householdId) throw new ForbiddenException();
    return liability;
  }
}
