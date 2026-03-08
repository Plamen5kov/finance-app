'use client';

import { useTranslation } from '@/i18n';
import { useGoals } from '@/hooks/use-goals';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function DashboardGoals() {
  const { t } = useTranslation();
  const { data: goals } = useGoals();
  const active = (goals ?? []).filter((g) => g.status === 'active' || g.status === 'at_risk').slice(0, 4);

  if (active.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">{t('dashboard.activeGoals')}</h2>
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
                <span className="font-medium text-gray-800 truncate">{goal.name}</span>
                <span className="text-gray-500 ml-2 flex-shrink-0">
                  {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
