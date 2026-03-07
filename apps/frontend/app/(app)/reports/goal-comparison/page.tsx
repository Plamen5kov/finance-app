'use client';

import { useGoals } from '@/hooks/use-goals';
import { formatCurrency, monthsUntil } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function GoalComparisonPage() {
  const { data: goals, isLoading } = useGoals();

  const activeGoals = (goals ?? []).filter((g) => g.status === 'active' || g.status === 'at_risk');

  const chartData = activeGoals.map((g) => ({
    name: g.name.length > 16 ? g.name.slice(0, 14) + '…' : g.name,
    fullName: g.name,
    Current: g.currentAmount,
    Remaining: Math.max(0, g.targetAmount - g.currentAmount),
    Target: g.targetAmount,
    pct: g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0,
  }));

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/reports" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Goal Progress Tracking</h1>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Saved vs Remaining (BGN)</h2>
        {isLoading ? (
          <div className="h-72 bg-gray-100 rounded animate-pulse" />
        ) : chartData.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-12">No active goals</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
              <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={90} />
              <Tooltip
                formatter={(v: number, name: string) => [formatCurrency(v), name]}
                labelFormatter={(label) => chartData.find((d) => d.name === label)?.fullName ?? label}
              />
              <Legend />
              <Bar dataKey="Current" stackId="a" fill="#2D6A4F" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Remaining" stackId="a" fill="#E5E7EB" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Detail table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Goal</th>
              <th className="px-4 py-3 text-right">Saved</th>
              <th className="px-4 py-3 text-right">Target</th>
              <th className="px-4 py-3 text-right">Progress</th>
              <th className="px-4 py-3 text-right">Months Left</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            ) : activeGoals.map((g) => {
              const pct = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0;
              const months = g.targetDate ? monthsUntil(g.targetDate) : null;
              return (
                <tr key={g.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{g.name}</td>
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
                    {months === null ? '—' : months <= 0 ? <span className="text-red-500">Overdue</span> : `${months} mo`}
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
