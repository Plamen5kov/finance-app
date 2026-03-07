import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Reports' };

const reports = [
  { href: '/reports/net-worth', label: 'Net Worth Over Time' },
  { href: '/reports/expense-budget', label: 'Monthly Budget Report' },
  { href: '/reports/allocation-comparison', label: 'Planned vs Actual Allocations' },
  { href: '/reports/goal-comparison', label: 'Goal Progress Tracking' },
  { href: '/reports/deadline-status', label: 'Deadline Status' },
];

export default function ReportsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Reports</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
          >
            <p className="font-medium">{r.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
