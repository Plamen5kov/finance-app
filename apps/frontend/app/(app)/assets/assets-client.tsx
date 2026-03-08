'use client';

import { useState, useMemo } from 'react';
import { useAssets, useCreateAsset, useDeleteAsset, useRefreshPrices, Asset, CreateAssetInput } from '@/hooks/use-assets';
import { ASSET_TYPES } from '@finances/shared';
import { AssetCard } from '@/components/assets/asset-card';
import { AssetForm } from '@/components/assets/asset-form';
import { AssetEntryForm } from '@/components/assets/asset-entry-form';
import { AssetSnapshotModal } from '@/components/assets/asset-snapshot-modal';
import { Modal } from '@/components/ui/modal';
import { formatCurrency } from '@/lib/utils';
import { Plus, TrendingUp, RefreshCw } from 'lucide-react';
import { useTranslation } from '@/i18n';

export function AssetsClient() {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [entryAsset, setEntryAsset] = useState<Asset | null>(null);
  const [historyAsset, setHistoryAsset] = useState<Asset | null>(null);

  const { data: assets, isLoading } = useAssets();
  const createAsset = useCreateAsset();
  const deleteAsset = useDeleteAsset();
  const refreshPrices = useRefreshPrices();

  const totalAssets = useMemo(() => (assets ?? []).reduce((s, a) => s + a.value, 0), [assets]);

  const assetsByType = useMemo(() => (assets ?? []).reduce<Record<string, typeof assets>>((acc, a) => {
    const group = acc[a.type] ?? [];
    return { ...acc, [a.type]: [...group, a] };
  }, {}), [assets]);

  async function handleCreate(input: CreateAssetInput) {
    await createAsset.mutateAsync(input);
    setShowForm(false);
  }

  function handleCardClick(id: string) {
    const asset = assets?.find((a) => a.id === id);
    if (asset) setEntryAsset(asset);
  }

  function handleHistory(id: string) {
    const asset = assets?.find((a) => a.id === id);
    if (asset) setHistoryAsset(asset);
  }

  async function handleDelete(id: string) {
    if (!confirm(t('assets.deleteConfirm'))) return;
    await deleteAsset.mutateAsync(id);
  }

  const hasAssets = (assets?.length ?? 0) > 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{t('assets.title')}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refreshPrices.mutate()}
            disabled={refreshPrices.isPending}
            className="flex items-center gap-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshPrices.isPending ? 'animate-spin' : ''} />
            {refreshPrices.isPending ? t('assets.refreshing' as any) : t('assets.refreshPrices' as any)}
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-dark text-sm font-medium"
          >
            <Plus size={16} />
            {t('common.add')}
          </button>
        </div>
      </div>

      {/* Total Assets banner */}
      <div className="bg-gradient-to-r from-brand to-brand-light rounded-xl p-4 sm:p-6 text-white mb-8">
        <div className="flex items-center gap-2 mb-1 text-white/80 text-sm">
          <TrendingUp size={16} />
          <span>{t('assets.totalAssets')}</span>
        </div>
        <p className="text-2xl sm:text-4xl font-bold">
          {isLoading ? '—' : formatCurrency(totalAssets)}
        </p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && !hasAssets && (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-lg font-medium">{t('common.nothingYet')}</p>
          <p className="text-sm mt-1">{t('assets.addFirst')}</p>
        </div>
      )}

      {!isLoading && hasAssets && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300">{t('assets.title')}</h2>
            <span className="text-sm font-semibold text-brand">{formatCurrency(totalAssets)}</span>
          </div>
          {ASSET_TYPES.map((type) => {
            const group = assetsByType[type];
            if (!group?.length) return null;
            const subtotal = group.reduce((s, a) => s + a.value, 0);
            return (
              <section key={type} className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {t(`assetType.${type}` as any)}
                  </h3>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(subtotal)}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {group.map((asset) => (
                    <AssetCard key={asset.id} asset={asset} onClick={handleCardClick} onHistory={handleHistory} onDelete={handleDelete} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {showForm && (
        <Modal title={t('assets.addAsset')} onClose={() => setShowForm(false)}>
          <AssetForm
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
            isLoading={createAsset.isPending}
          />
        </Modal>
      )}

      {entryAsset && (
        <Modal title={`${t('assets.newEntry' as any)} — ${entryAsset.name}`} onClose={() => setEntryAsset(null)}>
          <AssetEntryForm
            asset={entryAsset}
            onDone={() => setEntryAsset(null)}
          />
        </Modal>
      )}
      {historyAsset && (
        <AssetSnapshotModal
          assetId={historyAsset.id}
          assetName={historyAsset.name}
          onClose={() => setHistoryAsset(null)}
        />
      )}
    </div>
  );
}
