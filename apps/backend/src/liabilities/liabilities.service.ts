import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { assertHouseholdAccess } from '../common/utils/assert-household-access';
import { CreateLiabilityDto } from './dto/create-liability.dto';
import { MortgageMetadata, LeasingMetadata } from '@finances/shared';

@Injectable()
export class LiabilitiesService {
  constructor(private prisma: PrismaService) {}

  /** Calculate current outstanding balance from loan metadata and today's date. */
  private calculateCurrentBalance(type: string, metadata?: MortgageMetadata | LeasingMetadata): number {
    if (!metadata) return 0;
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    if (type === 'mortgage' || type === 'loan') {
      const meta = metadata as MortgageMetadata;
      if (!meta.originalAmount || !meta.startDate) return 0;

      const events = (meta.events ?? []).slice().sort((a, b) => a.date.localeCompare(b.date));
      let balance = meta.originalAmount;
      let rate = meta.interestRate;
      let payment = meta.monthlyPayment;
      let [year, month] = meta.startDate.slice(0, 7).split('-').map(Number);

      while (balance > 0.01) {
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        if (monthKey > currentMonthKey) break;

        for (const evt of events) {
          const evtMonth = evt.date.slice(0, 7);
          if (evtMonth !== monthKey) continue;
          if (evt.type === 'rate_change' && evt.newRate != null) rate = evt.newRate;
          if (evt.type === 'payment_change' && evt.newMonthlyPayment != null) payment = evt.newMonthlyPayment;
          if (evt.type === 'extra_payment' && evt.amount != null) balance = Math.max(0, balance - evt.amount);
          if (evt.type === 'refinance') {
            if (evt.newBalance != null) balance = evt.newBalance;
            if (evt.newRate != null) rate = evt.newRate;
            if (evt.newMonthlyPayment != null) payment = evt.newMonthlyPayment;
          }
        }

        if (monthKey === currentMonthKey) break;

        const monthlyRate = rate / 100 / 12;
        const interest = balance * monthlyRate;
        const principal = payment - interest;
        if (principal > 0) balance = Math.max(0, balance - principal);

        month++;
        if (month > 12) { month = 1; year++; }
      }
      return Math.round(balance * 100) / 100;
    }

    if (type === 'leasing') {
      const meta = metadata as LeasingMetadata;
      if (!meta.originalValue || !meta.startDate) return 0;

      const financed = meta.originalValue - (meta.downPayment ?? 0);
      let balance = financed;
      let [year, month] = meta.startDate.slice(0, 7).split('-').map(Number);
      const residual = meta.residualValue ?? 0;

      while (balance > residual + 0.01) {
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        if (monthKey > currentMonthKey) break;
        if (monthKey === currentMonthKey) break;

        const monthlyRate = meta.interestRate / 100 / 12;
        const interest = balance * monthlyRate;
        const principal = meta.monthlyPayment - interest;
        if (principal > 0) balance = Math.max(residual, balance - principal);

        month++;
        if (month > 12) { month = 1; year++; }
      }
      return Math.round(balance * 100) / 100;
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
    const value = this.calculateCurrentBalance(type, metadata as MortgageMetadata | LeasingMetadata);
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

  async getTotal(householdId: string) {
    const liabilities = await this.prisma.liability.findMany({ where: { householdId } });
    const total = liabilities.reduce((sum, l) => sum + l.value, 0);
    return { total, liabilities };
  }

  private assertHouseholdAccess(householdId: string, liabilityId: string) {
    return assertHouseholdAccess(this.prisma.liability.findUnique.bind(this.prisma.liability), householdId, liabilityId, 'Liability');
  }
}
