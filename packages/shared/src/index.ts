export const ASSET_TYPES = ['etf', 'crypto', 'gold', 'apartment'] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const LIABILITY_TYPES = ['mortgage', 'loan', 'leasing'] as const;
export type LiabilityType = (typeof LIABILITY_TYPES)[number];

export const ALL_FINANCIAL_TYPES = [...ASSET_TYPES, ...LIABILITY_TYPES] as const;
export type FinancialType = (typeof ALL_FINANCIAL_TYPES)[number];

export function isLiability(type: string): boolean {
  return (LIABILITY_TYPES as readonly string[]).includes(type);
}

export const CURRENCIES = ['EUR', 'USD', 'GBP'] as const;
export type Currency = (typeof CURRENCIES)[number];

export const MORTGAGE_EVENT_TYPES = ['rate_change', 'payment_change', 'extra_payment', 'refinance'] as const;
export type MortgageEventType = (typeof MORTGAGE_EVENT_TYPES)[number];

export interface MortgageEvent {
  id: string;
  type: MortgageEventType;
  date: string;                  // YYYY-MM-DD
  newRate?: number;              // rate_change, refinance
  newMonthlyPayment?: number;    // payment_change, refinance
  amount?: number;               // extra_payment
  newBalance?: number;           // refinance (sets balance directly)
  notes?: string;
}

export interface MortgageMetadata {
  originalAmount: number;   // original loan amount
  interestRate: number;     // initial annual rate % at startDate
  monthlyPayment: number;   // initial monthly payment
  termMonths: number;       // total loan term in months
  startDate: string;        // ISO date YYYY-MM-DD
  events: MortgageEvent[];  // lifecycle events (rate changes, refinances, extra payments)
}

export interface LoanMetadata {
  originalAmount?: number;
  interestRate?: number;
  monthlyPayment?: number;
  termMonths?: number;
  startDate?: string;
  events?: MortgageEvent[];
}

export interface LeasingMetadata {
  originalValue: number;    // Total asset price (e.g. car value)
  downPayment: number;      // Initial down payment
  residualValue: number;    // Balloon payment due at end of lease
  interestRate: number;     // Annual rate %
  monthlyPayment: number;   // Fixed monthly payment
  termMonths: number;       // Total lease duration in months
  startDate: string;        // ISO date YYYY-MM-DD
}
