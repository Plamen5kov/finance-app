'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GOLD_UNITS } from '@finances/shared';
import { Asset, useAddAssetSnapshot, useUpdateAsset, useAssetSnapshots } from '@/hooks/use-assets';
import { useTranslation } from '@/i18n';
import { AssetSnapshotModal } from './asset-snapshot-modal';
import { History } from 'lucide-react';

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  value: z.coerce.number().min(0, 'Must be 0 or more'),
  quantity: z.coerce.number().min(0).optional().or(z.literal('')),
  costBasis: z.coerce.number().min(0).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

interface AssetEntryFormProps {
  asset: Asset;
  onDone: () => void;
}

export function AssetEntryForm({ asset, onDone }: AssetEntryFormProps) {
  const { t } = useTranslation();
  const addSnapshot = useAddAssetSnapshot(asset.id);
  const updateAsset = useUpdateAsset(asset.id);
  const { data: snapshots } = useAssetSnapshots(asset.id);
  const [showHistory, setShowHistory] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  // Min date = day after the last snapshot (dim everything up to and including it)
  const minDate = (() => {
    if (!snapshots?.length) return null;
    const last = [...snapshots].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt)).at(-1)!.capturedAt.slice(0, 10);
    const d = new Date(last + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  })();

  const meta = asset.metadata as Record<string, unknown> | undefined;
  const ticker = meta?.ticker as string | undefined;
  const coinId = meta?.coinId as string | undefined;
  const isGold = meta?.metal === 'gold';
  const goldUnit = (meta?.unit as string) ?? 'g';

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: today,
      value: asset.value,
      quantity: asset.quantity,
      costBasis: asset.costBasis,
    },
  });

  async function submit(values: FormValues) {
    const quantity = values.quantity ? Number(values.quantity) : undefined;
    const costBasis = values.costBasis ? Number(values.costBasis) : undefined;

    await Promise.all([
      addSnapshot.mutateAsync({ value: values.value, date: values.date }),
      updateAsset.mutateAsync({ value: values.value, quantity, costBasis }),
    ]);
    onDone();
  }

  const inputClass = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand';
  const disabledClass = 'w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 cursor-not-allowed';

  const isPending = addSnapshot.isPending || updateAsset.isPending;

  if (showHistory) {
    return (
      <AssetSnapshotModal
        assetId={asset.id}
        assetName={asset.name}
        onClose={() => setShowHistory(false)}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      {/* Identity fields — disabled */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assetForm.type')}</label>
          <input type="text" value={t(`assetType.${asset.type}` as any)} disabled className={disabledClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assetForm.name')}</label>
          <input type="text" value={asset.name} disabled className={disabledClass} />
        </div>
      </div>

      {/* Tracking metadata — disabled */}
      {asset.type === 'etf' && ticker && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assetForm.ticker' as any)}</label>
          <input type="text" value={ticker} disabled className={disabledClass} />
        </div>
      )}
      {asset.type === 'crypto' && coinId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assetForm.coinId' as any)}</label>
          <input type="text" value={coinId} disabled className={disabledClass} />
        </div>
      )}
      {asset.type === 'gold' && isGold && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assetForm.goldUnit' as any)}</label>
          <input type="text" value={t(`assetForm.${goldUnit === 'g' ? 'grams' : 'troyOunces'}` as any)} disabled className={disabledClass} />
        </div>
      )}

      {/* Currency — disabled */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assetForm.currency')}</label>
        <input type="text" value={asset.currency ?? 'EUR'} disabled className={disabledClass} />
      </div>

      {/* Date — editable, min >= last snapshot */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assetForm.date' as any)} *</label>
        <input
          {...register('date')}
          type="date"
          min={minDate ?? undefined}
          className={inputClass}
          required
        />
      </div>

      {/* Value — editable */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assetForm.currentValue')} *</label>
        <input {...register('value')} type="number" step="0.01" className={inputClass} placeholder="0.00" />
        {errors.value && <p className="text-red-500 text-xs mt-1">{errors.value.message}</p>}
      </div>

      {/* Quantity + Cost basis — editable */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assetForm.quantity')}</label>
          <input {...register('quantity')} type="number" step="any" className={inputClass} placeholder={t('common.optional')} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assetForm.costBasis')}</label>
          <input {...register('costBasis')} type="number" step="0.01" className={inputClass} placeholder={t('common.optional')} />
        </div>
      </div>

      {/* View history link */}
      <button
        type="button"
        onClick={() => setShowHistory(true)}
        className="flex items-center gap-1.5 text-sm text-brand hover:text-brand-dark transition-colors"
      >
        <History size={14} />
        {t('assets.viewHistory' as any)}
      </button>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onDone} className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
          {t('common.cancel')}
        </button>
        <button type="submit" disabled={isPending} className="flex-1 bg-brand text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
          {isPending ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </form>
  );
}
