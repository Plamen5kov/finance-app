'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { PwaInstallPrompt } from '@/components/pwa-install-prompt';
import { useTranslation } from '@/i18n';

interface InviteInfo {
  householdName: string;
  invitedBy: string;
  expiresAt: string;
}

function isLoggedIn(): boolean {
  return document.cookie.split('; ').some((c) => c.startsWith('access_token='));
}

export function InviteClient({ token }: { token: string }) {
  const router = useRouter();
  const { t } = useTranslation();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(isLoggedIn());

    apiClient
      .get<InviteInfo>(`/household/invites/${token}/info`)
      .then((res) => setInfo(res.data))
      .catch((err) => setError(err.message));
  }, [token]);

  async function handleAccept() {
    setAccepting(true);
    try {
      const { data } = await apiClient.post<{ accessToken: string }>(
        `/household/invites/${token}/accept`,
      );

      document.cookie = `access_token=${data.accessToken}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax`;
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invite');
      setAccepting(false);
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="max-w-sm w-full bg-white dark:bg-gray-800 rounded-xl shadow p-6 text-center">
          <div className="text-4xl mb-4">:(</div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{t('invite.invalid')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{error}</p>
          <Link href="/login" className="text-brand hover:underline text-sm">
            {t('invite.goToLogin')}
          </Link>
        </div>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400 text-sm">{t('invite.loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-sm w-full bg-white dark:bg-gray-800 rounded-xl shadow p-6 text-center">
        <div className="text-4xl mb-4">+</div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {t('invite.joinHousehold', { name: info.householdName })}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          {t('invite.invitedBy', { name: info.invitedBy })}
        </p>

        {loggedIn ? (
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full bg-brand text-white py-2.5 rounded-lg font-medium hover:bg-brand-dark disabled:opacity-60 transition-colors"
          >
            {accepting ? t('invite.accepting') : t('invite.accept')}
          </button>
        ) : (
          <div className="space-y-3">
            <Link
              href={`/register?invite=${token}`}
              className="block w-full bg-brand text-white py-2.5 rounded-lg font-medium hover:bg-brand-dark transition-colors"
            >
              {t('auth.createAccount')}
            </Link>
            <Link
              href={`/login?invite=${token}`}
              className="block w-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2.5 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {t('auth.signIn')}
            </Link>
          </div>
        )}

        <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
          {t('invite.expires', { date: new Date(info.expiresAt).toLocaleDateString() })}
        </p>
      </div>

      <div className="max-w-sm w-full mt-4">
        <PwaInstallPrompt />
      </div>
    </div>
  );
}
