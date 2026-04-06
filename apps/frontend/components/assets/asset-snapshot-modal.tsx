'use client';

import { useState } from 'react';
import { Trash2, Pencil } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';
import { useAssetSnapshots, useAddAssetSnapshot, useDeleteAssetSnapshot } from '@/hooks/use-assets';
import { useTranslation } from '@/i18n';

interface Props {
  assetId: string;
  assetName: string;
  currency?: string;
  onClose: () => void;
}

interface EditingSnapshot {
  date: string;
  value: string;
  quantity: string;
  price: string;
}

export function AssetSnapshotModal({ assetId, assetName, currency = 'EUR', onClose }: Props) {
  const { t } = useTranslation();
  const { data: snapshots, isLoading } = useAssetSnapshots(assetId);
  const addSnapshot = useAddAssetSnapshot(assetId);
  const deleteSnapshot = useDeleteAssetSnapshot(assetId);

  const today = new Date().toISOString().slice(0, 10);

  // Min date for new snapshots: day after last snapshot
  const minDate = (() => {
    if (!snapshots?.length) return null;
    const last = [...snapshots]
      .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt))
      .at(-1)!
      .capturedAt.slice(0, 10);
    const d = new Date(last + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  })();

  const [date, setDate] = useState(today);
  const [addQty, setAddQty] = useState('');
  const [addPrice, setAddPrice] = useState('');
  const [editing, setEditing] = useState<EditingSnapshot | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const qty = Number(addQty);
    const prc = Number(addPrice);
    if (isNaN(qty) || qty < 0 || isNaN(prc) || prc < 0) return;
    const value = Math.round(qty * prc * 100) / 100;
    await addSnapshot.mutateAsync({ value, date, quantity: qty, price: prc });
    setAddQty('');
    setAddPrice('');
    setDate(today);
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const qty = Number(editing.quantity);
    const prc = Number(editing.price);
    if (isNaN(qty) || qty < 0 || isNaN(prc) || prc < 0) return;
    const value = Math.round(qty * prc * 100) / 100;
    await addSnapshot.mutateAsync({ value, date: editing.date, quantity: qty, price: prc });
    setEditing(null);
  }

  function startEdit(snapshot: {
    value: number;
    quantity?: number;
    price?: number;
    capturedAt: string;
  }) {
    setEditing({
      date: snapshot.capturedAt.slice(0, 10),
      value: String(snapshot.value),
      quantity: snapshot.quantity != null ? String(snapshot.quantity) : '',
      price: snapshot.price != null ? String(snapshot.price) : '',
    });
  }

  const inputClass =
    'border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand';

  return (
    <Modal title={`${t('assets.history')} — ${assetName}`} onClose={onClose}>
      {/* Edit form — shown when editing a snapshot */}
      {editing ? (
        <form
          onSubmit={handleEditSave}
          className="space-y-3 mb-5 p-3 rounded-lg bg-brand/5 dark:bg-brand/10 border border-brand/20"
        >
          <input
            type="date"
            value={editing.date}
            disabled
            className={`w-full ${inputClass} opacity-70 cursor-not-allowed`}
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                {t('assetForm.quantity')} *
              </label>
              <input
                type="number"
                value={editing.quantity}
                onChange={(e) => setEditing({ ...editing, quantity: e.target.value })}
                min={0}
                step="any"
                className={`w-full ${inputClass}`}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                {t('assets.pricePerUnit' as any)} *
              </label>
              <input
                type="number"
                value={editing.price}
                onChange={(e) => setEditing({ ...editing, price: e.target.value })}
                min={0}
                step="any"
                className={`w-full ${inputClass}`}
                required
              />
            </div>
          </div>
          {editing.quantity && editing.price && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('assetForm.currentValue')}:{' '}
              {formatCurrency(Number(editing.quantity) * Number(editing.price), currency)}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={addSnapshot.isPending}
              className="flex-1 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50"
            >
              {addSnapshot.isPending ? t('common.saving') : t('common.save')}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      ) : (
        /* Add form — shown when not editing */
        <form onSubmit={handleAdd} className="space-y-2 mb-5">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={minDate ?? undefined}
            className={`w-full ${inputClass}`}
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder={t('assetForm.quantity')}
              value={addQty}
              onChange={(e) => setAddQty(e.target.value)}
              min={0}
              step="any"
              className={inputClass}
              required
            />
            <input
              type="number"
              placeholder={t('assets.pricePerUnit' as any)}
              value={addPrice}
              onChange={(e) => setAddPrice(e.target.value)}
              min={0}
              step="any"
              className={inputClass}
              required
            />
          </div>
          {addQty && addPrice && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('assetForm.currentValue')}:{' '}
              {formatCurrency(Number(addQty) * Number(addPrice), currency)}
            </p>
          )}
          <button
            type="submit"
            disabled={addSnapshot.isPending}
            className="w-full bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50"
          >
            {t('common.add')}
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
      ) : !snapshots?.length ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
          {t('assets.noHistory')}
        </p>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {[...snapshots].reverse().map((s) => {
            const isEditingThis = editing?.date === s.capturedAt.slice(0, 10);
            return (
              <div
                key={s.id}
                className={`flex items-center py-2 text-sm gap-2 ${isEditingThis ? 'bg-brand/5 dark:bg-brand/10 -mx-2 px-2 rounded' : ''}`}
              >
                <span className="text-gray-500 dark:text-gray-400 shrink-0">
                  {s.capturedAt.slice(0, 10)}
                </span>
                <span className="ml-auto flex items-center gap-2">
                  {s.quantity != null && s.price != null && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {s.quantity} x {s.price}
                    </span>
                  )}
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {formatCurrency(s.value, currency)}
                  </span>
                </span>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => startEdit(s)}
                    className={`p-1 transition-colors ${isEditingThis ? 'text-brand' : 'text-gray-300 dark:text-gray-600 hover:text-brand'}`}
                    aria-label="Edit snapshot"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => deleteSnapshot.mutate(s.id)}
                    className="p-1 text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors"
                    aria-label="Delete snapshot"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
