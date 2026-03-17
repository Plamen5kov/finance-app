import {
  calculateMortgageBalance,
  calculateLeasingBalance,
  amortizeWithEvents,
  getEffectiveTerms,
  getCurrentMonthlyPayment,
} from './amortization';
import { MortgageMetadata, LeasingMetadata } from '@finances/shared';

const baseMortgage: MortgageMetadata = {
  originalAmount: 100000,
  interestRate: 3,
  monthlyPayment: 500,
  termMonths: 360,
  startDate: '2024-01-01',
  events: [],
};

describe('calculateMortgageBalance', () => {
  it('computes balance after 12 months of a simple mortgage', () => {
    const balance = calculateMortgageBalance(baseMortgage, '2025-01-01');
    // After 12 months: each month pays ~250 interest + ~250 principal
    expect(balance).toBeGreaterThan(96000);
    expect(balance).toBeLessThan(98000);
  });

  it('returns 0 when missing originalAmount', () => {
    expect(calculateMortgageBalance({ ...baseMortgage, originalAmount: 0 }, '2025-01-01')).toBe(0);
  });

  it('returns 0 when missing startDate', () => {
    expect(calculateMortgageBalance({ ...baseMortgage, startDate: '' }, '2025-01-01')).toBe(0);
  });

  it('applies rate_change event', () => {
    const meta: MortgageMetadata = {
      ...baseMortgage,
      events: [{ id: '1', type: 'rate_change', date: '2024-06-01', newRate: 5 }],
    };
    const withEvent = calculateMortgageBalance(meta, '2025-01-01');
    const withoutEvent = calculateMortgageBalance(baseMortgage, '2025-01-01');
    // Higher rate means more goes to interest, less to principal, so higher balance
    expect(withEvent).toBeGreaterThan(withoutEvent);
  });

  it('applies payment_change event', () => {
    const meta: MortgageMetadata = {
      ...baseMortgage,
      events: [{ id: '1', type: 'payment_change', date: '2024-06-01', newMonthlyPayment: 800 }],
    };
    const withEvent = calculateMortgageBalance(meta, '2025-01-01');
    const withoutEvent = calculateMortgageBalance(baseMortgage, '2025-01-01');
    // Higher payment means faster payoff, lower balance
    expect(withEvent).toBeLessThan(withoutEvent);
  });

  it('applies extra_payment event', () => {
    const meta: MortgageMetadata = {
      ...baseMortgage,
      events: [{ id: '1', type: 'extra_payment', date: '2024-06-01', amount: 10000 }],
    };
    const withEvent = calculateMortgageBalance(meta, '2025-01-01');
    const withoutEvent = calculateMortgageBalance(baseMortgage, '2025-01-01');
    expect(withEvent).toBeLessThan(withoutEvent - 9000); // At least 9k less due to extra payment
  });

  it('applies refinance event', () => {
    const meta: MortgageMetadata = {
      ...baseMortgage,
      events: [
        {
          id: '1',
          type: 'refinance',
          date: '2024-06-01',
          newBalance: 80000,
          newRate: 2,
          newMonthlyPayment: 600,
        },
      ],
    };
    const balance = calculateMortgageBalance(meta, '2024-07-01');
    // Balance was set to 80000, then one month of amortization at 2% with 600 payment
    expect(balance).toBeLessThan(80000);
    expect(balance).toBeGreaterThan(79000);
  });

  it('handles zero interest rate', () => {
    const meta: MortgageMetadata = { ...baseMortgage, interestRate: 0 };
    const balance = calculateMortgageBalance(meta, '2025-01-01');
    // With 0% interest, all payment goes to principal.
    // The start month events are applied but amortization happens before incrementing,
    // so 13 months of amortization occur (Jan 2024 through Jan 2025 inclusive of boundary)
    expect(balance).toBeLessThan(94500);
    expect(balance).toBeGreaterThan(93000);
  });

  it('returns balance at start month with one month of amortization applied', () => {
    const balance = calculateMortgageBalance(baseMortgage, '2024-01-01');
    // At start month: events applied, then loop breaks before amortization step
    // But the month before start isn't iterated, so we get post-event pre-amortization balance
    expect(balance).toBeLessThanOrEqual(100000);
    expect(balance).toBeGreaterThan(99000);
  });
});

describe('calculateLeasingBalance', () => {
  const baseLease: LeasingMetadata = {
    originalValue: 35000,
    downPayment: 7000,
    residualValue: 8750,
    interestRate: 3.9,
    monthlyPayment: 450,
    termMonths: 48,
    startDate: '2024-01-01',
  };

  it('computes balance for standard leasing', () => {
    const balance = calculateLeasingBalance(baseLease, '2025-01-01');
    // Financed: 28000, after 12 months of payment
    expect(balance).toBeLessThan(28000);
    expect(balance).toBeGreaterThan(20000);
  });

  it('balance never drops below residual', () => {
    // Run to far future
    const balance = calculateLeasingBalance(baseLease, '2030-01-01');
    expect(balance).toBeGreaterThanOrEqual(8750);
  });

  it('returns 0 when missing originalValue', () => {
    expect(calculateLeasingBalance({ ...baseLease, originalValue: 0 }, '2025-01-01')).toBe(0);
  });

  it('returns balance at start month', () => {
    const balance = calculateLeasingBalance(baseLease, '2024-01-01');
    // Start month: loop breaks on monthKey === untilMonthKey before amortization
    // But months before start are iterated, so one month of amort has been applied
    expect(balance).toBeLessThanOrEqual(28000);
    expect(balance).toBeGreaterThan(27000);
  });
});

describe('amortizeWithEvents', () => {
  it('returns a Map with entries for each month', () => {
    const map = amortizeWithEvents(baseMortgage, '2024-06-01');
    expect(map.size).toBe(6); // Jan through Jun
    expect(map.has('2024-01-01')).toBeFalsy(); // key format is YYYY-MM
    expect(map.has('2024-01')).toBeTruthy();
  });

  it('balance decreases monotonically', () => {
    const map = amortizeWithEvents(baseMortgage, '2025-01-01');
    const values = Array.from(map.values());
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeLessThanOrEqual(values[i - 1]);
    }
  });

  it('applies events at correct months', () => {
    const meta: MortgageMetadata = {
      ...baseMortgage,
      events: [{ id: '1', type: 'extra_payment', date: '2024-03-15', amount: 5000 }],
    };
    const map = amortizeWithEvents(meta, '2024-06-01');
    const balanceMar = map.get('2024-03')!;
    const balanceFeb = map.get('2024-02')!;
    // March balance should be notably lower than Feb due to extra payment
    expect(balanceFeb - balanceMar).toBeGreaterThan(4500);
  });
});

describe('getEffectiveTerms', () => {
  it('returns initial values when no events', () => {
    const { rate, payment } = getEffectiveTerms(baseMortgage, '2025-01-01');
    expect(rate).toBe(3);
    expect(payment).toBe(500);
  });

  it('returns updated rate after rate_change', () => {
    const meta: MortgageMetadata = {
      ...baseMortgage,
      events: [{ id: '1', type: 'rate_change', date: '2024-06-01', newRate: 4.5 }],
    };
    const { rate, payment } = getEffectiveTerms(meta, '2025-01-01');
    expect(rate).toBe(4.5);
    expect(payment).toBe(500); // payment unchanged
  });

  it('returns updated payment after payment_change', () => {
    const meta: MortgageMetadata = {
      ...baseMortgage,
      events: [{ id: '1', type: 'payment_change', date: '2024-06-01', newMonthlyPayment: 700 }],
    };
    const { rate, payment } = getEffectiveTerms(meta, '2025-01-01');
    expect(rate).toBe(3); // rate unchanged
    expect(payment).toBe(700);
  });

  it('refinance updates both rate and payment', () => {
    const meta: MortgageMetadata = {
      ...baseMortgage,
      events: [
        {
          id: '1',
          type: 'refinance',
          date: '2024-06-01',
          newRate: 2.5,
          newMonthlyPayment: 600,
          newBalance: 90000,
        },
      ],
    };
    const { rate, payment } = getEffectiveTerms(meta, '2025-01-01');
    expect(rate).toBe(2.5);
    expect(payment).toBe(600);
  });

  it('ignores events after atMonthKey', () => {
    const meta: MortgageMetadata = {
      ...baseMortgage,
      events: [{ id: '1', type: 'rate_change', date: '2025-06-01', newRate: 5 }],
    };
    const { rate } = getEffectiveTerms(meta, '2025-01-01');
    expect(rate).toBe(3); // event is after query month
  });
});

describe('getCurrentMonthlyPayment', () => {
  it('returns initial payment when no events', () => {
    expect(getCurrentMonthlyPayment('mortgage', baseMortgage)).toBe(500);
  });

  it('returns leasing payment directly', () => {
    const lease: LeasingMetadata = {
      originalValue: 35000,
      downPayment: 7000,
      residualValue: 8750,
      interestRate: 3.9,
      monthlyPayment: 450,
      termMonths: 48,
      startDate: '2024-01-01',
    };
    expect(getCurrentMonthlyPayment('leasing', lease)).toBe(450);
  });

  it('returns 0 for unknown type', () => {
    expect(getCurrentMonthlyPayment('unknown', baseMortgage)).toBe(0);
  });

  it('returns 0 for undefined metadata', () => {
    expect(getCurrentMonthlyPayment('mortgage')).toBe(0);
  });
});
