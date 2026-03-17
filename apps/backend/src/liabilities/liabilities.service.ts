import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { assertHouseholdAccess } from '../common/utils/assert-household-access';
import {
  calculateMortgageBalance,
  calculateLeasingBalance,
  currentMonthKey,
  getCurrentMonthlyPayment as getPayment,
} from '../common/utils/amortization';
import { CreateLiabilityDto } from './dto/create-liability.dto';
import { MortgageMetadata, LeasingMetadata } from '@finances/shared';

@Injectable()
export class LiabilitiesService {
  constructor(private prisma: PrismaService) {}

  private calculateCurrentBalance(
    type: string,
    metadata?: MortgageMetadata | LeasingMetadata,
  ): number {
    if (!metadata) return 0;
    const monthKey = currentMonthKey();
    if (type === 'mortgage' || type === 'loan') {
      return calculateMortgageBalance(metadata as MortgageMetadata, monthKey);
    }
    if (type === 'leasing') {
      return calculateLeasingBalance(metadata as LeasingMetadata, monthKey);
    }
    return 0;
  }

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
    const value = this.calculateCurrentBalance(dto.type, dto.metadata);
    return this.prisma.liability.create({ data: { userId, householdId, ...dto, value } });
  }

  async update(householdId: string, id: string, dto: Partial<CreateLiabilityDto>) {
    const existing = await this.prisma.liability.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Liability not found');
    if (existing.householdId !== householdId) throw new ForbiddenException();
    const type = dto.type ?? existing.type;
    const metadata = dto.metadata ?? existing.metadata;
    const value = this.calculateCurrentBalance(
      type,
      metadata as MortgageMetadata | LeasingMetadata,
    );
    return this.prisma.liability.update({ where: { id }, data: { ...dto, value } });
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

  getCurrentMonthlyPayment(type: string, metadata?: MortgageMetadata | LeasingMetadata): number {
    return getPayment(type, metadata);
  }

  async getTotal(householdId: string) {
    const liabilities = await this.prisma.liability.findMany({ where: { householdId } });
    const total = liabilities.reduce((sum, l) => sum + l.value, 0);
    return { total, liabilities };
  }

  private assertHouseholdAccess(householdId: string, liabilityId: string) {
    return assertHouseholdAccess(
      this.prisma.liability.findUnique.bind(this.prisma.liability),
      householdId,
      liabilityId,
      'Liability',
    );
  }
}
