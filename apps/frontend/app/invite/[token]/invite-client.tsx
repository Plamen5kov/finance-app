'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PwaInstallPrompt } from '@/components/pwa-install-prompt';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface InviteInfo {
  householdName: string;
  invitedBy: string;
  expiresAt: string;
}

function getAccessToken(): string | undefined {
  return document.cookie
    .split('; ')
    .find((c) => c.startsWith('access_token='))
    ?.split('=')[1];
}

export function InviteClient({ token }: { token: string }) {
  const router = useRouter();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!getAccessToken());

    fetch(`${API_URL}/api/v1/household/invites/${token}/info`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error?.message ?? 'Invalid invite');
        setInfo(body.data);
      })
      .catch((err) => setError(err.message));
  }, [token]);

  async function handleAccept() {
    setAccepting(true);
    try {
      const accessToken = getAccessToken();
      const res = await fetch(`${API_URL}/api/v1/household/invites/${token}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message ?? 'Failed to accept invite');

      // Store new tokens
      const data = body.data;
      document.cookie = `access_token=${data.accessToken}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax`;

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invite');
      setAccepting(false);
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm w-full bg-white rounded-xl shadow p-6 text-center">
          <div className="text-4xl mb-4">:(</div>
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Invalid Invite</h1>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <Link href="/login" className="text-brand hover:underline text-sm">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-sm">Loading invite...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm w-full bg-white rounded-xl shadow p-6 text-center">
        <div className="text-4xl mb-4">+</div>
        <h1 className="text-lg font-semibold text-gray-900 mb-1">
          Join &ldquo;{info.householdName}&rdquo;
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          {info.invitedBy} invited you to their household.
        </p>

        {isLoggedIn ? (
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full bg-brand text-white py-2.5 rounded-lg font-medium hover:bg-brand-dark disabled:opacity-60 transition-colors"
          >
            {accepting ? 'Joining...' : 'Accept Invite'}
          </button>
        ) : (
          <div className="space-y-3">
            <Link
              href={`/register?invite=${token}`}
              className="block w-full bg-brand text-white py-2.5 rounded-lg font-medium hover:bg-brand-dark transition-colors"
            >
              Create account
            </Link>
            <Link
              href={`/login?invite=${token}`}
              className="block w-full border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Sign in
            </Link>
          </div>
        )}

        <p className="text-xs text-gray-400 mt-4">
          Expires {new Date(info.expiresAt).toLocaleDateString()}
        </p>
      </div>

      <div className="max-w-sm w-full mt-4">
        <PwaInstallPrompt />
      </div>
    </div>
  );
}
