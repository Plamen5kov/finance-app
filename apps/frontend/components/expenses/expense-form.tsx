'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreateExpenseInput, ExpenseCategory } from '@/hooks/use-expenses';
import { useTranslation } from '@/i18n';

const schema = z.object({
  amount: z.coerce.number().positive('Must be positive'),
  description: z.string().min(1, 'Description is required').max(200),
  date: z.string().min(1, 'Date is required'),
  categoryId: z.string().min(1, 'Category is required'),
  notes: z.string().max(500).optional(),
  isRecurring: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ExpenseFormProps {
  categories: ExpenseCategory[];
  onSubmit: (data: CreateExpenseInput) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ExpenseForm({ categories, onSubmit, onCancel, isLoading }: ExpenseFormProps) {
  const { t } = useTranslation();
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { date: new Date().toISOString().split('T')[0], isRecurring: false },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('expenseForm.amount')} *</label>
          <input
            {...register('amount')}
            type="number"
            step="0.01"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            placeholder="0.00"
          />
          {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('expenseForm.date')} *</label>
          <input
            {...register('date')}
            type="date"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
          {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('expenseForm.description')} *</label>
        <input
          {...register('description')}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          placeholder="e.g. Grocery shopping"
        />
        {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('expenseForm.category')} *</label>
        <select
          {...register('categoryId')}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="">{t('expenseForm.selectCategory')}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ''}{c.name}</option>
          ))}
        </select>
        {errors.categoryId && <p className="text-red-500 text-xs mt-1">{errors.categoryId.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('expenseForm.notes')}</label>
        <textarea
          {...register('notes')}
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"
          placeholder="Optional"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input {...register('isRecurring')} type="checkbox" className="rounded" />
        {t('expenseForm.recurringExpense')}
      </label>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">
          {t('common.cancel')}
        </button>
        <button type="submit" disabled={isLoading} className="flex-1 bg-brand text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
          {isLoading ? t('common.saving') : t('expenses.addExpense')}
        </button>
      </div>
    </form>
  );
}
