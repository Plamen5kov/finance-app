'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { registerAction } from '@/lib/auth/actions';
import { useTranslation } from '@/i18n';

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().min(1, 'Username is required'),
    password: z.string().min(12, 'Password must be at least 12 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite') ?? undefined;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerAction(data.name, data.email, data.password, inviteToken);
    } catch (err) {
      setError('root', { message: err instanceof Error ? err.message : 'Registration failed' });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {errors.root && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded">{errors.root.message}</div>
      )}

      {inviteToken && (
        <div className="bg-blue-50 text-blue-700 text-sm p-3 rounded">
          {t('auth.inviteRegister')}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">{t('common.name')}</label>
        <input
          {...register('name')}
          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand"
          placeholder="Your name"
        />
        {errors.name && <p className="text-red-600 text-xs mt-1">{t('auth.nameMin')}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">{t('auth.username')}</label>
        <input
          {...register('email')}
          type="text"
          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand"
          placeholder="your username"
        />
        {errors.email && <p className="text-red-600 text-xs mt-1">{t('auth.usernameRequired')}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">{t('auth.password')}</label>
        <input
          {...register('password')}
          type="password"
          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand"
        />
        {errors.password && <p className="text-red-600 text-xs mt-1">{t('auth.passwordMin')}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">{t('auth.confirmPassword')}</label>
        <input
          {...register('confirmPassword')}
          type="password"
          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand"
        />
        {errors.confirmPassword && (
          <p className="text-red-600 text-xs mt-1">{t('auth.passwordsMismatch')}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-brand text-white py-2 rounded font-medium hover:bg-brand-dark disabled:opacity-60"
      >
        {isSubmitting ? t('auth.creatingAccount') : t('auth.createAccount')}
      </button>

      <p className="text-sm text-center text-gray-600 dark:text-gray-400">
        {t('auth.haveAccount')}{' '}
        <Link
          href={inviteToken ? `/login?invite=${inviteToken}` : '/login'}
          className="text-brand hover:underline"
        >
          {t('auth.signIn')}
        </Link>
      </p>
    </form>
  );
}
