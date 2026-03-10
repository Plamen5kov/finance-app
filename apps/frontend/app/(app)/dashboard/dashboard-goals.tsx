'use client';

import { useTranslation } from '@/i18n';
import { useGoals, useGoalBudgetAdvice } from '@/hooks/use-goals';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { ArrowRight, Lightbulb } from 'lucide-react';

export function DashboardGoals() {
  const { t } = useTranslation();
  const { data: goals } = useGoals();
  const { data: budgetAdvice } = useGoalBudgetAdvice();
  const active = (goals ?? []).filter((g) => g.status === 'active' || g.status === 'at_risk').slice(0, 4);
  // Pick most urgent suggestion (behind/overdue first, then highest priority)
  const topSuggestion = budgetAdvice?.suggestions.find((s) => s.type === 'behind' || s.type === 'overdue')
    ?? budgetAdvice?.suggestions[0];

  if (active.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.activeGoals')}</h2>
        <Link href="/goals" className="text-sm text-brand hover:underline flex items-center gap-1">
          {t('dashboard.viewAll')} <ArrowRight size={14} />
        </Link>
      </div>
      <div className="space-y-4">
        {active.map((goal) => {
          const pct = goal.targetAmount > 0 ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0;
          return (
            <div key={goal.id}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-800 dark:text-gray-200 truncate">{goal.name}</span>
                <span className="text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                  {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      {topSuggestion && topSuggestion.suggestedAmount > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Lightbulb size={13} className="text-indigo-500 flex-shrink-0" />
          <span>{t('budgetAdvice.dashboardTip', { amount: formatCurrency(topSuggestion.suggestedAmount), goalName: topSuggestion.goalName })}</span>
        </div>
      )}
    </div>
  );
}
