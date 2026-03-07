'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreateLiabilityInput, MortgageMetadata } from '@/hooks/use-liabilities';
import { LIABILITY_TYPES, CURRENCIES } from '@finances/shared';
import { Plus, Trash2 } from 'lucide-react';

const rateChangeSchema = z.object({
  date: z.string().min(1, 'Date required'),
  rate: z.coerce.number().min(0).max(100),
});

const schema = z.object({
  type: z.enum(LIABILITY_TYPES),
  name: z.string().min(1, 'Name is required').max(100),
  value: z.coerce.number().min(0, 'Must be 0 or more'),
  currency: z.string().max(10).optional(),
  // Mortgage / loan extra fields
  originalAmount: z.coerce.number().min(0).optional().or(z.literal('')),
  interestRate: z.coerce.number().min(0).max(100).optional().or(z.literal('')),
  monthlyPayment: z.coerce.number().min(0).optional().or(z.literal('')),
  termMonths: z.coerce.number().min(0).optional().or(z.literal('')),
  startDate: z.string().optional(),
  rateHistory: z.array(rateChangeSchema).optional(),
});

type FormValues = z.infer<typeof schema>;

interface LiabilityFormProps {
  defaultValues?: Partial<CreateLiabilityInput>;
  onSubmit: (data: CreateLiabilityInput) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

function toFormDefaults(defaults?: Partial<CreateLiabilityInput>): Partial<FormValues> {
  const meta = defaults?.metadata as MortgageMetadata | undefined;
  return {
    type: defaults?.type ?? 'mortgage',
    name: defaults?.name ?? '',
    value: defaults?.value ?? ('' as unknown as number),
    currency: defaults?.currency ?? 'EUR',
    originalAmount: meta?.originalAmount ?? ('' as unknown as number),
    interestRate: meta?.interestRate ?? ('' as unknown as number),
    monthlyPayment: meta?.monthlyPayment ?? ('' as unknown as number),
    termMonths: meta?.termMonths ?? ('' as unknown as number),
    startDate: meta?.startDate ?? '',
    rateHistory: meta?.rateHistory ?? [],
  };
}

export function LiabilityForm({ defaultValues, onSubmit, onCancel, isLoading, submitLabel = 'Save' }: LiabilityFormProps) {
  const { register, handleSubmit, watch, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormDefaults(defaultValues),
  });

  const { fields: rateFields, append: appendRate, remove: removeRate } = useFieldArray({
    control,
    name: 'rateHistory',
  });

  const selectedType = watch('type');
  const showMortgageFields = selectedType === 'mortgage' || selectedType === 'loan';

  async function submit(values: FormValues) {
    let metadata: MortgageMetadata | undefined;

    if (showMortgageFields) {
      const sortedRateHistory = (values.rateHistory ?? [])
        .filter((r) => r.date && r.rate != null)
        .sort((a, b) => a.date.localeCompare(b.date));

      // Current rate = latest entry in rate history, or the interestRate field
      const latestRate = sortedRateHistory.at(-1)?.rate ?? Number(values.interestRate) || 0;

      metadata = {
        originalAmount: Number(values.originalAmount) || 0,
        interestRate: latestRate,
        monthlyPayment: Number(values.monthlyPayment) || 0,
        termMonths: Number(values.termMonths) || 0,
        startDate: values.startDate ?? '',
        rateHistory: sortedRateHistory,
      };
    }

    await onSubmit({
      type: values.type,
      name: values.name,
      value: values.value,
      currency: values.currency,
      metadata,
    });
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      {/* Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
        <select
          {...register('type')}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        >
          {LIABILITY_TYPES.map((t) => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
        <input
          {...register('name')}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          placeholder="e.g. Home Mortgage"
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
      </div>

      {/* Balance + Currency */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Outstanding Balance *</label>
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
          <select
            {...register('currency')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Mortgage / Loan specific fields */}
      {showMortgageFields && (
        <div className="border-t border-gray-100 pt-4 space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Loan Details</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Original Amount</label>
              <input
                {...register('originalAmount')}
                type="number"
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Term (months)</label>
              <input
                {...register('termMonths')}
                type="number"
                step="1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                placeholder="e.g. 300"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Payment</label>
              <input
                {...register('monthlyPayment')}
                type="number"
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                {...register('startDate')}
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>

          {/* Rate History */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Interest Rate History</label>
              <button
                type="button"
                onClick={() => appendRate({ date: '', rate: 0 })}
                className="flex items-center gap-1 text-xs text-brand hover:text-brand-dark font-medium"
              >
                <Plus size={12} /> Add Rate
              </button>
            </div>
            {rateFields.length === 0 && (
              <p className="text-xs text-gray-400 italic">No rate history — click "Add Rate" to record the initial rate.</p>
            )}
            <div className="space-y-2">
              {rateFields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-center">
                  <input
                    {...register(`rateHistory.${index}.date`)}
                    type="date"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      {...register(`rateHistory.${index}.rate`)}
                      type="number"
                      step="0.01"
                      className="w-24 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                      placeholder="3.50"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRate(index)}
                    className="p-1.5 text-gray-300 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
