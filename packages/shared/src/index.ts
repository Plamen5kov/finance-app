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

export interface RateChange {
  date: string;   // ISO date string YYYY-MM-DD
  rate: number;   // annual rate as a percentage, e.g. 3.5
}

export interface MortgageMetadata {
  originalAmount: number;   // original loan amount
  interestRate: number;     // current annual rate %
  monthlyPayment: number;   // current monthly payment
  termMonths: number;       // total loan term in months
  startDate: string;        // ISO date YYYY-MM-DD
  rateHistory: RateChange[]; // chronological log of rate changes
}

export interface LoanMetadata {
  originalAmount?: number;
  interestRate?: number;
  monthlyPayment?: number;
  termMonths?: number;
  startDate?: string;
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
