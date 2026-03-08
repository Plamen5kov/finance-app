'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

interface MobileShellProps {
  sidebar: React.ReactNode;
  bottomNav: React.ReactNode;
  children: React.ReactNode;
}

export function MobileShell({ sidebar, bottomNav, children }: MobileShellProps) {
  const router = useRouter();

  // Pull-to-refresh state
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const mainRef = useRef<HTMLDivElement>(null);

  const PULL_THRESHOLD = 80;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const el = mainRef.current;
    if (!el || el.scrollTop > 0) return;
    touchStartY.current = e.touches[0].clientY;
    setPulling(true);
  }, []);

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

      {/* Main content */}
      <main
        ref={mainRef}
        className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-800 min-w-0"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pull-to-refresh indicator */}
        <div
          className="flex items-center justify-center overflow-hidden transition-all duration-200 ease-out md:hidden"
          style={{ height: pullDistance > 0 ? `${pullDistance}px` : '0px' }}
        >
          <RefreshCw
            size={20}
            className={`text-gray-400 dark:text-gray-500 transition-transform ${refreshing ? 'animate-spin' : ''}`}
            style={{ transform: `rotate(${Math.min(pullDistance / PULL_THRESHOLD, 1) * 360}deg)` }}
          />
        </div>

        {/* pb-20 on mobile to clear the bottom nav bar */}
        <div className="p-4 md:p-6 pb-20 md:pb-6">{children}</div>
      </main>

      {/* Bottom nav — mobile only */}
      {bottomNav}
    </div>
  );
}
