'use client';

import { useEffect, useState } from 'react';
import { X, Share, PlusSquare, Download } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as any).standalone === true;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    // Don't show if already installed or dismissed this session
    if (isStandalone()) return;

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // Android/Chrome: capture the install prompt
    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // iOS: show manual instructions
    if (isIOS()) {
      setShowIOSPrompt(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  }

  function handleDismiss() {
    setDismissed(true);
    setDeferredPrompt(null);
    setShowIOSPrompt(false);
  }

  if (dismissed || isStandalone()) return null;

  // Android/Chrome prompt
  if (deferredPrompt) {
    return (
      <div className="bg-brand/10 border border-brand/20 rounded-xl p-4 flex items-start gap-3">
        <Download size={20} className="text-brand flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{t('pwa.installTitle')}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {t('pwa.installDesc')}
          </p>
          <button
            onClick={handleInstall}
            className="mt-2 text-sm bg-brand text-white px-4 py-1.5 rounded-lg hover:bg-brand-dark transition-colors"
          >
            {t('pwa.installButton')}
          </button>
        </div>
        <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>
    );
  }

  // iOS prompt
  if (showIOSPrompt) {
    return (
      <div className="bg-brand/10 border border-brand/20 rounded-xl p-4 flex items-start gap-3">
        <Download size={20} className="text-brand flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{t('pwa.installTitle')}</p>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            {t('pwa.iosInstructions')}
          </p>
        </div>
        <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>
    );
  }

  return null;
}
