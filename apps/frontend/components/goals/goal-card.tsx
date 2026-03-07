'use client';

import { Goal } from '@/hooks/use-goals';
import { formatCurrency, formatDate, monthsUntil } from '@/lib/utils';
import { Trash2, Calendar, TrendingUp } from 'lucide-react';

interface GoalCardProps {
  goal: Goal;
  onDelete: (id: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-brand text-white',
  at_risk: 'bg-yellow-500 text-white',
  completed: 'bg-blue-600 text-white',
  archived: 'bg-gray-400 text-white',
};

const PERIOD_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  annual: 'Annual',
};

export function GoalCard({ goal, onDelete }: GoalCardProps) {
  const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
  const clampedProgress = Math.min(progress, 100);
  const remaining = goal.targetAmount - goal.currentAmount;
  const months = goal.targetDate ? monthsUntil(goal.targetDate) : null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 truncate">{goal.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[goal.status] ?? 'bg-gray-200'}`}>
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
        <button
          onClick={() => onDelete(goal.id)}
          className="ml-2 p-1.5 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
          aria-label="Delete goal"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{formatCurrency(goal.currentAmount)} saved</span>
          <span>{Math.round(clampedProgress)}%</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-brand transition-all"
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
        <span className="ml-auto">Priority {goal.priority}</span>
      </div>
    </div>
  );
}
