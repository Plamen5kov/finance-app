import { MortgageMetadata, LeasingMetadata } from '@finances/shared';
import { round2 } from './money';

/** Helper to get current month key in YYYY-MM format. */
export function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Calculate current outstanding balance for a mortgage/loan by amortizing
 * month-by-month with lifecycle events.
 */
export function calculateMortgageBalance(meta: MortgageMetadata, untilMonthKey: string): number {
  if (!meta.originalAmount || !meta.startDate) return 0;

  const events = (meta.events ?? []).slice().sort((a, b) => a.date.localeCompare(b.date));
  let balance = meta.originalAmount;
  let rate = meta.interestRate;
  let payment = meta.monthlyPayment;
  let [year, month] = meta.startDate.slice(0, 7).split('-').map(Number);

  while (balance > 0.01) {
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    if (monthKey > untilMonthKey) break;

    for (const evt of events) {
      const evtMonth = evt.date.slice(0, 7);
      if (evtMonth !== monthKey) continue;
      if (evt.type === 'rate_change' && evt.newRate != null) rate = evt.newRate;
      if (evt.type === 'payment_change' && evt.newMonthlyPayment != null)
        payment = evt.newMonthlyPayment;
      if (evt.type === 'extra_payment' && evt.amount != null)
        balance = Math.max(0, balance - evt.amount);
      if (evt.type === 'refinance') {
        if (evt.newBalance != null) balance = evt.newBalance;
        if (evt.newRate != null) rate = evt.newRate;
        if (evt.newMonthlyPayment != null) payment = evt.newMonthlyPayment;
      }
    }

    if (monthKey === untilMonthKey) break;

    const monthlyRate = rate / 100 / 12;
    const interest = balance * monthlyRate;
    const principal = payment - interest;
    if (principal > 0) balance = Math.max(0, balance - principal);

    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }
  return round2(balance);
}

/**
 * Calculate current outstanding balance for a leasing by amortizing
 * from start to the given month.
 */
export function calculateLeasingBalance(meta: LeasingMetadata, untilMonthKey: string): number {
  if (!meta.originalValue || !meta.startDate) return 0;

  const financed = meta.originalValue - (meta.downPayment ?? 0);
  let balance = financed;
  let [year, month] = meta.startDate.slice(0, 7).split('-').map(Number);
  const residual = meta.residualValue ?? 0;

  while (balance > residual + 0.01) {
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    if (monthKey > untilMonthKey) break;
    if (monthKey === untilMonthKey) break;

    const monthlyRate = meta.interestRate / 100 / 12;
    const interest = balance * monthlyRate;
    const principal = meta.monthlyPayment - interest;
    if (principal > 0) balance = Math.max(residual, balance - principal);

    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }
  return round2(balance);
}

/**
 * Run full amortization returning balance at each month (for charting).
 */
export function amortizeWithEvents(
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

    const monthlyRate = rate / 100 / 12;
    const interest = balance * monthlyRate;
    const principal = payment - interest;
    if (principal > 0) balance = Math.max(0, balance - principal);

    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }

  return balances;
}

/**
 * Get the effective rate and payment at a given month after applying all
 * lifecycle events up to that point.
 */
export function getEffectiveTerms(
  meta: MortgageMetadata,
  atMonthKey: string,
): { rate: number; payment: number } {
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

/**
 * Get the current monthly payment after lifecycle events.
 * Works for mortgage/loan and leasing.
 */
export function getCurrentMonthlyPayment(
  type: string,
  metadata?: MortgageMetadata | LeasingMetadata,
): number {
  if (!metadata) return 0;

  if (type === 'mortgage' || type === 'loan') {
    const meta = metadata as MortgageMetadata;
    if (!meta.monthlyPayment) return 0;
    let payment = meta.monthlyPayment;
    const now = currentMonthKey();

    for (const evt of (meta.events ?? []).slice().sort((a, b) => a.date.localeCompare(b.date))) {
      if (evt.date.slice(0, 7) > now) break;
      if (evt.type === 'payment_change' && evt.newMonthlyPayment != null)
        payment = evt.newMonthlyPayment;
      if (evt.type === 'refinance' && evt.newMonthlyPayment != null)
        payment = evt.newMonthlyPayment;
    }
    return payment;
  }

  if (type === 'leasing') {
    return (metadata as LeasingMetadata).monthlyPayment ?? 0;
  }

  return 0;
}
