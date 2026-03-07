'use client';

import { useState } from 'react';
import { useAssets, useCreateAsset, useDeleteAsset, CreateAssetInput } from '@/hooks/use-assets';
import { ASSET_TYPES } from '@finances/shared';
import { AssetCard } from '@/components/assets/asset-card';
import { AssetForm } from '@/components/assets/asset-form';
import { Modal } from '@/components/ui/modal';
import { formatCurrency } from '@/lib/utils';
import { Plus, TrendingUp } from 'lucide-react';

export function AssetsClient() {
  const [showForm, setShowForm] = useState(false);

  const { data: assets, isLoading } = useAssets();
  const createAsset = useCreateAsset();
  const deleteAsset = useDeleteAsset();

  const totalAssets = (assets ?? []).reduce((s, a) => s + a.value, 0);

  async function handleCreate(input: CreateAssetInput) {
    await createAsset.mutateAsync(input);
    setShowForm(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this asset?')) return;
    await deleteAsset.mutateAsync(id);
  }

  const assetsByType = (assets ?? []).reduce<Record<string, typeof assets>>((acc, a) => {
    const group = acc[a.type] ?? [];
    return { ...acc, [a.type]: [...group, a] };
  }, {});

  const hasAssets = (assets?.length ?? 0) > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Assets</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-dark text-sm font-medium"
        >
          <Plus size={16} />
          Add
        </button>
      </div>

      {/* Total Assets banner */}
      <div className="bg-gradient-to-r from-brand to-brand-light rounded-xl p-6 text-white mb-8">
        <div className="flex items-center gap-2 mb-1 text-white/80 text-sm">
          <TrendingUp size={16} />
          <span>Total Assets</span>
        </div>
        <p className="text-4xl font-bold">
          {isLoading ? '—' : formatCurrency(totalAssets)}
        </p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && !hasAssets && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">Nothing tracked yet</p>
          <p className="text-sm mt-1">Add your first asset to track your portfolio</p>
        </div>
      )}

      {!isLoading && hasAssets && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-700">Assets</h2>
            <span className="text-sm font-semibold text-brand">{formatCurrency(totalAssets)}</span>
          </div>
          {ASSET_TYPES.map((type) => {
            const group = assetsByType[type];
            if (!group?.length) return null;
            const subtotal = group.reduce((s, a) => s + a.value, 0);
            return (
              <section key={type} className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </h3>
                  <span className="text-sm font-semibold text-gray-700">{formatCurrency(subtotal)}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {group.map((asset) => (
                    <AssetCard key={asset.id} asset={asset} onDelete={handleDelete} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {showForm && (
        <Modal title="Add Asset" onClose={() => setShowForm(false)}>
          <AssetForm
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
            isLoading={createAsset.isPending}
          />
        </Modal>
      )}
    </div>
  );
}
