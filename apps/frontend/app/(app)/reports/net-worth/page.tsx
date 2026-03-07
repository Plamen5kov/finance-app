'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface Snapshot { capturedAt: string; value: number; }
interface Asset { id: string; name: string; type: string; value: number; snapshots: Snapshot[]; }

function useAssetsWithSnapshots() {
  return useQuery({
    queryKey: ['assets', 'with-snapshots'],
    queryFn: async () => {
      const { data } = await apiClient.get<Asset[]>('/assets');
      return data;
    },
  });
}

const ASSET_COLORS: Record<string, string> = {
  crypto: '#F59E0B',
  etf: '#3B82F6',
  gold: '#EAB308',
  mortgage: '#EF4444',
};

export default function NetWorthReportPage() {
  const { data: assets, isLoading } = useAssetsWithSnapshots();

  // Merge all snapshot dates and build chart data
  const chartData = (() => {
    if (!assets?.length) return [];
    const dateMap: Record<string, Record<string, number>> = {};
    for (const asset of assets) {
      for (const snap of asset.snapshots ?? []) {
        const month = snap.capturedAt.slice(0, 7);
        if (!dateMap[month]) dateMap[month] = {};
        dateMap[month][asset.name] = snap.value;
      }
    }
    return Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, values]) => ({ month, ...values }));
  })();

  const currentTotal = assets?.reduce((s, a) => s + (a.type === 'mortgage' ? 0 : a.value), 0) ?? 0;
  const mortgageBalance = assets?.find((a) => a.type === 'mortgage')?.value ?? 0;
  const netWorth = currentTotal - mortgageBalance;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/reports" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Net Worth Over Time</h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Investment Assets</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(currentTotal)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Mortgage Remaining</p>
          <p className="text-2xl font-bold text-red-500">{formatCurrency(mortgageBalance)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">True Net Worth</p>
          <p className={`text-2xl font-bold ${netWorth >= 0 ? 'text-brand' : 'text-red-500'}`}>
            {formatCurrency(netWorth)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Portfolio Value by Asset</h2>
        {isLoading ? (
          <div className="h-72 bg-gray-100 rounded animate-pulse" />
        ) : chartData.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-12">No snapshot history yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
              {assets?.map((asset) => (
                <Line
                  key={asset.id}
                  type="monotone"
                  dataKey={asset.name}
                  stroke={ASSET_COLORS[asset.type] ?? '#6B7280'}
                  strokeWidth={2}
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
