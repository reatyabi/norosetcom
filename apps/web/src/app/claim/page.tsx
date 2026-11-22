import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import Link from 'next/link';
import { AlertCircleIcon } from 'lucide-react';
import { LinkPage, type AnyElement, type PageContent } from '@noroset/norolink/ui';
import { lucideServerIcon } from '@/lib/lucide-icons.server';
import { routes } from '@/lib/routes';
import { ClaimSheet, type ClaimOffer } from './claim-client';

const API_ORIGIN = process.env.API_ORIGIN ?? 'http://127.0.0.1:3001';
/** پلنی که ۱۴ روز رایگان آن داده می‌شود (docs/architecture.md §9.11). */
const TRIAL_PLAN_CODE = 'basic';

export const metadata: Metadata = {
  title: 'تحویل صفحه اختصاصی کسب‌وکار | نورولینک',
  description: 'صفحه‌ی آماده‌ی کسب‌وکار خود را ببینید و با شماره موبایل تحویل بگیرید.',
  robots: { index: false, follow: false },
};

interface ClaimPreview {
  title: string;
  businessName: string;
  slug: string | null;
  content: PageContent;
  elements: AnyElement[];
  assetBaseUrl: string;
}

type Props = {
  searchParams: Promise<{ token?: string; slug?: string; preview?: string }>;
};

/** UA و IP بازدیدکننده را می‌فرستد تا باز شدن لینک (جز ربات‌ها و پیش‌نمایش پیام‌رسان‌ها) در قیف شمرده شود. */
async function loadClaim(token: string, preview: boolean): Promise<ClaimPreview | null> {
  const h = await headers();
  const forward: Record<string, string> = {};
  for (const name of ['x-forwarded-for', 'user-agent']) {
    const value = h.get(name);
    if (value) forward[name] = value;
  }
  const res = await fetch(`${API_ORIGIN}/norolink/public/pages/claim/${encodeURIComponent(token)}${preview ? '?preview=1' : ''}`, {
    headers: forward,
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return (await res.json()) as ClaimPreview;
}

/** کوتاه‌ترین دوره‌ی پلن پایه برای جمله‌ی «بعد از ۱۴ روز از … تومان»؛ نبودش فقط آن جمله را حذف می‌کند. */
async function loadOffer(): Promise<ClaimOffer | null> {
  try {
    const res = await fetch(`${API_ORIGIN}/billing/plans`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const data = (await res.json()) as { plans: { code: string; prices: { months: number; priceRial: number }[] }[] };
    const plan = data.plans.find((p) => p.code === TRIAL_PLAN_CODE);
    const price = [...(plan?.prices ?? [])].sort((a, b) => a.months - b.months)[0];
    return price ? { months: price.months, priceRial: price.priceRial } : null;
  } catch {
    return null;
  }
}

function InvalidLink({ title, text }: { title: string; text: string }) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4" dir="rtl">
      <div className="w-full max-w-md rounded-3xl border bg-card p-8 text-center shadow-xl">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-warning/10 text-warning">
          <AlertCircleIcon className="size-8" />
        </div>
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href={routes.auth()}
            className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary/90"
          >
            ورود به حساب
          </Link>
          <Link href={routes.home} className="inline-flex h-11 items-center justify-center rounded-full border px-6 text-sm font-semibold hover:bg-muted">
            صفحه اصلی
          </Link>
        </div>
      </div>
    </main>
  );
}

/**
 * تحویل صفحه‌ی آماده به مشتری (docs/architecture.md §9.8): خود صفحه تمام‌صفحه همان‌طور که منتشر می‌شود، و یک برگه‌ی کوچک
 * روی آن با پیام‌ها و دکمه‌ی تأیید (در موبایل ثابت پایین صفحه). `preview=1` پیش‌نمایش ادیتور قالب است: شمرده نمی‌شود و تحویل ندارد.
 */
export default async function ClaimPage({ searchParams }: Props) {
  const { token, slug, preview } = await searchParams;
  if (!token) {
    return (
      <InvalidLink title="لینک تحویل کامل نیست" text="لینکی را که در پیامک یا پیام‌رسان برایتان فرستاده شده کامل باز کنید." />
    );
  }
  const isPreview = preview === '1';
  const [page, offer] = await Promise.all([loadClaim(token, isPreview), loadOffer()]);
  if (!page) {
    return (
      <InvalidLink
        title="این لینک دیگر فعال نیست"
        text="صفحه قبلاً تحویل گرفته شده یا لینک باطل شده است. اگر صفحه را خودتان تحویل گرفته‌اید، وارد حساب شوید."
      />
    );
  }
  const isAuthenticated = (await cookies()).has('access_token');

  return (
    <div className="claim-shell relative min-h-svh">
      <LinkPage
        content={page.content}
        elements={page.elements}
        assetBaseUrl={page.assetBaseUrl}
        forceLicense
        lucideIcon={lucideServerIcon}
      />
      <ClaimSheet
        token={token}
        businessName={page.businessName || page.title}
        reservedSlug={page.slug}
        initialSlug={slug ?? null}
        offer={offer}
        isAuthenticated={isAuthenticated}
        preview={isPreview}
      />
    </div>
  );
}
