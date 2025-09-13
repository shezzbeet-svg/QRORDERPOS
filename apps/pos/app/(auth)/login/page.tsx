'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '../../../src/hooks/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [merchant, setMerchant] = useState('');
  const [token, setToken] = useState('');
  const [role, setRole] = useState<'admin' | 'cashier' | 'waiter'>('waiter');

  const submit = () => {
    login(token, role);
    router.push(`/${merchant}/menu`);
  };

  return (
    <div className="max-w-sm mx-auto p-4 space-y-2">
      <input
        className="border p-2 w-full"
        placeholder="Merchant"
        value={merchant}
        onChange={e => setMerchant(e.target.value)}
      />
      <input
        className="border p-2 w-full"
        placeholder="Token"
        value={token}
        onChange={e => setToken(e.target.value)}
      />
      <select
        className="border p-2 w-full"
        value={role}
        onChange={e => setRole(e.target.value as any)}
      >
        <option value="admin">Admin</option>
        <option value="cashier">Cashier</option>
        <option value="waiter">Waiter</option>
      </select>
      <button onClick={submit} className="bg-blue-600 text-white px-4 py-2 rounded w-full">
        Login
      </button>
    </div>
  );
}
