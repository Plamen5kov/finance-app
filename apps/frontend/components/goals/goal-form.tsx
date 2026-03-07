'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreateGoalInput } from '@/hooks/use-goals';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  targetAmount: z.coerce.number().positive('Must be positive'),
  targetDate: z.string().optional(),
  recurringPeriod: z.enum(['monthly', 'annual', '']).optional(),
  priority: z.coerce.number().min(1).max(3).optional(),
  description: z.string().max(500).optional(),
  category: z.string().max(50).optional(),
});

type FormValues = z.infer<typeof schema>;

interface GoalFormProps {
  onSubmit: (data: CreateGoalInput) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function GoalForm({ onSubmit, onCancel, isLoading }: GoalFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function submit(values: FormValues) {
    await onSubmit({
      name: values.name,
      targetAmount: values.targetAmount,
      targetDate: values.targetDate || undefined,
      recurringPeriod: (values.recurringPeriod as 'monthly' | 'annual') || null,
      priority: values.priority,
      description: values.description,
      category: values.category,
    });
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
        <input
          {...register('name')}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          placeholder="e.g. Emergency Fund"
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Target Amount *</label>
          <input
            {...register('targetAmount')}
            type="number"
            step="0.01"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            placeholder="10000"
          />
          {errors.targetAmount && <p className="text-red-500 text-xs mt-1">{errors.targetAmount.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Target Date</label>
          <input
            {...register('targetDate')}
            type="date"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Recurring</label>
          <select
            {...register('recurringPeriod')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <option value="">One-time</option>
            <option value="monthly">Monthly</option>
            <option value="annual">Annual</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select
            {...register('priority')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <option value="1">1 — High</option>
            <option value="2">2 — Medium</option>
            <option value="3">3 — Low</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
        <input
          {...register('category')}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          placeholder="e.g. Retirement, Travel"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          {...register('description')}
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"
          placeholder="Optional notes"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 bg-brand text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50"
        >
          {isLoading ? 'Saving…' : 'Create Goal'}
        </button>
      </div>
    </form>
  );
}
