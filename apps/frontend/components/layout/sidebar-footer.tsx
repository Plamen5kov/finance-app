'use client';

import { useState, useEffect, useRef } from 'react';
import { logoutAction } from '@/lib/auth/actions';
import { LogOut, Settings, Sun, Moon, Monitor, X } from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: 'Light', icon: <Sun size={15} /> },
  { value: 'dark', label: 'Dark', icon: <Moon size={15} /> },
  { value: 'system', label: 'System', icon: <Monitor size={15} /> },
];

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
}

interface SidebarFooterProps {
  name?: string;
  email: string;
}

export function SidebarFooter({ name, email }: SidebarFooterProps) {
  const [theme, setTheme] = useState<Theme>('system');
  const [loggingOut, setLoggingOut] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = (localStorage.getItem('theme') as Theme) ?? 'system';
    setTheme(saved);
    applyTheme(saved);
  }, []);

  // Close panel on outside click
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    }
    if (settingsOpen) document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [settingsOpen]);

  function handleTheme(t: Theme) {
    setTheme(t);
    localStorage.setItem('theme', t);
    applyTheme(t);
  }

  async function handleLogout() {
    setLoggingOut(true);
    await logoutAction();
  }

  return (
    <>
      {/* Settings panel — slides up from the sidebar footer */}
      {settingsOpen && (
        <div
          ref={panelRef}
          className="absolute bottom-[120px] left-2 right-2 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl p-4 z-50"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-white">Settings</span>
            <button onClick={() => setSettingsOpen(false)} className="text-gray-400 hover:text-white">
              <X size={15} />
            </button>
          </div>

          {/* Theme */}
          <div>
            <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Appearance</p>
            <div className="flex rounded-lg overflow-hidden border border-gray-600">
              {THEME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleTheme(opt.value)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                    theme === opt.value
                      ? 'bg-brand text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-gray-700 p-3 space-y-1">
        {/* User info */}
        <div className="flex items-center gap-2 px-1 py-1.5 mb-1">
          <div className="w-7 h-7 rounded-full bg-brand-light flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {(name ?? email)[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{name ?? email}</p>
            {name && <p className="text-xs text-gray-400 truncate">{email}</p>}
          </div>
        </div>

        {/* Settings button */}
        <button
          onClick={() => setSettingsOpen((o) => !o)}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            settingsOpen
              ? 'bg-gray-700 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          <Settings size={15} />
          Settings
        </button>

        {/* Sign out */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          <LogOut size={15} />
          {loggingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </>
  );
}
