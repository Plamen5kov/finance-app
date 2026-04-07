import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { assertHouseholdAccess } from '../common/utils/assert-household-access';
import {
  calculateMortgageBalance,
  calculateLeasingBalance,
  getCurrentMonthlyPayment as getPayment,
} from '../common/utils/amortization';
import { currentMonthKey, monthRange } from '../common/utils/date-utils';
import { CreateLiabilityDto } from './dto/create-liability.dto';
import { MortgageMetadata, LeasingMetadata } from '@finances/shared';

@Injectable()
export class LiabilitiesService {
  private readonly logger = new Logger(LiabilitiesService.name);

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

  /** Runs daily at 00:30 — recalculates balances and creates snapshots for liabilities whose paymentDay matches today. */
  @Cron('30 0 * * *')
  async scheduledBalanceRefresh() {
    const today = new Date().getDate();
    this.logger.log(`Daily liability check: day ${today}`);

    const liabilities = await this.prisma.liability.findMany();
    let updated = 0;

    for (const liability of liabilities) {
      const meta = liability.metadata as MortgageMetadata | LeasingMetadata | null;
      if (!meta) continue;

      const paymentDay = (meta as MortgageMetadata & LeasingMetadata).paymentDay;
      if (paymentDay !== today) continue;

      const newValue = this.calculateCurrentBalance(liability.type, meta);

      await this.prisma.liability.update({
        where: { id: liability.id },
        data: { value: newValue },
      });

      await this.upsertSnapshot(liability.id, newValue);
      updated++;
      this.logger.log(`Updated ${liability.name}: ${liability.value} → ${newValue}`);
    }

    if (updated > 0) {
      this.logger.log(`Refreshed ${updated} liabilities`);
    }
  }

  private async upsertSnapshot(liabilityId: string, value: number) {
    const { start, end } = monthRange(currentMonthKey());

    const existing = await this.prisma.liabilitySnapshot.findFirst({
      where: { liabilityId, capturedAt: { gte: start, lt: end } },
    });
    if (existing) return;

    await this.prisma.liabilitySnapshot.create({
      data: { liabilityId, value, capturedAt: start },
    });
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
