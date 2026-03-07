'use client';

import { useNetWorth } from '@/hooks/use-assets';
import { useGoals } from '@/hooks/use-goals';
import { useMonthlySummary } from '@/hooks/use-expenses';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, Target, Receipt, CheckCircle } from 'lucide-react';
import Link from 'next/link';

function getMonthStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

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

export function DashboardStats() {
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
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
      <StatCard
        label="Net Worth"
        value={netWorth ? formatCurrency(netWorth.total) : '—'}
        icon={<TrendingUp size={18} className="text-brand" />}
        href="/assets"
        sub={`${netWorth?.assets?.length ?? 0} assets`}
        color="bg-brand/10"
      />
      <StatCard
        label="Active Goals"
        value={String(activeGoals.length)}
        icon={<Target size={18} className="text-blue-600" />}
        href="/goals"
        sub={`${Math.round(avgProgress)}% avg progress`}
        color="bg-blue-50"
      />
      <StatCard
        label="This Month"
        value={formatCurrency(summary?.total ?? 0)}
        icon={<Receipt size={18} className="text-orange-600" />}
        href="/expenses"
        sub={`${summary?.byCategory?.length ?? 0} categories`}
        color="bg-orange-50"
      />
      <StatCard
        label="Completed Goals"
        value={String(completedGoals.length)}
        icon={<CheckCircle size={18} className="text-green-600" />}
        href="/goals"
        sub="all time"
        color="bg-green-50"
      />
    </div>
  );
}
