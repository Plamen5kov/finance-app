'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Wallet, Scale, Target, Receipt,
  DollarSign, BarChart3, Upload, FileText, User,
} from 'lucide-react';
import { useTranslation, type TranslationKey } from '@/i18n';

const NAV_LINKS: { href: string; labelKey: TranslationKey; icon: React.ReactNode }[] = [
  { href: '/dashboard', labelKey: 'nav.dashboard', icon: <LayoutDashboard size={18} /> },
  { href: '/assets', labelKey: 'nav.assets', icon: <Wallet size={18} /> },
  { href: '/liabilities', labelKey: 'nav.liabilities', icon: <Scale size={18} /> },
  { href: '/goals', labelKey: 'nav.goals', icon: <Target size={18} /> },
  { href: '/expenses', labelKey: 'nav.expenses', icon: <Receipt size={18} /> },
  { href: '/income', labelKey: 'nav.income', icon: <DollarSign size={18} /> },
  { href: '/reports', labelKey: 'nav.reports', icon: <BarChart3 size={18} /> },
  { href: '/import', labelKey: 'nav.import', icon: <Upload size={18} /> },
  { href: '/documents', labelKey: 'nav.documents', icon: <FileText size={18} /> },
  { href: '/account', labelKey: 'nav.account', icon: <User size={18} /> },
];

export function SidebarNav() {
  const { t } = useTranslation();
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <>
      {/* Logo */}
      <div className="p-4 border-b border-gray-700 flex-shrink-0">
        <span className="text-lg font-bold text-brand-light">{t('nav.finances')}</span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              isActive(link.href)
                ? 'bg-gray-700 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            {link.icon}
            {t(link.labelKey)}
          </Link>
        ))}
      </nav>
    </>
  );
}
