/* eslint-disable @next/next/no-img-element -- آواتارهای کوچک از API؛ بهینه‌سازی next/image لازم نیست */
import { headers } from 'next/headers';
import './customer-logos.css';
import { publicLinkUrl } from '@/lib/routes';
import { DEFAULT_PUBLIC_HOST } from '@/lib/host-routing';

const API_ORIGIN = process.env.API_ORIGIN ?? 'http://127.0.0.1:3001';
const TILE_COLORS = ['#fde2cf', '#d9ecff', '#dff5e6', '#efe2ff', '#ffe0e6', '#fff1c7'];

interface DirectoryItem {
  slug: string;
  name: string;
  avatarUrl: string | null;
}

async function fetchIndexedPages(): Promise<DirectoryItem[]> {
  try {
    const res = await fetch(`${API_ORIGIN}/norolink/public/pages`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: DirectoryItem[] };
    if (!data?.items || !Array.isArray(data.items)) return [];
    return data.items.map((item) => ({
      slug: item.slug,
      name: item.name,
      avatarUrl: item.avatarUrl ?? null,
    }));
  } catch {
    return [];
  }
}

function Logo({
  item,
  index,
  pageUrl,
}: {
  item: DirectoryItem;
  index: number;
  pageUrl: string;
}) {
  return (
    <li className="flex shrink-0 flex-col items-center gap-2 px-5 sm:px-7" title={item.name}>
      <a
        href={pageUrl}
        target="_blank"
        rel="noopener nofollow ugc"
        className="block rounded-2xl ring-2 ring-transparent transition-shadow hover:ring-border focus-visible:outline-none focus-visible:ring-primary"
        aria-label={item.name}
      >
        {item.avatarUrl ? (
          <img
            src={item.avatarUrl}
            alt={item.name}
            width={75}
            height={75}
            loading="lazy"
            decoding="async"
            className="size-[75px] rounded-2xl object-cover"
          />
        ) : (
          <span
            aria-label={item.name}
            role="img"
            className="flex size-[75px] items-center justify-center rounded-2xl text-2xl font-black text-neutral-800"
            style={{ background: TILE_COLORS[index % TILE_COLORS.length] }}
          >
            {item.name.charAt(0)}
          </span>
        )}
      </a>
    </li>
  );
}

/** اسلایدر خودکار صفحات ایندکس‌شده‌ی نورولینک از دایرکتوری n8l.ir (پیش از بلوک CTA). */
export async function CustomerLogos() {
  const reqHeaders = await headers();
  const hostHeader = reqHeaders.get('host') ?? '';
  const devPort = hostHeader.includes(':') ? hostHeader.split(':')[1] : undefined;
  const publicHost = process.env.PUBLIC_HOST ?? DEFAULT_PUBLIC_HOST;

  const pages = await fetchIndexedPages();
  if (!pages.length) return null;

  return (
    <section aria-labelledby="customer-logos-heading" className="border-t border-border">
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 md:py-16">
        <h2
          id="customer-logos-heading"
          className="text-center text-xl font-black text-foreground sm:text-3xl"
        >
          کسب‌وکارهایی که با نورولینک دیده می‌شوند
        </h2>
        <p className="mt-2 text-center text-muted-foreground">
          صفحات نورولینک ایندکس‌شده در دایرکتوری n8l.ir
        </p>
        {/* حرکت با CSS: فهرست دو بار پشت هم، نسخه‌ی دوم برای صفحه‌خوان پنهان */}
        <div className="mkt-ticker-viewport mkt-logos mt-8 overflow-hidden" dir="ltr">
          <div className="mkt-logos-track">
            <ul className="flex">
              {pages.map((item, i) => (
                <Logo
                  key={item.slug}
                  item={item}
                  index={i}
                  pageUrl={publicLinkUrl(publicHost, item.slug, devPort)}
                />
              ))}
            </ul>
            <ul className="mkt-logos-copy flex" aria-hidden="true">
              {pages.map((item, i) => (
                <Logo
                  key={item.slug}
                  item={item}
                  index={i}
                  pageUrl={publicLinkUrl(publicHost, item.slug, devPort)}
                />
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
