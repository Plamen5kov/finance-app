'use client';

import { useState } from 'react';
import { useAssets, useNetWorth, useCreateAsset, useDeleteAsset, CreateAssetInput } from '@/hooks/use-assets';
import { AssetCard } from '@/components/assets/asset-card';
import { AssetForm } from '@/components/assets/asset-form';
import { Modal } from '@/components/ui/modal';
import { formatCurrency } from '@/lib/utils';
import { Plus, TrendingUp } from 'lucide-react';

export function AssetsClient() {
  const [showForm, setShowForm] = useState(false);

  const { data: assets, isLoading } = useAssets();
  const { data: netWorth } = useNetWorth();
  const createAsset = useCreateAsset();
  const deleteAsset = useDeleteAsset();

  async function handleCreate(input: CreateAssetInput) {
    await createAsset.mutateAsync(input);
    setShowForm(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this asset?')) return;
    await deleteAsset.mutateAsync(id);
  }

  // Group by type
  const byType = (assets ?? []).reduce<Record<string, typeof assets>>((acc, asset) => {
    if (!asset) return acc;
    const group = acc[asset.type] ?? [];
    return { ...acc, [asset.type]: [...group, asset] };
  }, {});

  const typeOrder = ['etf', 'crypto', 'gold', 'mortgage'];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Assets</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-dark text-sm font-medium"
        >
          <Plus size={16} />
          Add Asset
        </button>
      </div>

      {/* Net Worth banner */}
      <div className="bg-gradient-to-r from-brand to-brand-light rounded-xl p-6 text-white mb-8">
        <div className="flex items-center gap-2 mb-1 text-white/80 text-sm">
          <TrendingUp size={16} />
          <span>Total Net Worth</span>
        </div>
        <p className="text-4xl font-bold">
          {netWorth ? formatCurrency(netWorth.total) : '—'}
        </p>
        <p className="text-white/70 text-sm mt-1">
          {assets?.length ?? 0} asset{assets?.length !== 1 ? 's' : ''}
        </p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && (assets?.length ?? 0) === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No assets yet</p>
          <p className="text-sm mt-1">Add your first asset to track your net worth</p>
        </div>
      )}

      {!isLoading && typeOrder.map((type) => {
        const group = byType[type];
        if (!group?.length) return null;
        const subtotal = group.reduce((s, a) => s + a.value, 0);
        return (
          <section key={type} className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </h2>
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
