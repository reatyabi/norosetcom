'use client';

import { useEffect } from 'react';

let viewed: string | null = null;

/** ثبت بازدید و کلیک با sendBeacon (لینک‌ها مستقیم می‌مانند، بدون redirect). */
export function LinkTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const endpoint = `/api/norolink/public/pages/${encodeURIComponent(slug)}/events`;
    const send = (body: Record<string, string>) => {
      const data = new Blob([JSON.stringify(body)], { type: 'application/json' });
      if (!navigator.sendBeacon?.(endpoint, data)) {
        void fetch(endpoint, { method: 'POST', body: data, keepalive: true, headers: { 'content-type': 'application/json' } }).catch(
          () => undefined,
        );
      }
    };
    // یک بازدید برای هر بارگذاری صفحه (StrictMode در development افکت را دوبار اجرا می‌کند).
    if (viewed !== slug) {
      viewed = slug;
      send({ kind: 'page_view', ...(document.referrer ? { referrer: document.referrer } : {}) });
    }

    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>('[data-nl-el]');
      if (el?.dataset.nlEl) send({ kind: 'element_click', elementId: el.dataset.nlEl });
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [slug]);
  return null;
}
