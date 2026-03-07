import type { Metadata } from 'next';
import { IncomeClient } from './income-client';

export const metadata: Metadata = { title: 'Income' };

export default function IncomePage() {
  return <IncomeClient />;
}
