import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { DEFAULT_PUBLIC_HOST } from '@/lib/host-routing';
import { DirectoryFooter } from './_components/directory-footer';
import { DirectoryHeader } from './_components/directory-header';
import { DirectoryView } from './_components/directory-view';
import type { DirectoryPageItem } from './types';

const API_ORIGIN = process.env.API_ORIGIN ?? 'http://127.0.0.1:3001';

export const metadata: Metadata = {
  title: 'دایرکتوری صفحات پیوند | n8l.ir — نورولینک',
  description:
    'دایرکتوری رسمی صفحات پیوند اختصاصی (Link in Bio) کسب‌وکارها، سازندگان محتوا، فریلنسرها و برندهای ایرانی در شبکه n8l.ir.',
  alternates: {
    canonical: '/n8l',
  },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'دایرکتوری صفحات لینک | n8l.ir — نورولینک',
    description: 'کاوش و کشف برترین صفحات پیوند اختصاصی کسب‌وکارها و سازندگان محتوا در شبکه نورولینک.',
    type: 'website',
    url: '/n8l',
    siteName: 'نوروست — نورولینک',
    locale: 'fa_IR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'دایرکتوری صفحات لینک | n8l.ir',
    description: 'کاوش و کشف برترین صفحات پیوند اختصاصی در شبکه n8l.ir',
  },
};

interface ApiDirectoryResponse {
  items: Array<{
    slug: string;
    title: string;
    name: string;
    bio: string;
    avatarUrl: string | null;
    themePreset: string;
    elementCount: number;
    publishedAt: string | null;
    isIndexable: boolean;
    socialPlatforms: string[];
    links: Array<{ label: string; url: string; icon?: string | null }>;
  }>;
  total: number;
}

async function fetchDirectoryPages(): Promise<DirectoryPageItem[]> {
  try {
    const res = await fetch(`${API_ORIGIN}/norolink/public/pages`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as ApiDirectoryResponse;
    if (!data || !Array.isArray(data.items)) return [];
    return data.items.map((item) => ({
      slug: item.slug,
      title: item.title,
      name: item.name,
      bio: item.bio,
      avatarUrl: item.avatarUrl,
      themePreset: item.themePreset,
      elementCount: item.elementCount,
      publishedAt: item.publishedAt,
      isIndexable: item.isIndexable,
      socialPlatforms: item.socialPlatforms,
      links: item.links,
    }));
  } catch {
    return [];
  }
}

export default async function N8lDirectoryPage() {
  const reqHeaders = await headers();
  const hostHeader = reqHeaders.get('host') ?? '';
  const devPort = hostHeader.includes(':') ? hostHeader.split(':')[1] : undefined;
  const publicHost = process.env.PUBLIC_HOST ?? DEFAULT_PUBLIC_HOST;

  // فقط صفحه‌های واقعی منتشرشده (docs/architecture.md §9.1)؛ نمونه‌ی ساختگی یا نشان «تأییدشده» نداریم.
  const pages = await fetchDirectoryPages();

  const siteOrigin = (process.env.WEB_ORIGIN ?? 'https://noroset.com').replace(/\/$/, '');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: 'دایرکتوری صفحات پیوند نورولینک',
        description: 'دایرکتوری رسمی صفحات پیوند اختصاصی کسب‌وکارها و سازندگان محتوا در شبکه n8l.ir.',
        url: `${siteOrigin}/n8l`,
        inLanguage: 'fa-IR',
        publisher: {
          '@type': 'Organization',
          name: 'نوروست',
          url: siteOrigin,
        },
      },
      {
        '@type': 'WebSite',
        name: 'نورولینک — دایرکتوری n8l.ir',
        url: `${siteOrigin}/n8l`,
        inLanguage: 'fa-IR',
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${siteOrigin}/n8l?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans antialiased selection:bg-tone-rose/20 selection:text-tone-rose dark:selection:text-tone-rose">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DirectoryHeader />
      <DirectoryView
        initialPages={pages}
        publicHost={publicHost}
        devPort={devPort}
      />
      <DirectoryFooter />
    </div>
  );
}
