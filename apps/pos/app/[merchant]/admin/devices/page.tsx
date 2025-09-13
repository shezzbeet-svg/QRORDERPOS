'use client';
import { useState } from 'react';
import { useAuth } from '../../../../src/hooks/useAuth';
import { apiFetch } from '../../../../src/lib/api';
import { useOfflineSync } from '../../../../src/hooks/useOfflineSync';

export default function DevicesPage({ params }: { params: { merchant: string } }) {
  const { role } = useAuth();
  const { merchant } = params;
  const submit = useOfflineSync(merchant);
  const [name, setName] = useState('');

  if (role !== 'admin') return <div>Access denied</div>;

  const register = async () => {
    await submit('/devices', { method: 'POST', body: JSON.stringify({ name }) });
    setName('');
  };

  const testPrint = () => {
    apiFetch(merchant, '/printers/test', { method: 'POST' });
  };

  return (
    <div className="space-y-2">
      <input
        className="border p-2"
        placeholder="Device name"
        value={name}
        onChange={e => setName(e.target.value)}
      />
      <button onClick={register} className="bg-blue-600 text-white px-4 py-2 rounded">
        Register
      </button>
      <button onClick={testPrint} className="bg-gray-600 text-white px-4 py-2 rounded">
        Test Print
      </button>
    </div>
  );
}
