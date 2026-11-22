import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const SITE_ORIGIN = (process.env.WEB_ORIGIN ?? 'https://noroset.com').replace(/\/$/, '');

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  icons: {
    icon: [
      { url: '/favicon-nl.svg', type: 'image/svg+xml' },
    ],
    apple: '/favicon-nl.svg',
  },
};

export default function N8lLayout({ children }: { children: ReactNode }) {
  return children;
}

