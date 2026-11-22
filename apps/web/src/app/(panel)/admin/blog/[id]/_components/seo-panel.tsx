'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2Icon, ChevronDownIcon, CircleAlertIcon, CircleXIcon } from 'lucide-react';
import { cn, Field, FieldDescription, FieldLabel, ImagePickerField, Input, Switch, Textarea } from '@noroset/ui';
import {
  analyzeSeo,
  effectiveSeoDescription,
  effectiveSeoTitle,
  SEO_LENGTH,
  SEO_MAX,
  type BlogDoc,
  type PostSeo,
  type SeoCheckStatus,
} from '@noroset/blog/ui';
import { errorMessage } from '@/lib/api';
import { blogImageSource } from '@/lib/file-sources';

// تنظیمات و تحلیل سئوی مقاله: کلمه‌ی کلیدی، نمای نتیجه‌ی گوگل، کارت اشتراک، canonical و noindex (docs/architecture.md §9.12).

const fa = (n: number) => n.toLocaleString('fa-IR');
const OG_OPTIONS = { accept: ['image' as const], maxBytes: 5 * 1024 * 1024, requirePublic: true, image: { aspect: 1200 / 630, shape: 'rect' as const, maxSize: 1200, quality: 0.85 } };

const STATUS_ICON: Record<SeoCheckStatus, typeof CheckCircle2Icon> = { good: CheckCircle2Icon, ok: CircleAlertIcon, bad: CircleXIcon };
const STATUS_COLOR: Record<SeoCheckStatus, string> = { good: 'text-success', ok: 'text-warning', bad: 'text-destructive' };

function scoreTone(score: number): SeoCheckStatus {
  return score >= 75 ? 'good' : score >= 50 ? 'ok' : 'bad';
}

function ScoreRing({ score }: { score: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const tone = scoreTone(score);
  return (
    <div className="relative size-14 shrink-0">
      <svg viewBox="0 0 56 56" className="size-14 -rotate-90" aria-hidden>
        <circle cx="28" cy="28" r={r} fill="none" strokeWidth="5" className="stroke-muted" />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          className={cn('transition-[stroke-dashoffset] duration-500', tone === 'good' ? 'stroke-success' : tone === 'ok' ? 'stroke-warning' : 'stroke-destructive')}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums">{fa(score)}</span>
    </div>
  );
}

/** شمارنده‌ی نویسه با نوار رنگی بازه‌ی پیشنهادی. */
function LengthMeter({ length, min, max }: { length: number; min: number; max: number }) {
  const tone: SeoCheckStatus = length >= min && length <= max ? 'good' : length === 0 || length > max + 10 ? 'bad' : 'ok';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-[width]', tone === 'good' ? 'bg-success' : tone === 'ok' ? 'bg-warning' : 'bg-destructive')}
          style={{ width: `${Math.min(100, (length / max) * 100)}%` }}
        />
      </div>
      <span className={cn('text-xs tabular-nums', STATUS_COLOR[tone])}>
        {fa(length)} / {fa(min)}–{fa(max)}
      </span>
    </div>
  );
}

export interface SeoPanelProps {
  title: string;
  slug: string;
  excerpt: string;
  doc: BlogDoc;
  coverUrl: string | null;
  seo: PostSeo;
  ogImageUrl: string | null;
  siteOrigin: string;
  onChange: (patch: Partial<PostSeo>, ogImageUrl?: string | null) => void;
}

export function SeoPanel({ title, slug, excerpt, doc, coverUrl, seo, ogImageUrl, siteOrigin, onChange }: SeoPanelProps) {
  const [advanced, setAdvanced] = useState(Boolean(seo.canonical || seo.noindex));
  const siteHost = siteOrigin.replace(/^https?:\/\//, '');
  const analysis = useMemo(() => analyzeSeo({ title, slug, excerpt, seo, doc, hasCover: Boolean(coverUrl), siteHost }), [title, slug, excerpt, seo, doc, coverUrl, siteHost]);
  const sorted = [...analysis.checks].sort((a, b) => ['bad', 'ok', 'good'].indexOf(a.status) - ['bad', 'ok', 'good'].indexOf(b.status));
  const seoTitle = effectiveSeoTitle(title, seo);
  const seoDescription = effectiveSeoDescription(excerpt, seo);
  const ogTitle = seo.og_title || seoTitle;
  const ogDescription = seo.og_description || seoDescription;
  const ogImage = ogImageUrl ?? coverUrl;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <ScoreRing score={analysis.score} />
        <div className="flex flex-col">
          <span className="font-semibold">امتیاز سئو</span>
          <span className="text-sm text-muted-foreground">
            {scoreTone(analysis.score) === 'good' ? 'خوب است.' : scoreTone(analysis.score) === 'ok' ? 'قابل بهبود است.' : 'نیاز به کار دارد.'} راهنماست و مانع انتشار
            نیست.
          </span>
        </div>
      </div>

      <Field>
        <FieldLabel>کلمه‌ی کلیدی اصلی</FieldLabel>
        <Input value={seo.focus_keyword ?? ''} maxLength={SEO_MAX.keyword} placeholder="مثلاً: صفحه لینک" onChange={(e) => onChange({ focus_keyword: e.target.value })} />
        <FieldDescription>عبارتی که می‌خواهید این مقاله در گوگل برای آن دیده شود.</FieldDescription>
      </Field>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">نمای نتیجه‌ی گوگل</h3>
        <div className="rounded-xl border border-border bg-background p-4" dir="rtl">
          <div dir="ltr" className="truncate text-start text-xs text-muted-foreground">
            {siteHost} › blog › {slug}
          </div>
          <div className="mt-1 line-clamp-1 text-lg text-[#1a0dab] dark:text-[#8ab4f8]">{seoTitle || 'عنوان مقاله'}</div>
          <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{seoDescription || 'توضیح متا یا خلاصه‌ی مقاله اینجا می‌آید.'}</div>
        </div>
        <Field>
          <FieldLabel>عنوان سئو</FieldLabel>
          <Input value={seo.title ?? ''} maxLength={SEO_MAX.title} placeholder={title || 'همان عنوان مقاله'} onChange={(e) => onChange({ title: e.target.value })} />
          <LengthMeter length={seoTitle.length} min={SEO_LENGTH.title.min} max={SEO_LENGTH.title.max} />
        </Field>
        <Field>
          <FieldLabel>توضیح متا</FieldLabel>
          <Textarea
            rows={3}
            value={seo.description ?? ''}
            maxLength={SEO_MAX.description}
            placeholder={excerpt || 'خالی = خلاصه‌ی مقاله'}
            onChange={(e) => onChange({ description: e.target.value })}
          />
          <LengthMeter length={seoDescription.length} min={SEO_LENGTH.description.min} max={SEO_LENGTH.description.max} />
        </Field>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">بررسی‌ها</h3>
        <ul className="flex flex-col gap-1.5">
          {sorted.map((c) => {
            const Icon = STATUS_ICON[c.status];
            return (
              <li key={c.id} className="flex items-start gap-2 text-sm">
                <Icon className={cn('mt-0.5 size-4 shrink-0', STATUS_COLOR[c.status])} aria-label={c.status} />
                <span>{c.message}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">اشتراک‌گذاری در شبکه‌های اجتماعی</h3>
        <div className="overflow-hidden rounded-xl border border-border bg-background">
          {ogImage ? (
            // eslint-disable-next-line @next/next/no-img-element -- فایل پلتفرم norofile
            <img src={ogImage} alt="" className="aspect-[1200/630] w-full object-cover" />
          ) : (
            <div className="flex aspect-[1200/630] items-center justify-center bg-muted text-sm text-muted-foreground">بدون تصویر</div>
          )}
          <div className="flex flex-col gap-0.5 p-3">
            <span dir="ltr" className="text-start text-xs text-muted-foreground uppercase">
              {siteHost}
            </span>
            <span className="line-clamp-1 font-semibold">{ogTitle || 'عنوان'}</span>
            <span className="line-clamp-2 text-sm text-muted-foreground">{ogDescription}</span>
          </div>
        </div>
        <Field>
          <FieldLabel>عنوان اشتراک‌گذاری</FieldLabel>
          <Input value={seo.og_title ?? ''} maxLength={SEO_MAX.title} placeholder="خالی = عنوان سئو" onChange={(e) => onChange({ og_title: e.target.value })} />
        </Field>
        <Field>
          <FieldLabel>توضیح اشتراک‌گذاری</FieldLabel>
          <Textarea
            rows={2}
            value={seo.og_description ?? ''}
            maxLength={SEO_MAX.description}
            placeholder="خالی = توضیح متا"
            onChange={(e) => onChange({ og_description: e.target.value })}
          />
        </Field>
        <ImagePickerField
          label="تصویر اشتراک‌گذاری (۱۲۰۰×۶۳۰؛ خالی = تصویر شاخص)"
          previewUrl={ogImageUrl}
          source={blogImageSource()}
          options={OG_OPTIONS}
          title="تصویر اشتراک‌گذاری"
          errorMessage={errorMessage}
          onPick={(f) => onChange({ og_image: { file_id: f.id, width: f.width, height: f.height } }, f.url)}
          onRemove={ogImageUrl ? () => onChange({ og_image: null }, null) : undefined}
        />
      </section>

      <section className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setAdvanced((v) => !v)}
          aria-expanded={advanced}
          className="flex items-center justify-between text-sm font-semibold"
        >
          تنظیمات پیشرفته
          <ChevronDownIcon className={cn('size-4 transition-transform', advanced && 'rotate-180')} />
        </button>
        {advanced ? (
          <>
            <Field>
              <FieldLabel>آدرس canonical</FieldLabel>
              <Input dir="ltr" value={seo.canonical ?? ''} maxLength={SEO_MAX.canonical} placeholder="https://" onChange={(e) => onChange({ canonical: e.target.value })} />
              <FieldDescription>فقط وقتی همین مطلب جای دیگری منتشر شده است؛ خالی = نشانی همین مقاله. مقاله‌ی دارای canonical در نقشه‌ی سایت نمی‌آید.</FieldDescription>
            </Field>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="flex flex-col">
                <span>پنهان از موتورهای جستجو (noindex)</span>
                <span className="text-xs text-muted-foreground">مقاله در سایت دیده می‌شود ولی گوگل آن را فهرست نمی‌کند.</span>
              </span>
              <Switch checked={Boolean(seo.noindex)} onCheckedChange={(v) => onChange({ noindex: v })} />
            </label>
          </>
        ) : null}
      </section>
    </div>
  );
}
