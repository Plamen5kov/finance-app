import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RegisterForm } from '@/components/forms/register-form';

export const metadata: Metadata = { title: 'Register' };

export default function RegisterPage() {
  return (
    <div className="bg-white p-8 rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6">Create your account</h1>
      <Suspense>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
