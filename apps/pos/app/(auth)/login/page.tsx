'use client';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginStaff } from '../../../src/lib/authClient';
import { clientUuid } from '../../../src/lib/api';
import { useAuth } from '../../../src/hooks/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuth(state => state.setSession);
  const [merchantSlug, setMerchantSlug] = useState('demo-bistro');
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await loginStaff({ merchantSlug, code, pin, deviceId: clientUuid });
      setSession({
        accessToken: response.tokens.accessToken,
        refreshToken: response.tokens.refreshToken,
        user: response.user,
        merchant: response.merchant
      });
      router.push(`/${response.merchant.slug}/menu`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto p-6 mt-12 bg-white rounded shadow space-y-4">
      <h1 className="text-2xl font-semibold text-center">Staff Login</h1>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1">
          <label className="block text-sm font-medium">Merchant Slug</label>
          <input
            className="border rounded w-full p-2"
            placeholder="demo-bistro"
            value={merchantSlug}
            onChange={e => setMerchantSlug(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium">Staff Code</label>
          <input
            className="border rounded w-full p-2"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="WAIT001"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium">PIN</label>
          <input
            className="border rounded w-full p-2"
            value={pin}
            onChange={e => setPin(e.target.value)}
            type="password"
            inputMode="numeric"
            required
          />
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded w-full disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
