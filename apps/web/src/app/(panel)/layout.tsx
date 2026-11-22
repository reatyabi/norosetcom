import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { PanelClientLayout } from './_components/panel-client-layout';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AppLayout({ children }: { children: ReactNode }) {
  return <PanelClientLayout>{children}</PanelClientLayout>;
}
