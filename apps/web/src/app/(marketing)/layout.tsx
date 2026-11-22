import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './marketing.css';
import { SkipLink } from '@/components/skip-link';
import { MarketingHeader } from './_components/marketing-header';
import { MarketingFooter } from './_components/marketing-footer';

const SITE_ORIGIN = (process.env.WEB_ORIGIN ?? 'https://noroset.com').replace(/\/$/, '');

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  icons: {
    icon: [{ url: '/favicon-ns.svg', type: 'image/svg+xml' }],
    apple: '/apple-icon.png',
  },
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="marketing-root flex min-h-screen flex-col bg-background text-foreground antialiased selection:bg-accent selection:text-accent-foreground">
      <SkipLink />
      <MarketingHeader />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}
