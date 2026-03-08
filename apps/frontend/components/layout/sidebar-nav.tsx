'use client';

import { useTranslation, type TranslationKey } from '@/i18n';

const NAV_LINKS: { href: string; labelKey: TranslationKey }[] = [
  { href: '/dashboard', labelKey: 'nav.dashboard' },
  { href: '/assets', labelKey: 'nav.assets' },
  { href: '/liabilities', labelKey: 'nav.liabilities' },
  { href: '/goals', labelKey: 'nav.goals' },
  { href: '/expenses', labelKey: 'nav.expenses' },
  { href: '/income', labelKey: 'nav.income' },
  { href: '/reports', labelKey: 'nav.reports' },
  { href: '/import', labelKey: 'nav.import' },
  { href: '/documents', labelKey: 'nav.documents' },
  { href: '/account', labelKey: 'nav.account' },
];

export function SidebarNav() {
  const { t } = useTranslation();

  return (
    <>
      {/* Logo */}
      <div className="p-4 border-b border-gray-700 flex-shrink-0">
        <span className="text-lg font-bold text-brand-light">{t('nav.finances')}</span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="block px-3 py-2.5 rounded-lg hover:bg-gray-700 text-sm text-gray-300 hover:text-white transition-colors active:bg-gray-600"
          >
            {t(link.labelKey)}
          </a>
        ))}
      </nav>
    </>
  );
}
