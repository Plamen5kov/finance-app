'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { registerAction } from '@/lib/auth/actions';

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(12, 'Password must be at least 12 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterForm() {
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
          Create an account to join the household.
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <input
          {...register('name')}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          placeholder="Your name"
        />
        {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          {...register('email')}
          type="email"
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          placeholder="you@example.com"
        />
        {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Password</label>
        <input
          {...register('password')}
          type="password"
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
        {errors.password && <p className="text-red-600 text-xs mt-1">{errors.password.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Confirm Password</label>
        <input
          {...register('confirmPassword')}
          type="password"
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
        {errors.confirmPassword && (
          <p className="text-red-600 text-xs mt-1">{errors.confirmPassword.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-brand text-white py-2 rounded font-medium hover:bg-brand-dark disabled:opacity-60"
      >
        {isSubmitting ? 'Creating account...' : 'Create account'}
      </button>

      <p className="text-sm text-center text-gray-600">
        Already have an account?{' '}
        <Link
          href={inviteToken ? `/login?invite=${inviteToken}` : '/login'}
          className="text-brand hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
