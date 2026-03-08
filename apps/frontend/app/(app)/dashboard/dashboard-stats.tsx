'use client';

import { useTranslation } from '@/i18n';
import { useNetWorth } from '@/hooks/use-assets';
import { useGoals } from '@/hooks/use-goals';
import { useMonthlySummary } from '@/hooks/use-expenses';
import { formatCurrency, getMonthStr } from '@/lib/utils';
import { TrendingUp, Target, Receipt, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  href: string;
  sub?: string;
  color: string;
}

function StatCard({ label, value, icon, href, sub, color }: StatCardProps) {
  return (
    <Link href={href} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <span className={`p-2 rounded-lg ${color}`}>{icon}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </Link>
  );
}

export function DashboardStats({ name }: { name: string }) {
  const { t } = useTranslation();
  const { data: netWorth } = useNetWorth();
  const { data: goals } = useGoals();
  const { data: summary } = useMonthlySummary(getMonthStr());

  const activeGoals = goals?.filter((g) => g.status === 'active' || g.status === 'at_risk') ?? [];
  const completedGoals = goals?.filter((g) => g.status === 'completed') ?? [];

  const avgProgress =
    activeGoals.length > 0
      ? activeGoals.reduce((s, g) => s + (g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0), 0) / activeGoals.length
      : 0;

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('dashboard.welcomeBack', { name })}
        </h1>
        <p className="text-gray-500 text-sm mt-1">{t('dashboard.overview')}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          label={t('dashboard.netWorth')}
          value={netWorth ? formatCurrency(netWorth.total) : '—'}
          icon={<TrendingUp size={18} className="text-brand" />}
          href="/assets"
          sub={t('dashboard.assetsCount', { count: netWorth?.assets?.length ?? 0 })}
          color="bg-brand/10"
        />
        <StatCard
          label={t('dashboard.activeGoals')}
          value={String(activeGoals.length)}
          icon={<Target size={18} className="text-blue-600" />}
          href="/goals"
          sub={t('dashboard.avgProgress', { percent: Math.round(avgProgress) })}
          color="bg-blue-50"
        />
        <StatCard
          label={t('dashboard.thisMonth')}
          value={formatCurrency(summary?.total ?? 0)}
          icon={<Receipt size={18} className="text-orange-600" />}
          href="/expenses"
          sub={t('dashboard.categories', { count: summary?.byCategory?.length ?? 0 })}
          color="bg-orange-50"
        />
        <StatCard
          label={t('dashboard.completedGoals')}
          value={String(completedGoals.length)}
          icon={<CheckCircle size={18} className="text-green-600" />}
          href="/goals"
          sub={t('dashboard.allTime')}
          color="bg-green-50"
        />
      </div>
    </>
  );
}
