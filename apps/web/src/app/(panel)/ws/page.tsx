'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState, type FormEvent } from 'react';
import { Building2Icon, PlusIcon } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  MotionArt,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Input,
} from '@noroset/ui';
import { api, errorMessage } from '@/lib/api';
import { routes } from '@/lib/routes';
import { FormDialog, InfoCard, InfoRow, PageHeader } from '@/components/settings-ui';
import { useSession } from '../session';

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ROLE_LABEL = { owner: 'مالک', admin: 'مدیر', member: 'عضو' } as const;

/** `/ws?new=1` (لینک «فضای کاری جدید» سایدبار) دیالوگ افزودن را باز و پارامتر را پاک می‌کند. */
function OpenAddFromQuery({ onOpen }: { onOpen: () => void }) {
  const router = useRouter();
  const wantsNew = useSearchParams().has('new');
  useEffect(() => {
    if (!wantsNew) return;
    onOpen();
    router.replace(routes.workspace);
  }, [wantsNew, onOpen, router]);
  return null;
}

export default function WorkspacePage() {
  const router = useRouter();
  const { me, tenant, reload, setTenant } = useSession();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const slugError = slug && (!SLUG.test(slug) || slug.length < 2) ? 'فقط حروف کوچک انگلیسی، عدد و خط تیره (حداقل ۲ کاراکتر).' : null;

  const openAdd = useCallback(() => {
    setName('');
    setSlug('');
    setError(null);
    setOpen(true);
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (slugError) return;
    setError(null);
    setBusy(true);
    try {
      const created = await api<{ id: string }>('/tenants', { method: 'POST', body: { name: name.trim(), slug } });
      await reload();
      setTenant(created.id);
      router.replace(routes.link.home);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  function enter(tenantId: string) {
    setTenant(tenantId);
    router.push(routes.link.home);
  }

  const addButton = (
    <Button variant="secondary" onClick={openAdd}>
      <PlusIcon />
      افزودن فضای کاری
    </Button>
  );

  return (
    <div className="flex flex-col gap-6">
      <Suspense>
        <OpenAddFromQuery onOpen={openAdd} />
      </Suspense>
      <PageHeader icon="dashboard" title="داشبورد" description="فرم‌ها، صفحه‌ها و فایل‌ها در فضای کاری نگه داشته می‌شوند." action={addButton} />

      {me.memberships.length > 0 ? (
        <InfoCard icon="workspace" title="فضاهای کاری شما">
          {me.memberships.map((m) => (
            <InfoRow
              key={m.tenantId}
              label={
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                    <Building2Icon className="size-4" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium text-foreground">{m.name}</span>
                    <span dir="ltr" className="truncate text-end text-xs">
                      {m.slug}
                    </span>
                  </span>
                </span>
              }
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary">{ROLE_LABEL[m.role]}</Badge>
                  {tenant?.tenantId === m.tenantId ? <Badge variant="info">فضای جاری</Badge> : null}
                </div>
                <Button variant="link" size="sm" className="px-0" onClick={() => enter(m.tenantId)}>
                  ورود
                </Button>
              </div>
            </InfoRow>
          ))}
        </InfoCard>
      ) : (
        <Card className="py-0">
          <Empty>
            <EmptyHeader>
              <EmptyMedia>
                <MotionArt name="welcome-workspace" className="size-28" />
              </EmptyMedia>
              <EmptyTitle>هنوز فضای کاری ندارید</EmptyTitle>
              <EmptyDescription>برای شروع، اولین فضای کاری را بسازید. شما مالک آن خواهید بود.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={openAdd}>
                <PlusIcon />
                ساخت اولین فضای کاری
              </Button>
            </EmptyContent>
          </Empty>
        </Card>
      )}

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="فضای کاری جدید"
        description="شما مالک فضای کاری جدید خواهید بود."
        onSubmit={submit}
        submitLabel="ساخت"
        busy={busy}
        canSubmit={Boolean(name.trim()) && Boolean(slug) && !slugError}
        error={error}
      >
        <Field>
          <FieldLabel>نام</FieldLabel>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} required autoFocus />
        </Field>
        <Field invalid={Boolean(slugError)}>
          <FieldLabel>نشانی</FieldLabel>
          <Input
            dir="ltr"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder="my-company"
            maxLength={64}
            required
          />
          {slugError ? <FieldError match>{slugError}</FieldError> : <FieldDescription>فقط حروف کوچک انگلیسی، عدد و خط تیره.</FieldDescription>}
        </Field>
      </FormDialog>
    </div>
  );
}
