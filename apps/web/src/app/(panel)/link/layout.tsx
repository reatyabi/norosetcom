import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'نورولینک',
  robots: { index: false, follow: false },
};

export default function LinkLayout({ children }: { children: ReactNode }) {
  return children;
}

