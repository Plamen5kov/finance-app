'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreateAssetInput } from '@/hooks/use-assets';

const ASSET_TYPES = ['mortgage', 'etf', 'crypto', 'gold'] as const;

const schema = z.object({
  type: z.enum(ASSET_TYPES),
  name: z.string().min(1, 'Name is required').max(100),
  value: z.coerce.number().min(0, 'Must be 0 or more'),
  quantity: z.coerce.number().min(0).optional().or(z.literal('')),
  costBasis: z.coerce.number().min(0).optional().or(z.literal('')),
  currency: z.string().max(10).optional(),
});

type FormValues = z.infer<typeof schema>;

interface AssetFormProps {
  defaultValues?: Partial<CreateAssetInput>;
  onSubmit: (data: CreateAssetInput) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export function AssetForm({ defaultValues, onSubmit, onCancel, isLoading, submitLabel = 'Add Asset' }: AssetFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currency: 'BGN', type: 'etf', ...defaultValues },
  });

  async function submit(values: FormValues) {
    await onSubmit({
      type: values.type,
      name: values.name,
      value: values.value,
      quantity: values.quantity ? Number(values.quantity) : undefined,
      costBasis: values.costBasis ? Number(values.costBasis) : undefined,
      currency: values.currency,
    });
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
        <select
          {...register('type')}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        >
          {ASSET_TYPES.map((t) => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
        {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
        <input
          {...register('name')}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          placeholder="e.g. S&P 500 ETF"
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current Value *</label>
          <input
            {...register('value')}
            type="number"
            step="0.01"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            placeholder="0.00"
          />
          {errors.value && <p className="text-red-500 text-xs mt-1">{errors.value.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
          <input
            {...register('currency')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            placeholder="BGN"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
          <input
            {...register('quantity')}
            type="number"
            step="any"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            placeholder="Optional"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cost Basis</label>
          <input
            {...register('costBasis')}
            type="number"
            step="0.01"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">
          Cancel
        </button>
        <button type="submit" disabled={isLoading} className="flex-1 bg-brand text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
          {isLoading ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
