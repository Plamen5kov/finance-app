import type { Metadata } from 'next';
import { verifySession } from '@/lib/auth/dal';
import { DashboardStats } from './dashboard-stats';
import { DashboardGoals } from './dashboard-goals';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const session = await verifySession();

  return (
    <div>
      <DashboardStats name={session.name ?? 'there'} />
      <DashboardGoals />
    </div>
  );
}
