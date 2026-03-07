'use client';

import { formatCurrency } from '@/lib/utils';
import { Trash2, TrendingUp, TrendingDown } from 'lucide-react';

const TYPE_COLORS: Record<string, string> = {
  etf: 'bg-blue-100 text-blue-700',
  crypto: 'bg-orange-100 text-orange-700',
  gold: 'bg-yellow-100 text-yellow-700',
  apartment: 'bg-purple-100 text-purple-700',
  mortgage: 'bg-red-100 text-red-700',
  loan: 'bg-red-100 text-red-700',
};

const TYPE_ICONS: Record<string, string> = {
  etf: '📈',
  crypto: '₿',
  gold: '🥇',
  apartment: '🏠',
  mortgage: '🏦',
  loan: '💳',
};

interface CardItem {
  id: string;
  type: string;
  name: string;
  value: number;
  currency?: string;
  costBasis?: number;
  quantity?: number;
}

interface AssetCardProps {
  asset: CardItem;
  onDelete: (id: string) => void;
}

export function AssetCard({ asset, onDelete }: AssetCardProps) {
  const gain = asset.costBasis != null ? asset.value - asset.costBasis : null;
  const gainPct = gain != null && asset.costBasis ? (gain / asset.costBasis) * 100 : null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{TYPE_ICONS[asset.type] ?? '💼'}</span>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">{asset.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[asset.type] ?? 'bg-gray-100 text-gray-600'}`}>
              {asset.type}
            </span>
          </div>
        </div>
        <button
          onClick={() => onDelete(asset.id)}
          className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
          aria-label="Delete asset"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div className="mt-2">
        <p className="text-2xl font-bold text-gray-900">{formatCurrency(asset.value)}</p>
        {asset.currency && asset.currency !== 'BGN' && (
          <p className="text-xs text-gray-400 mt-0.5">{asset.currency}</p>
        )}
      </div>

      {gain != null && (
        <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${gain >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {gain >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{gain >= 0 ? '+' : ''}{formatCurrency(gain)}</span>
          {gainPct != null && <span className="text-xs font-normal">({gainPct >= 0 ? '+' : ''}{gainPct.toFixed(1)}%)</span>}
        </div>
      )}

      {asset.quantity != null && (
        <p className="text-xs text-gray-400 mt-1">Qty: {asset.quantity}</p>
      )}
    </div>
  );
}
