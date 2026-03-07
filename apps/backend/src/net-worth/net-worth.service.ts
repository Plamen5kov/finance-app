import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { MortgageMetadata, LeasingMetadata } from '@finances/shared';

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
      if (l.type === 'leasing') {
        const meta = l.metadata as unknown as LeasingMetadata | null;
        if (meta?.startDate && meta?.monthlyPayment && meta?.interestRate !== undefined && meta?.termMonths) {
          const financed = (meta.originalValue ?? 0) - (meta.downPayment ?? 0);
          const residual = meta.residualValue ?? 0;
          const monthlyRate = meta.interestRate / 100 / 12;
          let balance = financed;
          let [year, month] = meta.startDate.slice(0, 7).split('-').map(Number);
          for (let i = 0; i <= meta.termMonths; i++) {
            const monthKey = `${year}-${String(month).padStart(2, '0')}`;
            if (monthKey > nowMonthKey) break;
            const displayBalance = i === meta.termMonths ? residual : Math.max(residual, balance);
            if (!liabByMonth.has(monthKey)) liabByMonth.set(monthKey, []);
            liabByMonth.get(monthKey)!.push({ name: l.name, type: l.type, value: displayBalance });
            if (i < meta.termMonths) {
              const interest = balance * monthlyRate;
              const principal = meta.monthlyPayment - interest;
              balance = Math.max(residual, balance - (principal > 0 ? principal : 0));
            }
            month++;
            if (month > 12) { month = 1; year++; }
          }
        } else {
          for (const s of l.snapshots) {
            const monthKey = s.capturedAt.toISOString().slice(0, 7);
            if (!liabByMonth.has(monthKey)) liabByMonth.set(monthKey, []);
            liabByMonth.get(monthKey)!.push({ name: l.name, type: l.type, value: s.value });
          }
        }
      } else {
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
          for (const s of l.snapshots) {
            const monthKey = s.capturedAt.toISOString().slice(0, 7);
            if (!liabByMonth.has(monthKey)) liabByMonth.set(monthKey, []);
            liabByMonth.get(monthKey)!.push({ name: l.name, type: l.type, value: s.value });
          }
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

    // The earliest month that any liability appears — used so a snapshot-less asset (e.g. apartment)
    // is included from when its paired liability first shows up, even if the asset was added to the
    // app later than the liability start date.
    const earliestLiabilityMonth = liabByMonth.size > 0
      ? Array.from(liabByMonth.keys()).sort()[0]
      : null;

    return sortedMonths.map((month) => {
      const items: Array<{ name: string; type: string; value: number; isLiability: boolean }> = [];

      // Assets: carry forward the most recent snapshot value for each asset.
      // Assets with no snapshots are included from the earlier of (createdAt, firstLiabilityMonth)
      // using their current value, so that manually-tracked assets (e.g. apartment) offset a
      // paired liability (e.g. mortgage) without causing phantom net-worth drops.
      for (const a of assets) {
        if (!a.snapshots.length) {
          const createdAtMonth = a.createdAt.toISOString().slice(0, 7);
          const effectiveStart = earliestLiabilityMonth && earliestLiabilityMonth < createdAtMonth
            ? earliestLiabilityMonth
            : createdAtMonth;
          if (month >= effectiveStart) {
            items.push({ name: a.name, type: a.type, value: a.value, isLiability: false });
          }
          continue;
        }
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
      const meta = l.metadata as unknown as MortgageMetadata | LeasingMetadata | null;
      return meta && (meta as MortgageMetadata).monthlyPayment > 0 && l.value > 0;
    });

    if (!projectable.length) return { payoffMonth: null, points: [] as Array<{ month: string; projectedNetWorth: number }> };

    const now = new Date();
    const nowMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let balances = projectable.map((l) => {
      if (l.type === 'leasing') {
        const meta = l.metadata as unknown as LeasingMetadata;
        const financed = (meta.originalValue ?? 0) - (meta.downPayment ?? 0);
        const residual = meta.residualValue ?? 0;
        const monthlyRate = meta.interestRate / 100 / 12;
        // Compute current leasing balance by running amortization from start to now
        let balance = financed;
        if (meta.startDate) {
          let [yr, mo] = meta.startDate.slice(0, 7).split('-').map(Number);
          for (let i = 0; i < meta.termMonths; i++) {
            const mk = `${yr}-${String(mo).padStart(2, '0')}`;
            if (mk >= nowMonthKey) break;
            const interest = balance * monthlyRate;
            const principal = meta.monthlyPayment - interest;
            balance = Math.max(residual, balance - (principal > 0 ? principal : 0));
            mo++; if (mo > 12) { mo = 1; yr++; }
          }
        }
        // Compute end-of-lease month for payoff tracking
        let endMonthKey: string | null = null;
        if (meta.startDate && meta.termMonths) {
          const d = new Date(meta.startDate + 'T00:00:00Z');
          d.setUTCMonth(d.getUTCMonth() + meta.termMonths);
          endMonthKey = d.toISOString().slice(0, 7);
        }
        return { name: l.name, type: l.type, balance, monthlyRate, payment: meta.monthlyPayment, residual, endMonthKey };
      } else {
        const meta = l.metadata as unknown as MortgageMetadata;
        const sortedRates = (meta.rateHistory ?? []).slice().sort((a, b) => a.date.localeCompare(b.date));
        const balance = meta.originalAmount && meta.startDate
          ? this.amortizeToMonth(meta, nowMonthKey)
          : l.value;
        const latestRate = sortedRates.length > 0 ? sortedRates[sortedRates.length - 1].rate : meta.interestRate;
        return { name: l.name, type: l.type, balance, monthlyRate: latestRate / 100 / 12, payment: meta.monthlyPayment, residual: 0, endMonthKey: null as string | null };
      }
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
        if (b.balance <= b.residual) return b;
        // For leasing: at end month the residual (balloon) is paid — balance drops to 0
        if (b.endMonthKey && month >= b.endMonthKey) return { ...b, balance: 0 };
        const interest = b.balance * b.monthlyRate;
        const principal = b.payment - interest;
        if (principal <= 0) return b;
        return { ...b, balance: Math.max(b.residual, b.balance - principal) };
      });
    }

    return { payoffMonth, points };
  }
}
