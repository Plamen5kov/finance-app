'use client';

import { Goal } from '@/hooks/use-goals';
import { formatCurrency, formatDate, monthsUntil } from '@/lib/utils';
import { Trash2, Calendar, TrendingUp, Pencil } from 'lucide-react';

interface GoalCardProps {
  goal: Goal;
  onDelete: (id: string) => void;
  onEdit: (goal: Goal) => void;
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

const PERIOD_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  annual: 'Annual',
};

export function GoalCard({ goal, onDelete, onEdit }: GoalCardProps) {
  const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
  const clampedProgress = Math.min(progress, 100);
  const remaining = goal.targetAmount - goal.currentAmount;
  const months = goal.targetDate ? monthsUntil(goal.targetDate) : null;
  const isCompleted = goal.status === 'completed' || goal.currentAmount >= goal.targetAmount;

  return (
    <div className={`rounded-xl shadow-sm border p-5 flex flex-col gap-3 ${
      isCompleted ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 truncate">{goal.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              (goal.status === 'active' || goal.status === 'at_risk')
                ? (PRIORITY_COLORS[goal.priority]?.badge ?? 'bg-gray-200')
                : (STATUS_COLORS[goal.status] ?? 'bg-gray-200')
            }`}>
              {goal.status.replace('_', ' ')}
            </span>
            {goal.recurringPeriod && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-brand/10 text-brand font-medium">
                {PERIOD_LABELS[goal.recurringPeriod]}
              </span>
            )}
          </div>
          {goal.description && (
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{goal.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          <button
            onClick={() => onEdit(goal)}
            className="p-2 text-gray-300 hover:text-brand active:text-brand transition-colors"
            aria-label="Edit goal"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => onDelete(goal.id)}
            className="p-2 text-gray-300 hover:text-red-500 active:text-red-500 transition-colors"
            aria-label="Delete goal"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{formatCurrency(goal.currentAmount)} saved</span>
          <span>{Math.round(clampedProgress)}%</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${PRIORITY_COLORS[goal.priority]?.bar ?? 'bg-brand'}`}
            style={{ width: `${clampedProgress}%` }}
          />
        </div>
        <div className="mt-1 text-xs text-gray-400">
          Target: {formatCurrency(goal.targetAmount)}
          {remaining > 0 && <span className="ml-2 text-gray-400">({formatCurrency(remaining)} to go)</span>}
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-4 text-xs text-gray-400">
        {goal.targetDate && (
          <span className="flex items-center gap-1">
            <Calendar size={12} />
            {formatDate(goal.targetDate)}
            {months !== null && months > 0 && <span className="ml-1">({months}mo)</span>}
          </span>
        )}
        {goal.category && (
          <span className="flex items-center gap-1">
            <TrendingUp size={12} />
            {goal.category}
          </span>
        )}
        <span className="ml-auto font-medium text-gray-500">
          P{goal.priority} {goal.priority === 1 ? 'High' : goal.priority === 2 ? 'Med' : 'Low'}
        </span>
      </div>
    </div>
  );
}
