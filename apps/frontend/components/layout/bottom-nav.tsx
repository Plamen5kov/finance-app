'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Wallet, Receipt, BarChart3, MoreHorizontal,
  Scale, DollarSign, Target, Upload, FileText, User, LogOut,
  Sun, Moon, Monitor, X, Pencil, Check,
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

interface NavItemDef {
  id: string;
  href: string;
  labelKey: TranslationKey;
  icon: React.ReactNode;
}

const ALL_NAV_ITEMS: NavItemDef[] = [
  { id: 'dashboard', href: '/dashboard', labelKey: 'nav.dashboard', icon: <LayoutDashboard size={22} /> },
  { id: 'assets', href: '/assets', labelKey: 'nav.assets', icon: <Wallet size={22} /> },
  { id: 'liabilities', href: '/liabilities', labelKey: 'nav.liabilities', icon: <Scale size={22} /> },
  { id: 'goals', href: '/goals', labelKey: 'nav.goals', icon: <Target size={22} /> },
  { id: 'expenses', href: '/expenses', labelKey: 'nav.expenses', icon: <Receipt size={22} /> },
  { id: 'income', href: '/income', labelKey: 'nav.income', icon: <DollarSign size={22} /> },
  { id: 'reports', href: '/reports', labelKey: 'nav.reports', icon: <BarChart3 size={22} /> },
  { id: 'import', href: '/import', labelKey: 'nav.import', icon: <Upload size={22} /> },
  { id: 'documents', href: '/documents', labelKey: 'nav.documents', icon: <FileText size={22} /> },
  { id: 'account', href: '/account', labelKey: 'nav.account', icon: <User size={22} /> },
];

const DEFAULT_TAB_IDS = ['dashboard', 'assets', 'expenses', 'reports'];
const TAB_COUNT = 4;
const STORAGE_KEY = 'bottom-nav-tabs';

function loadTabIds(): string[] {
  if (typeof window === 'undefined') return DEFAULT_TAB_IDS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TAB_IDS;
    const ids = JSON.parse(raw) as string[];
    const valid = ids.filter((id) => ALL_NAV_ITEMS.some((n) => n.id === id));
    return valid.length === TAB_COUNT ? valid : DEFAULT_TAB_IDS;
  } catch {
    return DEFAULT_TAB_IDS;
  }
}

function saveTabIds(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

interface BottomNavProps {
  userName?: string;
  userEmail: string;
}

export function BottomNav({ userName, userEmail }: BottomNavProps) {
  const pathname = usePathname();
  const { t, locale, setLocale } = useTranslation();
  const [moreOpen, setMoreOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [tabIds, setTabIds] = useState(DEFAULT_TAB_IDS);
  const [theme, setTheme] = useState<Theme>('system');
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setTabIds(loadTabIds());
    const saved = (localStorage.getItem('theme') as Theme) ?? 'system';
    setTheme(saved);
    applyTheme(saved);
  }, []);

  // Close sheet on navigation
  useEffect(() => {
    setMoreOpen(false);
    setEditing(false);
  }, [pathname]);

  // Lock body scroll when sheet is open
  useEffect(() => {
    document.body.style.overflow = moreOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [moreOpen]);

  const tabItems = tabIds.map((id) => ALL_NAV_ITEMS.find((n) => n.id === id)!).filter(Boolean);
  const moreItems = ALL_NAV_ITEMS.filter((n) => !tabIds.includes(n.id));

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/');
  }

  const moreActive = moreItems.some((item) => isActive(item.href));

  function handleTheme(th: Theme) {
    setTheme(th);
    localStorage.setItem('theme', th);
    applyTheme(th);
  }

  async function handleLogout() {
    setLoggingOut(true);
    await logoutAction();
  }

  // In edit mode, tapping a "more" item swaps it into the tab bar
  // replacing the last tab (or you tap a tab item to remove it)
  const handleEditTap = useCallback((itemId: string) => {
    setTabIds((prev) => {
      const inBar = prev.includes(itemId);
      if (inBar) {
        // Can't remove if already at minimum — but we always keep 4,
        // so removing one means we need to add the first "more" item
        // Instead: do nothing on tap of a bar item (user taps a "more" item to swap)
        return prev;
      } else {
        // Not in bar — show a selection: replace which slot?
        // Simplest UX: swap with the last tab in the bar
        const newIds = [...prev];
        newIds[TAB_COUNT - 1] = itemId;
        saveTabIds(newIds);
        return newIds;
      }
    });
  }, []);

  const handleSwapSlot = useCallback((slotIndex: number, newItemId: string) => {
    setTabIds((prev) => {
      const newIds = [...prev];
      newIds[slotIndex] = newItemId;
      saveTabIds(newIds);
      return newIds;
    });
  }, []);

  const THEME_OPTIONS: { value: Theme; labelKey: TranslationKey; icon: React.ReactNode }[] = [
    { value: 'light', labelKey: 'theme.light', icon: <Sun size={14} /> },
    { value: 'dark', labelKey: 'theme.dark', icon: <Moon size={14} /> },
    { value: 'system', labelKey: 'theme.system', icon: <Monitor size={14} /> },
  ];

  // Edit mode: which bar slot is selected for swapping
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  return (
    <>
      {/* Backdrop */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => { setMoreOpen(false); setEditing(false); setSelectedSlot(null); }}
        />
      )}

      {/* More bottom sheet */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 md:hidden transform transition-transform duration-250 ease-out ${
          moreOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl border-t border-gray-200 dark:border-gray-700 max-h-[80vh] overflow-y-auto pb-[env(safe-area-inset-bottom,0px)]">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white text-sm font-bold">
                {(userName ?? userEmail)[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{userName ?? userEmail}</p>
                {userName && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{userEmail}</p>}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setEditing((e) => !e); setSelectedSlot(null); }}
                className={`p-2 rounded-lg transition-colors ${
                  editing ? 'text-brand bg-brand/10' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
                aria-label={editing ? 'Done editing' : 'Edit tabs'}
              >
                {editing ? <Check size={18} /> : <Pencil size={16} />}
              </button>
              <button
                onClick={() => { setMoreOpen(false); setEditing(false); setSelectedSlot(null); }}
                className="p-2 -mr-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Edit mode: current tab bar slots */}
          {editing && (
            <div className="px-4 pb-3">
              <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">{t('nav.tabBar')}</p>
              <div className="flex gap-1.5">
                {tabItems.map((item, idx) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedSlot(selectedSlot === idx ? null : idx)}
                    className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 transition-colors ${
                      selectedSlot === idx
                        ? 'border-brand bg-brand/10 text-brand'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {item.icon}
                    <span className="text-[10px] font-medium">{t(item.labelKey)}</span>
                  </button>
                ))}
              </div>
              {selectedSlot !== null && (
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 px-1">{t('nav.tapToReplace')}</p>
              )}
            </div>
          )}

          {/* Nav grid — items not in tab bar */}
          <div className="grid grid-cols-3 gap-1 px-4 pb-3">
            {moreItems.map((item) => (
              editing ? (
                <button
                  key={item.id}
                  onClick={() => {
                    if (selectedSlot !== null) {
                      handleSwapSlot(selectedSlot, item.id);
                      setSelectedSlot(null);
                    }
                  }}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl transition-colors ${
                    selectedSlot !== null
                      ? 'text-gray-600 dark:text-gray-400 hover:bg-brand/10 hover:text-brand active:bg-brand/20'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {item.icon}
                  <span className="text-[11px] font-medium">{t(item.labelKey)}</span>
                </button>
              ) : (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl transition-colors ${
                    isActive(item.href)
                      ? 'bg-brand/10 text-brand'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700'
                  }`}
                >
                  {item.icon}
                  <span className="text-[11px] font-medium">{t(item.labelKey)}</span>
                </Link>
              )
            ))}
          </div>

          {!editing && (
            <>
              {/* Divider */}
              <div className="mx-4 border-t border-gray-100 dark:border-gray-800" />

              {/* Settings section */}
              <div className="px-5 py-3 space-y-3">
                {/* Theme */}
                <div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">{t('settings.appearance')}</p>
                  <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    {THEME_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => handleTheme(opt.value)}
                        className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium transition-colors ${
                          theme === opt.value
                            ? 'bg-brand text-white'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
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
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">{t('settings.language')}</p>
                  <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    {LOCALES.map((loc) => (
                      <button
                        key={loc.value}
                        onClick={() => setLocale(loc.value as Locale)}
                        className={`flex-1 flex items-center justify-center py-2 text-xs font-medium transition-colors ${
                          locale === loc.value
                            ? 'bg-brand text-white'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
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
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                >
                  <LogOut size={16} />
                  {loggingOut ? t('settings.signingOut') : t('settings.signOut')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 md:hidden pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex items-stretch h-14">
          {tabItems.map((tab) => {
            const active = isActive(tab.href);
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  active ? 'text-brand' : 'text-gray-400 dark:text-gray-500'
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
              moreOpen || moreActive ? 'text-brand' : 'text-gray-400 dark:text-gray-500'
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
