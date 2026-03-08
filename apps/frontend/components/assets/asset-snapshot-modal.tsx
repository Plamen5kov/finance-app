'use client';

import { useState } from 'react';
import { Trash2, Pencil, Check, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';
import { useAssetSnapshots, useAddAssetSnapshot, useDeleteAssetSnapshot } from '@/hooks/use-assets';
import { useTranslation } from '@/i18n';

interface Props {
  assetId: string;
  assetName: string;
  onClose: () => void;
}

function SnapshotRow({ snapshot, assetId }: { snapshot: { id: string; value: number; capturedAt: string }; assetId: string }) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(snapshot.value));
  const addSnapshot = useAddAssetSnapshot(assetId);
  const deleteSnapshot = useDeleteAssetSnapshot(assetId);
  const month = snapshot.capturedAt.slice(0, 7);

  async function handleSave() {
    const num = Number(editValue);
    if (isNaN(num) || num < 0) return;
    await addSnapshot.mutateAsync({ value: num, month });
    setEditing(false);
  }

  function handleCancel() {
    setEditValue(String(snapshot.value));
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center justify-between py-2 text-sm gap-2">
        <span className="text-gray-500 dark:text-gray-400 shrink-0">{month}</span>
        <input
          type="number"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          step="0.01"
          min={0}
          className="flex-1 min-w-[80px] border border-brand rounded px-2 py-1 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
        />
        <div className="flex items-center gap-0.5">
          <button
            onClick={handleSave}
            disabled={addSnapshot.isPending}
            className="p-1 text-green-600 hover:text-green-700 transition-colors disabled:opacity-50"
            aria-label="Save"
          >
            <Check size={14} />
          </button>
          <button
            onClick={handleCancel}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Cancel"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="text-gray-500 dark:text-gray-400">{month}</span>
      <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(snapshot.value)}</span>
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => setEditing(true)}
          className="p-1 text-gray-300 dark:text-gray-600 hover:text-brand transition-colors"
          aria-label="Edit snapshot"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={() => deleteSnapshot.mutate(snapshot.id)}
          className="p-1 text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors"
          aria-label="Delete snapshot"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

export function AssetSnapshotModal({ assetId, assetName, onClose }: Props) {
  const { t } = useTranslation();
  const { data: snapshots, isLoading } = useAssetSnapshots(assetId);
  const addSnapshot = useAddAssetSnapshot(assetId);

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
            <SnapshotRow key={s.id} snapshot={s} assetId={assetId} />
          ))}
        </div>
      )}
    </Modal>
  );
}
