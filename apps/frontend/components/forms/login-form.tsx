'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { loginAction } from '@/lib/auth/actions';
import { useTranslation } from '@/i18n';

const loginSchema = z.object({
  email: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite') ?? undefined;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await loginAction(data.email, data.password, inviteToken);
    } catch (err) {
      setError('root', { message: err instanceof Error ? err.message : 'Login failed' });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {errors.root && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded">{errors.root.message}</div>
      )}

      {inviteToken && (
        <div className="bg-blue-50 text-blue-700 text-sm p-3 rounded">
          {t('auth.inviteSignIn')}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">{t('auth.username')}</label>
        <input
          {...register('email')}
          type="text"
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          placeholder="your username"
        />
        {errors.email && <p className="text-red-600 text-xs mt-1">{t('auth.usernameRequired')}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">{t('auth.password')}</label>
        <input
          {...register('password')}
          type="password"
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
        {errors.password && <p className="text-red-600 text-xs mt-1">{t('auth.passwordRequired')}</p>}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-brand text-white py-2 rounded font-medium hover:bg-brand-dark disabled:opacity-60"
      >
        {isSubmitting ? t('auth.signingIn') : t('auth.signIn')}
      </button>

      <p className="text-sm text-center text-gray-600">
        {t('auth.noAccount')}{' '}
        <Link
          href={inviteToken ? `/register?invite=${inviteToken}` : '/register'}
          className="text-brand hover:underline"
        >
          {t('auth.register')}
        </Link>
      </p>
    </form>
  );
}
