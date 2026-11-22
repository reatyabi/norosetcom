'use client';

import Link from 'next/link';
import { use, useState, type FormEvent } from 'react';
import { ExternalLinkIcon } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Button,
  Field,
  FieldDescription,
  FieldLabel,
  Input,
  NativeSelect,
  NativeSelectOption,
  Segmented,
  Skeleton,
  Switch,
  Textarea,
} from '@noroset/ui';
import {
  defaultModerationNotice,
  FLUID_MIN_WIDTH,
  LinkPage,
  MODERATION_MAX_DAYS,
  MODERATION_NOTE_MAX,
  MODERATION_NOTICE_MAX,
  MODERATION_REASON_LABELS,
  MODERATION_REASONS,
  MODERATION_REFERENCE_MAX,
  MODERATION_STATUS_HINTS,
  MODERATION_STATUS_LABELS,
  MODERATION_STATUSES,
  type ModerationReason,
  type ModerationStatus,
} from '@noroset/norolink/ui';
import type { AuditItem, Page } from '@noroset/admin/ui';
import { api, errorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useLucideIcon, usesLucide } from '@/lib/lucide-icons';
import { routes } from '@/lib/routes';
import { PUBLIC_HOST, publicUrl } from '../../../link/links-shared';
import { FormDialog, InfoCard, InfoRow, Notice } from '@/components/settings-ui';
import { AdminPage, fa, query, TenantStatusBadge, useAdminResource } from '../../_components/admin-ui';
import { AuditList } from '../../_components/audit-list';
import { ModerationBadge, ReportsTable } from '../moderation-ui';
import type { ModerationPageDetail } from '../types';

// جزئیات یک صفحه‌ی لینک برای مدیریت پلتفرم (docs/architecture.md §9.13): نسخه‌ی منتشرشده (نه پیش‌نویس)، وضعیت مدیریتی،
// گزارش‌ها و سابقه‌ی ممیزی.

export default function AdminLinkPagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const page = useAdminResource<ModerationPageDetail>(`/norolink/admin/pages/${encodeURIComponent(id)}`);
  const audit = useAdminResource<Page<AuditItem>>(`/admin/audit${query({ targetType: 'link_page', targetId: id, limit: 50 })}`);
  const [editing, setEditing] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const p = page.data;

  return (
    <AdminPage title={p?.title ?? 'صفحه‌ی لینک'} description={p ? `${p.slug}.${PUBLIC_HOST}` : undefined} back={{ href: routes.admin.linkPages, label: 'صفحه‌های لینک' }}>
      {page.error ? (
        <Alert variant="destructive">
          <AlertDescription>{page.error}</AlertDescription>
        </Alert>
      ) : null}
      {!p ? (
        page.error ? null : <Skeleton className="h-64 w-full rounded-xl" />
      ) : (
        <>
          <Notice error={null} done={done} />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="flex min-w-0 flex-col gap-6">
              <InfoCard
                title="وضعیت مدیریتی"
                action={
                  <Button variant="link" size="sm" className="px-0" onClick={() => setEditing(true)}>
                    تغییر وضعیت
                  </Button>
                }
              >
                <InfoRow label="وضعیت" hint={MODERATION_STATUS_HINTS[p.moderation.effective]}>
                  <ModerationBadge status={p.moderation.effective} />
                </InfoRow>
                {p.moderation.status !== 'none' && p.moderation.effective === 'none' ? (
                  <InfoRow label="محدودیت قبلی">
                    {MODERATION_STATUS_LABELS[p.moderation.status]} تا {p.moderation.until ? formatDateTime(p.moderation.until) : '—'} (مهلت گذشته)
                  </InfoRow>
                ) : null}
                {p.moderation.effective !== 'none' && p.moderation.reason ? <InfoRow label="دلیل">{MODERATION_REASON_LABELS[p.moderation.reason]}</InfoRow> : null}
                {p.moderation.effective !== 'none' ? (
                  <InfoRow label="پیام عمومی">{p.moderation.notice || <span className="text-muted-foreground">متن پیش‌فرض</span>}</InfoRow>
                ) : null}
                {p.moderation.effective !== 'none' && p.moderation.until ? <InfoRow label="پایان خودکار">{formatDateTime(p.moderation.until)}</InfoRow> : null}
                {p.moderation.at ? <InfoRow label="آخرین تغییر">{formatDateTime(p.moderation.at)}</InfoRow> : null}
              </InfoCard>

              <InfoCard title="مشخصات">
                <InfoRow label="نشانی">
                  <a href={publicUrl(p.slug)} target="_blank" rel="noopener noreferrer" dir="ltr" className="inline-flex items-center gap-1 self-start text-primary hover:underline">
                    {p.slug}.{PUBLIC_HOST}
                    <ExternalLinkIcon className="size-3.5" />
                  </a>
                </InfoRow>
                <InfoRow label="وضعیت انتشار">{p.status === 'published' ? 'منتشرشده' : 'لغو انتشار شده (نسخه‌ی آخر نمایش داده می‌شود)'}</InfoRow>
                <InfoRow label="آخرین انتشار">{p.publishedAt ? formatDateTime(p.publishedAt) : '—'}</InfoRow>
                <InfoRow label="فضای کاری">
                  <span className="flex items-center gap-2">
                    <Link href={routes.admin.tenant(p.tenant.id)} className="text-primary hover:underline">
                      {p.tenant.name}
                    </Link>
                    <TenantStatusBadge status={p.tenant.status} />
                  </span>
                </InfoRow>
              </InfoCard>

              <section className="flex flex-col gap-3">
                <h2 className="text-base font-semibold">گزارش‌های تخلف ({fa(p.reports.length)})</h2>
                <ReportsTable
                  items={p.reports}
                  showPage={false}
                  onChanged={(next) => {
                    page.setData((cur) =>
                      cur
                        ? { ...cur, reports: cur.reports.map((r) => (r.id === next.id ? next : r)), openReports: cur.reports.filter((r) => r.id !== next.id && r.status === 'open').length }
                        : cur,
                    );
                    void audit.reload();
                  }}
                />
              </section>

              <section className="flex flex-col gap-3">
                <h2 className="text-base font-semibold">سابقه‌ی اقدام‌ها</h2>
                {audit.data ? <AuditList items={audit.data.items} showTarget={false} /> : null}
              </section>
            </div>

            <aside className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold">نسخه‌ی منتشرشده</h2>
              <p className="text-xs text-muted-foreground">همان چیزی که بازدیدکننده‌ها دیده‌اند؛ پیش‌نویس مالک نمایش داده نمی‌شود.</p>
              <SnapshotPreview detail={p} />
            </aside>
          </div>

          {editing ? (
            <ModerationDialog
              detail={p}
              onClose={() => setEditing(false)}
              onDone={(next) => {
                page.setData(next);
                setEditing(false);
                setDone(`وضعیت صفحه: ${MODERATION_STATUS_LABELS[next.moderation.effective]}`);
                void audit.reload();
              }}
            />
          ) : null}
        </>
      )}
    </AdminPage>
  );
}

function SnapshotPreview({ detail }: { detail: ModerationPageDetail }) {
  const { content, elements } = detail.snapshot;
  const lucideIcon = useLucideIcon(usesLucide(elements));
  return (
    <div className="h-[640px] overflow-auto rounded-xl border border-border bg-card shadow-xs" inert>
      <div className="flex min-h-full flex-col" style={{ width: FLUID_MIN_WIDTH, zoom: 380 / FLUID_MIN_WIDTH }}>
        <LinkPage content={content} elements={elements} assetBaseUrl={detail.assetBaseUrl} forceLicense={false} lucideIcon={lucideIcon} preview />
      </div>
    </div>
  );
}

const DAY_ITEMS: { value: string; label: string }[] = [
  { value: '', label: 'تا برداشتن دستی' },
  { value: '1', label: '۱ روز' },
  { value: '7', label: '۷ روز' },
  { value: '30', label: '۳۰ روز' },
  { value: '90', label: '۹۰ روز' },
  { value: String(MODERATION_MAX_DAYS), label: '۱ سال' },
];

function ModerationDialog({
  detail,
  onClose,
  onDone,
}: {
  detail: ModerationPageDetail;
  onClose: () => void;
  onDone: (next: ModerationPageDetail) => void;
}) {
  const current = detail.moderation;
  const [status, setStatus] = useState<ModerationStatus>(current.effective === 'none' ? 'delisted' : current.effective);
  const [reason, setReason] = useState<ModerationReason | ''>(current.effective !== 'none' && current.reason ? current.reason : '');
  const [notice, setNotice] = useState(current.effective !== 'none' ? (current.notice ?? '') : '');
  const [reference, setReference] = useState('');
  const [days, setDays] = useState('');
  const [note, setNote] = useState('');
  const [resolveReports, setResolveReports] = useState(detail.openReports > 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lifting = status === 'none';

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      onDone(
        await api<ModerationPageDetail>(`/norolink/admin/pages/${encodeURIComponent(detail.id)}/moderation`, {
          method: 'PUT',
          body: {
            status,
            note,
            ...(lifting ? {} : { reason, ...(notice.trim() ? { notice } : {}), ...(days ? { days: Number(days) } : {}) }),
            ...(reference.trim() ? { reference } : {}),
            ...(detail.openReports > 0 ? { resolveReports } : {}),
          },
        }),
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormDialog
      open
      onOpenChange={(o) => (o ? undefined : onClose())}
      title="تغییر وضعیت مدیریتی صفحه"
      description="مالک صفحه وضعیت، دسته‌ی دلیل و پیام عمومی را در پنل خود می‌بیند؛ یادداشت داخلی فقط در لاگ ممیزی می‌ماند. داده‌ای پاک نمی‌شود."
      onSubmit={submit}
      submitLabel={lifting ? 'برداشتن محدودیت' : 'اعمال'}
      submitVariant={status === 'suspended' ? 'destructive' : 'default'}
      busy={busy}
      canSubmit={note.trim().length >= 3 && (lifting || Boolean(reason))}
      error={error}
    >
      <Field>
        <FieldLabel>وضعیت</FieldLabel>
        <Segmented<ModerationStatus> value={status} onChange={setStatus} items={MODERATION_STATUSES.map((s) => ({ value: s, label: MODERATION_STATUS_LABELS[s] }))} className="w-full" />
        <FieldDescription>{MODERATION_STATUS_HINTS[status]}</FieldDescription>
      </Field>
      {lifting ? null : (
        <>
          <Field>
            <FieldLabel htmlFor="mod-reason">دسته‌ی دلیل</FieldLabel>
            <NativeSelect id="mod-reason" required value={reason} onChange={(e) => setReason(e.target.value as ModerationReason)}>
              <NativeSelectOption value="" disabled>
                انتخاب کنید
              </NativeSelectOption>
              {MODERATION_REASONS.map((r) => (
                <NativeSelectOption key={r} value={r}>
                  {MODERATION_REASON_LABELS[r]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {status === 'suspended' && reason === 'legal_order' ? <FieldDescription>صفحه با کد ۴۵۱ (دسترسی به دلایل قانونی ممنوع) پاسخ می‌دهد.</FieldDescription> : null}
          </Field>
          {status !== 'delisted' ? (
            <Field>
              <FieldLabel htmlFor="mod-notice">پیام به بازدیدکننده و مالک (اختیاری)</FieldLabel>
              <Textarea
                id="mod-notice"
                rows={3}
                maxLength={MODERATION_NOTICE_MAX}
                value={notice}
                placeholder={reason ? defaultModerationNotice(status, reason) : undefined}
                onChange={(e) => setNotice(e.target.value)}
              />
              <FieldDescription>خالی ← متن پیش‌فرض. جزئیات حساس یا نام شاکی را ننویسید.</FieldDescription>
            </Field>
          ) : null}
          <Field>
            <FieldLabel htmlFor="mod-days">مدت</FieldLabel>
            <NativeSelect id="mod-days" value={days} onChange={(e) => setDays(e.target.value)}>
              {DAY_ITEMS.map((d) => (
                <NativeSelectOption key={d.value} value={d.value}>
                  {d.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldDescription>محدودیت موقت پس از این مدت خودکار برداشته می‌شود.</FieldDescription>
          </Field>
        </>
      )}
      <Field>
        <FieldLabel htmlFor="mod-reference">شماره‌ی مرجع (اختیاری)</FieldLabel>
        <Input id="mod-reference" maxLength={MODERATION_REFERENCE_MAX} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="مثلاً شماره‌ی نامه یا دستور قضایی" />
      </Field>
      <Field>
        <FieldLabel htmlFor="mod-note">یادداشت داخلی</FieldLabel>
        <Textarea id="mod-note" rows={3} required maxLength={MODERATION_NOTE_MAX} value={note} onChange={(e) => setNote(e.target.value)} />
        <FieldDescription>چرا این تصمیم گرفته شد؟ فقط مدیران پلتفرم در لاگ ممیزی می‌بینند.</FieldDescription>
      </Field>
      {detail.openReports > 0 ? (
        <Field orientation="horizontal">
          <Switch id="mod-resolve" checked={resolveReports} onCheckedChange={setResolveReports} />
          <FieldLabel htmlFor="mod-resolve">{fa(detail.openReports)} گزارش باز این صفحه «اقدام شد» شوند</FieldLabel>
        </Field>
      ) : null}
    </FormDialog>
  );
}
