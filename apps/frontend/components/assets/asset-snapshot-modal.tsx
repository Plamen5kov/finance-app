'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';
import { useAssetSnapshots, useAddAssetSnapshot, useDeleteAssetSnapshot } from '@/hooks/use-assets';
import { useTranslation } from '@/i18n';

interface Props {
  assetId: string;
  assetName: string;
  onClose: () => void;
}

export function AssetSnapshotModal({ assetId, assetName, onClose }: Props) {
  const { t } = useTranslation();
  const { data: snapshots, isLoading } = useAssetSnapshots(assetId);
  const addSnapshot = useAddAssetSnapshot(assetId);
  const deleteSnapshot = useDeleteAssetSnapshot(assetId);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const [value, setValue] = useState('');

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!value) return;
    await addSnapshot.mutateAsync({ value: Number(value), month });
    setValue('');
    setMonth(currentMonth);
  }

  return (
    <Modal title={`History — ${assetName}`} onClose={onClose}>
      <form onSubmit={handleAdd} className="flex flex-wrap gap-2 mb-5">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
          required
        />
        <input
          type="number"
          placeholder={t('assets.valuePlaceholder')}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          min={0}
          step="0.01"
          className="flex-1 min-w-[120px] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
          required
        />
        <button
          type="submit"
          disabled={addSnapshot.isPending}
          className="w-full sm:w-auto bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50"
        >
          {t('common.add')}
        </button>
      </form>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-8 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />)}
        </div>
      ) : !snapshots?.length ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">{t('assets.noHistory')}</p>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {[...snapshots].reverse().map((s) => (
            <div key={s.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-gray-500 dark:text-gray-400">{s.capturedAt.slice(0, 7)}</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(s.value)}</span>
              <button
                onClick={() => deleteSnapshot.mutate(s.id)}
                className="p-1 text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors"
                aria-label="Delete snapshot"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
