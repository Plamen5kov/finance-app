'use client';

import { formatCurrency } from '@/lib/utils';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useNetWorthHistory, useNetWorthProjection, useNetWorthSummary } from '@/hooks/use-net-worth';

const TYPE_COLORS: Record<string, string> = {
  crypto: '#F59E0B',
  etf: '#3B82F6',
  gold: '#EAB308',
  apartment: '#8B5CF6',
  mortgage: '#EF4444',
  loan: '#F87171',
};

const RANGES = [
  { label: '1Y', months: 12 },
  { label: '2Y', months: 24 },
  { label: '3Y', months: 36 },
  { label: 'All', months: 0 },
];

function toMonthStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export default function NetWorthReportPage() {
  const { data: summary, isLoading: summaryLoading } = useNetWorthSummary();
  const { data: history, isLoading: historyLoading } = useNetWorthHistory();
  const { data: projection, isLoading: projectionLoading } = useNetWorthProjection();
  const [range, setRange] = useState(0); // 0 = All
  const [showNetWorth, setShowNetWorth] = useState(true);
  const [showNetWorthProjection, setShowNetWorthProjection] = useState(true);
  const [showLiabilityProjection, setShowLiabilityProjection] = useState(true);
  const currentYear = new Date().getFullYear();
  const [projectionEndYear, setProjectionEndYear] = useState(currentYear + 30);

  const isLoading = summaryLoading || historyLoading || projectionLoading;

  // Apply date range filter to history
  const filteredHistory = (() => {
    if (!history) return [];
    if (range === 0) return history;
    const cutoff = toMonthStr(new Date(Date.now() - range * 30 * 24 * 60 * 60 * 1000));
    return history.filter((p) => p.month >= cutoff);
  })();

  // Transform history into recharts format — presentation only, values come from backend
  const chartData = filteredHistory.map((point) => {
    const row: Record<string, unknown> = { month: point.month, 'Net Worth': point.netWorth };
    for (const item of point.items) {
      row[item.name] = item.value;
    }
    return row;
  });

  // Collect all unique items to render chart Lines
  const allItems = (() => {
    if (!history) return [];
    const seen = new Map<string, { name: string; type: string; isLiability: boolean }>();
    for (const point of history) {
      for (const item of point.items) {
        if (!seen.has(item.name)) seen.set(item.name, item);
      }
    }
    return Array.from(seen.values());
  })();

  // Collect unique projected liability names for rendering Lines
  const projectedLiabilityNames = (() => {
    const seen = new Map<string, { name: string; type: string }>();
    for (const p of projection?.points ?? []) {
      for (const l of p.liabilities) {
        if (!seen.has(l.name)) seen.set(l.name, { name: l.name, type: l.type });
      }
    }
    return Array.from(seen.values());
  })();

  // Merge projected points into chart data — starts from today forward
  const mergedData = (() => {
    const map = new Map<string, Record<string, unknown>>();
    for (const d of chartData) map.set(d.month as string, { ...d });
    const projPoints = (projection?.points ?? []).filter(
      (p) => p.month <= `${projectionEndYear}-12`,
    );
    projPoints.forEach((p, i) => {
      const existing = map.get(p.month) ?? { month: p.month };
      const row: Record<string, unknown> = { ...existing, 'Projected Net Worth': p.projectedNetWorth };
      // Bridge the gap at the start of the projection: seed Net Worth so the two lines connect
      if (i === 0 && row['Net Worth'] == null) {
        row['Net Worth'] = p.projectedNetWorth;
      }
      for (const l of p.liabilities) {
        row[`${l.name} (projected)`] = l.balance;
      }
      map.set(p.month, row);
    });
    return Array.from(map.values())
      .sort((a, b) => String(a.month).localeCompare(String(b.month)))
      .filter((d) => String(d.month) <= `${projectionEndYear}-12`);
  })();

  const hasProjection = (projection?.points.length ?? 0) > 0;
  const todayMonth = toMonthStr(new Date());

  // Compute Y-axis domain from only the visible series so scale adapts to toggled lines
  const yDomain = (() => {
    const visibleKeys = [
      ...allItems.map((i) => i.name),
      ...(showNetWorth ? ['Net Worth'] : []),
      ...(hasProjection && showNetWorthProjection ? ['Projected Net Worth'] : []),
      ...(showLiabilityProjection ? projectedLiabilityNames.map((l) => `${l.name} (projected)`) : []),
    ];
    let min = Infinity;
    let max = -Infinity;
    for (const row of mergedData) {
      for (const key of visibleKeys) {
        const v = row[key] as number | undefined;
        if (v != null) {
          if (v < min) min = v;
          if (v > max) max = v;
        }
      }
    }
    if (min === Infinity) return ['auto', 'auto'];
    const pad = (max - min) * 0.05 || Math.abs(min) * 0.05 || 1000;
    return [Math.floor(min - pad), Math.ceil(max + pad)];
  })();

  const firstNetWorth = (chartData.at(0)?.['Net Worth'] as number) ?? 0;
  const latestNetWorth = summary?.netWorth ?? 0;
  const netWorthChange = latestNetWorth - firstNetWorth;

  const payoffLabel = projection?.payoffMonth
    ? new Date(projection.payoffMonth + '-02').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/reports" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Net Worth Over Time</h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Net Worth</p>
          <p className={`text-2xl font-bold ${latestNetWorth >= 0 ? 'text-brand' : 'text-red-500'}`}>
            {isLoading ? '—' : formatCurrency(latestNetWorth)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Change (period)</p>
          <p className={`text-2xl font-bold ${netWorthChange >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {isLoading ? '—' : `${netWorthChange >= 0 ? '+' : ''}${formatCurrency(netWorthChange)}`}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Total Assets</p>
          <p className="text-2xl font-bold text-gray-900">
            {isLoading ? '—' : formatCurrency(summary?.totalAssets ?? 0)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Total Liabilities</p>
          <p className="text-2xl font-bold text-red-500">
            {isLoading ? '—' : formatCurrency(summary?.totalLiabilities ?? 0)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Mortgage Payoff</p>
          <p className={`text-2xl font-bold ${payoffLabel ? 'text-green-600' : 'text-gray-400'}`}>
            {isLoading ? '—' : (payoffLabel ?? 'N/A')}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Portfolio Value by Asset</h2>
              {hasProjection && (
                <p className="text-xs text-gray-400 mt-0.5">Dashed line shows projected net worth assuming current assets stay flat</p>
              )}
            </div>
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
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 border-t border-gray-100 pt-3">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showNetWorth}
                onChange={(e) => setShowNetWorth(e.target.checked)}
                className="accent-brand"
              />
              Net Worth
            </label>
            {hasProjection && (
              <>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showNetWorthProjection}
                    onChange={(e) => setShowNetWorthProjection(e.target.checked)}
                    className="accent-brand"
                  />
                  Net Worth projection
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showLiabilityProjection}
                    onChange={(e) => setShowLiabilityProjection(e.target.checked)}
                    className="accent-brand"
                  />
                  Liability projections
                </label>
                <label className="flex items-center gap-1.5 select-none">
                  Project until
                  <select
                    value={projectionEndYear}
                    onChange={(e) => setProjectionEndYear(Number(e.target.value))}
                    className="border border-gray-200 rounded px-1.5 py-0.5 text-xs bg-white"
                  >
                    {Array.from({ length: 30 }, (_, i) => currentYear + 1 + i).map((yr) => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </label>
              </>
            )}
          </div>
        </div>
        {isLoading ? (
          <div className="h-72 bg-gray-100 rounded animate-pulse" />
        ) : mergedData.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-12">No snapshot history</p>
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={mergedData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10 }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={yDomain}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip formatter={(v: number, name) => [formatCurrency(v), name]} />
              <Legend />
              <ReferenceLine
                x={todayMonth}
                stroke="#D1D5DB"
                strokeDasharray="4 2"
                label={{ value: 'Today', position: 'top', fontSize: 9, fill: '#9CA3AF' }}
              />
              {projection?.payoffMonth && (
                <ReferenceLine
                  x={projection.payoffMonth}
                  stroke="#16A34A"
                  strokeDasharray="4 2"
                  label={{ value: 'Payoff', position: 'top', fontSize: 9, fill: '#16A34A' }}
                />
              )}
              {allItems.map((item) => (
                <Line
                  key={item.name}
                  type="monotone"
                  dataKey={item.name}
                  stroke={TYPE_COLORS[item.type] ?? '#6B7280'}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
              {showNetWorth && (
                <Line
                  type="monotone"
                  dataKey="Net Worth"
                  stroke="#2D6A4F"
                  strokeWidth={2.5}
                  strokeDasharray="5 3"
                  dot={false}
                  connectNulls
                />
              )}
              {hasProjection && showNetWorthProjection && (
                <Line
                  type="monotone"
                  dataKey="Projected Net Worth"
                  stroke="#86EFAC"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  dot={false}
                  connectNulls
                />
              )}
              {showLiabilityProjection && projectedLiabilityNames.map((l) => (
                <Line
                  key={`${l.name} (projected)`}
                  type="monotone"
                  dataKey={`${l.name} (projected)`}
                  stroke={TYPE_COLORS[l.type] ?? '#F87171'}
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
