import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  icons: {
    icon: [
      { url: '/favicon-nl.svg', type: 'image/svg+xml' },
    ],
    apple: '/favicon-nl.svg',
  },
};

export default function NlsLayout({ children }: { children: ReactNode }) {
  return children;
}

