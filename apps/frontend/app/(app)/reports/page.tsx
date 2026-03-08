'use client';

import Link from 'next/link';
import { useTranslation } from '@/i18n';

export default function ReportsPage() {
  const { t } = useTranslation();

  const reports = [
    { href: '/reports/net-worth', label: t('reports.netWorthOverTime') },
    { href: '/reports/expense-budget', label: t('reports.monthlyBudget') },
    { href: '/reports/allocation-comparison', label: t('reports.allocationComparison') },
    { href: '/reports/goal-comparison', label: t('reports.goalComparison') },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t('reports.title')}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-md transition-shadow"
          >
            <p className="font-medium">{r.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
