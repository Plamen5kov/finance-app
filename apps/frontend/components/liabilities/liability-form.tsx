'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreateLiabilityInput, MortgageMetadata, LeasingMetadata } from '@/hooks/use-liabilities';
import { LIABILITY_TYPES, CURRENCIES, MORTGAGE_EVENT_TYPES } from '@finances/shared';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from '@/i18n';

const eventSchema = z.object({
  id: z.string(),
  type: z.enum(MORTGAGE_EVENT_TYPES),
  date: z.string().min(1, 'Date required'),
  newRate: z.coerce.number().min(0).max(100).optional().or(z.literal('')),
  newMonthlyPayment: z.coerce.number().min(0).optional().or(z.literal('')),
  amount: z.coerce.number().min(0).optional().or(z.literal('')),
  newBalance: z.coerce.number().min(0).optional().or(z.literal('')),
  notes: z.string().optional(),
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
  events: z.array(eventSchema).optional(),
  // Leasing-specific fields
  originalValue: z.coerce.number().min(0).optional().or(z.literal('')),
  downPayment: z.coerce.number().min(0).optional().or(z.literal('')),
  residualValue: z.coerce.number().min(0).optional().or(z.literal('')),
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
  const meta = defaults?.metadata as (MortgageMetadata & LeasingMetadata) | undefined;
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
    events: (meta as MortgageMetadata | undefined)?.events ?? [],
    originalValue: (meta as LeasingMetadata | undefined)?.originalValue ?? ('' as unknown as number),
    downPayment: (meta as LeasingMetadata | undefined)?.downPayment ?? ('' as unknown as number),
    residualValue: (meta as LeasingMetadata | undefined)?.residualValue ?? ('' as unknown as number),
  };
}

export function LiabilityForm({ defaultValues, onSubmit, onCancel, isLoading, submitLabel }: LiabilityFormProps) {
  const { t } = useTranslation();

  const EVENT_TYPE_LABELS: Record<string, string> = {
    rate_change: t('events.rateChange'),
    payment_change: t('events.paymentChange'),
    extra_payment: t('events.extraPayment'),
    refinance: t('events.refinance'),
  };
  const { register, handleSubmit, watch, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormDefaults(defaultValues),
  });

  const { fields: eventFields, append: appendEvent, remove: removeEvent } = useFieldArray({
    control,
    name: 'events',
  });

  const selectedType = watch('type');
  const showMortgageFields = selectedType === 'mortgage' || selectedType === 'loan';
  const showLeasingFields = selectedType === 'leasing';

  async function submit(values: FormValues) {
    let metadata: MortgageMetadata | LeasingMetadata | undefined;

    if (showMortgageFields) {
      const events = (values.events ?? [])
        .filter((e) => e.date)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((e) => ({
          id: e.id || crypto.randomUUID(),
          type: e.type,
          date: e.date,
          ...(e.newRate != null && e.newRate !== '' ? { newRate: Number(e.newRate) } : {}),
          ...(e.newMonthlyPayment != null && e.newMonthlyPayment !== '' ? { newMonthlyPayment: Number(e.newMonthlyPayment) } : {}),
          ...(e.amount != null && e.amount !== '' ? { amount: Number(e.amount) } : {}),
          ...(e.newBalance != null && e.newBalance !== '' ? { newBalance: Number(e.newBalance) } : {}),
          ...(e.notes ? { notes: e.notes } : {}),
        }));
      metadata = {
        originalAmount: Number(values.originalAmount) || 0,
        interestRate: Number(values.interestRate) || 0,
        monthlyPayment: Number(values.monthlyPayment) || 0,
        termMonths: Number(values.termMonths) || 0,
        startDate: values.startDate ?? '',
        events,
      };
    } else if (showLeasingFields) {
      metadata = {
        originalValue: Number(values.originalValue) || 0,
        downPayment: Number(values.downPayment) || 0,
        residualValue: Number(values.residualValue) || 0,
        interestRate: Number(values.interestRate) || 0,
        monthlyPayment: Number(values.monthlyPayment) || 0,
        termMonths: Number(values.termMonths) || 0,
        startDate: values.startDate ?? '',
      };
    }

    await onSubmit({
      type: values.type,
      name: values.name,
      value: 0, // calculated by backend from metadata
      currency: values.currency,
      metadata,
    });
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      {/* Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('assetForm.type')} *</label>
        <select
          {...register('type')}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        >
          {LIABILITY_TYPES.map((tp) => (
            <option key={tp} value={tp}>{t(`liabilityType.${tp}` as any)}</option>
          ))}
        </select>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('assetForm.name')} *</label>
        <input
          {...register('name')}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          placeholder="e.g. Home Mortgage"
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
      </div>

      {/* Currency */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('assetForm.currency')}</label>
        <select
          {...register('currency')}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Leasing specific fields */}
      {showLeasingFields && (
        <div className="border-t border-gray-100 pt-4 space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('liabilityForm.leaseDetails')}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('liabilityForm.assetValue')}</label>
              <input
                {...register('originalValue')}
                type="number"
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                placeholder="e.g. 40000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('liabilityForm.downPayment')}</label>
              <input
                {...register('downPayment')}
                type="number"
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('liabilityForm.balloonPayment')}</label>
              <input
                {...register('residualValue')}
                type="number"
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                placeholder="e.g. 10000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('liabilityForm.interestRate')}</label>
              <input
                {...register('interestRate')}
                type="number"
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                placeholder="e.g. 5.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('liabilityForm.monthlyPayment')}</label>
              <input
                {...register('monthlyPayment')}
                type="number"
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('liabilityForm.termMonths')}</label>
              <input
                {...register('termMonths')}
                type="number"
                step="1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                placeholder="e.g. 48"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('liabilityForm.startDate')}</label>
            <input
              {...register('startDate')}
              type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
        </div>
      )}

      {/* Mortgage / Loan specific fields */}
      {showMortgageFields && (
        <div className="border-t border-gray-100 pt-4 space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('liabilityForm.loanDetails')}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('liabilityForm.originalAmount')}</label>
              <input
                {...register('originalAmount')}
                type="number"
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('liabilityForm.termMonths')}</label>
              <input
                {...register('termMonths')}
                type="number"
                step="1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                placeholder="e.g. 300"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('liabilityForm.initialRate')}</label>
              <input
                {...register('interestRate')}
                type="number"
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                placeholder="e.g. 2.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('liabilityForm.initialPayment')}</label>
              <input
                {...register('monthlyPayment')}
                type="number"
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('liabilityForm.startDate')}</label>
            <input
              {...register('startDate')}
              type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          {/* Lifecycle Events */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">{t('events.title')}</label>
              <button
                type="button"
                onClick={() => appendEvent({ id: crypto.randomUUID(), type: 'rate_change', date: '', newRate: '' as unknown as number, newMonthlyPayment: '' as unknown as number, amount: '' as unknown as number, newBalance: '' as unknown as number, notes: '' })}
                className="flex items-center gap-1 text-xs text-brand hover:text-brand-dark font-medium"
              >
                <Plus size={12} /> {t('events.addEvent')}
              </button>
            </div>
            {eventFields.length === 0 && (
              <p className="text-xs text-gray-400 italic">{t('events.noEvents')}</p>
            )}
            <div className="space-y-3">
              {eventFields.map((field, index) => {
                const eventType = watch(`events.${index}.type`);
                const showRate = eventType === 'rate_change' || eventType === 'refinance';
                const showPayment = eventType === 'payment_change' || eventType === 'refinance';
                const showAmount = eventType === 'extra_payment';
                const showBalance = eventType === 'refinance';

                return (
                  <div key={field.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                    <div className="flex gap-2 items-center">
                      <select
                        {...register(`events.${index}.type`)}
                        className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                      >
                        {MORTGAGE_EVENT_TYPES.map((et) => (
                          <option key={et} value={et}>{EVENT_TYPE_LABELS[et]}</option>
                        ))}
                      </select>
                      <input
                        {...register(`events.${index}.date`)}
                        type="date"
                        className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                      <button
                        type="button"
                        onClick={() => removeEvent(index)}
                        className="p-1.5 text-gray-300 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {showRate && (
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">{t('events.newRate')}</label>
                          <input
                            {...register(`events.${index}.newRate`)}
                            type="number"
                            step="0.01"
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                            placeholder="2.58"
                          />
                        </div>
                      )}
                      {showPayment && (
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">{t('events.newPayment')}</label>
                          <input
                            {...register(`events.${index}.newMonthlyPayment`)}
                            type="number"
                            step="0.01"
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                            placeholder="1010.01"
                          />
                        </div>
                      )}
                      {showAmount && (
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">{t('events.extraAmount')}</label>
                          <input
                            {...register(`events.${index}.amount`)}
                            type="number"
                            step="0.01"
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                            placeholder="5000"
                          />
                        </div>
                      )}
                      {showBalance && (
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">{t('events.newBalance')}</label>
                          <input
                            {...register(`events.${index}.newBalance`)}
                            type="number"
                            step="0.01"
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                            placeholder="116318.90"
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <input
                        {...register(`events.${index}.notes`)}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand"
                        placeholder={t('events.notesPlaceholder')}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">
          {t('common.cancel')}
        </button>
        <button type="submit" disabled={isLoading} className="flex-1 bg-brand text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
          {isLoading ? t('common.saving') : (submitLabel ?? t('common.save'))}
        </button>
      </div>
    </form>
  );
}
