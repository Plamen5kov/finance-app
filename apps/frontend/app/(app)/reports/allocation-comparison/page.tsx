'use client';

import { useAssetAllocation } from '@/hooks/use-net-worth';
import { formatCurrency } from '@/lib/utils';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { ChartLegendChips, useChartLegend } from '@/components/charts/chart-legend-chips';

const COLORS: Record<string, string> = {
  etf: '#2D6A4F',
  crypto: '#F59E0B',
  gold: '#D97706',
  apartment: '#8B5CF6',
};

const PLANNED: Record<string, number> = {
  etf: 60,
  crypto: 20,
  gold: 10,
  apartment: 10,
};

export default function AllocationComparisonPage() {
  const { t } = useTranslation();
  const { data: allocation, isLoading } = useAssetAllocation();
  const { hiddenKeys: hiddenActual, toggle: toggleActual } = useChartLegend();
  const { hiddenKeys: hiddenPlanned, toggle: togglePlanned } = useChartLegend();

  const TYPE_LABELS: Record<string, string> = {
    etf: t('allocation.etfStocks'),
    crypto: t('assetType.crypto'),
    gold: t('assetType.gold'),
    apartment: t('assetType.apartment'),
  };

  const actualData = (allocation ?? []).map((item) => ({
    name: TYPE_LABELS[item.type] ?? item.type,
    type: item.type,
    value: item.value,
    pct: item.pct,
  }));

  const plannedData = Object.entries(PLANNED).map(([type, pct]) => ({
    name: TYPE_LABELS[type] ?? type,
    type,
    value: pct,
    pct,
  }));

  const actualLegendItems = actualData.map((d) => ({ dataKey: d.name, color: COLORS[d.type] ?? '#6B7280' }));
  const plannedLegendItems = plannedData.map((d) => ({ dataKey: d.name, color: COLORS[d.type] ?? '#6B7280' }));

  const filteredActual = actualData.filter((d) => !hiddenActual.has(d.name));
  const filteredPlanned = plannedData.filter((d) => !hiddenPlanned.has(d.name));

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/reports" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t('allocation.title')}</h1>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Actual */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-1">{t('allocation.actual')}</h2>
          <p className="text-xs text-gray-400 mb-4">{t('allocation.actualDesc')}</p>
          {isLoading ? (
            <div className="h-64 bg-gray-100 rounded animate-pulse" />
          ) : actualData.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-12">{t('allocation.noAssetData')}</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={filteredActual}
                    dataKey="pct"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, pct }) => `${name} ${pct}%`}
                    labelLine={false}
                  >
                    {filteredActual.map((entry) => (
                      <Cell key={entry.type} fill={COLORS[entry.type] ?? '#6B7280'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v}%`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3">
                <ChartLegendChips items={actualLegendItems} hiddenKeys={hiddenActual} onToggle={toggleActual} />
              </div>
            </>
          )}
        </div>

        {/* Planned */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-1">{t('allocation.target')}</h2>
          <p className="text-xs text-gray-400 mb-4">{t('allocation.targetDesc')}</p>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={filteredPlanned}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ name, value }) => `${name} ${value}%`}
                labelLine={false}
              >
                {filteredPlanned.map((entry) => (
                  <Cell key={entry.type} fill={COLORS[entry.type] ?? '#6B7280'} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => `${v}%`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3">
            <ChartLegendChips items={plannedLegendItems} hiddenKeys={hiddenPlanned} onToggle={togglePlanned} />
          </div>
        </div>
      </div>

      {/* Comparison table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">{t('allocation.assetClass')}</th>
              <th className="px-4 py-3 text-right">{t('allocation.value')}</th>
              <th className="px-4 py-3 text-right">{t('allocation.actualPct')}</th>
              <th className="px-4 py-3 text-right">{t('allocation.targetPct')}</th>
              <th className="px-4 py-3 text-right">{t('allocation.drift')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">{t('common.loading')}</td></tr>
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
