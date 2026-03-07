import type { Metadata } from 'next';
import { GoalsClient } from './goals-client';

export const metadata: Metadata = {
  title: 'Goals',
  description: 'Track your financial goals and allocation plans',
};

export default function GoalsPage() {
  return <GoalsClient />;
}
