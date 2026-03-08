import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from '@/components/forms/login-form';

export const metadata: Metadata = { title: 'Login' };

export default function LoginPage() {
  return (
    <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6">Sign in to Finances</h1>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
