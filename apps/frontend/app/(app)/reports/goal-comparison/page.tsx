'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { formatCurrency, monthsUntil } from '@/lib/utils';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from '@/i18n';

interface GoalSnapshot { month: string; balanceAsOf: number; targetAmount: number; }
interface Goal {
  id: string; name: string; targetAmount: number; currentAmount: number;
  targetDate: string | null; status: string; snapshots: GoalSnapshot[];
}

const GOAL_COLORS = ['#2D6A4F', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444', '#10B981'];

const RANGES = [
  { label: '1Y', months: 12 },
  { label: '2Y', months: 24 },
  { label: 'All', months: 0 },
];

function useGoalsHistory() {
  return useQuery({
    queryKey: ['goals', 'history'],
    queryFn: async () => {
      const { data } = await apiClient.get<Goal[]>('/goals/history');
      return data;
    },
  });
}

export default function GoalComparisonPage() {
  const { t } = useTranslation();
  const { data: goals, isLoading } = useGoalsHistory();
  const [range, setRange] = useState(0);

  const activeGoals = (goals ?? []).filter((g) => g.status === 'active' || g.status === 'at_risk');

  const chartData = (() => {
    if (!activeGoals.length) return [];
    const cutoff = range > 0
      ? new Date(Date.now() - range * 30 * 24 * 60 * 60 * 1000)
      : null;

    const dateMap: Record<string, Record<string, number>> = {};
    for (const goal of activeGoals) {
      for (const snap of goal.snapshots ?? []) {
        if (cutoff && new Date(snap.month) < cutoff) continue;
        const month = snap.month.slice(0, 7);
        if (!dateMap[month]) dateMap[month] = {};
        dateMap[month][goal.name] = snap.balanceAsOf;
      }
    }
    return Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, values]) => ({ month, ...values }));
  })();

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/reports" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t('goalTracking.title')}</h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {activeGoals.slice(0, 4).map((g) => {
          const pct = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0;
          return (
            <div key={g.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-500 mb-1 truncate">{g.name}</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(g.currentAmount)}</p>
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{pct}%</span>
                  <span>{formatCurrency(g.targetAmount)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Historical line chart */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">{t('goalTracking.savingsProgress')}</h2>
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <button
                key={r.label}
                onClick={() => setRange(r.months)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                  range === r.months
                    ? 'bg-brand text-white'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        {isLoading ? (
          <div className="h-72 bg-gray-100 rounded animate-pulse" />
        ) : chartData.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-12">{t('goalTracking.noHistory')}</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10 }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip formatter={(v: number, name) => [formatCurrency(v), name]} />
              <Legend />
              {activeGoals.map((goal, i) => (
                <Line
                  key={goal.id}
                  type="monotone"
                  dataKey={goal.name}
                  stroke={GOAL_COLORS[i % GOAL_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
              {activeGoals.map((goal, i) => (
                <ReferenceLine
                  key={`ref-${goal.id}`}
                  y={goal.targetAmount}
                  stroke={GOAL_COLORS[i % GOAL_COLORS.length]}
                  strokeDasharray="4 2"
                  strokeOpacity={0.4}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
        <p className="text-xs text-gray-400 mt-2">{t('goalTracking.dashedNote')}</p>
      </div>

      {/* Detail table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">{t('goalTracking.goal')}</th>
              <th className="px-4 py-3 text-right">{t('goalTracking.saved')}</th>
              <th className="px-4 py-3 text-right">{t('goalTracking.target')}</th>
              <th className="px-4 py-3 text-right">{t('goalTracking.progress')}</th>
              <th className="px-4 py-3 text-right">{t('goalTracking.monthsLeft')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">{t('common.loading')}</td></tr>
            ) : activeGoals.map((g, i) => {
              const pct = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0;
              const months = g.targetDate ? monthsUntil(g.targetDate) : null;
              return (
                <tr key={g.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: GOAL_COLORS[i % GOAL_COLORS.length] }}
                      />
                      {g.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">{formatCurrency(g.currentAmount)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(g.targetAmount)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <span className={`font-medium ${pct >= 100 ? 'text-brand' : pct >= 50 ? 'text-yellow-600' : 'text-gray-700'}`}>
                        {pct}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {months === null ? '—' : months <= 0 ? <span className="text-red-500">{t('goals.overdue')}</span> : `${months} mo`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
