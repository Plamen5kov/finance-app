'use client';

import { formatCurrency } from '@/lib/utils';
import { Trash2, Pencil } from 'lucide-react';
import { Liability, MortgageMetadata, LeasingMetadata } from '@/hooks/use-liabilities';
import { useTranslation } from '@/i18n';

const TYPE_COLORS: Record<string, string> = {
  mortgage: 'bg-red-100 text-red-700',
  loan: 'bg-orange-100 text-orange-700',
  leasing: 'bg-purple-100 text-purple-700',
};

const TYPE_ICONS: Record<string, string> = {
  mortgage: '🏦',
  loan: '💳',
  leasing: '🚗',
};

/** Returns estimated months remaining given current balance, annual rate %, and monthly payment. */
function calcMonthsRemaining(
  balance: number,
  annualRate: number,
  monthlyPayment: number,
): number | null {
  if (balance <= 0 || monthlyPayment <= 0) return null;
  const r = annualRate / 100 / 12;
  if (r === 0) return Math.ceil(balance / monthlyPayment);
  const interestThisMonth = balance * r;
  if (monthlyPayment <= interestThisMonth) return null; // payment doesn't cover interest
  return Math.ceil(
    Math.log(monthlyPayment / (monthlyPayment - interestThisMonth)) / Math.log(1 + r),
  );
}

interface LiabilityCardProps {
  liability: Liability;
  onDelete: (id: string) => void;
  onEdit: (liability: Liability) => void;
}

export function LiabilityCard({ liability, onDelete, onEdit }: LiabilityCardProps) {
  const { t } = useTranslation();
  const isLeasing = liability.type === 'leasing';
  const leasingMeta = isLeasing ? (liability.metadata as LeasingMetadata | null) : null;
  const mortgageMeta =
    !isLeasing && (liability.type === 'mortgage' || liability.type === 'loan')
      ? (liability.metadata as MortgageMetadata | null)
      : null;

  const { latestRate, latestPayment } = (() => {
    if (!mortgageMeta) return { latestRate: undefined, latestPayment: undefined };
    let rate = mortgageMeta.interestRate;
    let payment = mortgageMeta.monthlyPayment;
    for (const evt of (mortgageMeta.events ?? [])
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))) {
      if ((evt.type === 'rate_change' || evt.type === 'refinance') && evt.newRate != null)
        rate = evt.newRate;
      if (
        (evt.type === 'payment_change' || evt.type === 'refinance') &&
        evt.newMonthlyPayment != null
      )
        payment = evt.newMonthlyPayment;
    }
    return { latestRate: rate, latestPayment: payment };
  })();

  const mortgageMonthsRemaining = (() => {
    if (!mortgageMeta) return null;
    if (mortgageMeta.termMonths && mortgageMeta.startDate) {
      const start = new Date(mortgageMeta.startDate + 'T00:00:00Z');
      const elapsed = Math.max(
        0,
        Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.4375)),
      );
      return Math.max(0, mortgageMeta.termMonths - elapsed);
    }
    if (latestRate != null && latestPayment) {
      return calcMonthsRemaining(liability.value, latestRate, latestPayment);
    }
    return null;
  })();

  const totalInterestRemaining =
    mortgageMonthsRemaining != null && latestPayment
      ? latestPayment * mortgageMonthsRemaining - liability.value
      : null;

  // Leasing derived values
  const leasingMonthsRemaining = (() => {
    if (!leasingMeta?.startDate || !leasingMeta.termMonths) return null;
    const start = new Date(leasingMeta.startDate + 'T00:00:00Z');
    const elapsed = Math.max(
      0,
      Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.4375)),
    );
    return Math.max(0, leasingMeta.termMonths - elapsed);
  })();

  const leasingEndDate = (() => {
    if (!leasingMeta?.startDate || !leasingMeta.termMonths) return null;
    const d = new Date(leasingMeta.startDate + 'T00:00:00Z');
    d.setUTCMonth(d.getUTCMonth() + leasingMeta.termMonths);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  })();

  const totalLeasingCost = leasingMeta
    ? leasingMeta.monthlyPayment * leasingMeta.termMonths + leasingMeta.residualValue
    : null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{TYPE_ICONS[liability.type] ?? '💼'}</span>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
              {liability.name}
            </h3>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[liability.type] ?? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
            >
              {t(`liabilityType.${liability.type}` as any)}
            </span>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(liability)}
            className="p-2 text-gray-300 dark:text-gray-600 hover:text-brand active:text-brand transition-colors"
            aria-label="Edit liability"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => onDelete(liability.id)}
            className="p-2 text-gray-300 dark:text-gray-600 hover:text-red-500 active:text-red-500 transition-colors"
            aria-label="Delete liability"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Balance */}
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        {formatCurrency(liability.value)}
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
        {t('liabilities.outstandingBalance')}
      </p>

      {/* Leasing details */}
      {leasingMeta && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          {leasingMeta.monthlyPayment > 0 && (
            <>
              <span className="text-gray-500 dark:text-gray-400">
                {t('liabilityCard.monthlyPayment')}
              </span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {formatCurrency(leasingMeta.monthlyPayment)}
              </span>
            </>
          )}
          {leasingMeta.residualValue > 0 && (
            <>
              <span className="text-gray-500 dark:text-gray-400">
                {t('liabilityCard.balloonPayment')}
              </span>
              <span className="font-medium text-orange-600">
                {formatCurrency(leasingMeta.residualValue)}
              </span>
            </>
          )}
          {leasingMeta.interestRate > 0 && (
            <>
              <span className="text-gray-500 dark:text-gray-400">
                {t('liabilityCard.interestRate')}
              </span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {leasingMeta.interestRate.toFixed(2)}%
              </span>
            </>
          )}
          {leasingMonthsRemaining != null && (
            <>
              <span className="text-gray-500 dark:text-gray-400">
                {t('liabilityCard.monthsRemaining')}
              </span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {leasingMonthsRemaining}
              </span>
            </>
          )}
          {leasingEndDate && (
            <>
              <span className="text-gray-500 dark:text-gray-400">
                {t('liabilityCard.leaseEnds')}
              </span>
              <span className="font-medium text-gray-800 dark:text-gray-200">{leasingEndDate}</span>
            </>
          )}
          {leasingMeta.originalValue > 0 && (
            <>
              <span className="text-gray-500 dark:text-gray-400">
                {t('liabilityCard.assetValue')}
              </span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {formatCurrency(leasingMeta.originalValue)}
              </span>
            </>
          )}
          {leasingMeta.downPayment > 0 && (
            <>
              <span className="text-gray-500 dark:text-gray-400">
                {t('liabilityCard.downPayment')}
              </span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {formatCurrency(leasingMeta.downPayment)}
              </span>
            </>
          )}
          {totalLeasingCost != null && (
            <>
              <span className="text-gray-500 dark:text-gray-400">
                {t('liabilityCard.totalCost')}
              </span>
              <span className="font-medium text-red-600">{formatCurrency(totalLeasingCost)}</span>
            </>
          )}
        </div>
      )}

      {/* Mortgage / Loan details */}
      {mortgageMeta && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          {latestRate != null && (
            <>
              <span className="text-gray-500 dark:text-gray-400">
                {t('liabilityCard.interestRate')}
              </span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {latestRate.toFixed(2)}%
              </span>
            </>
          )}
          {latestPayment != null && latestPayment > 0 && (
            <>
              <span className="text-gray-500 dark:text-gray-400">
                {t('liabilityCard.monthlyPayment')}
              </span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {formatCurrency(latestPayment)}
              </span>
            </>
          )}
          {mortgageMonthsRemaining != null && (
            <>
              <span className="text-gray-500 dark:text-gray-400">
                {t('liabilityCard.estMonthsLeft')}
              </span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {mortgageMonthsRemaining}
              </span>
            </>
          )}
          {totalInterestRemaining != null && totalInterestRemaining > 0 && (
            <>
              <span className="text-gray-500 dark:text-gray-400">
                {t('liabilityCard.interestRemaining')}
              </span>
              <span className="font-medium text-red-600">
                {formatCurrency(totalInterestRemaining)}
              </span>
            </>
          )}
          {mortgageMeta.originalAmount > 0 && (
            <>
              <span className="text-gray-500 dark:text-gray-400">
                {t('liabilityCard.originalAmount')}
              </span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {formatCurrency(mortgageMeta.originalAmount)}
              </span>
            </>
          )}
          {(mortgageMeta.events?.length ?? 0) > 0 && (
            <>
              <span className="text-gray-500 dark:text-gray-400">{t('liabilityCard.events')}</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {mortgageMeta.events!.length}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
