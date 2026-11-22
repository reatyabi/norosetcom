'use client';

import { useState, type FormEvent } from 'react';
import { CircleCheckIcon } from 'lucide-react';
import { Alert, AlertDescription, Button, Field, FieldDescription, FieldLabel, Input, NativeSelect, NativeSelectOption, Textarea } from '@noroset/ui';
import { MODERATION_REASON_LABELS, REPORT_CONTACT_MAX, REPORT_DETAILS_MAX, REPORT_REASONS, type ReportReason } from '@noroset/norolink/ui';
import { ApiError, api } from '@/lib/api';

export function ReportForm({ slug }: { slug: string }) {
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [details, setDetails] = useState('');
  const [contact, setContact] = useState('');
  const [website, setWebsite] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!reason) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/norolink/public/pages/${encodeURIComponent(slug)}/reports`, {
        method: 'POST',
        body: { reason, details: details.trim(), ...(contact.trim() ? { contact: contact.trim() } : {}), ...(website ? { website } : {}) },
      });
      setSent(true);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 404
          ? 'این صفحه پیدا نشد یا دیگر منتشر نمی‌شود.'
          : err instanceof ApiError && err.status === 429
            ? 'چند گزارش پشت سر هم فرستادید. کمی بعد دوباره امتحان کنید.'
            : 'ارسال نشد. دوباره امتحان کنید.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div role="status" className="flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-6 shadow-xs">
        <CircleCheckIcon aria-hidden className="size-8 text-success" />
        <p className="font-semibold">گزارش شما ثبت شد. ممنون که خبر دادید.</p>
        <p className="text-sm text-muted-foreground">
          اگر صفحه قوانین را نقض کرده باشد، محدود یا حذف می‌شود. اگر راه تماس گذاشته‌اید ممکن است برای جزئیات بیشتر با شما تماس بگیریم.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 rounded-xl border border-border bg-card p-6 shadow-xs">
      <Field>
        <FieldLabel htmlFor="report-reason">دلیل گزارش</FieldLabel>
        <NativeSelect id="report-reason" className="w-full" required value={reason} onChange={(e) => setReason(e.target.value as ReportReason)}>
          <NativeSelectOption value="" disabled>
            انتخاب کنید
          </NativeSelectOption>
          {REPORT_REASONS.map((r) => (
            <NativeSelectOption key={r} value={r}>
              {MODERATION_REASON_LABELS[r]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      <Field>
        <FieldLabel htmlFor="report-details">توضیح (اختیاری)</FieldLabel>
        <Textarea id="report-details" rows={4} maxLength={REPORT_DETAILS_MAX} value={details} onChange={(e) => setDetails(e.target.value)} />
        <FieldDescription>چه چیزی در صفحه مشکل دارد؟ اگر مربوط به یک لینک خاص است، نامش را بنویسید.</FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor="report-contact">ایمیل یا شماره‌ی تماس (اختیاری)</FieldLabel>
        <Input id="report-contact" dir="ltr" maxLength={REPORT_CONTACT_MAX} value={contact} onChange={(e) => setContact(e.target.value)} />
        <FieldDescription>فقط تیم نوروست می‌بیند؛ برای پیگیری گزارش.</FieldDescription>
      </Field>
      {/* honeypot: برای انسان پنهان */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -start-[9999px] size-px opacity-0"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
      />
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" disabled={busy || !reason} className="self-start">
        {busy ? 'در حال ارسال…' : 'ارسال گزارش'}
      </Button>
    </form>
  );
}
