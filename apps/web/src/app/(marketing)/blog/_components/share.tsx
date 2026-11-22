'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { CheckIcon, LinkIcon, Share2Icon } from 'lucide-react';

// اشتراک مقاله: اشتراک سیستم‌عامل (اگر هست)، کپی نشانی و چند شبکه‌ی رایج.

const NETWORKS = [
  { name: 'تلگرام', href: (u: string, t: string) => `https://t.me/share/url?url=${u}&text=${t}` },
  { name: 'واتس‌اپ', href: (u: string, t: string) => `https://wa.me/?text=${t}%20${u}` },
  { name: 'ایکس', href: (u: string, t: string) => `https://x.com/intent/post?url=${u}&text=${t}` },
  { name: 'لینکدین', href: (u: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
];

const noop = () => () => {};

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  // سرور navigator ندارد؛ پس از hydrate از مرورگر خوانده می‌شود
  const canShare = useSyncExternalStore(noop, () => typeof navigator.share === 'function', () => false);
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // مرورگر اجازه‌ی کپی نداد
    }
  }

  const btn = 'flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-sm text-muted-foreground transition-colors hover:text-foreground';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium">اشتراک‌گذاری:</span>
      {canShare ? (
        <button type="button" className={btn} onClick={() => void navigator.share({ title, url }).catch(() => undefined)}>
          <Share2Icon className="size-4" />
          اشتراک
        </button>
      ) : null}
      <button type="button" className={btn} onClick={() => void copy()} aria-live="polite">
        {copied ? <CheckIcon className="size-4 text-success" /> : <LinkIcon className="size-4" />}
        {copied ? 'کپی شد' : 'کپی نشانی'}
      </button>
      {NETWORKS.map((n) => (
        <a key={n.name} href={n.href(u, t)} target="_blank" rel="noopener noreferrer" className={btn}>
          {n.name}
        </a>
      ))}
    </div>
  );
}

/** نوار پیشرفت مطالعه بالای صفحه. */
export function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = document.getElementById('article-body');
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      setProgress(total <= 0 ? 1 : Math.min(1, Math.max(0, -rect.top / total)));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);
  return (
    <div aria-hidden className="fixed inset-x-0 top-0 z-[60] h-0.5">
      <div className="h-full origin-right bg-primary transition-transform duration-100" style={{ transform: `scaleX(${progress})` }} />
    </div>
  );
}
