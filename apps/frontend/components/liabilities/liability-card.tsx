'use client';

import { formatCurrency } from '@/lib/utils';
import { Trash2, Pencil } from 'lucide-react';
import { Liability, MortgageMetadata } from '@/hooks/use-liabilities';

const TYPE_COLORS: Record<string, string> = {
  mortgage: 'bg-red-100 text-red-700',
  loan: 'bg-orange-100 text-orange-700',
};

const TYPE_ICONS: Record<string, string> = {
  mortgage: '🏦',
  loan: '💳',
};

/** Returns estimated months remaining given current balance, annual rate %, and monthly payment. */
function calcMonthsRemaining(balance: number, annualRate: number, monthlyPayment: number): number | null {
  if (balance <= 0 || monthlyPayment <= 0) return null;
  const r = annualRate / 100 / 12;
  if (r === 0) return Math.ceil(balance / monthlyPayment);
  const interestThisMonth = balance * r;
  if (monthlyPayment <= interestThisMonth) return null; // payment doesn't cover interest
  return Math.ceil(Math.log(monthlyPayment / (monthlyPayment - interestThisMonth)) / Math.log(1 + r));
}

interface LiabilityCardProps {
  liability: Liability;
  onDelete: (id: string) => void;
  onEdit: (liability: Liability) => void;
}

export function LiabilityCard({ liability, onDelete, onEdit }: LiabilityCardProps) {
  const meta = liability.type === 'mortgage' || liability.type === 'loan'
    ? (liability.metadata as MortgageMetadata | null)
    : null;

  const latestRate = meta?.rateHistory?.length
    ? [...meta.rateHistory].sort((a, b) => b.date.localeCompare(a.date))[0].rate
    : meta?.interestRate;

  const monthsRemaining = (() => {
    if (!meta) return null;
    // Prefer termMonths − elapsed when the user has configured both
    if (meta.termMonths && meta.startDate) {
      const start = new Date(meta.startDate + 'T00:00:00Z');
      const elapsed = Math.max(0, Math.floor(
        (Date.now() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.4375)
      ));
      return Math.max(0, meta.termMonths - elapsed);
    }
    // Fall back to amortization formula
    if (latestRate != null && meta.monthlyPayment) {
      return calcMonthsRemaining(liability.value, latestRate, meta.monthlyPayment);
    }
    return null;
  })();

  const totalInterestRemaining =
    monthsRemaining != null && meta?.monthlyPayment
      ? meta.monthlyPayment * monthsRemaining - liability.value
      : null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{TYPE_ICONS[liability.type] ?? '💼'}</span>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">{liability.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[liability.type] ?? 'bg-gray-100 text-gray-600'}`}>
              {liability.type}
            </span>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(liability)}
            className="p-1.5 text-gray-300 hover:text-brand transition-colors"
            aria-label="Edit liability"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(liability.id)}
            className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
            aria-label="Delete liability"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Balance */}
      <p className="text-2xl font-bold text-gray-900">{formatCurrency(liability.value)}</p>
      <p className="text-xs text-gray-400 mt-0.5">Outstanding balance</p>

      {/* Mortgage / Loan details */}
      {meta && (
        <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          {latestRate != null && (
            <>
              <span className="text-gray-500">Interest rate</span>
              <span className="font-medium text-gray-800">{latestRate.toFixed(2)}%</span>
            </>
          )}
          {meta.monthlyPayment > 0 && (
            <>
              <span className="text-gray-500">Monthly payment</span>
              <span className="font-medium text-gray-800">{formatCurrency(meta.monthlyPayment)}</span>
            </>
          )}
          {monthsRemaining != null && (
            <>
              <span className="text-gray-500">Est. months left</span>
              <span className="font-medium text-gray-800">{monthsRemaining} mo</span>
            </>
          )}
          {totalInterestRemaining != null && totalInterestRemaining > 0 && (
            <>
              <span className="text-gray-500">Interest remaining</span>
              <span className="font-medium text-red-600">{formatCurrency(totalInterestRemaining)}</span>
            </>
          )}
          {meta.originalAmount > 0 && (
            <>
              <span className="text-gray-500">Original amount</span>
              <span className="font-medium text-gray-800">{formatCurrency(meta.originalAmount)}</span>
            </>
          )}
          {meta.rateHistory?.length > 1 && (
            <>
              <span className="text-gray-500">Rate changes</span>
              <span className="font-medium text-gray-800">{meta.rateHistory.length}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
