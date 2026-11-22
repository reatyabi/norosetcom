import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'نوروفرم',
  robots: { index: false, follow: false },
};

export default function FormLayout({ children }: { children: ReactNode }) {
  return children;
}

