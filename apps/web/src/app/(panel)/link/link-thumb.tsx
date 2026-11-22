'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { assetUrlFor, FLUID_MIN_WIDTH, LinkPage, templateElements, type AnyElement, type LinkTemplate, type PageContent } from '@noroset/norolink/ui';
import { useLucideIcon, usesLucide } from '@/lib/lucide-icons';
import { hasTemplateThumb, templateThumbSrc } from '@/lib/marketing-shots';

// تصویر بندانگشتی صفحه‌ی لینک (فهرست و گالری قالب‌ها): همان رندر صفحه‌ی عمومی در حالت پیش‌نمایش، در عرض
// موبایل ساخته و با zoom تا عرض کارت کوچک می‌شود (اندازه‌های سیال از عرض قاب حساب می‌شوند).

export function LinkThumb({ content, elements, assetBaseUrl = '' }: { content: PageContent; elements: AnyElement[]; assetBaseUrl?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ zoom: 0.5, height: 0 });
  const lucideIcon = useLucideIcon(usesLucide(elements));

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSize({ zoom: entry.contentRect.width / FLUID_MIN_WIDTH, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={box} aria-hidden className="size-full overflow-hidden" inert>
      {/* ارتفاع کمینه = ارتفاع کارت تا پس‌زمینه‌ی صفحه‌ی کوتاه هم کل تصویر را بپوشاند. */}
      <div className="flex flex-col" style={{ width: FLUID_MIN_WIDTH, minHeight: size.height / size.zoom, zoom: size.zoom, visibility: size.height ? undefined : 'hidden' }}>
        <LinkPage content={content} elements={elements} assetBaseUrl={assetBaseUrl} forceLicense={false} lucideIcon={lucideIcon} preview />
      </div>
    </div>
  );
}

/**
 * بندانگشتی قالب گالری بدون رندر زنده: قالب مدیریت پلتفرم ← تصویری که هنگام انتشار ساخته شد (`thumb`)؛ قالب کد ←
 * تصویر ثابت نسخه‌دار (lib/marketing-shots.ts). فقط اگر هیچ‌کدام نبود (قالب قدیمی) زنده رندر می‌شود.
 */
export function TemplateThumb({ template, assetBaseUrl }: { template: LinkTemplate; assetBaseUrl: string }) {
  const src = template.thumb ? assetUrlFor(assetBaseUrl)({ file_id: template.thumb, width: 0, height: 0 }) : hasTemplateThumb(template.id) ? templateThumbSrc(template.id) : null;
  if (src) {
    return (
      <div aria-hidden className="relative size-full overflow-hidden">
        <Image src={src} alt="" fill sizes="(min-width: 768px) 280px, 50vw" className="object-cover object-top" unoptimized={!!template.thumb} />
      </div>
    );
  }
  return <LinkThumb content={template.content} elements={templateElements(template)} assetBaseUrl={assetBaseUrl} />;
}
