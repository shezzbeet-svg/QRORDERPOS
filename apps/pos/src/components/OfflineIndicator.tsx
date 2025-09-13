'use client';
import { useEffect, useState } from 'react';

export function OfflineIndicator() {
  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  if (!offline) return null;
  return (
    <div className="bg-yellow-500 text-black text-center py-1 text-sm">
      Offline mode - changes will sync when back online
    </div>
  );
}
