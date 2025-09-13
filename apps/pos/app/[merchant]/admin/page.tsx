'use client';
import { useAuth } from '../../../src/hooks/useAuth';

export default function AdminHome({ params }: { params: { merchant: string } }) {
  const { role } = useAuth();
  if (role !== 'admin' && role !== 'cashier') {
    return <div>Access denied</div>;
  }
  return <div>Admin Dashboard for {params.merchant}</div>;
}
