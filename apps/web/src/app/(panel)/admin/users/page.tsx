'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { SearchIcon, UserIcon, UserPlusIcon } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  MotionArt,
  Field,
  FieldDescription,
  FieldLabel,
  Input,
  Label,
  NativeSelect,
  NativeSelectOption,
  PasswordInput,
  Segmented,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@noroset/ui';
import { ItemTableSkeleton } from '../../_components/page-skeletons';
import type { AdminUserDetail, AdminUserItem, Page, PlatformRole, UserStatus } from '@noroset/admin/ui';
import { api, errorMessage } from '@/lib/api';
import { formatDateTime, toAsciiDigits } from '@/lib/format';
import { routes } from '@/lib/routes';
import { FormDialog } from '@/components/settings-ui';
import { AdminPage, fa, Pager, query, RoleBadge, useAdminResource, useDebounced, UserStatusBadge } from '../_components/admin-ui';

const LIMIT = 50;
type StatusFilter = 'all' | UserStatus;
const STATUS_ITEMS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'همه' },
  { value: 'active', label: 'فعال' },
  { value: 'disabled', label: 'غیرفعال' },
  { value: 'blocked', label: 'مسدود' },
];

function UsersList() {
  const params = useSearchParams();
  const initialStatus = params.get('status');
  const [status, setStatus] = useState<StatusFilter>(
    STATUS_ITEMS.some((s) => s.value === initialStatus) ? (initialStatus as StatusFilter) : 'all',
  );
  const [role, setRole] = useState<'' | PlatformRole>(params.get('role') === 'superadmin' ? 'superadmin' : '');
  const [text, setText] = useState('');
  const [offset, setOffset] = useState(0);
  const [adding, setAdding] = useState(false);
  const q = useDebounced(text.trim());

  const path = `/admin/users${query({ q, status: status === 'all' ? undefined : status, role, limit: LIMIT, offset })}`;
  const { data, error } = useAdminResource<Page<AdminUserItem>>(path);
  const filtered = Boolean(q) || status !== 'all' || Boolean(role);

  return (
    <AdminPage
      title="کاربران"
      description="همه‌ی کاربران پلتفرم، وضعیت و نقش آن‌ها"
      action={
        <Button onClick={() => setAdding(true)}>
          <UserPlusIcon />
          افزودن کاربر
        </Button>
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          value={status}
          onChange={(v) => {
            setStatus(v);
            setOffset(0);
          }}
          items={STATUS_ITEMS}
          className="w-full sm:w-auto"
        />
        <NativeSelect
          size="sm"
          aria-label="نقش پلتفرم"
          className="w-full sm:w-40"
          value={role}
          onChange={(e) => {
            setRole(e.target.value as '' | PlatformRole);
            setOffset(0);
          }}
        >
          <NativeSelectOption value="">همه‌ی نقش‌ها</NativeSelectOption>
          <NativeSelectOption value="superadmin">سوپرادمین</NativeSelectOption>
          <NativeSelectOption value="user">کاربر</NativeSelectOption>
        </NativeSelect>
        <div className="relative w-full sm:w-72">
          <SearchIcon className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="جست‌وجوی کاربر"
            placeholder="موبایل، نام یا ایمیل"
            className="ps-8"
            value={text}
            maxLength={100}
            onChange={(e) => {
              setText(e.target.value);
              setOffset(0);
            }}
          />
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!data && !error ? (
        <ItemTableSkeleton count={8} />
      ) : data && data.items.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia>
              <MotionArt name="no-results" className="size-28" />
            </EmptyMedia>
            <EmptyTitle>{filtered ? 'کاربری پیدا نشد' : 'هنوز کاربری نیست'}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : data ? (
        <section className="flex flex-col gap-2">
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>کاربر</TableHead>
                  <TableHead>وضعیت</TableHead>
                  <TableHead className="hidden md:table-cell">فضای کاری</TableHead>
                  <TableHead className="hidden lg:table-cell">عضویت</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="max-w-0 min-w-56">
                      <Link href={routes.admin.user(u.id)} className="flex items-center gap-3 hover:underline">
                        <Avatar>
                          {u.avatarUrl ? <AvatarImage src={u.avatarUrl} alt="" /> : null}
                          <AvatarFallback>{u.fullName.trim().charAt(0) || <UserIcon className="size-4" />}</AvatarFallback>
                        </Avatar>
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="truncate font-medium">{u.fullName || 'بدون نام'}</span>
                          <span dir="ltr" className="truncate text-end text-xs text-muted-foreground">
                            {u.mobile ?? u.email ?? ''}
                          </span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <UserStatusBadge status={u.status} />
                        <RoleBadge role={u.platformRole} />
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{fa(u.tenantCount)}</TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">{formatDateTime(u.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <Pager offset={data.offset} limit={data.limit} total={data.total} shown={data.items.length} noun="کاربر" onChange={setOffset} />
        </section>
      ) : null}

      <AddUserDialog open={adding} onOpenChange={setAdding} />
    </AdminPage>
  );
}

function AddUserDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [mobile, setMobile] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [withTenant, setWithTenant] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [slug, setSlug] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = await api<AdminUserDetail>('/admin/users', {
        method: 'POST',
        body: {
          mobile: toAsciiDigits(mobile),
          ...(fullName.trim() ? { fullName } : {}),
          ...(password ? { password } : {}),
          ...(withTenant ? { tenant: { name: tenantName, slug } } : {}),
        },
      });
      onOpenChange(false);
      router.push(routes.admin.user(user.id));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="افزودن کاربر"
      description="کاربر با همین موبایل و کد پیامکی هم وارد می‌شود."
      onSubmit={submit}
      submitLabel="افزودن"
      busy={busy}
      canSubmit={Boolean(mobile.trim()) && (!withTenant || (Boolean(tenantName.trim()) && Boolean(slug.trim())))}
      error={error}
    >
      <Field>
        <FieldLabel>شماره موبایل</FieldLabel>
        <Input dir="ltr" inputMode="tel" autoComplete="off" value={mobile} onChange={(e) => setMobile(e.target.value)} required autoFocus />
      </Field>
      <Field>
        <FieldLabel>نام و نام خانوادگی (اختیاری)</FieldLabel>
        <Input maxLength={200} value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </Field>
      <Field>
        <FieldLabel>رمز عبور (اختیاری)</FieldLabel>
        <PasswordInput autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        <FieldDescription>بدون رمز، کاربر فقط با کد پیامکی وارد می‌شود.</FieldDescription>
      </Field>
      <div className="flex items-center gap-3">
        <Switch id="admin-new-tenant" checked={withTenant} onCheckedChange={setWithTenant} />
        <Label htmlFor="admin-new-tenant">ساخت فضای کاری که این کاربر مالک آن است</Label>
      </div>
      {withTenant ? (
        <>
          <Field>
            <FieldLabel>نام فضای کاری</FieldLabel>
            <Input maxLength={200} value={tenantName} onChange={(e) => setTenantName(e.target.value)} required />
          </Field>
          <Field>
            <FieldLabel>نشانی (slug)</FieldLabel>
            <Input dir="ltr" maxLength={64} value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} required />
            <FieldDescription>حروف کوچک انگلیسی، عدد و خط تیره.</FieldDescription>
          </Field>
        </>
      ) : null}
    </FormDialog>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense>
      <UsersList />
    </Suspense>
  );
}
