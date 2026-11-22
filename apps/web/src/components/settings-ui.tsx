'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowRightIcon, CircleCheckIcon } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
  cn,
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
  MotionArt,
  Separator,
  SystemIcon,
  type SystemIconName,
} from '@noroset/ui';
import { PageHead } from './page-head';

// اجزای مشترک صفحه‌های تنظیمات پنل (حساب کاربری، فضاهای کاری): سرصفحه، کارت فقط‌خواندنی با سطرهای
// «عنوان | مقدار» در تمام عرض، و دیالوگ فرم وسط صفحه (مثل حساب مایکروسافت / ContentDialog ویندوز).

export function PageHeader({
  title,
  description,
  action,
  icon,
  back,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  /** آیکون سیستمی صفحه کنار عنوان (مثل صفحه‌های تنظیمات ویندوز ۱۱). */
  icon?: SystemIconName;
  /**
   * زیرصفحه: لینک بازگشت. پیش‌فرض بالای عنوان است؛ با `inline` کنار عنوان و در
   * همان سطر می‌نشیند تا ارتفاع سرصفحه یک سطر کمتر شود.
   */
  back?: { href: string; label: string; inline?: boolean };
}) {
  const backLink = back ? (
    back.inline ? (
      <Button
        nativeButton={false}
        render={<Link href={back.href} />}
        variant="secondary"
        size="xs"
        className="shrink-0 text-muted-foreground"
      >
        <ArrowRightIcon />
        {back.label}
      </Button>
    ) : (
      <Link href={back.href} className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowRightIcon className="size-3.5" />
        {back.label}
      </Link>
    )
  ) : null;

  return (
    <PageHead>
      <div className="flex flex-col gap-1">
        {back && !back.inline ? backLink : null}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {icon ? <SystemIcon name={icon} className="size-12" /> : null}
            <div className="min-w-0">
              {back?.inline ? (
                <div className="flex flex-wrap items-center gap-2">
                  {backLink}
                  <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                </div>
              ) : (
                <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
              )}
              {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
            </div>
          </div>
          {action}
        </div>
      </div>
    </PageHead>
  );
}

export function Notice({ error, done }: { error: string | null; done: string | null }) {
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  if (done) {
    return (
      <Alert>
        <CircleCheckIcon className="text-success" />
        <AlertDescription>{done}</AlertDescription>
      </Alert>
    );
  }
  return null;
}

/** کارت فقط‌خواندنی؛ با `onEdit` دکمه‌ی «ویرایش» در سرکارت دیالوگ ویرایش را باز می‌کند. */
export function InfoCard({
  title,
  icon,
  onEdit,
  action,
  notice,
  aside,
  children,
}: {
  title: string;
  /** آیکون سیستمی کنار عنوان کارت. */
  icon?: SystemIconName;
  onEdit?: () => void;
  /** اقدام سرکارت به‌جای «ویرایش». */
  action?: ReactNode;
  notice?: ReactNode;
  /** بخش جدا کنار سطرها (مثلاً تصویر پروفایل با کارت آپلود خودش). */
  aside?: ReactNode;
  children: ReactNode;
}) {
  const headerAction =
    action ??
    (onEdit ? (
      <Button variant="link" size="sm" className="px-0" onClick={onEdit}>
        ویرایش
      </Button>
    ) : null);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon ? <SystemIcon name={icon} className="size-6" /> : null}
          {title}
        </CardTitle>
        {headerAction ? <CardAction>{headerAction}</CardAction> : null}
      </CardHeader>
      <Separator />
      <CardContent className="flex flex-col gap-3">
        {notice}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-8">
          {aside}
          <dl className="min-w-0 flex-1 divide-y">{children}</dl>
        </div>
      </CardContent>
    </Card>
  );
}

export function InfoRow({
  label,
  hint,
  children,
}: {
  label: ReactNode;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[14rem_1fr] sm:items-center sm:gap-4">
      <dt className="min-w-0 text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 flex-col gap-0.5">
        {children}
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </dd>
    </div>
  );
}

/** مدت نمایش صحنه‌ی «انجام شد» پس از اقدام موفق، پیش از بسته شدن دیالوگ. */
const DONE_MS = 1500;

/**
 * دیالوگ فرم وسط صفحه با «ذخیره/انصراف». بدون DialogTrigger جهت صریح داده می‌شود.
 * اقدام موفق = بستن دیالوگ در همان رندری که `busy` تمام می‌شود (الگوی همه‌ی فراخوان‌ها)؛ آن‌وقت دیالوگ
 * به‌جای بسته شدن فوری، صحنه‌ی متحرک «انجام شد» را کوتاه نشان می‌دهد و بعد بسته می‌شود. خطا تکان کوتاه دارد.
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  onSubmit,
  submitLabel = 'ذخیره',
  cancelLabel = 'انصراف',
  submitVariant = 'default',
  doneLabel = 'انجام شد',
  busy,
  canSubmit = true,
  error,
  className,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onSubmit: (e: FormEvent) => void;
  submitLabel?: string;
  cancelLabel?: string;
  submitVariant?: 'default' | 'destructive';
  /** متن زیر صحنه‌ی موفقیت. */
  doneLabel?: string;
  busy: boolean;
  canSubmit?: boolean;
  error: string | null;
  className?: string;
  children: ReactNode;
}) {
  const [prev, setPrev] = useState({ open, busy });
  const [celebrating, setCelebrating] = useState(false);
  // محتوای «انجام شد» تا باز شدن دوباره می‌ماند تا انیمیشن بسته شدن دیالوگ فرم را دوباره نشان ندهد.
  const [showDone, setShowDone] = useState(false);
  if (prev.open !== open || prev.busy !== busy) {
    // بسته شدن درست پس از اقدام (busy در رندر قبل یا همین رندر) و بدون خطا ← موفقیت.
    if (prev.open && !open && (prev.busy || busy) && !error) {
      setCelebrating(true);
      setShowDone(true);
    }
    if (open) {
      setCelebrating(false);
      setShowDone(false);
    }
    setPrev({ open, busy });
  }
  useEffect(() => {
    if (!celebrating) return;
    const t = setTimeout(() => setCelebrating(false), DONE_MS);
    return () => clearTimeout(t);
  }, [celebrating]);

  return (
    <Dialog
      open={open || celebrating}
      onOpenChange={(next) => (celebrating && !next ? setCelebrating(false) : onOpenChange(next))}
    >
      <DialogPopup dir="rtl" className={cn('sm:max-w-md', className)}>
        {showDone && !open ? (
          <div className="flex flex-col items-center gap-3 px-6 pt-4 pb-8 text-center">
            <MotionArt name="done" className="size-24" />
            <DialogTitle className="text-lg">{doneLabel}</DialogTitle>
          </div>
        ) : (
          <FormDialogBody
            title={title}
            description={description}
            onSubmit={onSubmit}
            submitLabel={submitLabel}
            cancelLabel={cancelLabel}
            submitVariant={submitVariant}
            busy={busy}
            canSubmit={canSubmit}
            error={error}
            onCancel={() => onOpenChange(false)}
          >
            {children}
          </FormDialogBody>
        )}
      </DialogPopup>
    </Dialog>
  );
}

function FormDialogBody({
  title,
  description,
  onSubmit,
  submitLabel,
  cancelLabel,
  submitVariant,
  busy,
  canSubmit,
  error,
  onCancel,
  children,
}: {
  title: string;
  description: string;
  onSubmit: (e: FormEvent) => void;
  submitLabel: string;
  cancelLabel: string;
  submitVariant: 'default' | 'destructive';
  busy: boolean;
  canSubmit: boolean;
  error: string | null;
  onCancel: () => void;
  children: ReactNode;
}) {
  const hasContent = Boolean(error || children);
  return (
    <>
      <DialogHeader className="gap-1.5 pe-14">
        <DialogTitle className="text-lg">{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        {hasContent ? (
          <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-1 pb-4">
            {/* key: هر خطای تازه دوباره تکان می‌خورد. */}
            {error ? (
              <div key={error} className="ma-nudge">
                <Notice error={error} done={null} />
              </div>
            ) : null}
            {children}
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button type="submit" variant={submitVariant} loading={busy} disabled={!canSubmit}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
