'use client';

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreateAssetInput } from '@/hooks/use-assets';
import { ASSET_TYPES, CURRENCIES, GOLD_UNITS } from '@finances/shared';
import { formatCurrency } from '@/lib/utils';
import { useTranslation } from '@/i18n';

const schema = z.object({
  type: z.enum(ASSET_TYPES),
  name: z.string().min(1, 'Name is required').max(100),
  value: z.coerce.number().min(0, 'Must be 0 or more').optional().or(z.literal('')),
  quantity: z.coerce.number().min(0).optional().or(z.literal('')),
  price: z.coerce.number().min(0).optional().or(z.literal('')),
  costBasis: z.coerce.number().min(0).optional().or(z.literal('')),
  currency: z.string().max(10).optional(),
  ticker: z.string().max(20).optional().or(z.literal('')),
  coinId: z.string().max(50).optional().or(z.literal('')),
  goldUnit: z.enum(GOLD_UNITS).optional(),
});

type FormValues = z.infer<typeof schema>;

interface AssetFormProps {
  defaultValues?: Partial<CreateAssetInput>;
  onSubmit: (data: CreateAssetInput) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export function AssetForm({ defaultValues, onSubmit, onCancel, isLoading, submitLabel }: AssetFormProps) {
  const { t } = useTranslation();

  // Extract metadata fields from defaultValues
  const metaDefaults = defaultValues?.metadata as Record<string, unknown> | undefined;

  const { register, handleSubmit, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      currency: 'EUR',
      type: 'etf',
      ...defaultValues,
      ticker: (metaDefaults?.ticker as string) ?? '',
      coinId: (metaDefaults?.coinId as string) ?? '',
      goldUnit: (metaDefaults?.unit as 'g' | 'toz') ?? 'g',
    },
  });

  const selectedType = useWatch({ control, name: 'type' });
  const watchedTicker = useWatch({ control, name: 'ticker' });
  const watchedCoinId = useWatch({ control, name: 'coinId' });
  const watchedQuantity = useWatch({ control, name: 'quantity' });
  const watchedPrice = useWatch({ control, name: 'price' });
  const watchedCurrency = useWatch({ control, name: 'currency' });

  const isQuantityBased = selectedType !== 'apartment';
  const computedValue = watchedQuantity && watchedPrice
    ? Math.round(Number(watchedQuantity) * Number(watchedPrice) * 100) / 100
    : null;

  const hasTrackingId = !!(
    (selectedType === 'etf' && watchedTicker) ||
    (selectedType === 'crypto' && watchedCoinId) ||
    selectedType === 'gold'
  );
  const isAutoMode = hasTrackingId && !!watchedQuantity;

  async function submit(values: FormValues) {
    // Build metadata based on type
    let metadata: Record<string, unknown> | undefined;
    if (values.type === 'etf' && values.ticker) {
      metadata = { ticker: values.ticker };
    } else if (values.type === 'crypto' && values.coinId) {
      metadata = { coinId: values.coinId };
    } else if (values.type === 'gold' && values.goldUnit) {
      metadata = { metal: 'gold', unit: values.goldUnit };
    }

    const qty = values.quantity ? Number(values.quantity) : undefined;
    const prc = values.price ? Number(values.price) : undefined;
    const finalValue = (qty && prc)
      ? Math.round(qty * prc * 100) / 100
      : (values.value ? Number(values.value) : 0);

    await onSubmit({
      type: values.type,
      name: values.name,
      value: finalValue,
      quantity: qty,
      costBasis: values.costBasis ? Number(values.costBasis) : undefined,
      currency: values.currency,
      metadata,
    });
  }

  const inputClass = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand';

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assetForm.type')} *</label>
        <select {...register('type')} className={inputClass}>
          {ASSET_TYPES.map((tp) => (
            <option key={tp} value={tp}>{t(`assetType.${tp}` as any)}</option>
          ))}
        </select>
        {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assetForm.name')} *</label>
        <input {...register('name')} className={inputClass} placeholder="e.g. S&P 500 ETF" />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
      </div>

      {/* Metadata fields — conditional on type */}
      {selectedType === 'etf' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assetForm.ticker' as any)}</label>
          <input {...register('ticker')} className={inputClass} placeholder={t('assetForm.tickerPlaceholder' as any)} />
        </div>
      )}

      {selectedType === 'crypto' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assetForm.coinId' as any)}</label>
          <input {...register('coinId')} className={inputClass} placeholder={t('assetForm.coinIdPlaceholder' as any)} />
        </div>
      )}

      {selectedType === 'gold' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assetForm.goldUnit' as any)}</label>
          <select {...register('goldUnit')} className={inputClass}>
            {GOLD_UNITS.map((u) => (
              <option key={u} value={u}>{t(`assetForm.${u === 'g' ? 'grams' : 'troyOunces'}` as any)}</option>
            ))}
          </select>
        </div>
      )}

      {/* Auto vs manual mode indicator */}
      {isAutoMode && (
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-3 py-2">
          <p className="text-xs text-green-700 dark:text-green-400">
            {t('assets.autoTrackNote' as any)}
          </p>
        </div>
      )}

      {hasTrackingId && !watchedQuantity && (
        <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 px-3 py-2">
          <p className="text-xs text-yellow-700 dark:text-yellow-500">
            {t('assets.addQuantityNote' as any)}
          </p>
        </div>
      )}

      {isQuantityBased ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assetForm.quantity')} *</label>
              <input {...register('quantity')} type="number" step="any" className={inputClass} placeholder="0" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assets.pricePerUnit' as any)} *</label>
              <input {...register('price')} type="number" step="0.01" className={inputClass} placeholder="0.00" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assetForm.currency')}</label>
              <select {...register('currency')} className={inputClass}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          {computedValue != null && (
            <div className="rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {t('assetForm.currentValue')}: <span className="font-semibold">{formatCurrency(computedValue, watchedCurrency ?? 'EUR')}</span>
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assetForm.costBasis')}</label>
            <input {...register('costBasis')} type="number" step="0.01" className={inputClass} placeholder={t('common.optional')} />
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assetForm.currentValue')} *</label>
              <input {...register('value')} type="number" step="0.01" className={inputClass} placeholder="0.00" />
              {errors.value && <p className="text-red-500 text-xs mt-1">{errors.value.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assetForm.currency')}</label>
              <select {...register('currency')} className={inputClass}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
          {t('common.cancel')}
        </button>
        <button type="submit" disabled={isLoading} className="flex-1 bg-brand text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
          {isLoading ? t('common.saving') : (submitLabel ?? t('assets.addAsset'))}
        </button>
      </div>
    </form>
  );
}
