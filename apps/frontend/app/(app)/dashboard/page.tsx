import type { Metadata } from 'next';
import { verifySession } from '@/lib/auth/dal';
import { DashboardStats } from './dashboard-stats';
import { DashboardGoals } from './dashboard-goals';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const session = await verifySession();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {session.name ?? 'there'} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">Here&apos;s your financial overview</p>
      </div>
      <DashboardStats />
      <DashboardGoals />
    </div>
  );
}
