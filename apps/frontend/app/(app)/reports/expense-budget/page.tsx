'use client';

import { formatCurrency } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useState, useCallback, useRef } from 'react';
import { useMonthlyReport } from '@/hooks/use-expenses';
import { useTranslation } from '@/i18n';
import { ChartLegendChips, useChartLegend } from '@/components/charts/chart-legend-chips';
import { ChartTooltipHeader, type TooltipEntry } from '@/components/charts/chart-tooltip-header';

const RANGES = [
  { label: '6M', months: 6 },
  { label: '1Y', months: 12 },
  { label: '2Y', months: 24 },
  { label: '3Y', months: 36 },
];

export default function ExpenseBudgetPage() {
  const { t } = useTranslation();
  const [range, setRange] = useState(12);
  const { data: report, isLoading } = useMonthlyReport(range);

  const { hiddenKeys: hiddenExpenseKeys, toggle: toggleExpense, isVisible: isExpenseVisible } = useChartLegend();
  const { hiddenKeys: hiddenPieKeys, toggle: togglePie } = useChartLegend();
  const { hiddenKeys: hiddenTrendKeys, toggle: toggleTrend, isVisible: isTrendVisible } = useChartLegend();

  // Scrub state
  const [scrubExpense, setScrubExpense] = useState<{ month: string; entries: TooltipEntry[] } | null>(null);
  const [scrubTrend, setScrubTrend] = useState<{ month: string; entries: TooltipEntry[] } | null>(null);
  const scrubExpenseTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const scrubTrendTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const months = report?.months ?? [];
  const categoryAverages = report?.categoryAverages ?? [];

  const expenseCategories = report?.categories.filter((c) => c.type !== 'income') ?? [];
  const barData = months.map((m) => {
    const row: Record<string, unknown> = { month: m.month, Income: m.totalIncome, 'Total Expenses': m.totalExpenses };
    for (const cat of expenseCategories) {
      const entry = m.byCategory.find((c) => c.categoryId === cat.id);
      row[cat.name] = entry?.total ?? 0;
    }
    return row;
  });

  const avgExpenses = months.length > 0
    ? Math.round(months.reduce((s, m) => s + m.totalExpenses, 0) / months.length)
    : 0;
  const avgIncome = months.length > 0
    ? Math.round(months.reduce((s, m) => s + m.totalIncome, 0) / months.length)
    : 0;
  const avgSavings = avgIncome - avgExpenses;

  const lastMonth = months.at(-1);
  const prevMonth = months.at(-2);
  const momChange = lastMonth && prevMonth
    ? lastMonth.totalExpenses - prevMonth.totalExpenses
    : 0;

  const pieData = categoryAverages.filter((c) => c.average > 0).map((c) => ({
    name: c.name, value: c.average, color: c.color ?? '#6B7280',
  }));

  const colorMap: Record<string, string> = {};
  for (const cat of report?.categories ?? []) {
    colorMap[cat.name] = cat.color ?? '#6B7280';
  }

  // Legend items for expense bar chart
  const expenseLegendItems = expenseCategories.map((cat) => ({
    dataKey: cat.name,
    color: cat.color ?? '#6B7280',
  }));

  // Legend items for pie chart
  const pieLegendItems = pieData.map((d) => ({ dataKey: d.name, color: d.color }));

  // Legend items for trend chart
  const trendLegendItems = [
    { dataKey: 'Total Expenses', color: '#EF4444' },
    { dataKey: 'Income', color: '#10B981' },
  ];

  const handleExpenseScrub = useCallback((state: any) => {
    if (scrubExpenseTimeout.current) clearTimeout(scrubExpenseTimeout.current);
    if (!state?.activePayload?.length) return;
    const entries: TooltipEntry[] = state.activePayload
      .filter((p: any) => p.value != null && p.value > 0)
      .map((p: any) => ({ label: p.dataKey, value: p.value as number, color: p.color ?? p.fill as string }));
    setScrubExpense({ month: state.activeLabel, entries });
  }, []);

  const handleExpenseLeave = useCallback(() => {
    scrubExpenseTimeout.current = setTimeout(() => setScrubExpense(null), 300);
  }, []);

  const handleTrendScrub = useCallback((state: any) => {
    if (scrubTrendTimeout.current) clearTimeout(scrubTrendTimeout.current);
    if (!state?.activePayload?.length) return;
    const entries: TooltipEntry[] = state.activePayload
      .filter((p: any) => p.value != null)
      .map((p: any) => ({ label: p.dataKey, value: p.value as number, color: p.fill as string }));
    setScrubTrend({ month: state.activeLabel, entries });
  }, []);

  const handleTrendLeave = useCallback(() => {
    scrubTrendTimeout.current = setTimeout(() => setScrubTrend(null), 300);
  }, []);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/reports" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t('budget.title')}</h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">{t('budget.avgIncome')}</p>
          <p className="text-2xl font-bold text-green-600">
            {isLoading ? '—' : formatCurrency(avgIncome)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">{t('budget.avgExpenses')}</p>
          <p className="text-2xl font-bold text-red-500">
            {isLoading ? '—' : formatCurrency(avgExpenses)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">{t('budget.avgSavings')}</p>
          <p className={`text-2xl font-bold ${avgSavings >= 0 ? 'text-brand' : 'text-red-500'}`}>
            {isLoading ? '—' : formatCurrency(avgSavings)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">{t('budget.lastVsPrior')}</p>
          <p className={`text-2xl font-bold ${momChange <= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {isLoading ? '—' : `${momChange >= 0 ? '+' : ''}${formatCurrency(momChange)}`}
          </p>
        </div>
      </div>

      {/* Stacked bar chart: expenses by category per month */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="font-semibold text-gray-900">{t('budget.expensesByCategory')}</h2>
            <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">{t('budget.stackedBreakdown')}</p>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            {RANGES.map((r) => (
              <button
                key={r.label}
                onClick={() => setRange(r.months)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
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

        {scrubExpense && (
          <div className="mb-2">
            <ChartTooltipHeader month={scrubExpense.month} entries={scrubExpense.entries} />
          </div>
        )}

        {isLoading ? (
          <div className="h-72 bg-gray-100 rounded animate-pulse" />
        ) : barData.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-12">{t('budget.noExpenseData')}</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={280} className="sm:!h-[340px]">
              <BarChart
                data={barData}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                onMouseMove={handleExpenseScrub}
                onMouseLeave={handleExpenseLeave}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} interval="preserveStartEnd" />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  content={() => null}
                  cursor={{ fill: 'rgba(156, 163, 175, 0.1)' }}
                />
                {expenseCategories.map((cat) => (
                  isExpenseVisible(cat.name) && (
                    <Bar key={cat.id} dataKey={cat.name} stackId="expenses" fill={cat.color ?? '#6B7280'} />
                  )
                ))}
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3">
              <ChartLegendChips items={expenseLegendItems} hiddenKeys={hiddenExpenseKeys} onToggle={toggleExpense} />
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Pie chart: average category split */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">{t('budget.avgMonthlySplit')}</h2>
          {isLoading ? (
            <div className="h-64 bg-gray-100 rounded animate-pulse" />
          ) : pieData.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-12">{t('common.noData')}</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData.filter((d) => !hiddenPieKeys.has(d.name))}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => percent >= 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                    labelLine={false}
                  >
                    {pieData.filter((d) => !hiddenPieKeys.has(d.name)).map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number, name: string) => [formatCurrency(v), name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3">
                <ChartLegendChips items={pieLegendItems} hiddenKeys={hiddenPieKeys} onToggle={togglePie} />
              </div>
            </>
          )}
        </div>

        {/* Category table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">{t('budget.categoryBreakdown')}</h2>
          {isLoading ? (
            <div className="h-64 bg-gray-100 rounded animate-pulse" />
          ) : categoryAverages.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-12">{t('common.noData')}</p>
          ) : (
            <div className="overflow-y-auto max-h-[280px]">
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500 border-b">
                  <tr>
                    <th className="text-left py-2">{t('table.category')}</th>
                    <th className="text-right py-2">{t('budget.avgPerMonth')}</th>
                    <th className="text-right py-2">{t('common.total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryAverages.map((c) => (
                    <tr key={c.categoryId} className="border-b border-gray-50">
                      <td className="py-2 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: c.color ?? '#6B7280' }} />
                        {c.name}
                      </td>
                      <td className="py-2 text-right font-medium">{formatCurrency(c.average)}</td>
                      <td className="py-2 text-right text-gray-500">{formatCurrency(c.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Income vs Expenses trend */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">{t('budget.incomeVsExpenses')}</h2>

        {scrubTrend && (
          <div className="mb-2">
            <ChartTooltipHeader month={scrubTrend.month} entries={scrubTrend.entries} />
          </div>
        )}

        {isLoading ? (
          <div className="h-64 bg-gray-100 rounded animate-pulse" />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={240} className="sm:!h-[280px]">
              <BarChart
                data={barData}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                onMouseMove={handleTrendScrub}
                onMouseLeave={handleTrendLeave}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} interval="preserveStartEnd" />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  content={() => null}
                  cursor={{ fill: 'rgba(156, 163, 175, 0.1)' }}
                />
                {isTrendVisible('Total Expenses') && (
                  <Bar dataKey="Total Expenses" fill="#EF4444" radius={[4, 4, 0, 0]} />
                )}
                {isTrendVisible('Income') && (
                  <Bar dataKey="Income" fill="#10B981" radius={[4, 4, 0, 0]} />
                )}
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3">
              <ChartLegendChips items={trendLegendItems} hiddenKeys={hiddenTrendKeys} onToggle={toggleTrend} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
