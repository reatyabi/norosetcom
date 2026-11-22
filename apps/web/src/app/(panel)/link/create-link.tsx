'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AlertDescription,
  Button,
  buttonVariants,
  cn,
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
  FilePicker,
  Input,
  Textarea,
  type FilePickerOptions,
  type PickedFile,
} from '@noroset/ui';
import { AlertCircleIcon, CheckCircle2Icon, ImageUpIcon, Loader2Icon, Trash2Icon } from 'lucide-react';
import { assetUrlFor, PAGE_SLUG_MAX, type ImageRef, type LinkTemplate } from '@noroset/norolink/ui';
import { api, ApiError, errorMessage } from '@/lib/api';
import { norofileSource } from '@/lib/file-sources';
import { routes } from '@/lib/routes';
import { useTenant } from '../session';
import { isPlanLimitText, planLimitMessage, PUBLIC_FILES_BASE, PUBLIC_HOST } from './links-shared';
import { cleanSlugInput, isValidPageSlug, MAX_PAGE_BIO, MAX_PAGE_NAME, newLinkPageBody } from './new-link-page';

/** المان‌های کامل هر قالب برای تصویر بندانگشتی. */

/** قالب‌های گالری از سرور: قالب‌های منتشرشده‌ی مدیریت پلتفرم + قالب‌های پیش‌فرضی که برداشته نشده‌اند. */
export function useLinkTemplates(): { templates: LinkTemplate[] | null; error: string | null } {
  const [templates, setTemplates] = useState<LinkTemplate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<LinkTemplate[]>('/norolink/templates')
      .then(setTemplates)
      .catch((err: unknown) => setError(errorMessage(err)));
  }, []);
  return { templates, error };
}

// صفحه هنوز ساخته نشده، پس عکس مستقیم در norofile (عمومی) بارگذاری می‌شود؛ مثل آواتار ویرایشگر.
const AVATAR_OPTIONS: FilePickerOptions = {
  accept: ['image'],
  maxBytes: 5 * 1024 * 1024,
  requirePublic: true,
  image: { aspect: 1, shape: 'round', maxSize: 512 },
};

const STEPS = ['عنوان و توضیحات', 'نشانی صفحه', 'عکس صفحه'] as const;
const LAST_STEP = STEPS.length - 1;
const faNum = (n: number) => n.toLocaleString('fa-IR');

/** به‌جای پرکردن هر سه مرحله و خطا در آخر؛ بررسی اصلی همچنان در سرور است. */
function PageLimitDialog({ limit, open, onClose }: { limit: number; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogPopup dir="rtl" className="sm:max-w-md">
        <DialogHeader className="gap-1.5 pe-14">
          <DialogTitle className="text-lg">سقف صفحه‌های پلن پر شده است</DialogTitle>
          <DialogDescription>
            پلن فعلی شما حداکثر {faNum(limit)} صفحه‌ی لینک دارد. برای صفحه‌ی جدید پلن را ارتقا دهید یا یکی از صفحه‌ها را حذف کنید.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            بستن
          </Button>
          <Link href={routes.billing.home} className={buttonVariants()}>
            ارتقای پلن
          </Link>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

/** پرسیدن عنوان و توضیحات، نشانی و عکس پیش از ساخت صفحه. */
function NewLinkDialog({ template, open, onClose }: { template: LinkTemplate | null; open: boolean; onClose: () => void }) {
  const router = useRouter();
  const tenant = useTenant();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [slug, setSlug] = useState('');
  const [serverSlugError, setServerSlugError] = useState<string | null>(null);
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [avatar, setAvatar] = useState<{ image: ImageRef; url: string | null } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const source = useMemo(() => norofileSource(tenant.tenantId, 'public'), [tenant.tenantId]);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const slugInputRef = useRef<HTMLInputElement>(null);

  // فعال‌شدن نشانگر فیلد ورودی به محض باز شدن دیالوگ و در هر مرحله
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      if (step === 0) {
        nameInputRef.current?.focus();
      } else if (step === 1) {
        slugInputRef.current?.focus();
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [open, step]);

  const trimmedSlug = slug.trim();
  const slugFormatError =
    !trimmedSlug
      ? null
      : trimmedSlug.length < 2
        ? 'حداقل ۲ نویسه؛ فقط حروف کوچک انگلیسی، عدد و خط تیره.'
        : !isValidPageSlug(trimmedSlug)
          ? 'حداقل دو نویسه؛ حروف لاتین و رقم، و خط تیره فقط بین آن‌ها.'
          : null;
  const activeSlugError = slugFormatError ?? serverSlugError;

  // بررسی برخط و یونیک بودن اسلاگ
  useEffect(() => {
    if (step !== 1 || !trimmedSlug || slugFormatError) {
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setSlugChecking(true);
      setServerSlugError(null);
      setSlugAvailable(null);
      try {
        const res = await api<{ available: boolean; message?: string }>(
          `/norolink/pages/check-slug?slug=${encodeURIComponent(trimmedSlug)}`,
          { tenantId: tenant.tenantId },
        );
        if (cancelled) return;
        setSlugChecking(false);
        setSlugAvailable(res.available);
        if (!res.available) {
          setServerSlugError(res.message ?? 'این نشانی در دسترس نیست.');
        } else {
          setServerSlugError(null);
        }
      } catch (err) {
        if (cancelled) return;
        setSlugChecking(false);
        setServerSlugError(errorMessage(err));
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [step, trimmedSlug, slugFormatError, tenant.tenantId]);

  const sample = template?.content.profile;
  const canContinueStep0 = name.trim().length > 0;
  const canContinueStep1 = Boolean(trimmedSlug && !slugFormatError && slugAvailable === true && !slugChecking && !activeSlugError);
  const previewUrl = avatar ? avatar.url : sample?.avatar ? assetUrlFor(PUBLIC_FILES_BASE)(sample.avatar) : null;

  const pick = (file: PickedFile) => {
    if (file.width && file.height) setAvatar({ image: { file_id: file.id, width: file.width, height: file.height }, url: file.url });
  };

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const page = await api<{ slug: string }>('/norolink/pages', {
        method: 'POST',
        tenantId: tenant.tenantId,
        body: newLinkPageBody({ name, bio, slug: trimmedSlug, avatar: avatar?.image ?? null, template }),
      });
      router.push(routes.link.editor(page.slug));
    } catch (err) {
      setBusy(false);
      if (err instanceof ApiError && (err.code === 'slug_taken' || err.code === 'slug_reserved')) {
        setServerSlugError(errorMessage(err));
        setSlugAvailable(false);
        setStep(1);
        return;
      }
      setError(planLimitMessage(err) ?? errorMessage(err));
    }
  }

  const advance = () => {
    if (step === LAST_STEP) void submit();
    else setStep(step + 1);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogPopup dir="rtl" className="sm:max-w-md">
        <DialogHeader className="gap-1.5 pe-14">
          <DialogTitle className="text-lg">ایجاد صفحه جدید</DialogTitle>
          <DialogDescription>
            مرحله‌ی {faNum(step + 1)} از {faNum(STEPS.length)}: {STEPS[step]}
          </DialogDescription>
          <div className="mt-1 flex gap-1.5" aria-hidden="true">
            {STEPS.map((label, i) => (
              <span key={label} className={cn('h-1 flex-1 rounded-full transition-colors duration-150 ease-fluent', i <= step ? 'bg-primary' : 'bg-muted')} />
            ))}
          </div>
        </DialogHeader>

        <div className="flex min-h-36 flex-col gap-2 px-6 pb-4">
          {step === 0 ? (
            <>
              <label htmlFor="new-link-name" className="text-sm font-medium">
                عنوان صفحه لینک
              </label>
              <Input
                ref={nameInputRef}
                id="new-link-name"
                autoFocus
                value={name}
                maxLength={MAX_PAGE_NAME}
                placeholder="مثلاً نام خودتان یا برندتان"
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canContinueStep0) {
                    e.preventDefault();
                    advance();
                  }
                }}
              />
              <label htmlFor="new-link-bio" className="mt-2 text-sm font-medium">
                توضیحات <span className="font-normal text-muted-foreground">(اختیاری)</span>
              </label>
              <Textarea
                id="new-link-bio"
                rows={3}
                value={bio}
                maxLength={MAX_PAGE_BIO}
                placeholder="توضیح کوتاهی درباره‌ی خود یا فعالیت‌تان بنویسید"
                onChange={(e) => setBio(e.target.value)}
              />
            </>
          ) : step === 1 ? (
            <>
              <label htmlFor="new-link-slug" className="text-sm font-medium">
                نشانی صفحه
              </label>
              <div
                dir="ltr"
                className={cn(
                  'flex h-11 items-stretch rounded-lg border bg-background shadow-2xs overflow-hidden transition-[color,background-color,border-color,box-shadow,opacity,transform]',
                  'ring-1 ring-border focus-within:ring-2 focus-within:ring-primary focus-within:border-primary',
                  (activeSlugError || (slug.length > 0 && slugFormatError !== null)) &&
                    'border-destructive ring-destructive/30 focus-within:ring-destructive focus-within:border-destructive',
                  slugAvailable && !slugChecking &&
                    'border-success/70 ring-success/20 focus-within:ring-success focus-within:border-success',
                )}
              >
                <div className="relative flex min-w-0 flex-1 items-center bg-background px-3">
                  <input
                    ref={slugInputRef}
                    id="new-link-slug"
                    autoFocus
                    className="h-full w-full bg-transparent font-medium text-sm outline-none placeholder:font-normal placeholder:text-muted-foreground"
                    value={slug}
                    maxLength={PAGE_SLUG_MAX}
                    placeholder="مثلاً my-page"
                    autoComplete="off"
                    spellCheck={false}
                    aria-invalid={activeSlugError !== null}
                    onChange={(e) => {
                      setServerSlugError(null);
                      setSlugAvailable(null);
                      setSlugChecking(false);
                      setSlug(cleanSlugInput(e.target.value));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && canContinueStep1) {
                        e.preventDefault();
                        advance();
                      }
                    }}
                  />
                  {slugChecking ? (
                    <Loader2Icon className="size-4 animate-spin text-muted-foreground ms-2 shrink-0" />
                  ) : slugAvailable ? (
                    <CheckCircle2Icon className="size-4 text-success ms-2 shrink-0" />
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center justify-center border-s border-border bg-muted/80 px-3.5 text-sm font-medium text-muted-foreground select-none">
                  <span>.{PUBLIC_HOST}</span>
                </div>
              </div>
              {slugChecking ? (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2Icon className="size-3.5 animate-spin shrink-0" />
                  در حال بررسی در دسترس بودن نشانی...
                </p>
              ) : activeSlugError ? (
                <p className="flex items-center gap-1.5 text-xs text-destructive">
                  <AlertCircleIcon className="size-3.5 shrink-0" />
                  {activeSlugError}
                </p>
              ) : slugAvailable ? (
                <p className="flex items-center gap-1.5 text-xs text-success dark:text-success font-medium">
                  <CheckCircle2Icon className="size-3.5 shrink-0" />
                  این نشانی آزاد و قابل استفاده است.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  حداقل ۲ نویسه؛ فقط حروف کوچک انگلیسی، عدد و خط تیره بین آن‌ها.
                </p>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-2 text-center">
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="group relative flex size-28 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground ring-4 ring-muted/70 transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-200 hover:ring-primary/40 hover:scale-[1.02] shadow-sm cursor-pointer"
                aria-label={previewUrl ? 'تعویض تصویر' : 'انتخاب تصویر'}
              >
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="" className="size-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground group-hover:text-primary transition-colors">
                    <ImageUpIcon className="size-8" />
                    <span className="text-[11px] font-medium">افزودن عکس</span>
                  </div>
                )}
                {previewUrl ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <ImageUpIcon className="size-6" />
                  </div>
                ) : null}
              </button>
              <div className="mt-3 flex items-center justify-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setPickerOpen(true)}>
                  {previewUrl ? 'تعویض تصویر' : 'انتخاب تصویر'}
                </Button>
                {avatar ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setAvatar(null)}
                  >
                    <Trash2Icon className="size-3.5 ms-1" />
                    حذف
                  </Button>
                ) : null}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                می‌توانید بعداً هم در ویرایشگر تصویر صفحه را تغییر دهید.
              </p>
              <FilePicker
                open={pickerOpen}
                onOpenChange={setPickerOpen}
                source={source}
                options={AVATAR_OPTIONS}
                onPick={pick}
                errorMessage={errorMessage}
                title="عکس صفحه"
              />
            </div>
          )}
          {error ? (
            <Alert variant="destructive" className="mt-2">
              <AlertDescription>{error}</AlertDescription>
              {isPlanLimitText(error) ? (
                <Link href={routes.billing.home} className={cn(buttonVariants({ size: 'sm' }), 'mt-2 w-fit')}>
                  ارتقای پلن
                </Link>
              ) : null}
            </Alert>
          ) : null}
        </div>

        <DialogFooter>
          {step > 0 ? (
            <Button variant="ghost" disabled={busy} onClick={() => setStep(step - 1)}>
              بازگشت
            </Button>
          ) : null}
          {step === 0 ? (
            <Button disabled={!canContinueStep0} loading={busy} onClick={advance}>
              بعدی
            </Button>
          ) : step === 1 ? (
            <Button disabled={!canContinueStep1} loading={busy} onClick={advance}>
              بعدی
            </Button>
          ) : avatar ? (
            <Button loading={busy} onClick={advance}>
              ساخت صفحه
            </Button>
          ) : (
            <Button variant="secondary" loading={busy} onClick={advance}>
              رد کردن و ساخت صفحه
            </Button>
          )}
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

/** ساخت صفحه‌ی خالی یا از قالب: `create` دیالوگ سه‌مرحله‌ای را باز می‌کند و `dialog` باید رندر شود. نشانی تصادفی است و در تنظیمات صفحه عوض می‌شود. */
export function useCreateLink() {
  const tenant = useTenant();
  const [session, setSession] = useState(0);
  const [open, setOpen] = useState(false);
  const [template, setTemplate] = useState<LinkTemplate | null>(null);
  const [fullAt, setFullAt] = useState<number | null>(null);
  function create(next?: LinkTemplate) {
    setTemplate(next ?? null);
    setSession((s) => s + 1);
    // دیالوگ پس از پاسخ باز می‌شود تا فرم پیش از پیام سقف پلن یک لحظه نپرد. خطا مهم نیست: سرور هنگام ساخت دوباره بررسی می‌کند.
    api<{ plan: { entitlements: Record<string, number> }; usage: Record<string, number> }>('/billing', { tenantId: tenant.tenantId })
      .then(({ plan, usage }) => {
        const limit = plan.entitlements['norolink.pages'];
        const used = usage['norolink.pages'];
        setFullAt(limit !== undefined && used !== undefined && used >= limit ? limit : null);
      })
      .catch(() => setFullAt(null))
      .finally(() => setOpen(true));
  }
  const close = () => setOpen(false);
  // key: هر بار فرم تازه، با همان انیمیشن بسته‌شدن
  const dialog =
    fullAt !== null ? (
      <PageLimitDialog limit={fullAt} open={open} onClose={close} />
    ) : (
      <NewLinkDialog key={session} template={template} open={open} onClose={close} />
    );
  return { create, dialog };
}
