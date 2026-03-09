import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { MortgageMetadata, LeasingMetadata } from '@finances/shared';

@Injectable()
export class NetWorthService {
  constructor(private prisma: PrismaService) {}

  /** Run amortization with lifecycle events, returning balance per month. */
  private amortizeWithEvents(
    meta: MortgageMetadata,
    untilMonthKey: string,
  ): Map<string, number> {
    const balances = new Map<string, number>();
    const events = (meta.events ?? []).slice().sort((a, b) => a.date.localeCompare(b.date));

    let balance = meta.originalAmount;
    let rate = meta.interestRate;
    let payment = meta.monthlyPayment;
    let [year, month] = meta.startDate.slice(0, 7).split('-').map(Number);

    while (balance > 0.01) {
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      if (monthKey > untilMonthKey) break;

      // Apply events for this month
      for (const evt of events) {
        const evtMonth = evt.date.slice(0, 7);
        if (evtMonth !== monthKey) continue;
        switch (evt.type) {
          case 'rate_change':
            if (evt.newRate != null) rate = evt.newRate;
            break;
          case 'payment_change':
            if (evt.newMonthlyPayment != null) payment = evt.newMonthlyPayment;
            break;
          case 'extra_payment':
            if (evt.amount != null) balance = Math.max(0, balance - evt.amount);
            break;
          case 'refinance':
            if (evt.newBalance != null) balance = evt.newBalance;
            if (evt.newRate != null) rate = evt.newRate;
            if (evt.newMonthlyPayment != null) payment = evt.newMonthlyPayment;
            break;
        }
      }

      balances.set(monthKey, balance);

      // Standard amortization step
      const monthlyRate = rate / 100 / 12;
      const interest = balance * monthlyRate;
      const principal = payment - interest;
      if (principal > 0) balance = Math.max(0, balance - principal);

      month++;
      if (month > 12) { month = 1; year++; }
    }

    return balances;
  }

  /** Get the effective rate and payment at a given month from events. */
  private getEffectiveTerms(meta: MortgageMetadata, atMonthKey: string) {
    let rate = meta.interestRate;
    let payment = meta.monthlyPayment;
    for (const evt of (meta.events ?? []).slice().sort((a, b) => a.date.localeCompare(b.date))) {
      if (evt.date.slice(0, 7) > atMonthKey) break;
      if (evt.type === 'rate_change' || evt.type === 'refinance') {
        if (evt.newRate != null) rate = evt.newRate;
      }
      if (evt.type === 'payment_change' || evt.type === 'refinance') {
        if (evt.newMonthlyPayment != null) payment = evt.newMonthlyPayment;
      }
    }
    return { rate, payment };
  }

  async getSummary(householdId: string) {
    const [assets, liabilities] = await Promise.all([
      this.prisma.asset.findMany({ where: { householdId } }),
      this.prisma.liability.findMany({ where: { householdId } }),
    ]);
    const totalAssets = assets.reduce((s, a) => s + a.value, 0);
    const totalLiabilities = liabilities.reduce((s, l) => s + l.value, 0);
    return { netWorth: totalAssets - totalLiabilities, totalAssets, totalLiabilities };
  }

  async getHistory(householdId: string) {
    const [assets, liabilities] = await Promise.all([
      this.prisma.asset.findMany({
        where: { householdId },
        include: { snapshots: { orderBy: { capturedAt: 'asc' } } },
      }),
      this.prisma.liability.findMany({
        where: { householdId },
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
          const balanceMap = this.amortizeWithEvents(meta, nowMonthKey);
          for (const [monthKey, balance] of balanceMap) {
            if (!liabByMonth.has(monthKey)) liabByMonth.set(monthKey, []);
            liabByMonth.get(monthKey)!.push({ name: l.name, type: l.type, value: balance });
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
      // items: only real data points (for individual chart lines)
      // netWorthValue: always includes carry-forward (for continuous Net Worth line)
      const items: Array<{ name: string; type: string; value: number; isLiability: boolean }> = [];
      let netWorthValue = 0;

      for (const a of assets) {
        if (!a.snapshots.length) {
          const createdAtMonth = a.createdAt.toISOString().slice(0, 7);
          const effectiveStart = earliestLiabilityMonth && earliestLiabilityMonth < createdAtMonth
            ? earliestLiabilityMonth
            : createdAtMonth;
          if (month >= effectiveStart) {
            items.push({ name: a.name, type: a.type, value: a.value, isLiability: false });
            netWorthValue += a.value;
          }
          continue;
        }
        const firstMonth = a.snapshots[0].capturedAt.toISOString().slice(0, 7);
        if (month < firstMonth) continue;

        const isDca = a.snapshots.some((s) => s.quantity != null && s.quantity > 0);
        if (isDca) {
          // Cumulative qty from purchase snapshots (those with quantity)
          // Price from the snapshot at this month (purchase or backfilled price-only)
          const snapsUpToMonth = a.snapshots.filter(
            (s) => s.capturedAt.toISOString().slice(0, 7) <= month,
          );
          const totalQty = snapsUpToMonth.reduce((s, sn) => s + (sn.quantity ?? 0), 0);
          const latestPriceSnap = [...snapsUpToMonth].reverse().find((s) => s.price != null);
          const price = latestPriceSnap?.price ?? 0;
          const value = Math.round(totalQty * price * 100) / 100;

          if (totalQty > 0) {
            items.push({ name: a.name, type: a.type, value, isLiability: false });
            netWorthValue += value;
          }
        } else {
          // Manual asset: carry forward most recent snapshot value
          const snap = [...a.snapshots].reverse().find(
            (s) => s.capturedAt.toISOString().slice(0, 7) <= month,
          );
          if (snap) {
            items.push({ name: a.name, type: a.type, value: snap.value, isLiability: false });
            netWorthValue += snap.value;
          }
        }
      }

      // Liabilities: for non-amortized ones, carry forward too
      const liabEntries = liabByMonth.get(month);
      if (liabEntries) {
        for (const e of liabEntries) {
          items.push({ ...e, isLiability: true });
          netWorthValue -= e.value;
        }
      } else {
        // Carry forward last known liability value for non-amortized liabilities
        for (const l of liabilities) {
          const meta = l.metadata as unknown as MortgageMetadata | null;
          const hasAmortization = meta?.originalAmount && meta?.startDate && meta?.monthlyPayment && meta?.interestRate !== undefined;
          if (hasAmortization || !l.snapshots.length) continue;
          const snap = [...l.snapshots].reverse().find(
            (s) => s.capturedAt.toISOString().slice(0, 7) <= month,
          );
          if (snap) {
            items.push({ name: l.name, type: l.type, value: snap.value, isLiability: true });
            netWorthValue -= snap.value;
          }
        }
      }

      return {
        month,
        netWorth: netWorthValue,
        items,
      };
    });
  }

  async getProjection(householdId: string) {
    const [liabilities, assetAgg] = await Promise.all([
      this.prisma.liability.findMany({ where: { householdId } }),
      this.prisma.asset.aggregate({ where: { householdId }, _sum: { value: true } }),
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
        let balance: number;
        if (meta.originalAmount && meta.startDate) {
          const balanceMap = this.amortizeWithEvents(meta, nowMonthKey);
          balance = balanceMap.get(nowMonthKey) ?? l.value;
        } else {
          balance = l.value;
        }
        const { rate, payment } = this.getEffectiveTerms(meta, nowMonthKey);
        return { name: l.name, type: l.type, balance, monthlyRate: rate / 100 / 12, payment, residual: 0, endMonthKey: null as string | null };
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
