'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';
import { useGoalProgress, useAddGoalProgress, useDeleteGoalProgress } from '@/hooks/use-goals';
import { useTranslation } from '@/i18n';

interface Props {
  goalId: string;
  goalName: string;
  targetAmount: number;
  onClose: () => void;
}

export function GoalProgressModal({ goalId, goalName, targetAmount, onClose }: Props) {
  const { t } = useTranslation();
  const { data: snapshots, isLoading } = useGoalProgress(goalId);
  const addProgress = useAddGoalProgress(goalId);
  const deleteProgress = useDeleteGoalProgress(goalId);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [month, setMonth] = useState(currentMonth);
  const [amount, setAmount] = useState('');

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const num = Number(amount);
    if (isNaN(num) || num < 0) return;
    await addProgress.mutateAsync({ month, amount: num });
    setAmount('');
  }

  const inputClass =
    'border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand';

  return (
    <Modal title={`${t('goals.progress')} — ${goalName}`} onClose={onClose}>
      <form onSubmit={handleAdd} className="space-y-3 mb-5">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            {t('goals.month')}
          </label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className={`w-full ${inputClass}`}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            {t('goals.amountSaved')}
          </label>
          <input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={0}
            step="0.01"
            className={`w-full ${inputClass}`}
            required
            autoFocus
          />
        </div>
        <button
          type="submit"
          disabled={addProgress.isPending}
          className="w-full bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50"
        >
          {addProgress.isPending ? t('common.saving') : t('goals.recordProgress')}
        </button>
      </form>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
      ) : !snapshots?.length ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
          {t('goals.noProgress')}
        </p>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {[...snapshots].reverse().map((s) => (
            <div key={s.id} className="flex items-center py-2 text-sm gap-2">
              <span className="text-gray-500 dark:text-gray-400 shrink-0">
                {s.month.slice(0, 7)}
              </span>
              <span className="ml-auto flex items-center gap-3">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  +{formatCurrency(s.actualSavedThisMonth)}
                </span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {formatCurrency(s.balanceAsOf)}
                </span>
              </span>
              <button
                onClick={() => deleteProgress.mutate(s.id)}
                className="p-1 text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors shrink-0"
                aria-label="Delete entry"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {snapshots && snapshots.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">{t('goalTracking.target')}</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {formatCurrency(targetAmount)}
          </span>
        </div>
      )}
    </Modal>
  );
}
