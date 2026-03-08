'use client';

import { useState } from 'react';
import {
  useExpenses,
  useExpenseCategories,
  useCreateExpense,
  useDeleteExpense,
  useUpdateExpense,
  useCreateCategory,
  CreateExpenseInput,
  Expense,
} from '@/hooks/use-expenses';
import { Modal } from '@/components/ui/modal';
import { formatCurrency, formatDate, getMonthStr } from '@/lib/utils';
import { Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/i18n';

export function IncomeClient() {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [monthOffset, setMonthOffset] = useState(0);

  const month = getMonthStr(monthOffset);
  const [year, mon] = month.split('-');
  const monthLabel = new Date(Number(year), Number(mon) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  const { data: allEntries, isLoading } = useExpenses({ month });
  const { data: allCategories = [] } = useExpenseCategories();
  const categories = allCategories.filter((c) => c.type === 'income');
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const createCategory = useCreateCategory();

  // Income = positive amounts
  const incomeEntries = (allEntries ?? []).filter((e) => e.amount > 0);
  const totalIncome = incomeEntries.reduce((sum, e) => sum + e.amount, 0);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const input: CreateExpenseInput = {
      amount: parseFloat(form.get('amount') as string), // positive = income
      description: form.get('description') as string,
      date: form.get('date') as string,
      categoryId: form.get('categoryId') as string,
    };
    if (!input.amount || !input.description || !input.date || !input.categoryId) return;
    await createExpense.mutateAsync(input);
    setShowForm(false);
  }

  async function handleDelete(id: string) {
    if (!confirm(t('income.deleteConfirm'))) return;
    await deleteExpense.mutateAsync(id);
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    await createCategory.mutateAsync({ name: newCatName.trim(), type: 'income' });
    setNewCatName('');
    setShowCategoryForm(false);
  }

  function handleCategoryChange(income: Expense, newCategoryId: string) {
    if (newCategoryId === income.categoryId) return;
    updateExpense.mutate({ id: income.id, categoryId: newCategoryId });
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('income.title')}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCategoryForm(true)}
            className="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
          >
            {t('expenses.addCategory')}
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-dark text-sm font-medium"
          >
            <Plus size={16} />
            {t('income.addIncome')}
          </button>
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center gap-2 sm:gap-4 mb-6">
        <button onClick={() => setMonthOffset((o) => o - 1)} className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200">
          <ChevronLeft size={18} />
        </button>
        <h2 className="text-base sm:text-lg font-semibold text-gray-700 min-w-[140px] sm:min-w-[180px] text-center">{monthLabel}</h2>
        <button
          onClick={() => setMonthOffset((o) => o + 1)}
          disabled={monthOffset >= 0}
          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-8 inline-block">
        <p className="text-xs text-gray-500 mb-1">{t('income.totalIncome')}</p>
        <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
      </div>

      {/* Income list */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-gray-200 rounded-lg animate-pulse" />)}
        </div>
      )}

      {!isLoading && incomeEntries.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg font-medium">{t('income.noIncome', { month: monthLabel })}</p>
          <p className="text-sm mt-1">{t('income.addFirst')}</p>
        </div>
      )}

      {!isLoading && incomeEntries.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">{t('table.description')}</th>
                <th className="px-4 py-3 text-left">{t('table.category')}</th>
                <th className="px-4 py-3 text-left">{t('table.date')}</th>
                <th className="px-4 py-3 text-right">{t('table.amount')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {incomeEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{entry.description}</td>
                  <td className="px-4 py-3">
                    <select
                      value={entry.categoryId}
                      onChange={(e) => handleCategoryChange(entry, e.target.value)}
                      className="text-sm text-gray-500 bg-transparent border-none cursor-pointer hover:text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand rounded px-1 py-0.5 -ml-1"
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(entry.date)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-green-600">{formatCurrency(entry.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(entry.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <Modal title={t('income.addIncome')} onClose={() => setShowForm(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('expenseForm.description')} *</label>
              <input name="description" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" placeholder="e.g. Monthly salary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('expenseForm.amount')} *</label>
              <input name="amount" type="number" step="0.01" min="0.01" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('expenseForm.date')} *</label>
              <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('expenseForm.category')}</label>
              <select name="categoryId" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white">
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">{t('common.cancel')}</button>
              <button type="submit" disabled={createExpense.isPending} className="flex-1 bg-brand text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
                {createExpense.isPending ? t('common.saving') : t('income.addIncome')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showCategoryForm && (
        <Modal title={t('income.newCategory')} onClose={() => setShowCategoryForm(false)}>
          <form onSubmit={handleCreateCategory} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.name')} *</label>
              <input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                placeholder="e.g. Freelance, Dividends"
              />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowCategoryForm(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">
                {t('common.cancel')}
              </button>
              <button type="submit" disabled={createCategory.isPending} className="flex-1 bg-brand text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
                {createCategory.isPending ? t('common.saving') : t('common.create')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
