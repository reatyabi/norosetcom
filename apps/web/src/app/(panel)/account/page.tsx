'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { CameraIcon, UserIcon } from 'lucide-react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FilePicker,
  Input,
  PasswordInput,
  SystemIcon,
  type FilePickerOptions,
} from '@noroset/ui';
import { SUPPORT_GRANT_STATUS_LABEL, type SupportGrantStatus } from '@noroset/admin/ui';
import { api, errorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { avatarSource } from '@/lib/file-sources';
import { routes } from '@/lib/routes';
import { FormDialog, InfoCard, InfoRow, Notice, PageHeader } from '@/components/settings-ui';
import { useSession } from '../session';

const PASSWORD_MIN = 8;
const NAME_MAX = 200;

// آواتار پیش از آپلود دایره‌ای کراپ و به ۵۱۲px webp کوچک می‌شود (سقف سرور ۱MB).
const AVATAR_OPTIONS: FilePickerOptions = {
  accept: ['image'],
  maxBytes: 1024 * 1024,
  image: { aspect: 1, shape: 'round', maxSize: 512, quality: 0.9 },
};

export default function AccountPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon="account"
        title="حساب کاربری"
        description="مشخصات، تصویر پروفایل و رمز عبور"
        action={
          <Button
            nativeButton={false}
            render={<Link href={routes.billing.home} />}
            variant="outline"
            className="gap-2 rounded-xl text-xs sm:text-sm font-medium hover:bg-muted"
          >
            <SystemIcon name="subscription" className="size-4 text-muted-foreground" />
            <span>مدیریت اشتراک</span>
          </Button>
        }
      />
      <ProfileCard />
      <PasswordCard />
      <SupportAccessCard />
    </div>
  );
}

function ProfileCard() {
  const { me, reload } = useSession();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(me.fullName);
  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const trimmed = name.trim();
  const dirty = trimmed !== me.fullName;

  function openEdit() {
    setName(me.fullName);
    setError(null);
    setDone(null);
    setOpen(true);
  }

  async function saveName(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api<{ fullName: string }>('/me', { method: 'PATCH', body: { fullName: trimmed } });
      await reload();
      setOpen(false);
      setDone('مشخصات ذخیره شد.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function removeAvatar() {
    setError(null);
    setAvatarBusy(true);
    try {
      await api('/me/avatar', { method: 'DELETE' });
      await reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setAvatarBusy(false);
    }
  }

  return (
    <>
      <InfoCard
        icon="account"
        title="مشخصات"
        onEdit={openEdit}
        notice={<Notice error={open ? null : error} done={done} />}
        aside={
          <ProfilePhoto
            busy={avatarBusy}
            onPicked={() => {
              setError(null);
              setDone(null);
              void reload();
            }}
            onRemove={() => void removeAvatar()}
          />
        }
      >
        <InfoRow label="نام و نام خانوادگی">
          {me.fullName ? <span className="truncate">{me.fullName}</span> : <span className="text-muted-foreground">تعیین نشده</span>}
        </InfoRow>
        <InfoRow label="شماره موبایل" hint="تغییر شماره موبایل به‌زودی فعال می‌شود.">
          <span dir="ltr" className="self-start">
            {me.mobile ?? me.email ?? ''}
          </span>
        </InfoRow>
      </InfoCard>

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="ویرایش مشخصات"
        description="نام نمایشی خود را تغییر دهید."
        onSubmit={saveName}
        busy={busy}
        canSubmit={dirty && Boolean(trimmed)}
        error={error}
      >
        <Field>
          <FieldLabel>نام و نام خانوادگی</FieldLabel>
          <Input autoComplete="name" maxLength={NAME_MAX} value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </Field>
      </FormDialog>
    </>
  );
}

/** تصویر پروفایل جدا از سطرها: کلیک روی تصویر کارت آپلود (کراپ دایره‌ای) را مستقیم باز می‌کند و بلافاصله ذخیره می‌شود. */
function ProfilePhoto({ busy, onPicked, onRemove }: { busy: boolean; onPicked: () => void; onRemove: () => void }) {
  const { me } = useSession();
  const [open, setOpen] = useState(false);
  const source = useMemo(() => avatarSource(), []);
  return (
    <div className="flex shrink-0 flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={busy}
        aria-label={me.avatarUrl ? 'تعویض تصویر پروفایل' : 'افزودن تصویر پروفایل'}
        className="group/photo relative rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
      >
        <Avatar className="size-24">
          {me.avatarUrl ? <AvatarImage src={me.avatarUrl} alt="" /> : null}
          <AvatarFallback className="text-2xl">{me.fullName.trim().charAt(0) || <UserIcon className="size-8" />}</AvatarFallback>
        </Avatar>
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover/photo:opacity-100 group-focus-visible/photo:opacity-100">
          <CameraIcon className="size-6" />
        </span>
        <span className="absolute end-0 bottom-0 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-card">
          <CameraIcon className="size-3.5" />
        </span>
      </button>
      <div className="flex items-center gap-3">
        <Button variant="link" size="sm" className="px-0" onClick={() => setOpen(true)} disabled={busy}>
          {me.avatarUrl ? 'تعویض تصویر' : 'افزودن تصویر'}
        </Button>
        {me.avatarUrl ? (
          <Button variant="link" size="sm" className="px-0 text-destructive" onClick={onRemove} loading={busy}>
            حذف
          </Button>
        ) : null}
      </div>
      <FilePicker
        open={open}
        onOpenChange={setOpen}
        source={source}
        options={AVATAR_OPTIONS}
        errorMessage={errorMessage}
        title="تصویر پروفایل"
        onPick={onPicked}
      />
    </div>
  );
}

function PasswordCard() {
  const { me, reload } = useSession();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const mismatch = repeat && next !== repeat ? 'تکرار رمز با رمز جدید یکی نیست.' : null;

  function openEdit() {
    setCurrent('');
    setNext('');
    setRepeat('');
    setError(null);
    setDone(null);
    setOpen(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (mismatch) return;
    setError(null);
    setBusy(true);
    try {
      await api('/auth/password', {
        method: 'POST',
        body: { newPassword: next, ...(me.hasPassword ? { currentPassword: current } : {}) },
      });
      await reload();
      setOpen(false);
      setDone('رمز عبور ذخیره شد.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <InfoCard
        icon="security"
        title="ورود و امنیت"
        // در حالت پشتیبانی امنیت حساب قفل است (سرور هم ۴۰۳ می‌دهد).
        onEdit={me.support ? undefined : openEdit}
        notice={<Notice error={null} done={done} />}
      >
        <InfoRow label="ورود با کد پیامکی" hint="همیشه فعال است.">
          <span>فعال</span>
        </InfoRow>
        <InfoRow
          label="رمز عبور"
          hint={me.hasPassword ? undefined : 'با تعیین رمز می‌توانید بدون کد پیامکی هم وارد شوید.'}
        >
          {me.hasPassword ? <span dir="ltr" className="self-start tracking-widest">••••••••</span> : <span className="text-muted-foreground">تعیین نشده</span>}
        </InfoRow>
      </InfoCard>

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={me.hasPassword ? 'تغییر رمز عبور' : 'تعیین رمز عبور'}
        description={
          me.hasPassword
            ? 'با تغییر رمز، از همه‌ی دستگاه‌های دیگر خارج می‌شوید.'
            : 'ورود با کد پیامکی همچنان فعال می‌ماند.'
        }
        onSubmit={submit}
        busy={busy}
        canSubmit={Boolean(next) && !mismatch}
        error={error}
      >
        {me.hasPassword ? (
          <Field>
            <FieldLabel>رمز فعلی</FieldLabel>
            <PasswordInput autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoFocus />
          </Field>
        ) : null}
        <Field>
          <FieldLabel>رمز جدید</FieldLabel>
          <PasswordInput
            autoComplete="new-password"
            minLength={PASSWORD_MIN}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
            autoFocus={!me.hasPassword}
          />
          <FieldDescription>دست‌کم {PASSWORD_MIN.toLocaleString('fa-IR')} کاراکتر.</FieldDescription>
        </Field>
        <Field invalid={Boolean(mismatch)}>
          <FieldLabel>تکرار رمز جدید</FieldLabel>
          <PasswordInput autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} required />
          {mismatch ? <FieldError match>{mismatch}</FieldError> : null}
        </Field>
      </FormDialog>
    </>
  );
}

interface SupportAccessEntry {
  id: string;
  reason: string;
  status: SupportGrantStatus;
  minutes: number;
  createdAt: string;
  revokedBy: 'admin' | 'user' | null;
}

/** سابقه‌ی ورود پشتیبانی به این حساب (docs/architecture.md §9.11)؛ دسترسی فعال را کاربر باطل می‌کند. */
function SupportAccessCard() {
  const { me } = useSession();
  const [entries, setEntries] = useState<SupportAccessEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(
    (isCurrent: () => boolean = () => true) =>
      api<SupportAccessEntry[]>('/me/support-access').then(
        (rows) => {
          if (isCurrent()) setEntries(rows);
        },
        (err: unknown) => {
          if (isCurrent()) setError(errorMessage(err));
        },
      ),
    [],
  );

  useEffect(() => {
    let current = true;
    void load(() => current);
    return () => {
      current = false;
    };
  }, [load]);

  async function revoke(id: string) {
    setError(null);
    setDone(null);
    setBusy(id);
    try {
      await api(`/me/support-access/${encodeURIComponent(id)}/revoke`, { method: 'POST' });
      await load();
      setDone('دسترسی پشتیبانی باطل شد.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <InfoCard icon="support" title="دسترسی‌های پشتیبانی" notice={<Notice error={error} done={done} />}>
      {entries && entries.length === 0 ? (
        <InfoRow label="سابقه" hint="پشتیبانی نوروست فقط با دلیل و برای مدت محدود (حداکثر یک ساعت) وارد حساب شما می‌شود و اینجا ثبت می‌شود.">
          <span className="text-muted-foreground">تاکنون کسی از پشتیبانی وارد حساب شما نشده است.</span>
        </InfoRow>
      ) : (
        (entries ?? []).map((e) => (
          <InfoRow key={e.id} label={formatDateTime(e.createdAt)} hint={`${e.minutes.toLocaleString('fa-IR')} دقیقه · ${SUPPORT_GRANT_STATUS_LABEL[e.status]}${e.revokedBy === 'user' ? ' توسط شما' : ''}`}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="min-w-0 break-words">{e.reason}</span>
              {(e.status === 'active' || e.status === 'pending') && !me.support ? (
                <Button variant="link" size="sm" className="px-0 text-destructive" loading={busy === e.id} onClick={() => void revoke(e.id)}>
                  ابطال دسترسی
                </Button>
              ) : null}
            </div>
          </InfoRow>
        ))
      )}
    </InfoCard>
  );
}
