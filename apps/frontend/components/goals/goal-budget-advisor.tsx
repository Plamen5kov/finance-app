'use client';

import { useState } from 'react';
import { GoalBudgetAdvice, BudgetSuggestion } from '@/hooks/use-goals';
import { formatCurrency } from '@/lib/utils';
import { useTranslation, TranslationKey } from '@/i18n';
import { Lightbulb, ChevronDown, ChevronUp, X } from 'lucide-react';

const TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  on_track: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
  ahead: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
  behind: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400' },
  overdue: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
  completed_soon: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' },
};

const TYPE_LABELS: Record<string, string> = {
  on_track: 'budgetAdvice.onTrack',
  ahead: 'budgetAdvice.ahead',
  behind: 'budgetAdvice.behind',
  overdue: 'budgetAdvice.overdue',
  completed_soon: 'budgetAdvice.completedSoon',
};

function StatusChip({ type }: { type: string }) {
  const { t } = useTranslation();
  const style = TYPE_STYLES[type] ?? TYPE_STYLES.on_track;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}>
      {t((TYPE_LABELS[type] ?? 'budgetAdvice.onTrack') as TranslationKey)}
    </span>
  );
}

function SuggestionRow({ suggestion }: { suggestion: BudgetSuggestion }) {
  const { t } = useTranslation();
  const PRIORITY_COLORS: Record<number, string> = {
    1: 'bg-red-500',
    2: 'bg-yellow-500',
    3: 'bg-green-500',
  };

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_COLORS[suggestion.priority] ?? 'bg-gray-400'}`} />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {suggestion.goalName}
          </span>
          <StatusChip type={suggestion.type} />
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400 dark:text-gray-500">
          <span>{t('budgetAdvice.idealMonthly', { amount: formatCurrency(suggestion.idealMonthly) })}</span>
          <span>
            {suggestion.monthsLeft !== null
              ? t('budgetAdvice.monthsLeft', { count: Math.max(suggestion.monthsLeft, 0) })
              : t('budgetAdvice.noDeadline')}
          </span>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {formatCurrency(suggestion.suggestedAmount)}
          <span className="text-xs font-normal text-gray-400 dark:text-gray-500">{t('budgetAdvice.perMonth')}</span>
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500">
          {formatCurrency(suggestion.remaining)} to go
        </div>
      </div>
    </div>
  );
}

interface GoalBudgetAdvisorProps {
  advice: GoalBudgetAdvice;
}

export function GoalBudgetAdvisor({ advice }: GoalBudgetAdvisorProps) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (dismissed || advice.suggestions.length === 0) return null;
  if (advice.snapshot.avgMonthlyIncome === 0) return null;

  const isNegative = advice.snapshot.freeMoney <= 0;

  return (
    <div className="mb-6 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <button
          onClick={!isNegative ? () => setExpanded(!expanded) : undefined}
          className={`flex items-start gap-3 flex-1 min-w-0 text-left ${!isNegative ? 'cursor-pointer' : ''}`}
        >
          <Lightbulb className="text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1 min-w-0">
            {isNegative ? (
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {t('budgetAdvice.negativeIncome')}
              </p>
            ) : (
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {t('budgetAdvice.summary', {
                  amount: formatCurrency(advice.snapshot.freeMoney),
                  count: advice.suggestions.length,
                })}
              </p>
            )}
            {!isNegative && (
              <span className="mt-1 text-xs text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                {expanded ? t('budgetAdvice.showLess') : t('budgetAdvice.showMore')}
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </span>
            )}
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

      {expanded && !isNegative && (
        <div className="mt-3 pt-1">
          {advice.suggestions.map((s) => (
            <SuggestionRow key={s.goalId} suggestion={s} />
          ))}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-indigo-200 dark:border-indigo-700 text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              {t('budgetAdvice.title')}
            </span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {formatCurrency(advice.suggestions.reduce((s, g) => s + g.suggestedAmount, 0))}{t('budgetAdvice.perMonth')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
