import type { Metadata } from 'next';
import { LoginForm } from '@/components/forms/login-form';

export const metadata: Metadata = { title: 'Login' };

export default function LoginPage() {
  return (
    <div className="bg-white p-8 rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6">Sign in to Finances</h1>
      <LoginForm />
    </div>
  );
}
