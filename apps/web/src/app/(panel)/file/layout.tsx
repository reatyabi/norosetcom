import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'نوروفایل',
  robots: { index: false, follow: false },
};

export default function FileLayout({ children }: { children: ReactNode }) {
  return children;
}

