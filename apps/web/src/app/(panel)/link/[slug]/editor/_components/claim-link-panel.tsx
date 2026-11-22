'use client';

import { useEffect, useState } from 'react';
import { CheckIcon, CopyIcon, EyeIcon, GiftIcon, MessageSquareTextIcon } from 'lucide-react';
import { Button, Input, Textarea } from '@noroset/ui';
import type { PageContent } from '@noroset/norolink/ui';
import { api, errorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { PUBLIC_HOST, type ClaimLinkView, type EditorElement } from '../../../links-shared';

const fa = (n: number) => n.toLocaleString('fa-IR');
const SLUG_MAX = 63;

/** شناسه‌ی اینستاگرام صفحه (اگر هست) به قالب نشانی: `narenj.cafe` ← `narenj-cafe`. */
export function suggestSlug(elements: EditorElement[]): string {
  for (const el of elements) {
    if (el.kind !== 'social_icons') continue;
    const insta = el.settings.items.find((i) => i.platform === 'instagram');
    if (!insta?.value) continue;
    const handle = insta.value.replace(/\/+$/, '').split('/').pop() ?? '';
    const slug = handle
      .toLowerCase()
      .replace(/^@/, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, SLUG_MAX);
    if (slug.length >= 2) return slug;
  }
  return '';
}

/**
 * متن آماده‌ی پیام همراه لینک (دایرکت، واتس‌اپ، پیامک). نشانی صفحه عمداً نمی‌آید: پیام‌رسان‌ها آن را لینک می‌کنند و صفحه پیش از
 * تحویل منتشر نشده است؛ ۱۴ روز رایگان هم فقط پس از انتشار گفته می‌شود.
 */
function messageText(link: ClaimLinkView): string {
  return `سلام، صفحه‌ی اختصاصی «${link.businessName}» در نورولینک آماده است. از لینک زیر آن را ببینید و با شماره موبایل خودتان تحویل بگیرید:\n${link.url}`;
}

type SlugState = { checking: true } | { checking: false; available: boolean; message?: string } | null;

/**
 * لینک واگذاری قالب به مشتری (docs/architecture.md §9.8): مختص شماره‌ی خاصی نیست و هر کس زودتر تحویل بگیرد صاحب صفحه می‌شود.
 * نشانی تا تحویل یا ابطال برای همین لینک رزرو است (مشتری پیش از تحویل می‌تواند عوضش کند)؛ نام کسب‌وکار و یادداشت برای پیگیری
 * قیف در «کمپین‌ها» است.
 */
export function ClaimLinkPanel({
  id,
  claimLink,
  claimedAt,
  content,
  elements,
  onChange,
}: {
  id: string;
  claimLink: ClaimLinkView | null;
  claimedAt: string | null;
  content: PageContent;
  elements: EditorElement[];
  onChange: (claim: { claimLink: ClaimLinkView | null }) => void;
}) {
  const [businessName, setBusinessName] = useState(() => content.profile.name.trim());
  const [slug, setSlug] = useState(() => suggestSlug(elements));
  const [note, setNote] = useState('');
  const [checked, setChecked] = useState<{ slug: string; available: boolean; message?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<'link' | 'message' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (claimLink || !slug) return;
    let current = true;
    const timer = setTimeout(() => {
      api<{ available: boolean; message?: string }>(`/norolink/admin/claim-links/check-slug?slug=${encodeURIComponent(slug)}`).then(
        (res) => current && setChecked({ slug, ...res }),
        () => current && setChecked({ slug, available: false, message: 'بررسی نشانی ممکن نشد؛ دوباره تلاش کنید.' }),
      );
    }, 350);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [slug, claimLink]);

  // نتیجه فقط برای همان نشانی که بررسی شده معتبر است؛ تا پاسخ نشانی تازه برسد «در حال بررسی».
  const slugState: SlugState =
    claimLink || !slug ? null : checked?.slug === slug ? { checking: false, available: checked.available, message: checked.message } : { checking: true };

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const link = await api<ClaimLinkView>(`/norolink/admin/templates/${id}/claim-token`, {
        method: 'POST',
        body: { slug, businessName: businessName.trim(), note: note.trim() || undefined },
      });
      onChange({ claimLink: link });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    setBusy(true);
    setError(null);
    try {
      await api(`/norolink/admin/templates/${id}/claim-token`, { method: 'DELETE' });
      onChange({ claimLink: null });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const copy = async (kind: 'link' | 'message', text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // دسترسی کلیپ‌بورد نیست؛ متن قابل انتخاب است
    }
  };

  const canCreate = businessName.trim().length > 0 && slugState !== null && !slugState.checking && slugState.available;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 rounded-xl border bg-muted/40 p-4">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-primary">
          <GiftIcon className="size-4.5" />
          لینک واگذاری به مشتری
        </span>
        <p className="text-xs leading-relaxed text-muted-foreground">
          صفحه را برای کسب‌وکار طراحی کنید و لینک را از هر راهی برایش بفرستید. مشتری صفحه را با نشانی‌ای که این‌جا رزرو می‌کنید
          می‌بیند، با شماره موبایل خودش وارد می‌شود و صفحه به نام او منتشر می‌شود و ۱۴ روز رایگان را می‌گیرد. لینک یک بار مصرف می‌شود
          و مختص شماره‌ی خاصی نیست. انتشار قالب در گالری لازم نیست.
        </p>
      </div>

      {error ? (
        <div role="alert" className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      ) : null}

      {claimedAt && !claimLink ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-success/30 bg-success/10 p-4 text-xs text-success dark:text-success">
          <CheckIcon className="mt-0.5 size-4 shrink-0" />
          <span>
            آخرین لینک در تاریخ {formatDateTime(claimedAt)} تحویل گرفته شد. قالب اینجا می‌ماند و صفحه‌ی مشتری مستقل از آن است. پیگیری
            مشتری در «مدیریت پلتفرم ← کمپین‌ها».
          </span>
        </div>
      ) : null}

      {claimLink ? (
        <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate text-sm font-semibold">{claimLink.businessName}</span>
            <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-medium text-warning dark:text-tone-amber">
              در انتظار تحویل
            </span>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
            <dt className="text-muted-foreground">نشانی رزروشده</dt>
            <dd dir="ltr" className="text-end font-mono">
              {claimLink.slug ? `${claimLink.slug}.${PUBLIC_HOST}` : 'تصادفی هنگام تحویل'}
            </dd>
            <dt className="text-muted-foreground">باز شده</dt>
            <dd>
              {claimLink.openCount > 0
                ? `${fa(claimLink.openCount)} بار · آخرین ${formatDateTime(claimLink.lastOpenedAt!)}`
                : 'هنوز باز نشده'}
            </dd>
            {claimLink.note ? (
              <>
                <dt className="text-muted-foreground">یادداشت</dt>
                <dd className="whitespace-pre-line">{claimLink.note}</dd>
              </>
            ) : null}
          </dl>
          <div className="flex items-center gap-2 rounded-xl border bg-muted/30 px-3 py-2">
            <span dir="ltr" className="min-w-0 flex-1 truncate font-mono text-xs">
              {claimLink.url}
            </span>
            <Button type="button" size="sm" variant="outline" onClick={() => void copy('link', claimLink.url)} className="h-7 text-xs">
              {copied === 'link' ? <CheckIcon className="size-3.5 text-success" /> : <CopyIcon className="size-3.5" />}
              {copied === 'link' ? 'کپی شد' : 'کپی لینک'}
            </Button>
          </div>
          <Button type="button" variant="secondary" onClick={() => void copy('message', messageText(claimLink))}>
            {copied === 'message' ? <CheckIcon className="size-4 text-success" /> : <MessageSquareTextIcon className="size-4" />}
            {copied === 'message' ? 'متن پیام کپی شد' : 'کپی متن پیام همراه لینک'}
          </Button>
          <div className="flex items-center justify-between gap-2 border-t pt-2">
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void revoke()} className="h-7 text-xs text-destructive hover:bg-destructive/10">
              ابطال لینک
            </Button>
            {/* preview=1: بازدید ادمین شمرده نمی‌شود و دکمه‌ی تحویل غیرفعال است (تحویل به حساب خود ادمین نرود). */}
            <a href={`${claimLink.url}?preview=1`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              <EyeIcon className="size-3.5" />
              پیش‌نمایش صفحه‌ی مشتری
            </a>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            نام کسب‌وکار
            <Input value={businessName} maxLength={200} onChange={(e) => setBusinessName(e.target.value)} placeholder="مثلاً کافه نارنج" />
          </label>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="claim-slug" className="text-sm font-medium">
              نشانی صفحه
            </label>
            <div dir="ltr" className="flex items-center overflow-hidden rounded-lg border bg-background focus-within:ring-2 focus-within:ring-ring/40">
              <input
                id="claim-slug"
                value={slug}
                maxLength={SLUG_MAX}
                onChange={(e) => setSlug(e.target.value.toLowerCase().trim())}
                placeholder="narenj-cafe"
                className="h-9 min-w-0 flex-1 bg-transparent px-3 font-mono text-sm outline-none"
              />
              <span className="shrink-0 bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">.{PUBLIC_HOST}</span>
            </div>
            <span
              className={
                slugState && !slugState.checking && !slugState.available ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'
              }
            >
              {!slug
                ? 'نشانی کوتاه و به‌یادماندنی؛ معمولاً همان شناسه‌ی اینستاگرام. مشتری پیش از تحویل می‌تواند عوضش کند.'
                : slugState?.checking
                  ? 'در حال بررسی…'
                  : slugState && !slugState.available
                    ? slugState.message
                    : slugState?.available
                      ? 'آزاد است و تا تحویل برای این مشتری رزرو می‌شود.'
                      : ''}
            </span>
          </div>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            یادداشت (اختیاری)
            <Textarea
              value={note}
              maxLength={500}
              rows={2}
              onChange={(e) => setNote(e.target.value)}
              placeholder="مثلاً دایرکت اینستاگرام، فروشنده: علی"
            />
          </label>
          <Button type="button" loading={busy} disabled={!canCreate} onClick={() => void create()}>
            {claimedAt ? 'ساخت لینک تازه' : 'ساخت لینک واگذاری'}
          </Button>
        </div>
      )}
    </div>
  );
}
