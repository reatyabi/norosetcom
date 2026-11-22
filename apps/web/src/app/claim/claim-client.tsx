'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2Icon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CopyIcon,
  ExternalLinkIcon,
  GiftIcon,
  GlobeIcon,
  PencilIcon,
} from 'lucide-react';
import { Button, cn } from '@noroset/ui';
import { formatToman } from '@noroset/admin/ui';
import { api, ApiError, errorMessage } from '@/lib/api';
import { routes } from '@/lib/routes';
import { PUBLIC_HOST, publicUrl } from '../(panel)/link/links-shared';

export interface ClaimOffer {
  months: number;
  priceRial: number;
}

/** همان کلید انتخاب فضای کاری پنل (`(panel)/session.tsx`). */
const TENANT_KEY = 'noroset.tenantId';
const SLUG_MAX = 63;
const fa = (n: number) => n.toLocaleString('fa-IR');

function readStoredTenant(): string | null {
  try {
    return localStorage.getItem(TENANT_KEY);
  } catch {
    return null;
  }
}

/**
 * فضای کاری مقصد تحویل: فضای جاری اگر کاربر هنوز عضوش است، وگرنه اولین عضویت. مشتری تازه‌ثبت‌نام‌کرده هنوز فضای کاری
 * ندارد، پس همین‌جا به نام کسب‌وکار برایش ساخته می‌شود تا برای تحویل لازم نباشد از این صفحه بیرون برود.
 */
async function claimTenant(name: string): Promise<string> {
  const me = await api<{ memberships: { tenantId: string }[] }>('/me');
  const ids = me.memberships.map((m) => m.tenantId);
  const stored = readStoredTenant();
  if (stored && ids.includes(stored)) return stored;
  if (ids[0]) return ids[0];
  const slug = `ws-${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const created = await api<{ id: string }>('/tenants', { method: 'POST', body: { name: name.slice(0, 200), slug } });
  return created.id;
}

interface Claimed {
  slug: string;
  published: boolean;
  planExpired: boolean;
}

type SlugCheck = { checking: true } | { checking: false; available: boolean; message?: string } | null;

/**
 * برگه‌ی تحویل روی صفحه‌ی تمام‌صفحه (docs/architecture.md §9.8): کوچک تا خود صفحه دیده شود، جمع‌شدنی، و در موبایل چسبیده به
 * پایین با دکمه‌ی تأیید همیشه در دسترس. ارتفاعش به پایین صفحه اضافه می‌شود تا انتهای صفحه زیر آن نماند.
 */
export function ClaimSheet({
  token,
  businessName,
  reservedSlug,
  initialSlug,
  offer,
  isAuthenticated,
  preview,
}: {
  token: string;
  businessName: string;
  reservedSlug: string | null;
  /** نشانی‌ای که مشتری پیش از ورود انتخاب کرده بود (از آدرس بازگشت ورود). */
  initialSlug: string | null;
  offer: ClaimOffer | null;
  isAuthenticated: boolean;
  preview: boolean;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [slug, setSlug] = useState(initialSlug ?? reservedSlug ?? '');
  const [draftSlug, setDraftSlug] = useState(slug);
  const [editing, setEditing] = useState(false);
  const [checked, setChecked] = useState<{ slug: string; available: boolean; message?: string } | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimed, setClaimed] = useState<Claimed | null>(null);
  const [copied, setCopied] = useState(false);

  // جای برگه در پایین صفحه‌ی لینک (متغیر CSS روی ریشه؛ قانون در <style> پایین).
  useLayoutEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    const root = document.documentElement;
    const observer = new ResizeObserver(() => root.style.setProperty('--claim-sheet', `${el.offsetHeight + 16}px`));
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--claim-sheet');
    };
  }, []);

  const needsCheck = editing && Boolean(draftSlug) && draftSlug !== reservedSlug;
  useEffect(() => {
    if (!needsCheck) return;
    let current = true;
    const timer = setTimeout(() => {
      api<{ available: boolean; message?: string }>(
        `/norolink/public/pages/claim/${encodeURIComponent(token)}/check-slug?slug=${encodeURIComponent(draftSlug)}`,
      ).then(
        (res) => current && setChecked({ slug: draftSlug, ...res }),
        () => current && setChecked({ slug: draftSlug, available: false, message: 'بررسی نشانی ممکن نشد؛ دوباره تلاش کنید.' }),
      );
    }, 350);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [draftSlug, needsCheck, token]);

  // نتیجه فقط برای همان نشانی که بررسی شده معتبر است؛ تا پاسخ نشانی تازه برسد «در حال بررسی».
  const slugCheck: SlugCheck = !needsCheck
    ? null
    : checked?.slug === draftSlug
      ? { checking: false, available: checked.available, message: checked.message }
      : { checking: true };

  const draftOk = draftSlug === reservedSlug || (slugCheck !== null && !slugCheck.checking && slugCheck.available);

  const saveSlug = () => {
    if (!draftOk) return;
    setSlug(draftSlug);
    setEditing(false);
    setError(null);
  };

  const claim = async () => {
    setClaiming(true);
    setError(null);
    try {
      const tenantId = await claimTenant(businessName);
      const res = await api<{ slug: string; published: boolean; planExpired: boolean }>(`/norolink/pages/claim/${encodeURIComponent(token)}`, {
        method: 'POST',
        tenantId,
        body: slug && slug !== reservedSlug ? { slug } : {},
      });
      try {
        // ویرایشگر همین صفحه در همین فضای کاری باز شود
        localStorage.setItem(TENANT_KEY, tenantId);
      } catch {
        // ذخیره‌ی انتخاب فقط راحتی است
      }
      setClaimed({ slug: res.slug, published: res.published, planExpired: res.planExpired });
      setCollapsed(false);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'slug_taken') {
        setDraftSlug(slug);
        setEditing(true);
      }
      setError(errorMessage(err));
    } finally {
      setClaiming(false);
    }
  };

  const pageUrl = claimed ? publicUrl(claimed.slug) : '';
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // نشانی روی برگه قابل انتخاب است
    }
  };

  const authHref = routes.auth(`/claim?token=${token}${slug && slug !== reservedSlug ? `&slug=${slug}` : ''}`) +
    `&for=${encodeURIComponent(`تحویل صفحه‌ی ${businessName}`)}`;

  return (
    <>
      <style>{`.claim-shell .nl-root{padding-bottom:calc(var(--nl-pad-bottom) + var(--claim-sheet, 0px))}`}</style>
      <div
        ref={sheetRef}
        dir="rtl"
        role="dialog"
        aria-label={claimed ? 'صفحه تحویل شد' : `تحویل صفحه‌ی ${businessName}`}
        className="fixed inset-x-0 bottom-0 z-50 sm:inset-x-4 sm:bottom-4 sm:mx-auto sm:max-w-md"
      >
        <div className="flex flex-col gap-3 rounded-t-3xl border border-b-0 bg-popover/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-popover-foreground shadow-lg backdrop-blur-xl sm:rounded-3xl sm:border-b">
          {claimed ? (
            <>
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success dark:text-success">
                  <CheckCircle2Icon className="size-5" />
                </span>
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm font-bold">{claimed.published && !claimed.planExpired ? 'صفحه‌ی شما منتشر شد' : 'صفحه به حساب شما منتقل شد'}</span>
                  {!claimed.published ? (
                    <span className="text-xs text-muted-foreground">صفحه هنوز کامل نیست؛ از ویرایشگر کاملش کنید و منتشر کنید.</span>
                  ) : null}
                </div>
              </div>
              {/* ۱۴ روز رایگان فقط پس از انتشار گفته می‌شود، کنار راه خرید پلن */}
              <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
                <span className="min-w-0 flex-1 text-xs leading-relaxed">
                  {claimed.planExpired ? (
                    '۱۴ روز رایگان این حساب قبلاً استفاده شده؛ با خرید پلن صفحه همان لحظه فعال می‌شود.'
                  ) : (
                    <>
                      <strong className="font-semibold">۱۴ روز رایگان فعال شد.</strong>{' '}
                      <span className="text-muted-foreground">
                        {offer ? `بعد از آن پلن پایه از ${formatToman(offer.priceRial)} برای ${fa(offer.months)} ماه. ` : ''}
                        خرید از همین حالا روزهای رایگان را کم نمی‌کند.
                      </span>
                    </>
                  )}
                </span>
                <Link
                  href={routes.billing.home}
                  className="inline-flex h-9 shrink-0 items-center justify-center rounded-full bg-primary/10 px-4 text-xs font-bold text-primary hover:bg-primary/15"
                >
                  خرید پلن
                </Link>
              </div>
              <a
                href={pageUrl}
                target="_blank"
                rel="noreferrer"
                dir="ltr"
                className="flex items-center justify-between gap-2 rounded-xl border bg-muted/40 px-3 py-2 font-mono text-sm font-semibold text-primary"
              >
                <span className="truncate">{pageUrl.replace(/^https?:\/\//, '')}</span>
                <ExternalLinkIcon className="size-4 shrink-0" />
              </a>
              <Button type="button" size="lg" className="h-12 w-full rounded-full text-base font-bold" onClick={() => void copyLink()}>
                {copied ? <CheckIcon className="size-5" /> : <CopyIcon className="size-5" />}
                {copied ? 'کپی شد؛ در بیوی اینستاگرام بچسبانید' : 'کپی لینک برای بیوی اینستاگرام'}
              </Button>
              <p className="text-center text-xs leading-relaxed text-muted-foreground">
                اینستاگرام ← ویرایش پروفایل ← لینک‌ها ← افزودن لینک خارجی، و همین نشانی را بچسبانید. در واتس‌اپ بیزینس و کارت ویزیت هم
                همین نشانی را بگذارید.
              </p>
              <Link
                href={routes.link.editor(claimed.slug)}
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border bg-background px-4 text-sm font-semibold hover:bg-accent"
              >
                <PencilIcon className="size-4" />
                ویرایش صفحه
              </Link>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <GiftIcon className="size-5" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-bold">صفحه‌ی آماده برای {businessName}</span>
                  <span className="text-xs text-muted-foreground">ساخته‌شده توسط تیم نورولینک</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9 shrink-0 rounded-full"
                  aria-expanded={!collapsed}
                  aria-label={collapsed ? 'نمایش جزئیات' : 'جمع کردن تا صفحه کامل دیده شود'}
                  onClick={() => setCollapsed((c) => !c)}
                >
                  {collapsed ? <ChevronUpIcon className="size-5" /> : <ChevronDownIcon className="size-5" />}
                </Button>
              </div>

              {!collapsed ? (
                <div className="flex flex-col gap-2.5">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    همین صفحه که می‌بینید با تأیید شما به نام خودتان منتشر می‌شود و بعد هر چیزش را می‌توانید عوض کنید.
                  </p>

                  {editing ? (
                    <div className="flex flex-col gap-1.5">
                      <div dir="ltr" className="flex items-center overflow-hidden rounded-xl border bg-background focus-within:ring-2 focus-within:ring-ring/40">
                        <input
                          value={draftSlug}
                          maxLength={SLUG_MAX}
                          autoFocus
                          aria-label="نشانی صفحه"
                          onChange={(e) => setDraftSlug(e.target.value.toLowerCase().trim())}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveSlug();
                            if (e.key === 'Escape') setEditing(false);
                          }}
                          className="h-10 min-w-0 flex-1 bg-transparent px-3 font-mono text-sm outline-none"
                        />
                        <span className="shrink-0 bg-muted px-2.5 py-2.5 font-mono text-xs text-muted-foreground">.{PUBLIC_HOST}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            'text-xs',
                            slugCheck && !slugCheck.checking && !slugCheck.available ? 'text-destructive' : 'text-muted-foreground',
                          )}
                        >
                          {slugCheck?.checking
                            ? 'در حال بررسی…'
                            : slugCheck && !slugCheck.available
                              ? slugCheck.message
                              : draftOk
                                ? 'این نشانی آزاد است.'
                                : 'حروف کوچک انگلیسی، عدد و خط تیره.'}
                        </span>
                        <div className="flex shrink-0 gap-1">
                          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
                            انصراف
                          </Button>
                          <Button type="button" size="sm" disabled={!draftOk} onClick={saveSlug}>
                            تأیید
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-xl border bg-muted/40 px-3 py-2">
                      <GlobeIcon className="size-4 shrink-0 text-muted-foreground" />
                      <span dir="ltr" className="min-w-0 flex-1 truncate text-start font-mono text-sm font-semibold">
                        {slug ? `${slug}.${PUBLIC_HOST}` : `نشانی تصادفی .${PUBLIC_HOST}`}
                      </span>
                      {!preview ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 shrink-0 px-2 text-xs"
                          onClick={() => {
                            setDraftSlug(slug);
                            setEditing(true);
                          }}
                        >
                          تغییر
                        </Button>
                      ) : null}
                    </div>
                  )}
                </div>
              ) : null}

              {error ? (
                <div role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </div>
              ) : null}

              {preview ? (
                <Button type="button" size="lg" disabled className="h-12 w-full rounded-full text-base font-bold">
                  پیش‌نمایش مدیر؛ تحویل غیرفعال است
                </Button>
              ) : isAuthenticated ? (
                <Button
                  type="button"
                  size="lg"
                  loading={claiming}
                  disabled={claiming || editing}
                  onClick={() => void claim()}
                  className="h-12 w-full rounded-full text-base font-bold"
                >
                  تأیید و تحویل صفحه
                </Button>
              ) : (
                <Link
                  href={authHref}
                  aria-disabled={editing}
                  className={cn(
                    'inline-flex h-12 w-full items-center justify-center rounded-full bg-primary px-6 text-base font-bold text-primary-foreground shadow-sm hover:bg-primary/90',
                    editing && 'pointer-events-none opacity-50',
                  )}
                >
                  ورود با موبایل و تحویل صفحه
                </Link>
              )}
              {!collapsed && !preview ? (
                <p className="-mt-1 text-center text-[11px] text-muted-foreground">
                  {isAuthenticated ? 'با تأیید، صفحه به نام شما منتشر می‌شود.' : 'ورود با کد پیامکی؛ رمز عبور لازم نیست.'}
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </>
  );
}
