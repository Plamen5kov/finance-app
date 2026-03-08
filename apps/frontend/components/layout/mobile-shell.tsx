'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, RefreshCw } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface MobileShellProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export function MobileShell({ sidebar, children }: MobileShellProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();

  // Pull-to-refresh state
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const mainRef = useRef<HTMLDivElement>(null);

  const PULL_THRESHOLD = 80;

  // Close sidebar on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const el = mainRef.current;
    if (!el || el.scrollTop > 0 || open) return;
    touchStartY.current = e.touches[0].clientY;
    setPulling(true);
  }, [open]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling || refreshing) return;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (deltaY > 0) {
      setPullDistance(Math.min(deltaY * 0.5, 120));
    } else {
      setPullDistance(0);
    }
  }, [pulling, refreshing]);

  const handleTouchEnd = useCallback(() => {
    if (!pulling) return;
    setPulling(false);
    if (pullDistance >= PULL_THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      router.refresh();
      setTimeout(() => {
        setRefreshing(false);
        setPullDistance(0);
      }, 800);
    } else {
      setPullDistance(0);
    }
  }, [pulling, pullDistance, refreshing, router]);

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar — always visible */}
      <aside className="hidden md:flex w-64 bg-gray-900 text-white flex-shrink-0 flex-col h-screen sticky top-0">
        {sidebar}
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white flex flex-col transform transition-transform duration-200 ease-in-out md:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebar}
      </aside>

      {/* Main content */}
      <main
        ref={mainRef}
        className="flex-1 overflow-auto bg-gray-50 min-w-0"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 flex items-center gap-3 bg-gray-50 border-b border-gray-200 px-4 py-3 md:hidden">
          <button
            onClick={() => setOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <span className="text-sm font-bold text-brand">{t('nav.finances')}</span>
        </div>

        {/* Pull-to-refresh indicator */}
        <div
          className="flex items-center justify-center overflow-hidden transition-all duration-200 ease-out md:hidden"
          style={{ height: pullDistance > 0 ? `${pullDistance}px` : '0px' }}
        >
          <RefreshCw
            size={20}
            className={`text-gray-400 transition-transform ${refreshing ? 'animate-spin' : ''}`}
            style={{ transform: `rotate(${Math.min(pullDistance / PULL_THRESHOLD, 1) * 360}deg)` }}
          />
        </div>

        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
