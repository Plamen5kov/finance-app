'use client';

import { useAssets } from '@/hooks/use-assets';
import { formatCurrency } from '@/lib/utils';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const COLORS: Record<string, string> = {
  etf: '#2D6A4F',
  crypto: '#F59E0B',
  gold: '#D97706',
  mortgage: '#EF4444',
};

const TYPE_LABELS: Record<string, string> = {
  etf: 'ETF / Stocks',
  crypto: 'Crypto',
  gold: 'Gold',
  mortgage: 'Mortgage',
};

const PLANNED: Record<string, number> = {
  etf: 60,
  crypto: 20,
  gold: 10,
  mortgage: 10,
};

export default function AllocationComparisonPage() {
  const { data: assets, isLoading } = useAssets();

  const positiveAssets = (assets ?? []).filter((a) => a.type !== 'mortgage');
  const total = positiveAssets.reduce((s, a) => s + a.value, 0);

  const byType: Record<string, number> = {};
  for (const a of positiveAssets) {
    byType[a.type] = (byType[a.type] ?? 0) + a.value;
  }

  const actualData = Object.entries(byType).map(([type, value]) => ({
    name: TYPE_LABELS[type] ?? type,
    type,
    value,
    pct: total > 0 ? Math.round((value / total) * 100) : 0,
  }));

  const plannedData = Object.entries(PLANNED).map(([type, pct]) => ({
    name: TYPE_LABELS[type] ?? type,
    type,
    value: pct,
    pct,
  }));

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/reports" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Allocation Comparison</h1>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Actual */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-1">Actual Allocation</h2>
          <p className="text-xs text-gray-400 mb-4">Based on current portfolio values</p>
          {isLoading ? (
            <div className="h-64 bg-gray-100 rounded animate-pulse" />
          ) : actualData.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-12">No asset data</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={actualData}
                  dataKey="pct"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, pct }) => `${name} ${pct}%`}
                  labelLine={false}
                >
                  {actualData.map((entry) => (
                    <Cell key={entry.type} fill={COLORS[entry.type] ?? '#6B7280'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Planned */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-1">Target Allocation</h2>
          <p className="text-xs text-gray-400 mb-4">Desired portfolio distribution</p>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={plannedData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ name, value }) => `${name} ${value}%`}
                labelLine={false}
              >
                {plannedData.map((entry) => (
                  <Cell key={entry.type} fill={COLORS[entry.type] ?? '#6B7280'} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Comparison table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Asset Class</th>
              <th className="px-4 py-3 text-right">Value</th>
              <th className="px-4 py-3 text-right">Actual %</th>
              <th className="px-4 py-3 text-right">Target %</th>
              <th className="px-4 py-3 text-right">Drift</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            ) : actualData.map((row) => {
              const target = PLANNED[row.type] ?? 0;
              const drift = row.pct - target;
              return (
                <tr key={row.type} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full inline-block flex-shrink-0"
                      style={{ backgroundColor: COLORS[row.type] ?? '#6B7280' }}
                    />
                    {row.name}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(row.value)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{row.pct}%</td>
                  <td className="px-4 py-3 text-right text-gray-500">{target}%</td>
                  <td className={`px-4 py-3 text-right font-medium ${drift > 5 ? 'text-red-500' : drift < -5 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {drift > 0 ? '+' : ''}{drift}%
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
