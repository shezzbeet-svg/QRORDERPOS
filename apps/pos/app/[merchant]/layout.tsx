import type { ReactNode } from 'react';
import { Layout } from '../../src/components/Layout';

export default function MerchantLayout({ params, children }: { params: { merchant: string }; children: ReactNode }) {
  return <Layout merchant={params.merchant}>{children}</Layout>;
}
