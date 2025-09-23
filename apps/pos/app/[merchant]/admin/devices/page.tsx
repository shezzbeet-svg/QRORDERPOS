'use client';
codex/build-modular-frontend-for-restaurant-pos-yluvnu
import { useEffect, useState } from 'react';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useOfflineSync, OfflineQueuedError } from '../../../../src/hooks/useOfflineSync';
import { apiFetch, ApiError } from '../../../../src/lib/api';
import { getClientDb } from '../../../../src/lib/db';

interface Device {
  id: string;
  name: string;
  type: string;
  location?: string | null;
  pairingCode?: string | null;
  lastSeenAt?: string | null;
}

export default function DevicesPage({ params }: { params: { merchant: string } }) {
  const { merchant } = params;
  const { user } = useAuth();
  const submit = useOfflineSync(merchant, 'device-management');
  const [devices, setDevices] = useState<Device[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState('tablet');
  const [location, setLocation] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    let cancelled = false;
    async function load() {
      const db = await getClientDb();
      try {
        const data = await apiFetch<Device[]>(merchant, '/devices');
        if (!cancelled) {
          setDevices(data);
          await db.put('meta', { devices: data }, `${merchant}-devices`);
        }
      } catch (err) {
        const cached = await db.get('meta', `${merchant}-devices`);
        if (cached?.devices) {
          setDevices(cached.devices as Device[]);
          setMessage('Loaded cached devices. Changes will sync when online.');
        } else {
          setError(err instanceof ApiError ? err.message : 'Unable to load devices.');
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [merchant, user]);

  if (!user || user.role !== 'admin') {
    return <div className="text-sm text-slate-500">Access denied</div>;
  }

  const register = async () => {
    if (!name.trim()) {
      setError('Enter a device name.');
      return;
    }
    setError(null);
    setMessage(null);
    try {
      const response = await submit('/devices', {
        method: 'POST',
        body: JSON.stringify({ name, type, location: location || undefined })
      });
      if (response) {
        setDevices(prev => [response as Device, ...prev]);
      }
      setName('');
      setLocation('');
      setMessage('Device registered.');
    } catch (err) {
      if (err instanceof OfflineQueuedError) {
        setMessage('Device registration queued.');
        setName('');
        setLocation('');
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Unable to register device.');
      }
    }
  };

  const testPrint = async () => {
    setError(null);
    setMessage(null);
    try {
      await apiFetch(merchant, '/printers/test', { method: 'POST' });
      setMessage('Test print dispatched.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Test print failed.');
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Devices & printers</h1>
        <p className="text-sm text-slate-500">Provision registers, tablets and kitchen printers.</p>
      </header>
      {message && <div className="text-sm text-emerald-600">{message}</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      <section className="bg-white rounded-lg shadow-sm p-4 space-y-3">
        <h2 className="font-semibold text-lg">Register a new device</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <input
            className="border rounded px-3 py-2 text-sm"
            placeholder="Device name"
            value={name}
            onChange={event => setName(event.target.value)}
          />
          <select className="border rounded px-3 py-2 text-sm" value={type} onChange={event => setType(event.target.value)}>
            <option value="tablet">Tablet</option>
            <option value="printer">Printer</option>
            <option value="display">Display</option>
            <option value="kds">Kitchen screen</option>
          </select>
          <input
            className="border rounded px-3 py-2 text-sm"
            placeholder="Location (optional)"
            value={location}
            onChange={event => setLocation(event.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <button className="bg-slate-900 text-white px-4 py-2 rounded" onClick={register}>
            Register device
          </button>
          <button className="border px-4 py-2 rounded" onClick={testPrint}>
            Trigger test print
          </button>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm p-4 space-y-3">
        <h2 className="font-semibold text-lg">Active devices</h2>
        <ul className="space-y-2 text-sm">
          {devices.map(device => (
            <li key={device.id} className="border rounded p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{device.name}</div>
                <div className="text-xs text-slate-500">
                  {device.type} · {device.location ?? 'No location'} · Pairing {device.pairingCode ?? '—'}
                </div>
              </div>
              <div className="text-xs text-slate-500">
                {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : 'never seen'}
              </div>
            </li>
          ))}
          {devices.length === 0 && <li className="text-slate-500">No registered devices yet.</li>}
        </ul>
      </section>

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
 main
    </div>
  );
}
