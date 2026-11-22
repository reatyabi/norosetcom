import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, permanentRedirect } from 'next/navigation';
import { cache } from 'react';
import { assetUrlFor, jsonLdScript, LinkPage, profileJsonLd, type AnyElement, type PageContent } from '@noroset/norolink/ui';
import { DEFAULT_PUBLIC_HOST } from '@/lib/host-routing';
import { lucideServerIcon } from '@/lib/lucide-icons.server';
import { publicDirectoryUrl, publicLinkUrl, publicReportUrl } from '@/lib/routes';
import { ModerationWarning, WarningBar } from './moderation-warning';
import { LinkTracker } from './tracker';

// صفحه‌ی لینک عمومی روی زیردامنه ({slug}.n8l.ir)؛ proxy مسیر را به /nls/{slug} بازنویسی می‌کند
// و CSP محدود frame را ست می‌کند. رندر سمت سرور، بدون JS جز اسکریپت کوچک آمار.

const API_ORIGIN = process.env.API_ORIGIN ?? 'http://127.0.0.1:3001';

interface PublicLinkView {
  slug: string;
  title: string;
  content: PageContent;
  elements: AnyElement[];
  assetBaseUrl: string;
  branding: { forceLicense: boolean };
  /** هشدار مدیریت پلتفرم پیش از محتوا (§9.13). */
  moderation: { status: 'warning'; reason: string; notice: string } | null;
}

/** نورولینک خاموش یا پلن صفحه تمام شده است (docs/architecture.md §9.11)؛ پیام ادمین یا متن پیش‌فرض. */
interface Unavailable {
  unavailable: true;
  notice: string | null;
}

/** نشانی فعلی صفحه‌ای که این نشانی قبلی آن است (ریدایرکت دائمی ۳۰۸؛ گوگل آن را مثل ۳۰۱ حساب می‌کند). */
interface MovedPage {
  redirectTo: string;
}

const load = cache(async (slug: string): Promise<PublicLinkView | Unavailable | MovedPage | null> => {
  // IP واقعی برای rate limit API (API فقط به loopback اعتماد دارد؛ TRUST_PROXY).
  const forwarded = (await headers()).get('x-forwarded-for');
  const res = await fetch(`${API_ORIGIN}/norolink/public/pages/${encodeURIComponent(slug)}`, {
    headers: forwarded ? { 'x-forwarded-for': forwarded } : {},
    // تازه در هر درخواست: انتشار باید فوراً دیده شود (کش در لایه‌ی CDN، بعداً).
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  // تعلیق مدیریت پلتفرم: proxy پیش از رندر ۴۵۱/۴۰۳ می‌دهد (src/lib/link-gate.ts)؛ این‌جا فقط پشتیبان است.
  if (res.status === 451 || res.status === 403) {
    const body = (await res.json().catch(() => null)) as { notice?: unknown } | null;
    return { unavailable: true, notice: typeof body?.notice === 'string' ? body.notice : null };
  }
  if (res.status === 503) {
    const body = (await res.json().catch(() => null)) as { notice?: unknown } | null;
    return { unavailable: true, notice: typeof body?.notice === 'string' ? body.notice : null };
  }
  // سقف درخواست به‌جای خطای ۵۰۰، همان پیام «در دسترس نیست» را نشان می‌دهد.
  if (res.status === 429) return { unavailable: true, notice: null };
  if (!res.ok) throw new Error(`public link page: ${res.status}`);
  return (await res.json()) as PublicLinkView | MovedPage;
});

/** نشانی کامل صفحه روی زیردامنه‌اش (canonical و og:url؛ بدون query تا UTM نسخه‌ی تکراری نسازد). */
async function pageUrl(slug: string): Promise<string> {
  const port = (await headers()).get('host')?.split(':')[1];
  return publicLinkUrl(process.env.PUBLIC_HOST ?? DEFAULT_PUBLIC_HOST, slug, port);
}

/** فرم گزارش تخلف همین صفحه روی دامنه‌ی کوتاه (§9.13). */
async function reportUrl(slug: string): Promise<string> {
  const port = (await headers()).get('host')?.split(':')[1];
  return publicReportUrl(process.env.PUBLIC_HOST ?? DEFAULT_PUBLIC_HOST, slug, port);
}

// ناموجود و نشانی قبلی را proxy پیش از stream با ۴۰۴ و ۳۰۸ پاسخ می‌دهد (src/lib/link-gate.ts)؛ این‌جا فقط پشتیبان است.
async function redirectToCurrent(slug: string): Promise<never> {
  permanentRedirect(await pageUrl(slug));
}

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ continue?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await load((await params).slug);
  if (page && 'redirectTo' in page) return redirectToCurrent(page.redirectTo);
  if (!page) return {};
  if ('unavailable' in page) return { robots: { index: false, follow: false } };
  const { profile, seo } = page.content;
  const assetUrl = assetUrlFor(page.assetBaseUrl);
  const image = seo.og_image ?? profile.avatar;
  const title = seo.title || profile.name || page.title;
  const description = seo.description || profile.bio || undefined;
  const url = await pageUrl(page.slug);
  return {
    // تصویر ثابت قالب نشانی نسبی دارد و بدون این مقدار، پیش‌نمایش اشتراک‌گذاری به localhost اشاره می‌کند.
    metadataBase: new URL(process.env.WEB_ORIGIN ?? 'http://localhost:3000'),
    title,
    description,
    // پیش‌فرض noindex
    robots: seo.indexable ? { index: true, follow: true } : { index: false, follow: false },
    // نشانی مطلق: metadataBase دامنه‌ی اصلی است و نشانی نسبی به noroset.com اشاره می‌کرد.
    alternates: { canonical: url },
    openGraph: { title, description, url, locale: 'fa_IR', siteName: 'نورولینک', type: 'profile', images: image ? [{ url: assetUrl(image), width: image.width, height: image.height }] : [] },
    twitter: { card: image ? 'summary_large_image' : 'summary', title, description },
  };
}

export default async function PublicLinkPage({ params, searchParams }: Props) {
  const page = await load((await params).slug);
  if (!page) notFound();
  if ('redirectTo' in page) return redirectToCurrent(page.redirectTo);
  if ('unavailable' in page) {
    return (
      <main className="flex min-h-svh items-center justify-center p-6 text-center">
        <p className="max-w-sm text-muted-foreground">{page.notice || 'این صفحه در حال حاضر در دسترس نیست.'}</p>
      </main>
    );
  }
  // هشدار مدیریت پلتفرم: اول صفحه‌ی هشدار (بدون JS)؛ «ادامه» همان صفحه را با ?continue=1 و نوار هشدار بالای آن باز می‌کند.
  const warned = page.moderation?.status === 'warning';
  if (warned && (await searchParams).continue !== '1') {
    const port = (await headers()).get('host')?.split(':')[1];
    const home = publicDirectoryUrl(process.env.PUBLIC_HOST ?? DEFAULT_PUBLIC_HOST, port);
    return <ModerationWarning notice={page.moderation!.notice} name={page.content.profile.name || page.title} homeHref={home} />;
  }
  // بدون لودر تمام‌صفحه (تصمیم مالک محصول ۱۴۰۵/۸/۲۰): محتوا همان HTML سرور است و همان لحظه دیده می‌شود (LCP).
  const { profile } = page.content;
  const assetUrl = assetUrlFor(page.assetBaseUrl);
  const avatarUrl = profile.avatar ? assetUrl(profile.avatar) : null;
  // seo.indexable از API همان مقدار مؤثر است (پلن، دوره‌ی رایگان، توضیح کافی)؛ بدون entity یا noindex ← null.
  const jsonLd = profileJsonLd(page.content, page.elements, await pageUrl(page.slug), assetUrl, true);

  return (
    <>
      {avatarUrl ? <link rel="preload" as="image" href={avatarUrl} fetchPriority="high" /> : null}
      {jsonLd ? (
        // متن کاربر داخل اسکریپت: jsonLdScript هر `<` را escape می‌کند تا از تگ بیرون نزند.
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      ) : null}
      <div className="relative min-h-svh">
        {warned ? <WarningBar notice={page.moderation!.notice} /> : null}
        <LinkPage
          content={page.content}
          elements={page.elements}
          assetBaseUrl={page.assetBaseUrl}
          forceLicense={page.branding.forceLicense}
          lucideIcon={lucideServerIcon}
          reportHref={await reportUrl(page.slug)}
        />
        <LinkTracker slug={page.slug} />
      </div>
    </>
  );
}
