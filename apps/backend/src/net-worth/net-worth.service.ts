import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { MortgageMetadata } from '@finances/shared';

@Injectable()
export class NetWorthService {
  constructor(private prisma: PrismaService) {}

  /** Apply one month's payment and return the new balance. */
  private amortizeMonth(
    balance: number,
    monthKey: string,
    sortedRates: Array<{ date: string; rate: number }>,
    defaultRate: number,
    monthlyPayment: number,
  ): number {
    const applicableRate =
      [...sortedRates].reverse().find((r) => r.date.slice(0, 7) <= monthKey)?.rate ?? defaultRate;
    const monthlyRate = applicableRate / 100 / 12;
    const interest = balance * monthlyRate;
    const principal = monthlyPayment - interest;
    if (principal <= 0) return balance;
    return Math.max(0, balance - principal);
  }

  /** Run amortization from meta.originalAmount at meta.startDate up to (but not including) untilMonthKey. */
  private amortizeToMonth(meta: MortgageMetadata, untilMonthKey: string): number {
    const sortedRates = (meta.rateHistory ?? []).slice().sort((a, b) => a.date.localeCompare(b.date));
    let balance = meta.originalAmount;
    let [year, month] = meta.startDate.slice(0, 7).split('-').map(Number);
    while (balance > 0.01) {
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      if (monthKey >= untilMonthKey) break;
      balance = this.amortizeMonth(balance, monthKey, sortedRates, meta.interestRate, meta.monthlyPayment);
      month++;
      if (month > 12) { month = 1; year++; }
    }
    return balance;
  }

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

    const nowMonthKey = new Date().toISOString().slice(0, 7);

    // Build amortized liability values per month
    type LiabEntry = { name: string; type: string; value: number };
    const liabByMonth = new Map<string, LiabEntry[]>();

    for (const l of liabilities) {
      const meta = l.metadata as unknown as MortgageMetadata | null;
      if (meta?.originalAmount && meta?.startDate && meta?.monthlyPayment && meta?.interestRate !== undefined) {
        const sortedRates = (meta.rateHistory ?? []).slice().sort((a, b) => a.date.localeCompare(b.date));
        let balance = meta.originalAmount;
        let [year, month] = meta.startDate.slice(0, 7).split('-').map(Number);
        while (true) {
          const monthKey = `${year}-${String(month).padStart(2, '0')}`;
          if (monthKey > nowMonthKey) break;
          if (!liabByMonth.has(monthKey)) liabByMonth.set(monthKey, []);
          liabByMonth.get(monthKey)!.push({ name: l.name, type: l.type, value: balance });
          if (balance <= 0.01) break;
          balance = this.amortizeMonth(balance, monthKey, sortedRates, meta.interestRate, meta.monthlyPayment);
          month++;
          if (month > 12) { month = 1; year++; }
        }
      } else {
        // Fall back to carry-forward from stored snapshots
        for (const s of l.snapshots) {
          const monthKey = s.capturedAt.toISOString().slice(0, 7);
          if (!liabByMonth.has(monthKey)) liabByMonth.set(monthKey, []);
          liabByMonth.get(monthKey)!.push({ name: l.name, type: l.type, value: s.value });
        }
      }
    }

    // Find earliest asset snapshot month so we don't show liability-only months
    let earliestAssetMonth: string | null = null;
    for (const a of assets) {
      if (a.snapshots.length > 0) {
        const m = a.snapshots[0].capturedAt.toISOString().slice(0, 7);
        if (!earliestAssetMonth || m < earliestAssetMonth) earliestAssetMonth = m;
      }
    }

    // Union of all months from asset snapshots and liability months (filtered to >= earliest asset month)
    const allMonths = new Set<string>();
    for (const a of assets) {
      for (const s of a.snapshots) allMonths.add(s.capturedAt.toISOString().slice(0, 7));
    }
    for (const m of liabByMonth.keys()) {
      if (!earliestAssetMonth || m >= earliestAssetMonth) allMonths.add(m);
    }

    const sortedMonths = Array.from(allMonths).sort();

    return sortedMonths.map((month) => {
      const items: Array<{ name: string; type: string; value: number; isLiability: boolean }> = [];

      // Assets: carry forward the most recent snapshot value for each asset
      for (const a of assets) {
        if (!a.snapshots.length) continue;
        const firstMonth = a.snapshots[0].capturedAt.toISOString().slice(0, 7);
        if (month < firstMonth) continue;
        const snap = [...a.snapshots].reverse().find(
          (s) => s.capturedAt.toISOString().slice(0, 7) <= month,
        );
        if (snap) items.push({ name: a.name, type: a.type, value: snap.value, isLiability: false });
      }

      // Liabilities: for non-amortized ones, carry forward too
      const liabEntries = liabByMonth.get(month);
      if (liabEntries) {
        for (const e of liabEntries) items.push({ ...e, isLiability: true });
      } else {
        // Carry forward last known liability value for non-amortized liabilities
        for (const l of liabilities) {
          const meta = l.metadata as unknown as MortgageMetadata | null;
          const hasAmortization = meta?.originalAmount && meta?.startDate && meta?.monthlyPayment && meta?.interestRate !== undefined;
          if (hasAmortization || !l.snapshots.length) continue;
          const snap = [...l.snapshots].reverse().find(
            (s) => s.capturedAt.toISOString().slice(0, 7) <= month,
          );
          if (snap) items.push({ name: l.name, type: l.type, value: snap.value, isLiability: true });
        }
      }

      return {
        month,
        netWorth: items.reduce((s, i) => s + (i.isLiability ? -i.value : i.value), 0),
        items,
      };
    });
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

    const now = new Date();

    const nowMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let balances = projectable.map((l) => {
      const meta = l.metadata as unknown as MortgageMetadata;
      const sortedRates = (meta.rateHistory ?? []).slice().sort((a, b) => a.date.localeCompare(b.date));
      const balance = meta.originalAmount && meta.startDate
        ? this.amortizeToMonth(meta, nowMonthKey)
        : l.value;
      const latestRate = sortedRates.length > 0
        ? (sortedRates[sortedRates.length - 1].rate)
        : meta.interestRate;
      return {
        name: l.name,
        type: l.type,
        balance,
        monthlyRate: latestRate / 100 / 12,
        payment: meta.monthlyPayment,
      };
    });

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

      if (totalBalance <= 0.01 && !payoffMonth) {
        payoffMonth = month;
      }
      if (payoffMonth) continue;

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
