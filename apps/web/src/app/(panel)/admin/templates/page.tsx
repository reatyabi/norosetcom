'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArchiveRestoreIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  DropdownMenuSeparator,
  Field,
  FieldLabel,
  FileTypeIcon,
  Input,
  Segmented,
  Textarea,
} from '@noroset/ui';
import { ItemGridSkeleton } from '../../_components/page-skeletons';
import { LINK_TEMPLATE_CATEGORIES, LINK_TEMPLATE_CATEGORY_LABELS, type LinkTemplateCategory } from '@noroset/norolink/ui';
import { api, errorMessage } from '@/lib/api';
import { formatShort } from '@/lib/format';
import { routes } from '@/lib/routes';
import { FormDialog } from '@/components/settings-ui';
import { LinkThumb } from '../../link/link-thumb';
import { STATUS, type AdminTemplateItem } from '../../link/links-shared';
import { MAX_PAGE_NAME } from '../../link/new-link-page';
import { ItemCard, ItemGrid, ItemMenu, ItemMenuItem } from '../../product-home';
import { AdminPage, useAdminResource } from '../_components/admin-ui';

const CATEGORY_ITEMS = LINK_TEMPLATE_CATEGORIES.map((value) => ({ value, label: LINK_TEMPLATE_CATEGORY_LABELS[value] }));

const removePath = (t: AdminTemplateItem) => (t.source === 'builtin' ? `/norolink/admin/templates/builtin/${encodeURIComponent(t.id)}` : `/norolink/admin/templates/${t.id}`);

/** قالب‌های آماده‌ی صفحه‌ی لینک: ساخت با ادیتور، انتشار در گالری کاربران و حذف (قالب‌های پیش‌فرض کد هم قابل برداشتن و بازگردانی‌اند). */
export default function AdminTemplatesPage() {
  const templates = useAdminResource<AdminTemplateItem[]>('/norolink/admin/templates');
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<AdminTemplateItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!toDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await api(removePath(toDelete), { method: 'DELETE' });
      setToDelete(null);
      await templates.reload();
    } catch (err) {
      setError(errorMessage(err));
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  async function restore(t: AdminTemplateItem) {
    setError(null);
    try {
      await api(`${removePath(t)}/restore`, { method: 'POST' });
      await templates.reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const custom = templates.data?.filter((t) => t.source === 'custom') ?? [];
  const builtin = templates.data?.filter((t) => t.source === 'builtin') ?? [];

  const card = (t: AdminTemplateItem) => (
    <ItemCard
      key={t.id}
      href={t.source === 'custom' ? routes.admin.templateEditor(t.id) : undefined}
      title={t.title}
      thumb={<LinkThumb {...t.preview} />}
      icon={<FileTypeIcon type="link-page" className="size-5 shrink-0" />}
      meta={t.updatedAt ? `${LINK_TEMPLATE_CATEGORY_LABELS[t.category]} · ${formatShort(t.updatedAt)}` : LINK_TEMPLATE_CATEGORY_LABELS[t.category]}
      badges={
        t.source === 'builtin' ? (
          t.removed ? <Badge variant="destructive">حذف‌شده از گالری</Badge> : null
        ) : (
          <>
            <Badge variant={STATUS[t.status].variant}>{STATUS[t.status].label}</Badge>
            {t.status === 'published' && t.hasUnpublishedChanges ? <Badge variant="outline">تغییر منتشرنشده</Badge> : null}
          </>
        )
      }
      menu={
        <ItemMenu label={t.title}>
          {t.source === 'custom' ? (
            <>
              <ItemMenuItem render={<a href={routes.admin.templateEditor(t.id)} />}>
                <PencilIcon />
                ویرایش
              </ItemMenuItem>
              <DropdownMenuSeparator />
            </>
          ) : null}
          {t.removed ? (
            <ItemMenuItem onClick={() => void restore(t)}>
              <ArchiveRestoreIcon />
              بازگردانی به گالری
            </ItemMenuItem>
          ) : (
            <ItemMenuItem variant="destructive" onClick={() => setToDelete(t)}>
              <Trash2Icon />
              حذف
            </ItemMenuItem>
          )}
        </ItemMenu>
      }
    />
  );

  return (
    <AdminPage
      title="قالب‌ها"
      description="قالب‌های آماده‌ی صفحه‌ی لینک که کاربران در گالری می‌بینند"
      action={
        <Button onClick={() => setCreating(true)}>
          <PlusIcon />
          قالب جدید
        </Button>
      }
    >
      {templates.error || error ? (
        <Alert variant="destructive">
          <AlertDescription>{error ?? templates.error}</AlertDescription>
        </Alert>
      ) : null}

      {templates.data ? (
        <div className="flex flex-col gap-8">
          <section className="flex flex-col">
            <h2 className="text-base font-medium">قالب‌های ساخته‌شده با ویرایشگر</h2>
            {custom.length ? (
              <ItemGrid>{custom.map(card)}</ItemGrid>
            ) : (
              <p className="pt-2 text-sm text-muted-foreground">هنوز قالبی نساخته‌اید؛ با «قالب جدید» در همان ویرایشگر صفحه‌ی لینک یکی بسازید و منتشر کنید.</p>
            )}
          </section>
          <section className="flex flex-col">
            <h2 className="text-base font-medium">قالب‌های پیش‌فرض</h2>
            <ItemGrid>{builtin.map(card)}</ItemGrid>
          </section>
        </div>
      ) : templates.error ? null : (
        <ItemGridSkeleton count={8} />
      )}

      {/* key: هر بار فرم تازه */}
      <NewTemplateDialog key={creating ? 'open' : 'closed'} open={creating} onClose={() => setCreating(false)} />

      <FormDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="حذف قالب"
        description={
          !toDelete
            ? ''
            : toDelete.source === 'builtin'
              ? `«${toDelete.title}» از گالری کاربران برداشته می‌شود و بعداً هم می‌توانید آن را برگردانید. صفحه‌هایی که از آن ساخته شده‌اند دست نمی‌خورند.`
              : `«${toDelete.title}» برای همیشه حذف می‌شود. صفحه‌هایی که از آن ساخته شده‌اند دست نمی‌خورند.`
        }
        submitLabel="حذف"
        doneLabel="قالب حذف شد"
        onSubmit={(e) => {
          e.preventDefault();
          void remove();
        }}
        busy={deleting}
        error={null}
      >
        {null}
      </FormDialog>
    </AdminPage>
  );
}

/** عنوان، توضیح و دسته؛ بعد از ساخت همه‌چیز در ویرایشگر ادامه پیدا می‌کند. */
function NewTemplateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<LinkTemplateCategory>('personal');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const t = await api<{ id: string }>('/norolink/admin/templates', { method: 'POST', body: { title, description, category } });
      router.push(routes.admin.templateEditor(t.id));
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => !next && !busy && onClose()}
      title="قالب جدید"
      description="بعد از ساخت، قالب را در ویرایشگر طراحی و منتشر می‌کنید؛ تا انتشار به کاربران نشان داده نمی‌شود."
      submitLabel="ساخت و ویرایش"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      busy={busy}
      canSubmit={title.trim().length > 0}
      error={error}
    >
      <Field>
        <FieldLabel>عنوان قالب</FieldLabel>
        <Input autoFocus value={title} maxLength={MAX_PAGE_NAME} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً کافه و رستوران" />
      </Field>
      <Field>
        <FieldLabel>توضیح در گالری (اختیاری)</FieldLabel>
        <Textarea rows={2} value={description} maxLength={300} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <Field>
        <FieldLabel>دسته‌بندی</FieldLabel>
        <Segmented value={category} onChange={setCategory} items={CATEGORY_ITEMS} />
      </Field>
    </FormDialog>
  );
}
