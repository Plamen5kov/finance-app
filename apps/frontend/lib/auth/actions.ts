'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createSession, deleteSession } from './session';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function storeAccessToken(token: string) {
  const cookieStore = await cookies();
  cookieStore.set('access_token', token, {
    httpOnly: false, // must be readable by JS for API calls
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export async function loginAction(email: string, password: string) {
  const res = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? 'Login failed');
  }

  const { data } = await res.json();
  await createSession(data.user.id, data.user.email, data.user.name);
  await storeAccessToken(data.accessToken);
  redirect('/dashboard');
}

export async function registerAction(name: string, email: string, password: string) {
  const res = await fetch(`${API_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? 'Registration failed');
  }

  const { data } = await res.json();
  await createSession(data.user.id, data.user.email, data.user.name);
  await storeAccessToken(data.accessToken);
  redirect('/dashboard');
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('access_token');
  await deleteSession();
  redirect('/login');
}
