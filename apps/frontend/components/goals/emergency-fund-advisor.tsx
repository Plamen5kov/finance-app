'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { EmergencyFundAdvice, useCreateGoal, useUpdateGoal } from '@/hooks/use-goals';
import { formatCurrency } from '@/lib/utils';
import { useTranslation } from '@/i18n';
import { ShieldCheck, ChevronDown, ChevronUp, X } from 'lucide-react';

interface EmergencyFundAdvisorProps {
  advice: EmergencyFundAdvice;
}

const MONTH_OPTIONS = [3, 6, 9, 12];

/** Shared controls for coverage months + category selection + action button */
export function EmergencyFundControls({
  advice,
  onDone,
}: {
  advice: EmergencyFundAdvice;
  onDone?: () => void;
}) {
  const { t } = useTranslation();
  const [coverageMonths, setCoverageMonths] = useState(() => {
    // Try to parse existing coverage months from description
    const desc = advice.existingGoal?.description ?? '';
    const match = desc.match(/^(\d+)\s/);
    return match ? Number(match[1]) : 6;
  });
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(() => {
    return new Set(
      advice.categories.filter((c) => c.type === 'required').map((c) => c.id),
    );
  });

  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal(advice.existingGoal?.id ?? '');

  const monthlyEssential = useMemo(
    () =>
      advice.categories
        .filter((c) => selectedCategoryIds.has(c.id))
        .reduce((sum, c) => sum + c.avgMonthly, 0),
    [advice.categories, selectedCategoryIds],
  );

  const recommendedAmount = Math.round(monthlyEssential * coverageMonths * 100) / 100;
  const isUpdate = !!advice.existingGoal;
  const isPending = createGoal.isPending || updateGoal.isPending;

  function toggleCategory(id: string) {
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAction() {
    const description = t('emergencyFund.goalDescription', { months: coverageMonths });
    if (isUpdate) {
      await updateGoal.mutateAsync({ targetAmount: recommendedAmount, description });
    } else {
      await createGoal.mutateAsync({
        name: t('emergencyFund.goalName'),
        targetAmount: recommendedAmount,
        category: 'emergency',
        priority: 1,
        description,
      });
    }
    onDone?.();
  }

  return (
    <div className="space-y-4">
      {/* Coverage months selector */}
      <div>
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
          {t('emergencyFund.coverageMonths')}
        </label>
        <div className="flex gap-2">
          {MONTH_OPTIONS.map((m) => (
            <button
              key={m}
              onClick={() => setCoverageMonths(m)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                coverageMonths === m
                  ? 'bg-amber-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-amber-300'
              }`}
            >
              {m} {t('emergencyFund.months')}
            </button>
          ))}
        </div>
      </div>

      {/* Category checkboxes */}
      <div>
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
          {t('emergencyFund.includeCategories')}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {advice.categories.map((cat) => (
            <label
              key={cat.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-amber-100/50 dark:hover:bg-amber-900/30 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedCategoryIds.has(cat.id)}
                onChange={() => toggleCategory(cat.id)}
                className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">
                {cat.name}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                {formatCurrency(cat.avgMonthly)}/{t('emergencyFund.mo')}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Summary + action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-gray-200 dark:border-gray-700 pt-3">
        <div className="text-sm">
          <span className="text-gray-500 dark:text-gray-400">{t('emergencyFund.recommended')}:</span>{' '}
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {formatCurrency(recommendedAmount)}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
            ({formatCurrency(monthlyEssential)}/{t('emergencyFund.mo')} x {coverageMonths})
          </span>
        </div>
        <button
          onClick={handleAction}
          disabled={isPending || recommendedAmount === 0}
          className="px-4 py-1.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {isPending
            ? t('common.saving')
            : isUpdate
              ? t('emergencyFund.updateTarget')
              : t('emergencyFund.createGoal')}
        </button>
      </div>
    </div>
  );
}

/** Banner shown only when no emergency fund goal exists */
export function EmergencyFundAdvisor({ advice }: EmergencyFundAdvisorProps) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Reset dismissed when emergency goal is deleted (existingGoal goes from non-null to null)
  const prevGoalId = useRef(advice.existingGoal?.id);
  useEffect(() => {
    if (prevGoalId.current && !advice.existingGoal) {
      setDismissed(false);
    }
    prevGoalId.current = advice.existingGoal?.id;
  }, [advice.existingGoal]);

  // Hide banner if: dismissed, no expense data, or goal already exists
  if (dismissed || advice.categories.length === 0 || advice.existingGoal) return null;

  const requiredMonthly = advice.categories
    .filter((c) => c.type === 'required')
    .reduce((sum, c) => sum + c.avgMonthly, 0);
  const defaultRecommended = Math.round(requiredMonthly * 6 * 100) / 100;

  return (
    <div className="mb-6 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-start gap-3 flex-1 min-w-0 text-left cursor-pointer"
        >
          <ShieldCheck className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {t('emergencyFund.bannerCreate', {
                amount: formatCurrency(defaultRecommended),
                months: 6,
              })}
            </p>
            <span className="mt-1 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1">
              {expanded ? t('emergencyFund.showLess') : t('emergencyFund.showMore')}
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </span>
          </div>
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>

      {expanded && (
        <div className="mt-4">
          <EmergencyFundControls advice={advice} onDone={() => setDismissed(true)} />
        </div>
      )}
    </div>
  );
}
