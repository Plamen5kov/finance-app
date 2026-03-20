'use client';

import { useState } from 'react';
import { Goal, EmergencyFundAdvice } from '@/hooks/use-goals';
import { formatCurrency, formatDate, monthsUntil } from '@/lib/utils';
import { Trash2, Calendar, TrendingUp, Pencil, ShieldCheck } from 'lucide-react';
import { useTranslation, TranslationKey } from '@/i18n';
import { Modal } from '@/components/ui/modal';
import { EmergencyFundControls } from './emergency-fund-advisor';
import { GoalProgressModal } from './goal-progress-modal';

type BudgetType = 'on_track' | 'behind' | 'ahead' | 'overdue' | 'completed_soon';

const BUDGET_TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  on_track: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-400',
    label: 'budgetAdvice.onTrack',
  },
  ahead: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-400',
    label: 'budgetAdvice.ahead',
  },
  behind: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-400',
    label: 'budgetAdvice.behind',
  },
  overdue: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-400',
    label: 'budgetAdvice.overdue',
  },
  completed_soon: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-400',
    label: 'budgetAdvice.completedSoon',
  },
};

interface GoalCardProps {
  goal: Goal;
  onDelete: (id: string) => void;
  onEdit: (goal: Goal) => void;
  emergencyAdvice?: EmergencyFundAdvice | null;
  budgetType?: BudgetType;
}

const PRIORITY_COLORS: Record<number, { badge: string; bar: string }> = {
  1: { badge: 'bg-red-500 text-white', bar: 'bg-red-500' },
  2: { badge: 'bg-yellow-500 text-white', bar: 'bg-yellow-500' },
  3: { badge: 'bg-green-500 text-white', bar: 'bg-green-500' },
};

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-blue-600 text-white',
  archived: 'bg-gray-400 text-white',
};

export function GoalCard({ goal, onDelete, onEdit, emergencyAdvice, budgetType }: GoalCardProps) {
  const { t } = useTranslation();
  const [showFundModal, setShowFundModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);

  const PERIOD_LABELS: Record<string, string> = {
    monthly: t('goals.filterMonthly'),
    annual: t('goals.filterAnnual'),
  };
  const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
  const clampedProgress = Math.min(progress, 100);
  const remaining = goal.targetAmount - goal.currentAmount;
  const months = goal.targetDate ? monthsUntil(goal.targetDate) : null;
  const isCompleted = goal.status === 'completed' || goal.currentAmount >= goal.targetAmount;
  const emergencyBadge = goal.emergencyBadge ?? null;
  const canEditFund = goal.category === 'emergency' && emergencyAdvice;

  return (
    <>
      <div
        onClick={() => setShowProgressModal(true)}
        className={`rounded-xl shadow-sm border p-5 flex flex-col gap-3 cursor-pointer hover:shadow-md transition-shadow ${
          isCompleted
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
            : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-800'
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                {goal.name}
              </h3>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  goal.status === 'active' || goal.status === 'at_risk'
                    ? (PRIORITY_COLORS[goal.priority]?.badge ?? 'bg-gray-200 dark:bg-gray-700')
                    : (STATUS_COLORS[goal.status] ?? 'bg-gray-200 dark:bg-gray-700')
                }`}
              >
                {goal.status.replace('_', ' ')}
              </span>
              {budgetType && BUDGET_TYPE_STYLES[budgetType] && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${BUDGET_TYPE_STYLES[budgetType].bg} ${BUDGET_TYPE_STYLES[budgetType].text}`}
                >
                  {t(BUDGET_TYPE_STYLES[budgetType].label as TranslationKey)}
                </span>
              )}
              {goal.recurringPeriod && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-brand/10 text-brand font-medium">
                  {PERIOD_LABELS[goal.recurringPeriod]}
                </span>
              )}
            </div>
            {goal.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                {goal.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(goal);
              }}
              className="p-2 text-gray-300 dark:text-gray-600 hover:text-brand active:text-brand transition-colors"
              aria-label="Edit goal"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(goal.id);
              }}
              className="p-2 text-gray-300 dark:text-gray-600 hover:text-red-500 active:text-red-500 transition-colors"
              aria-label="Delete goal"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>{t('goals.saved', { amount: formatCurrency(goal.currentAmount) })}</span>
            <span>{Math.round(clampedProgress)}%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${PRIORITY_COLORS[goal.priority]?.bar ?? 'bg-brand'}`}
              style={{ width: `${clampedProgress}%` }}
            />
          </div>
          <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            {t('goals.target', { amount: formatCurrency(goal.targetAmount) })}
            {remaining > 0 && (
              <span className="ml-2 text-gray-400 dark:text-gray-500">
                ({t('goals.toGo', { amount: formatCurrency(remaining) })})
              </span>
            )}
          </div>
        </div>

        {/* Emergency fund coverage badge */}
        {emergencyBadge && (
          <button
            onClick={
              canEditFund
                ? (e) => {
                    e.stopPropagation();
                    setShowFundModal(true);
                  }
                : undefined
            }
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md w-fit ${
              emergencyBadge.covered >= emergencyBadge.target
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
            } ${canEditFund ? 'hover:opacity-80 cursor-pointer' : ''}`}
          >
            <ShieldCheck size={13} />
            {t('emergencyFund.coversBadge', {
              covered: emergencyBadge.covered.toFixed(1),
              target: emergencyBadge.target,
            })}
          </button>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 dark:text-gray-500">
          {goal.targetDate && (
            <span className="flex items-center gap-1">
              <Calendar size={12} className="shrink-0" />
              {formatDate(goal.targetDate)}
              {months !== null && months > 0 && <span>({months}mo)</span>}
            </span>
          )}
          {goal.category && (
            <span className="flex items-center gap-1">
              <TrendingUp size={12} className="shrink-0" />
              {goal.category}
            </span>
          )}
          <span className="ml-auto font-medium text-gray-500 dark:text-gray-400 shrink-0">
            P{goal.priority}{' '}
            {goal.priority === 1
              ? t('goalForm.high')
              : goal.priority === 2
                ? t('goalForm.med')
                : t('goalForm.low')}
          </span>
        </div>
      </div>

      {/* Emergency fund edit modal */}
      {showFundModal && emergencyAdvice && (
        <Modal title={t('emergencyFund.goalName')} onClose={() => setShowFundModal(false)}>
          <EmergencyFundControls advice={emergencyAdvice} onDone={() => setShowFundModal(false)} />
        </Modal>
      )}

      {/* Goal progress modal */}
      {showProgressModal && (
        <GoalProgressModal
          goalId={goal.id}
          goalName={goal.name}
          targetAmount={goal.targetAmount}
          onClose={() => setShowProgressModal(false)}
        />
      )}
    </>
  );
}
