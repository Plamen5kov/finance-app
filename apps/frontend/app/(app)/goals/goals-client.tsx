'use client';

import { useState } from 'react';
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal, useEmergencyFundAdvice, CreateGoalInput, Goal } from '@/hooks/use-goals';
import { GoalCard } from '@/components/goals/goal-card';
import { GoalForm } from '@/components/goals/goal-form';
import { EmergencyFundAdvisor } from '@/components/goals/emergency-fund-advisor';
import { Modal } from '@/components/ui/modal';
import { Plus } from 'lucide-react';
import { useTranslation } from '@/i18n';

export function GoalsClient() {
  const { t } = useTranslation();

  const FILTER_OPTIONS = [
    { label: t('goals.filterAll'), value: undefined },
    { label: t('goals.filterMonthly'), value: 'monthly' },
    { label: t('goals.filterAnnual'), value: 'annual' },
    { label: t('goals.filterOneTime'), value: 'null' },
  ];
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [filter, setFilter] = useState<string | undefined>(undefined);

  const { data: goals, isLoading } = useGoals(filter !== undefined ? { recurringPeriod: filter } : undefined);
  const { data: advice } = useEmergencyFundAdvice();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal(editingGoal?.id ?? '');
  const deleteGoal = useDeleteGoal();

  async function handleCreate(input: CreateGoalInput) {
    await createGoal.mutateAsync(input);
    setShowForm(false);
  }

  async function handleUpdate(input: CreateGoalInput) {
    await updateGoal.mutateAsync(input);
    setEditingGoal(null);
  }

  async function handleDelete(id: string) {
    if (!confirm(t('goals.deleteConfirm'))) return;
    await deleteGoal.mutateAsync(id);
  }

  const activeGoals = goals?.filter((g) => g.status === 'active' || g.status === 'at_risk') ?? [];
  const completedGoals = goals?.filter((g) => g.status === 'completed') ?? [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{t('goals.title')}</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-dark text-sm font-medium"
        >
          <Plus size={16} />
          {t('goals.newGoal')}
        </button>
      </div>

      {/* Emergency fund advisor */}
      {advice && <EmergencyFundAdvisor advice={advice} />}

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 w-full sm:w-fit overflow-x-auto">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={String(opt.value)}
            onClick={() => setFilter(opt.value)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === opt.value ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && goals?.length === 0 && (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-lg font-medium">{t('goals.noGoals')}</p>
          <p className="text-sm mt-1">{t('goals.createFirst')}</p>
        </div>
      )}

      {!isLoading && activeGoals.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">{t('goals.active')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onDelete={handleDelete}
                onEdit={setEditingGoal}
                emergencyAdvice={goal.category === 'emergency' ? advice : undefined}
              />
            ))}
          </div>
        </section>
      )}

      {!isLoading && completedGoals.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">{t('goals.completed')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 opacity-70">
            {completedGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onDelete={handleDelete}
                onEdit={setEditingGoal}
                emergencyAdvice={goal.category === 'emergency' ? advice : undefined}
              />
            ))}
          </div>
        </section>
      )}

      {showForm && (
        <Modal title={t('goals.newGoal')} onClose={() => setShowForm(false)}>
          <GoalForm
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
            isLoading={createGoal.isPending}
          />
        </Modal>
      )}

      {editingGoal && (
        <Modal title={t('goals.editGoal')} onClose={() => setEditingGoal(null)}>
          <GoalForm
            goal={editingGoal}
            onSubmit={handleUpdate}
            onCancel={() => setEditingGoal(null)}
            isLoading={updateGoal.isPending}
          />
        </Modal>
      )}
    </div>
  );
}
