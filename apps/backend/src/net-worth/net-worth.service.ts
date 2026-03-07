import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { MortgageMetadata } from '@finances/shared';

@Injectable()
export class NetWorthService {
  constructor(private prisma: PrismaService) {}

  async getSummary(userId: string) {
    const [assets, liabilities] = await Promise.all([
      this.prisma.asset.findMany({ where: { userId } }),
      this.prisma.liability.findMany({ where: { userId } }),
    ]);
    const totalAssets = assets.reduce((s, a) => s + a.value, 0);
    const totalLiabilities = liabilities.reduce((s, l) => s + l.value, 0);
    return { netWorth: totalAssets - totalLiabilities, totalAssets, totalLiabilities };
  }

  async getHistory(userId: string) {
    const [assets, liabilities] = await Promise.all([
      this.prisma.asset.findMany({
        where: { userId },
        include: { snapshots: { orderBy: { capturedAt: 'asc' } } },
      }),
      this.prisma.liability.findMany({
        where: { userId },
        include: { snapshots: { orderBy: { capturedAt: 'asc' } } },
      }),
    ]);

    // month → list of item values at that month
    const dateMap = new Map<
      string,
      Array<{ name: string; type: string; value: number; isLiability: boolean }>
    >();

    const addSnapshots = (
      name: string,
      type: string,
      isLiability: boolean,
      snapshots: Array<{ capturedAt: Date; value: number }>,
    ) => {
      for (const snap of snapshots) {
        const month = snap.capturedAt.toISOString().slice(0, 7);
        if (!dateMap.has(month)) dateMap.set(month, []);
        dateMap.get(month)!.push({ name, type, value: snap.value, isLiability });
      }
    };

    for (const a of assets) addSnapshots(a.name, a.type, false, a.snapshots);
    for (const l of liabilities) addSnapshots(l.name, l.type, true, l.snapshots);

    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, items]) => ({
        month,
        netWorth: items.reduce((s, i) => s + (i.isLiability ? -i.value : i.value), 0),
        items,
      }));
  }

  async getProjection(userId: string) {
    const [liabilities, assetAgg] = await Promise.all([
      this.prisma.liability.findMany({ where: { userId } }),
      this.prisma.asset.aggregate({ where: { userId }, _sum: { value: true } }),
    ]);

    const totalAssets = assetAgg._sum.value ?? 0;

    const projectable = liabilities.filter((l) => {
      const meta = l.metadata as unknown as MortgageMetadata | null;
      return meta && meta.monthlyPayment > 0 && l.value > 0 && meta.interestRate >= 0;
    });

    if (!projectable.length) return { payoffMonth: null, points: [] as Array<{ month: string; projectedNetWorth: number }> };

    let balances = projectable.map((l) => {
      const meta = l.metadata as unknown as MortgageMetadata;
      const sortedHistory = (meta.rateHistory ?? []).slice().sort((a, b) => b.date.localeCompare(a.date));
      const annualRate = sortedHistory[0]?.rate ?? meta.interestRate;
      return {
        name: l.name,
        type: l.type,
        balance: l.value,
        monthlyRate: annualRate / 100 / 12,
        payment: meta.monthlyPayment,
      };
    });

    const now = new Date();
    const points: Array<{
      month: string;
      projectedNetWorth: number;
      liabilities: Array<{ name: string; type: string; balance: number }>;
    }> = [];
    let payoffMonth: string | null = null;

    for (let i = 0; i <= 600; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const totalBalance = balances.reduce((s, b) => s + b.balance, 0);
      points.push({
        month,
        projectedNetWorth: totalAssets - totalBalance,
        liabilities: balances.map((b) => ({ name: b.name, type: b.type, balance: b.balance })),
      });

      if (totalBalance <= 0.01) {
        payoffMonth = month;
        break;
      }

      balances = balances.map((b) => {
        if (b.balance <= 0) return b;
        const interest = b.balance * b.monthlyRate;
        const principal = b.payment - interest;
        if (principal <= 0) return b;
        return { ...b, balance: Math.max(0, b.balance - principal) };
      });
    }

    return { payoffMonth, points };
  }
}
