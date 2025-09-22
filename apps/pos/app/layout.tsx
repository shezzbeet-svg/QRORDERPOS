import './globals.css';
import type { ReactNode } from 'react';
import { ClientProviders } from '../src/components/ClientProviders';

export const metadata = {
  title: 'QR Order POS'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
