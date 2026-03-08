'use client';

import { formatCurrency, toEur } from '@/lib/utils';
import { Trash2, History, TrendingUp, TrendingDown } from 'lucide-react';
import { useTranslation } from '@/i18n';

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
  metadata?: Record<string, unknown>;
}

interface AssetCardProps {
  asset: CardItem;
  onClick: (id: string) => void;
  onHistory: (id: string) => void;
  onDelete: (id: string) => void;
}

export function AssetCard({ asset, onClick, onHistory, onDelete }: AssetCardProps) {
  const { t } = useTranslation();
  const eurValue = toEur(asset.value, asset.currency);
  const eurCostBasis = asset.costBasis != null ? toEur(asset.costBasis, asset.currency) : null;
  const gain = eurCostBasis != null ? eurValue - eurCostBasis : null;
  const gainPct = gain != null && eurCostBasis ? (gain / eurCostBasis) * 100 : null;
  const ticker = asset.metadata?.ticker as string | undefined;
  const coinId = asset.metadata?.coinId as string | undefined;
  const isGoldTracked = asset.metadata?.metal === 'gold';
  const trackingLabel = ticker ?? coinId ?? (isGoldTracked ? `${asset.metadata?.unit ?? 'g'}` : null);
  const isAutoTracked = !!(ticker || coinId || isGoldTracked) && asset.quantity != null;
  const nativePricePerUnit = asset.quantity ? Math.round(asset.value / asset.quantity * 100) / 100 : null;

  return (
    <div
      onClick={() => onClick(asset.id)}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 cursor-pointer hover:border-brand/40 dark:hover:border-brand/40 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{TYPE_ICONS[asset.type] ?? '💼'}</span>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{asset.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[asset.type] ?? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
              {t(`assetType.${asset.type}` as any)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={(e) => { e.stopPropagation(); onHistory(asset.id); }}
            className="p-2 text-gray-300 dark:text-gray-600 hover:text-brand active:text-brand transition-colors"
            aria-label="View history"
          >
            <History size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(asset.id); }}
            className="p-2 text-gray-300 dark:text-gray-600 hover:text-red-500 active:text-red-500 transition-colors"
            aria-label="Delete asset"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="mt-2">
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(eurValue)}</p>
        {asset.currency && asset.currency !== 'EUR' && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{formatCurrency(asset.value, asset.currency)}</p>
        )}
      </div>

      {gain != null && (
        <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${gain >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {gain >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{gain >= 0 ? '+' : ''}{formatCurrency(gain)}</span>
          {gainPct != null && <span className="text-xs font-normal">({gainPct >= 0 ? '+' : ''}{gainPct.toFixed(1)}%)</span>}
        </div>
      )}

      {isAutoTracked && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
            {trackingLabel}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {asset.quantity} × {formatCurrency(nativePricePerUnit ?? 0, asset.currency ?? 'EUR')}
          </span>
        </div>
      )}

      {!isAutoTracked && asset.quantity != null && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Qty: {asset.quantity}</p>
      )}

      {!isAutoTracked && (
        <div className="mt-2">
          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
            {t('assets.manual' as any)}
          </span>
        </div>
      )}
    </div>
  );
}
