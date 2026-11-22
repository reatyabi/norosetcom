import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { MarketingFooter } from '../(marketing)/_components/marketing-footer';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col justify-between bg-background text-foreground antialiased selection:bg-accent selection:text-accent-foreground">
      <main className="flex flex-1 items-center justify-center p-4 py-8">
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}
