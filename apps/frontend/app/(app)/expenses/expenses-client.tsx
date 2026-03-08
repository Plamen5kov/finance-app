'use client';

import { useState } from 'react';
import {
  useExpenses,
  useMonthlySummary,
  useExpenseCategories,
  useCreateExpense,
  useUpdateExpense,
  useReassignMerchant,
  useDeleteExpense,
  useCreateCategory,
  CreateExpenseInput,
  Expense,
} from '@/hooks/use-expenses';
import { ExpenseForm } from '@/components/expenses/expense-form';
import { Modal } from '@/components/ui/modal';
import { formatCurrency, formatDate, getMonthStr } from '@/lib/utils';
import { Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

export function ExpensesClient() {
  const [showForm, setShowForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);
  const [newCatName, setNewCatName] = useState('');
  const [reassignPrompt, setReassignPrompt] = useState<{
    expense: Expense;
    newCategoryId: string;
    newCategoryName: string;
  } | null>(null);

  const month = getMonthStr(monthOffset);
  const [year, mon] = month.split('-');
  const monthLabel = new Date(Number(year), Number(mon) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  const { data: allEntries, isLoading } = useExpenses({ month });
  // Expenses = negative amounts
  const expenses = (allEntries ?? []).filter((e) => e.amount < 0);
  const { data: summary } = useMonthlySummary(month);
  const { data: allCategories = [] } = useExpenseCategories();
  const categories = allCategories.filter((c) => c.type !== 'income');
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const reassignMerchant = useReassignMerchant();
  const deleteExpense = useDeleteExpense();
  const createCategory = useCreateCategory();

  async function handleCreate(input: CreateExpenseInput) {
    await createExpense.mutateAsync(input);
    setShowForm(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this expense?')) return;
    await deleteExpense.mutateAsync(id);
  }

  function handleCategoryChange(expense: Expense, newCategoryId: string) {
    if (newCategoryId === expense.categoryId) return;
    const newCat = categories.find((c) => c.id === newCategoryId);
    if (expense.merchant) {
      setReassignPrompt({
        expense,
        newCategoryId,
        newCategoryName: newCat?.name ?? 'Unknown',
      });
    } else {
      updateExpense.mutate({ id: expense.id, categoryId: newCategoryId });
    }
  }

  async function handleReassignYes() {
    if (!reassignPrompt) return;
    await reassignMerchant.mutateAsync({
      merchant: reassignPrompt.expense.merchant!,
      categoryId: reassignPrompt.newCategoryId,
    });
    setReassignPrompt(null);
  }

  async function handleReassignNo() {
    if (!reassignPrompt) return;
    await updateExpense.mutateAsync({
      id: reassignPrompt.expense.id,
      categoryId: reassignPrompt.newCategoryId,
    });
    setReassignPrompt(null);
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    await createCategory.mutateAsync({ name: newCatName.trim(), type: 'expense' });
    setNewCatName('');
    setShowCategoryForm(false);
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Expenses</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCategoryForm(true)}
            className="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
          >
            + Category
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-dark text-sm font-medium"
          >
            <Plus size={16} />
            Add Expense
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

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Total</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary?.total ?? 0)}</p>
        </div>
        {(summary?.byCategory ?? []).slice(0, 3).map((cat) => (
          <div key={cat.categoryId} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1 truncate">{cat.name}</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(cat.total)}</p>
            {summary && summary.total > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">{Math.round((cat.total / summary.total) * 100)}%</p>
            )}
          </div>
        ))}
      </div>

      {/* Expense list */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-14 bg-gray-200 rounded-lg animate-pulse" />)}
        </div>
      )}

      {!isLoading && expenses.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg font-medium">No expenses in {monthLabel}</p>
          <p className="text-sm mt-1">Add your first expense to start tracking</p>
        </div>
      )}

      {!isLoading && expenses.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {expenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {expense.description}
                    {expense.isRecurring && <span className="ml-2 text-xs text-brand bg-brand/10 px-1.5 py-0.5 rounded">recurring</span>}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={expense.categoryId}
                      onChange={(e) => handleCategoryChange(expense, e.target.value)}
                      className="text-sm text-gray-500 bg-transparent border-none cursor-pointer hover:text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand rounded px-1 py-0.5 -ml-1"
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(expense.date)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-red-600">-{formatCurrency(Math.abs(expense.amount))}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(expense.id)} className="text-gray-300 hover:text-red-500 transition-colors">
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
        <Modal title="Add Expense" onClose={() => setShowForm(false)}>
          {categories.length === 0 ? (
            <div className="text-center py-4 text-gray-500 text-sm">
              <p>Create a category first before adding expenses.</p>
              <button onClick={() => { setShowForm(false); setShowCategoryForm(true); }} className="mt-3 text-brand underline">
                Create category
              </button>
            </div>
          ) : (
            <ExpenseForm
              categories={categories}
              onSubmit={handleCreate}
              onCancel={() => setShowForm(false)}
              isLoading={createExpense.isPending}
            />
          )}
        </Modal>
      )}

      {showCategoryForm && (
        <Modal title="New Category" onClose={() => setShowCategoryForm(false)}>
          <form onSubmit={handleCreateCategory} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                placeholder="e.g. Food & Dining"
              />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowCategoryForm(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={createCategory.isPending} className="flex-1 bg-brand text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50">
                {createCategory.isPending ? 'Saving…' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {reassignPrompt && (
        <Modal title="Reassign Category" onClose={() => setReassignPrompt(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              Move <strong>all</strong> expenses from <strong>&ldquo;{reassignPrompt.expense.merchant}&rdquo;</strong> to <strong>&ldquo;{reassignPrompt.newCategoryName}&rdquo;</strong>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleReassignNo}
                disabled={updateExpense.isPending}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                {updateExpense.isPending ? 'Saving…' : 'No, just this one'}
              </button>
              <button
                onClick={handleReassignYes}
                disabled={reassignMerchant.isPending}
                className="flex-1 bg-brand text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50"
              >
                {reassignMerchant.isPending ? 'Saving…' : 'Yes, all of them'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
