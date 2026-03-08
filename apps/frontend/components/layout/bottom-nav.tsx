'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Wallet, Receipt, BarChart3, MoreHorizontal,
  Scale, DollarSign, Target, Upload, FileText, User, Settings, LogOut,
  Sun, Moon, Monitor, X,
} from 'lucide-react';
import { useTranslation, LOCALES, type Locale, type TranslationKey } from '@/i18n';
import { logoutAction } from '@/lib/auth/actions';

type Theme = 'light' | 'dark' | 'system';

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
}

interface NavItem {
  href: string;
  labelKey: TranslationKey;
  icon: React.ReactNode;
}

const TABS: NavItem[] = [
  { href: '/dashboard', labelKey: 'nav.dashboard', icon: <LayoutDashboard size={22} /> },
  { href: '/assets', labelKey: 'nav.assets', icon: <Wallet size={22} /> },
  { href: '/expenses', labelKey: 'nav.expenses', icon: <Receipt size={22} /> },
  { href: '/reports', labelKey: 'nav.reports', icon: <BarChart3 size={22} /> },
];

const MORE_ITEMS: NavItem[] = [
  { href: '/liabilities', labelKey: 'nav.liabilities', icon: <Scale size={22} /> },
  { href: '/income', labelKey: 'nav.income', icon: <DollarSign size={22} /> },
  { href: '/goals', labelKey: 'nav.goals', icon: <Target size={22} /> },
  { href: '/import', labelKey: 'nav.import', icon: <Upload size={22} /> },
  { href: '/documents', labelKey: 'nav.documents', icon: <FileText size={22} /> },
  { href: '/account', labelKey: 'nav.account', icon: <User size={22} /> },
];

interface BottomNavProps {
  userName?: string;
  userEmail: string;
}

export function BottomNav({ userName, userEmail }: BottomNavProps) {
  const pathname = usePathname();
  const { t, locale, setLocale } = useTranslation();
  const [moreOpen, setMoreOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>('system');
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const saved = (localStorage.getItem('theme') as Theme) ?? 'system';
    setTheme(saved);
    applyTheme(saved);
  }, []);

  // Close sheet on navigation
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  // Lock body scroll when sheet is open
  useEffect(() => {
    document.body.style.overflow = moreOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [moreOpen]);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/');
  }

  const moreActive = MORE_ITEMS.some((item) => isActive(item.href));

  function handleTheme(th: Theme) {
    setTheme(th);
    localStorage.setItem('theme', th);
    applyTheme(th);
  }

  async function handleLogout() {
    setLoggingOut(true);
    await logoutAction();
  }

  const THEME_OPTIONS: { value: Theme; labelKey: TranslationKey; icon: React.ReactNode }[] = [
    { value: 'light', labelKey: 'theme.light', icon: <Sun size={14} /> },
    { value: 'dark', labelKey: 'theme.dark', icon: <Moon size={14} /> },
    { value: 'system', labelKey: 'theme.system', icon: <Monitor size={14} /> },
  ];

  return (
    <>
      {/* Backdrop */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More bottom sheet */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 md:hidden transform transition-transform duration-250 ease-out ${
          moreOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="bg-white rounded-t-2xl shadow-2xl border-t border-gray-200 max-h-[70vh] overflow-y-auto pb-[env(safe-area-inset-bottom,0px)]">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-gray-300" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white text-sm font-bold">
                {(userName ?? userEmail)[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{userName ?? userEmail}</p>
                {userName && <p className="text-xs text-gray-500 truncate">{userEmail}</p>}
              </div>
            </div>
            <button
              onClick={() => setMoreOpen(false)}
              className="p-2 -mr-2 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <X size={18} />
            </button>
          </div>

          {/* Nav grid */}
          <div className="grid grid-cols-3 gap-1 px-4 pb-3">
            {MORE_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl transition-colors ${
                  isActive(item.href)
                    ? 'bg-brand/10 text-brand'
                    : 'text-gray-600 hover:bg-gray-100 active:bg-gray-200'
                }`}
              >
                {item.icon}
                <span className="text-[11px] font-medium">{t(item.labelKey)}</span>
              </Link>
            ))}
          </div>

          {/* Divider */}
          <div className="mx-4 border-t border-gray-100" />

          {/* Settings section */}
          <div className="px-5 py-3 space-y-3">
            {/* Theme */}
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">{t('settings.appearance')}</p>
              <div className="flex rounded-lg overflow-hidden border border-gray-200">
                {THEME_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleTheme(opt.value)}
                    className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium transition-colors ${
                      theme === opt.value
                        ? 'bg-brand text-white'
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {opt.icon}
                    {t(opt.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">{t('settings.language')}</p>
              <div className="flex rounded-lg overflow-hidden border border-gray-200">
                {LOCALES.map((loc) => (
                  <button
                    key={loc.value}
                    onClick={() => setLocale(loc.value as Locale)}
                    className={`flex-1 flex items-center justify-center py-2 text-xs font-medium transition-colors ${
                      locale === loc.value
                        ? 'bg-brand text-white'
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {loc.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sign out */}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <LogOut size={16} />
              {loggingOut ? t('settings.signingOut') : t('settings.signOut')}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 bg-white border-t border-gray-200 md:hidden pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex items-stretch h-14">
          {TABS.map((tab) => {
            const active = isActive(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  active ? 'text-brand' : 'text-gray-400'
                }`}
              >
                {tab.icon}
                <span className="text-[10px] font-medium">{t(tab.labelKey)}</span>
              </Link>
            );
          })}
          {/* More button */}
          <button
            onClick={() => setMoreOpen((o) => !o)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
              moreOpen || moreActive ? 'text-brand' : 'text-gray-400'
            }`}
          >
            <MoreHorizontal size={22} />
            <span className="text-[10px] font-medium">{t('nav.more')}</span>
          </button>
        </div>
      </nav>
    </>
  );
}
