import type { Metadata } from 'next';
import { AssetsClient } from './assets-client';

export const metadata: Metadata = { title: 'Assets' };

export default function AssetsPage() {
  return <AssetsClient />;
}
