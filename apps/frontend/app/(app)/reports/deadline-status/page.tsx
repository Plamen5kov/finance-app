'use client';

import { useGoals } from '@/hooks/use-goals';
import { formatCurrency, monthsUntil } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, Clock, CheckCircle2, XCircle } from 'lucide-react';

function UrgencyBadge({ months }: { months: number | null }) {
  if (months === null) return <span className="text-xs text-gray-400">No deadline</span>;
  if (months < 0) return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-white bg-red-500 rounded-full px-2 py-0.5">
      <XCircle size={11} /> Overdue
    </span>
  );
  if (months <= 3) return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-white bg-orange-500 rounded-full px-2 py-0.5">
      <AlertTriangle size={11} /> {months}mo left
    </span>
  );
  if (months <= 12) return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-white bg-yellow-500 rounded-full px-2 py-0.5">
      <Clock size={11} /> {months}mo left
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 rounded-full px-2 py-0.5">
      <CheckCircle2 size={11} /> {months}mo left
    </span>
  );
}

export default function DeadlineStatusPage() {
  const { data: goals, isLoading } = useGoals();

  const activeGoals = (goals ?? [])
    .filter((g) => g.status === 'active' || g.status === 'at_risk')
    .map((g) => ({
      ...g,
      months: g.targetDate ? monthsUntil(g.targetDate) : null,
      pct: g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0,
    }))
    .sort((a, b) => {
      // Sort: overdue first, then by months ascending, no deadline last
      const ma = a.months ?? 9999;
      const mb = b.months ?? 9999;
      return ma - mb;
    });

  const overdue = activeGoals.filter((g) => g.months !== null && g.months < 0);
  const urgent = activeGoals.filter((g) => g.months !== null && g.months >= 0 && g.months <= 3);
  const upcoming = activeGoals.filter((g) => g.months !== null && g.months > 3 && g.months <= 12);
  const longTerm = activeGoals.filter((g) => g.months !== null && g.months > 12);
  const noDeadline = activeGoals.filter((g) => g.months === null);

  const sections = [
    { label: 'Overdue', goals: overdue, color: 'text-red-600' },
    { label: 'Due within 3 months', goals: urgent, color: 'text-orange-600' },
    { label: 'Due within 12 months', goals: upcoming, color: 'text-yellow-700' },
    { label: 'Long term (12+ months)', goals: longTerm, color: 'text-green-700' },
    { label: 'No deadline', goals: noDeadline, color: 'text-gray-500' },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/reports" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Deadline Status</h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Overdue', count: overdue.length, bg: 'bg-red-50', text: 'text-red-600' },
          { label: 'Urgent (≤3mo)', count: urgent.length, bg: 'bg-orange-50', text: 'text-orange-600' },
          { label: 'Upcoming (≤12mo)', count: upcoming.length, bg: 'bg-yellow-50', text: 'text-yellow-700' },
          { label: 'Long term', count: longTerm.length, bg: 'bg-green-50', text: 'text-green-700' },
        ].map((card) => (
          <div key={card.label} className={`${card.bg} rounded-xl p-4`}>
            <p className="text-xs text-gray-500 mb-1">{card.label}</p>
            <p className={`text-2xl font-bold ${card.text}`}>{card.count}</p>
          </div>
        ))}
      </div>

      {/* Sections */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-400">
          Loading…
        </div>
      ) : activeGoals.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-400">
          No active goals
        </div>
      ) : (
        <div className="space-y-6">
          {sections.filter((s) => s.goals.length > 0).map((section) => (
            <div key={section.label} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50">
                <h2 className={`text-sm font-semibold ${section.color}`}>{section.label}</h2>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-2 text-left">Goal</th>
                    <th className="px-4 py-2 text-right">Saved</th>
                    <th className="px-4 py-2 text-right">Target</th>
                    <th className="px-4 py-2 text-right">Progress</th>
                    <th className="px-4 py-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {section.goals.map((g) => (
                    <tr key={g.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{g.name}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(g.currentAmount)}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{formatCurrency(g.targetAmount)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-brand"
                              style={{ width: `${Math.min(g.pct, 100)}%` }}
                            />
                          </div>
                          <span className={`font-medium text-xs ${g.pct >= 100 ? 'text-brand' : g.pct >= 50 ? 'text-yellow-600' : 'text-gray-700'}`}>
                            {g.pct}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <UrgencyBadge months={g.months} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
