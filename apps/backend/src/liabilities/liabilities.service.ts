import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateLiabilityDto } from './dto/create-liability.dto';

@Injectable()
export class LiabilitiesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.liability.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(userId: string, id: string) {
    const liability = await this.prisma.liability.findUnique({
      where: { id },
      include: { snapshots: { orderBy: { capturedAt: 'desc' }, take: 24 } },
    });
    if (!liability) throw new NotFoundException('Liability not found');
    if (liability.userId !== userId) throw new ForbiddenException();
    return liability;
  }

  async create(userId: string, dto: CreateLiabilityDto) {
    return this.prisma.liability.create({ data: { userId, ...dto } });
  }

  async update(userId: string, id: string, dto: Partial<CreateLiabilityDto>) {
    await this.assertOwner(userId, id);
    return this.prisma.liability.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    await this.assertOwner(userId, id);
    await this.prisma.liability.delete({ where: { id } });
  }

  async getHistory(userId: string) {
    return this.prisma.liability.findMany({
      where: { userId },
      include: { snapshots: { orderBy: { capturedAt: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getTotal(userId: string) {
    const liabilities = await this.prisma.liability.findMany({ where: { userId } });
    const total = liabilities.reduce((sum, l) => sum + l.value, 0);
    return { total, liabilities };
  }

  private async assertOwner(userId: string, liabilityId: string) {
    const liability = await this.prisma.liability.findUnique({ where: { id: liabilityId } });
    if (!liability) throw new NotFoundException('Liability not found');
    if (liability.userId !== userId) throw new ForbiddenException();
    return liability;
  }
}
