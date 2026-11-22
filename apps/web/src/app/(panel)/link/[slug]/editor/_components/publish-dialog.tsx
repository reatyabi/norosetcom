'use client';

import { useRef, useState, type RefObject } from 'react';
import Link from 'next/link';
import {
  BarChart3Icon,
  CheckIcon,
  ChevronLeftIcon,
  CircleAlertIcon,
  CopyIcon,
  ExternalLinkIcon,
  EyeOffIcon,
  ImageUpIcon,
  LockIcon,
  SearchIcon,
  Trash2Icon,
} from 'lucide-react';
import {
  Button,
  buttonVariants,
  cn,
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
  Segmented,
  Switch,
} from '@noroset/ui';
import {
  MAX_SLUG_CHANGES,
  SEO_DESCRIPTION_MIN,
  assetUrlFor,
  seoDescriptionLength,
  type PageContent,
  type SeoEntity,
} from '@noroset/norolink/ui';
import { formatDateTime } from '@/lib/format';
import { routes } from '@/lib/routes';
import { isPlanLimitText, PUBLIC_HOST, type LinkDetail } from '../../../links-shared';
import { hoverNativeScroll } from '@/components/editor-ui';
import { useImageUpload, type UploadContext } from './fields';

/** مورد مانع انتشار با جای آن در صفحه (کلیک ← بستن دیالوگ و رفتن به همان المان/پروفایل). */
export interface PublishBlocker {
  text: string;
  /** «دکمه‌ی لینک»، «پروفایل» و …؛ null = کل صفحه. */
  where: string | null;
  target: { type: 'element'; id: string } | { type: 'profile' } | null;
}

/**
 * دیالوگ یکپارچه‌ی «انتشار و تنظیمات صفحه» (دکمه‌ی انتشار هدر ادیتور). بدنه: موارد مانع انتشار (کلیک ← همان
 * المان)، کادر نشانی (زیردامنه‌ی قابل ویرایش در جا + کپی/مشاهده؛ با ویرایش ← ذخیره/انصراف) و کارت اشتراک‌گذاری
 * که عنوان، توضیح و تصویرش ویرایش می‌شوند (تب «جستجو و اشتراک‌گذاری» با noindex پیش‌فرض و نمای گوگل؛ ذخیره‌ی خودکار). پاورقی: آمار، لغو انتشار و حذف (تأیید در
 * همان پاورقی) و «بستن» + اقدام اصلی (انتشار / انتشار تغییرات / مشاهده‌ی صفحه). نتیجه‌ی موفق انتشار را ویرایشگر
 * با اعلان ثابت نشان می‌دهد و دیالوگ بسته می‌شود؛ خطا همین‌جا می‌ماند. انتشار، لغو و حذف فقط برای مالک و مدیر.
 */
export function PublishDialog({
  open,
  onOpenChange,
  ...props
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: LinkDetail;
  upload: UploadContext;
  publicUrl: string;
  analyticsHref: string;
  manage: boolean;
  blockers: PublishBlocker[];
  publishing: boolean;
  /** خطا را برمی‌گرداند یا null در صورت موفقیت (ویرایشگر دیالوگ را می‌بندد و اعلان می‌دهد). */
  onPublish: () => Promise<string | null>;
  onUnpublish: () => Promise<string | null>;
  onContent: (c: PageContent) => void;
  onSlug: (slug: string) => Promise<string | null>;
  onDelete: () => Promise<void>;
  /** رفتن به جای مورد مانع انتشار (دیالوگ را می‌بندد). */
  onJump: (target: PublishBlocker['target']) => void;
}) {
  // فوکوس اولیه روی «بستن» تا با باز شدن، فیلد نشانی ناخواسته در حالت ویرایش نباشد
  const closeRef = useRef<HTMLButtonElement>(null);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup dir="rtl" className="max-w-[34rem]" initialFocus={closeRef}>
        {/* key: پیش‌نویس نشانی، خطا و مرحله‌ی تأیید با هر بار باز شدن از نو */}
        <Body
          key={open ? 'open' : 'closed'}
          closeRef={closeRef}
          onClose={() => onOpenChange(false)}
          {...props}
        />
      </DialogPopup>
    </Dialog>
  );
}

type BodyProps = Omit<Parameters<typeof PublishDialog>[0], 'open' | 'onOpenChange'> & {
  onClose: () => void;
  closeRef: RefObject<HTMLButtonElement | null>;
};

function Body({
  page,
  upload,
  publicUrl,
  analyticsHref,
  manage,
  blockers,
  publishing,
  onPublish,
  onUnpublish,
  onContent,
  onSlug,
  onDelete,
  onJump,
  onClose,
  closeRef,
}: BodyProps) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftSlug, setDraftSlug] = useState(page.slug);
  const [slugBusy, setSlugBusy] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<'unpublish' | 'delete' | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'publish' | 'search'>('publish');

  const { content } = page;
  const seo = content.seo;
  const setSeo = (patch: Partial<PageContent['seo']>) =>
    onContent({ ...content, seo: { ...seo, ...patch } });
  const ogPicker = useImageUpload(upload, (og_image) => setSeo({ og_image }), 'og');
  const published = page.status === 'published';
  const pending = published && page.hasUnpublishedChanges;
  const upToDate = published && !page.hasUnpublishedChanges;
  const slugChanged = draftSlug !== page.slug;
  const slugInvalid = draftSlug.length < 2;
  const indexable = Boolean(seo.indexable);
  const seoAllowed = Boolean(page.limits?.seo);
  const descLength = seoDescriptionLength(seo.description);
  const descReady = descLength >= SEO_DESCRIPTION_MIN;
  const slugChangesLeft = Math.max(0, MAX_SLUG_CHANGES - (page.slugChanges ?? 0));
  const slugLocked = slugChangesLeft === 0;

  const status = upToDate
    ? {
        tone: 'ok',
        text: `منتشرشده${page.publishedAt ? ` · آخرین انتشار ${formatDateTime(page.publishedAt)}` : ''}`,
      }
    : pending
      ? { tone: 'warn', text: 'تغییراتی دارید که هنوز روی صفحه‌ی عمومی نیامده‌اند.' }
      : { tone: 'muted', text: 'هنوز منتشر نشده؛ تا انتشار فقط اعضای فضای کاری آن را می‌بینند.' };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // دسترسی کلیپ‌بورد نیست؛ نشانی قابل انتخاب است
    }
  };

  const publish = async () => {
    setError(null);
    setError(await onPublish());
  };

  const runConfirmed = async () => {
    setBusy(true);
    if (confirm === 'delete') await onDelete();
    else setError(await onUnpublish());
    setBusy(false);
    setConfirm(null);
  };

  const saveSlug = async () => {
    setSlugBusy(true);
    setSlugError(await onSlug(draftSlug));
    setSlugBusy(false);
  };
  const cancelSlug = () => {
    setDraftSlug(page.slug);
    setSlugError(null);
  };

  const image = seo.og_image ?? content.profile.avatar;
  const fallbackTitle = content.profile.name || page.title;
  const metaTitle = seo.title || fallbackTitle;
  const metaDescription = seo.description || content.profile.bio;

  return (
    <>
      <DialogHeader className="gap-1.5 pe-14">
        <DialogTitle className="text-lg">انتشار و تنظیمات صفحه</DialogTitle>
        <DialogDescription className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={cn(
              'size-2 shrink-0 rounded-full',
              status.tone === 'ok'
                ? 'bg-success'
                : status.tone === 'warn'
                  ? 'bg-warning'
                  : 'bg-muted-foreground/50',
            )}
          />
          {status.text}
        </DialogDescription>
        <Segmented
          className="mt-2"
          value={tab}
          onChange={setTab}
          items={[
            { value: 'publish', label: 'انتشار' },
            { value: 'search', label: 'جستجو و اشتراک‌گذاری' },
          ]}
        />
      </DialogHeader>

      {/* مثل FormDialog اسکرول ساده‌ی عمودی؛ ScrollArea محتوا را به اندازه‌ی طولانی‌ترین سطر پهن می‌کند (min-width: fit-content) */}
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-6 pt-1 pb-6',
          hoverNativeScroll,
        )}
      >
        {error ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
          >
            <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
            <span className="flex-1">{error}</span>
            {isPlanLimitText(error) ? (
              <Link href={routes.billing.home} className="shrink-0 font-medium underline underline-offset-4">
                ارتقای پلن
              </Link>
            ) : null}
          </div>
        ) : null}
        {!manage ? (
          <p className="text-xs text-muted-foreground">
            انتشار، لغو انتشار و حذف با مالک یا مدیر فضای کاری است.
          </p>
        ) : null}

        {tab === 'publish' && blockers.length ? (
          <div className="flex flex-col gap-1.5 rounded-lg bg-warning/10 p-3">
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              <CircleAlertIcon className="size-4 shrink-0 text-warning" />
              {blockers.length === 1
                ? 'یک مورد مانده تا انتشار'
                : `${blockers.length.toLocaleString('fa-IR')} مورد مانده تا انتشار`}
            </span>
            <ul className="flex flex-col">
              {blockers.map((b, i) => (
                <li key={i}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start text-xs transition-colors duration-150 ease-fluent hover:bg-warning/15 focus-visible:bg-warning/15 focus-visible:outline-none"
                    onClick={() => onJump(b.target)}
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      {b.where ? <span className="font-medium">{b.where}</span> : null}
                      <span className="text-muted-foreground">{b.text}</span>
                    </span>
                    {b.target ? (
                      <ChevronLeftIcon className="size-4 shrink-0 text-muted-foreground" />
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* کادر نشانی: زیردامنه در جا ویرایش می‌شود؛ بدون تغییر ← کپی/مشاهده، با تغییر ← ذخیره/انصراف */}
        {tab === 'publish' ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">نشانی صفحه</span>
            <div
              dir="ltr"
              className={cn(
                'flex h-10 items-center gap-1 rounded-lg bg-muted/60 ps-3 pe-1 text-sm ring-1 ring-border focus-within:ring-2 focus-within:ring-ring',
                (slugInvalid || slugError) && 'ring-destructive',
              )}
            >
              <input
                aria-label="زیردامنه"
                className="h-full min-w-0 flex-1 bg-transparent font-medium outline-none"
                value={draftSlug}
                readOnly={slugLocked}
                maxLength={63}
                onChange={(e) => {
                  setSlugError(null);
                  setDraftSlug(e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase());
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && slugChanged && !slugInvalid) void saveSlug();
                  if (e.key === 'Escape' && slugChanged) {
                    e.stopPropagation();
                    cancelSlug();
                  }
                }}
              />
              <span className="shrink-0 text-muted-foreground">.{PUBLIC_HOST}</span>
              {slugChanged ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={cancelSlug}
                  >
                    انصراف
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 px-2.5 text-xs"
                    loading={slugBusy}
                    disabled={slugInvalid}
                    onClick={() => void saveSlug()}
                  >
                    ذخیره‌ی نشانی
                  </Button>
                </>
              ) : (
                <>
                  {slugLocked ? (
                    <LockIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 px-2"
                    aria-label="کپی نشانی"
                    onClick={() => void copy()}
                  >
                    {copied ? <CheckIcon /> : <CopyIcon />}
                    <span className="text-xs">{copied ? 'کپی شد' : 'کپی'}</span>
                  </Button>
                  {published ? (
                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="مشاهده‌ی صفحه"
                      title="مشاهده‌ی صفحه"
                      className={buttonVariants({
                        variant: 'ghost',
                        size: 'icon',
                        className: 'size-8',
                      })}
                    >
                      <ExternalLinkIcon />
                    </a>
                  ) : null}
                </>
              )}
            </div>
            {slugError ? <p className="text-xs text-destructive">{slugError}</p> : null}
            <span className="text-xs text-muted-foreground">
              {slugLocked
                ? `سقف تغییر نشانی (${faNum(MAX_SLUG_CHANGES)} بار) پر شده است.`
                : slugChanged
                  ? `با ذخیره، لینک قبلی خودکار به نشانی تازه منتقل می‌شود و برای همین صفحه می‌ماند. ${faNum(slugChangesLeft - 1)} بار دیگر می‌توانید نشانی را عوض کنید.`
                  : `برای تغییر، روی نشانی بزنید و بنویسید. ${faNum(slugChangesLeft)} بار دیگر می‌توانید نشانی را عوض کنید.`}
            </span>
          </div>
        ) : null}

        {tab === 'search' ? (
          <>
            <div className="flex flex-col gap-2 rounded-lg bg-muted/40 p-3 ring-1 ring-border">
              {seoAllowed ? (
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="page-indexable" className="flex min-w-0 flex-col">
                    <span className="text-sm font-semibold">نمایش در نتایج موتورهای جستجو</span>
                    <span className={cn('text-xs text-muted-foreground', indexable && !descReady && 'text-warning')}>
                      {indexable
                        ? descReady
                          ? 'گوگل و موتورهای جستجو می‌توانند این صفحه را نشان دهند.'
                          : `تا توضیح موتور جستجو به ${faNum(SEO_DESCRIPTION_MIN)} نویسه نرسد، صفحه در نتایج نمی‌آید.`
                        : descReady
                          ? 'خاموش: صفحه در نتایج جستجو نمی‌آید (noindex).'
                          : `برای فعال شدن، دست‌کم ${faNum(SEO_DESCRIPTION_MIN)} نویسه توضیح موتور جستجو بنویسید (${faNum(descLength)} از ${faNum(SEO_DESCRIPTION_MIN)}).`}
                    </span>
                  </label>
                  <Switch
                    id="page-indexable"
                    aria-label="نمایش در نتایج موتورهای جستجو"
                    checked={indexable}
                    // خاموش کردن همیشه آزاد است؛ روشن کردن با توضیح کافی (سرور هم بررسی می‌کند)
                    disabled={!indexable && !descReady}
                    onCheckedChange={(next) => setSeo({ indexable: next })}
                  />
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="flex min-w-0 flex-1 basis-56 flex-col">
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      <SearchIcon className="size-4 text-muted-foreground" />
                      نمایش صفحه در نتایج گوگل
                    </span>
                    {/* همان قاعده‌ی سرور و صفحه‌ی اشتراک (limits.seoUpsell، ENTITLEMENT_META.paidOnly) */}
                    <span className="text-xs text-muted-foreground">
                      {page.limits?.seoUpsell === 'trial'
                        ? 'در دوره‌ی رایگان بسته است و با خرید اشتراک همان لحظه فعال می‌شود تا مشتری‌ها صفحه‌ی شما را با جستجو پیدا کنند.'
                        : page.limits?.seoUpsell === 'buy'
                          ? 'اشتراک فعالی ندارید؛ با خرید اشتراک دارای این امکان فعال می‌شود تا مشتری‌ها صفحه‌ی شما را با جستجو پیدا کنند.'
                          : 'در پلن فعلی شما نیست؛ با ارتقای پلن فعال می‌شود تا مشتری‌ها صفحه‌ی شما را با جستجو پیدا کنند.'}
                      {indexable ? ' تا آن موقع صفحه در نتایج جستجو نمی‌آید.' : null}
                      {manage ? null : ' خرید را مالک یا مدیر فضای کاری انجام می‌دهد.'}
                    </span>
                  </span>
                  {manage ? (
                    <Link href={routes.billing.home} className={buttonVariants({ size: 'sm' })}>
                      {page.limits?.seoUpsell === 'upgrade' ? 'ارتقای پلن' : 'خرید اشتراک'}
                    </Link>
                  ) : null}
                </div>
              )}

              {seoAllowed && indexable ? (
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-t border-border pt-2">
                  <span className="flex min-w-0 flex-col">
                    <span className="text-xs font-medium">این صفحه متعلق است به</span>
                    <span className="text-xs text-muted-foreground">برای معرفی دقیق‌تر صفحه و شبکه‌هایتان به گوگل</span>
                  </span>
                  <Segmented<'' | SeoEntity>
                    value={seo.entity ?? ''}
                    onChange={(entity) => setSeo({ entity: entity || null })}
                    items={[
                      { value: 'person', label: 'شخص' },
                      { value: 'organization', label: 'کسب‌وکار' },
                    ]}
                  />
                </div>
              ) : null}

              {published && seoAllowed ? (
                <p className="text-xs text-muted-foreground">
                  این تغییر پس از «انتشار تغییرات» روی صفحه‌ی عمومی اعمال می‌شود.
                </p>
              ) : null}
            </div>

            {/* نمای نتیجه‌ی گوگل با رنگ‌های خود گوگل (روشن در هر تم)؛ با پلن دارای سئو، حتی پیش از روشن کردن، تا توضیح نوشته شود */}
            {seoAllowed ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold">نمایش در نتایج گوگل</span>
                <div className="rounded-lg bg-white p-4 text-[#202124] ring-1 ring-border">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f1f3f4] text-xs font-bold text-[#4d5156]">
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element -- فایل نوروفایل
                        <img
                          src={assetUrlFor(upload.assetBaseUrl)(image)}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        fallbackTitle.trim().charAt(0)
                      )}
                    </span>
                    <span className="flex min-w-0 flex-col leading-tight">
                      <span className="truncate text-sm">{fallbackTitle}</span>
                      <span dir="ltr" className="truncate text-right text-xs text-[#4d5156]">
                        https://{page.slug}.{PUBLIC_HOST}
                      </span>
                    </span>
                  </div>
                  <input
                    aria-label="عنوان متا"
                    className={serpField(
                      'text-xl leading-7 text-[#1a0dab] placeholder:text-[#1a0dab]/75',
                    )}
                    value={seo.title}
                    placeholder={fallbackTitle}
                    maxLength={70}
                    onChange={(e) => setSeo({ title: e.target.value })}
                  />
                  <textarea
                    aria-label="توضیحات متا"
                    rows={2}
                    className={serpField(
                      'mt-0.5 resize-none text-sm leading-5 text-[#4d5156] placeholder:text-[#4d5156]/75',
                    )}
                    value={seo.description}
                    placeholder={
                      content.profile.bio || 'توضیح کوتاهی بنویسید که زیر عنوان نتیجه دیده شود'
                    }
                    maxLength={200}
                    onChange={(e) => setSeo({ description: e.target.value })}
                  />
                </div>
                <span className="flex flex-wrap justify-between gap-x-3 text-xs text-muted-foreground">
                  <span>
                    روی عنوان یا توضیح بزنید و ویرایش کنید. توضیح برای نمایش در گوگل لازم است (دست‌کم{' '}
                    {faNum(SEO_DESCRIPTION_MIN)} نویسه)؛ عنوان خالی = نام صفحه.
                  </span>
                  <span className="flex gap-3" dir="ltr">
                    <span
                      className={cn(
                        (!descReady || descLength > META_DESCRIPTION_LENGTH) && 'text-warning',
                      )}
                    >
                      {descReady ? `${descLength}/${META_DESCRIPTION_LENGTH}` : `${descLength}/${SEO_DESCRIPTION_MIN} min`}
                    </span>
                    <span className={cn(metaTitle.length > META_TITLE_LENGTH && 'text-warning')}>
                      {metaTitle.length}/{META_TITLE_LENGTH}
                    </span>
                  </span>
                </span>
              </div>
            ) : null}

            {/* کارت اشتراک‌گذاری که روی خودش ویرایش می‌شود: همان چیزی که در پیام‌رسان‌ها و شبکه‌ها دیده می‌شود */}
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold">نمایش در اشتراک‌گذاری</span>
              <div className="flex overflow-hidden rounded-lg bg-card ring-1 ring-border">
                <button
                  type="button"
                  aria-label={seo.og_image ? 'تعویض تصویر اشتراک' : 'انتخاب تصویر اشتراک'}
                  title="تغییر تصویر"
                  onClick={ogPicker.pick}
                  className="group relative flex aspect-square w-24 shrink-0 items-center justify-center overflow-hidden bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                >
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- فایل نوروفایل
                    <img
                      src={assetUrlFor(upload.assetBaseUrl)(image)}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-muted-foreground">
                      {(seo.title || fallbackTitle).trim().charAt(0)}
                    </span>
                  )}
                  <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/45 text-[11px] font-medium text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
                    <ImageUpIcon className="size-4" />
                    تغییر تصویر
                  </span>
                </button>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5 px-3 py-2">
                  <span dir="ltr" className="truncate text-left text-[11px] text-muted-foreground">
                    {page.slug}.{PUBLIC_HOST}
                  </span>
                  <span className="truncate text-sm font-semibold">{metaTitle}</span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">
                    {metaDescription || 'بدون توضیح'}
                  </span>
                </div>
              </div>
              <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                روی تصویر بزنید تا عوض شود؛ خالی = تصویر پروفایل. خودکار ذخیره می‌شود.
                {seo.og_image ? (
                  <button
                    type="button"
                    className="text-foreground underline underline-offset-2"
                    onClick={() => setSeo({ og_image: null })}
                  >
                    برگرداندن تصویر پروفایل
                  </button>
                ) : null}
              </span>
              {ogPicker.input}
            </div>
          </>
        ) : null}

      </div>

      {confirm ? (
        <DialogFooter
          className={cn(
            'flex-wrap justify-end gap-y-3',
            confirm === 'delete' && 'bg-destructive/10',
          )}
        >
          <span className="flex min-w-0 flex-1 basis-56 flex-col text-sm">
            <span className="font-semibold">
              {confirm === 'delete'
                ? `حذف صفحه‌ی «${page.title}»؟`
                : 'صفحه از دسترس عمومی خارج شود؟'}
            </span>
            <span className="text-xs text-muted-foreground">
              {confirm === 'delete'
                ? 'صفحه، المان‌ها و آمار برای همیشه حذف می‌شوند؛ تصاویر در «فایل‌ها» می‌مانند.'
                : 'لینک تا انتشار دوباره کار نمی‌کند؛ محتوا و آمار می‌مانند.'}
            </span>
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              انصراف
            </Button>
            <Button
              variant={confirm === 'delete' ? 'destructive' : 'default'}
              loading={busy}
              onClick={() => void runConfirmed()}
            >
              {confirm === 'delete' ? 'حذف برای همیشه' : 'لغو انتشار'}
            </Button>
          </div>
        </DialogFooter>
      ) : (
        <DialogFooter className="justify-between">
          <div className="flex items-center gap-0.5">
            <Link href={analyticsHref} title="آمار صفحه" className={footerAction()}>
              <BarChart3Icon />
              <span className="max-sm:sr-only">آمار</span>
            </Link>
            {manage && published ? (
              <button
                type="button"
                title="لغو انتشار"
                className={footerAction()}
                onClick={() => setConfirm('unpublish')}
              >
                <EyeOffIcon />
                <span className="max-sm:sr-only">لغو انتشار</span>
              </button>
            ) : null}
            {manage ? (
              <button
                type="button"
                title="حذف صفحه"
                className={footerAction(true)}
                onClick={() => setConfirm('delete')}
              >
                <Trash2Icon />
                <span className="max-sm:sr-only">حذف</span>
              </button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button ref={closeRef} variant="ghost" onClick={onClose}>
              بستن
            </Button>
            {manage && !upToDate ? (
              <Button
                loading={publishing}
                disabled={blockers.length > 0}
                title={blockers.length ? 'برای انتشار، موارد بالا را کامل کنید.' : undefined}
                onClick={() => void publish()}
              >
                {pending ? 'انتشار تغییرات' : 'انتشار'}
              </Button>
            ) : published ? (
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants()}
              >
                <ExternalLinkIcon />
                <span>
                  مشاهده<span className="max-sm:hidden">‌ی صفحه</span>
                </span>
              </a>
            ) : null}
          </div>
        </DialogFooter>
      )}
    </>
  );
}

const faNum = (n: number) => n.toLocaleString('fa-IR');

/** حد نمایش تقریبی عنوان و توضیح در نتایج گوگل (نویسه). */
const META_TITLE_LENGTH = 60;
const META_DESCRIPTION_LENGTH = 160;

/** فیلد درجا روی نمای گوگل: مثل متن نتیجه، با زمینه‌ی ملایم هنگام اشاره و قاب هنگام ویرایش. */
const serpField = (className: string) =>
  cn(
    'block w-full min-w-0 rounded-md bg-transparent px-1 -mx-1 outline-1 outline-transparent transition-colors duration-150 ease-fluent hover:bg-black/5 focus:bg-black/5 focus:outline-[#1a0dab]/40',
    className,
  );

const footerAction = (destructive = false) =>
  cn(
    'flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm outline-none transition-colors duration-150 ease-fluent [&_svg]:size-4',
    destructive
      ? 'text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10'
      : 'text-foreground hover:bg-muted focus-visible:bg-muted [&_svg]:text-muted-foreground',
  );
