import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { DirectionProvider } from '@base-ui/react/direction-provider';
import { themeInitScript } from '@noroset/ui';
import { ThemeProvider } from '@/components/theme-provider';
import { fontVariables } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'نوروست',
  description: 'پلتفرم SaaS فارسی (RTL)',
  icons: {
    icon: [{ url: '/favicon-ns.svg', type: 'image/svg+xml' }],
    apple: '/apple-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning className={`${fontVariables} font-sans antialiased`}>
      <body>
        <Script
          id="noroset-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        <DirectionProvider direction="rtl">
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </DirectionProvider>
      </body>
    </html>
  );
}
