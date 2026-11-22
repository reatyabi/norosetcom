'use client';

import { useCallback, useEffect, useState } from 'react';
import { ExternalLinkIcon, PencilIcon, TableIcon, Trash2Icon } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Badge,
  DropdownMenuSeparator,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  FileTypeIcon,
  MotionArt,
} from '@noroset/ui';
import { api, errorMessage } from '@/lib/api';
import { formatShort } from '@/lib/format';
import { routes } from '@/lib/routes';
import { FormDialog } from '@/components/settings-ui';
import { ItemGridSkeleton, ItemTableSkeleton } from '../_components/page-skeletons';
import { canManage, useSession, useTenant } from '../session';
import { useProductSearch } from '../product-bar';
import {
  arrange,
  BlankThumb,
  ItemCard,
  ItemGrid,
  ItemMenu,
  ItemMenuItem,
  ItemTable,
  NewFab,
  ownerLabel,
  RecentHeader,
  StartBand,
  StartCard,
  useHomePrefs,
  useInView,
} from '../product-home';
import { FormThumb } from './form-thumb';
import { FORM_TEMPLATES, type FormTemplate } from './templates';
import { TEMPLATE_PREVIEWS, useCreateForm } from './create-form';
import { ChannelDialog } from './channel-dialog';
import { STATUS, type FormChannel, type FormListItem } from './forms-shared';

/** قالب‌های نوار «شروع فرم جدید» (بقیه در گالری). */
const FEATURED = ['contact', 'event', 'job', 'feedback'];

export default function FormsPage() {
  const tenant = useTenant();
  // با تغییر فضای کاری، وضعیت فهرست از نو ساخته می‌شود.
  return <FormsHome key={tenant.tenantId} />;
}

function FormsHome() {
  const tenant = useTenant();
  const { me } = useSession();
  const manage = canManage(tenant.role);
  const prefs = useHomePrefs('noroform');
  const query = useProductSearch();
  const { create, creating, error: createError } = useCreateForm();
  const [forms, setForms] = useState<FormListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<FormListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [channelOpen, setChannelOpen] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<FormTemplate | undefined>(undefined);
  const [bandRef, bandInView] = useInView();

  /** انتخاب نوع پیش از ساخت؛ هیچ فرمی بدون انتخاب داخلی/خارجی ساخته نمی‌شود. */
  const startCreate = (template?: FormTemplate) => {
    setPendingTemplate(template);
    setChannelOpen(true);
  };
  const chooseChannel = (channel: FormChannel) => {
    const template = pendingTemplate;
    setChannelOpen(false);
    setPendingTemplate(undefined);
    void create(template, channel);
  };

  const load = useCallback(() => {
    api<FormListItem[]>('/noroform/forms', { tenantId: tenant.tenantId })
      .then(setForms)
      .catch((err: unknown) => setError(errorMessage(err)));
  }, [tenant.tenantId]);
  useEffect(load, [load]);
  useEffect(() => {
    document.title = 'نوروفرم';
  }, []);

  async function remove() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api(`/noroform/forms/${toDelete.id}`, { method: 'DELETE', tenantId: tenant.tenantId });
      setToDelete(null);
      load();
    } catch (err) {
      setError(errorMessage(err));
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  const shown = forms ? arrange(forms, { query, sort: prefs.sort, owner: prefs.owner, me: me.id }) : null;
  const filtered = Boolean(query) || prefs.owner !== 'all';
  const menu = (f: FormListItem) => (
    <ItemMenu label={f.title}>
      <ItemMenuItem render={<a href={routes.form.editor(f.id)} />}>
        <PencilIcon />
        ویرایش
      </ItemMenuItem>
      <ItemMenuItem render={<a href={routes.form.results(f.id)} />}>
        <TableIcon />
        پاسخ‌ها
      </ItemMenuItem>
      <ItemMenuItem render={<a href={routes.form.editor(f.id)} target="_blank" rel="noopener" />}>
        <ExternalLinkIcon />
        باز کردن در زبانه‌ی جدید
      </ItemMenuItem>
      {manage ? (
        <>
          <DropdownMenuSeparator />
          <ItemMenuItem variant="destructive" onClick={() => setToDelete(f)}>
            <Trash2Icon />
            حذف
          </ItemMenuItem>
        </>
      ) : null}
    </ItemMenu>
  );
  const badge = (f: FormListItem) => (
    <>
      <Badge variant="outline">{f.channel === 'internal' ? 'داخلی' : 'خارجی'}</Badge>
      {f.status === 'draft' ? null : <Badge variant={STATUS[f.status].variant}>{STATUS[f.status].label}</Badge>}
    </>
  );

  return (
    <div className="flex flex-col gap-2">
      <StartBand title="شروع فرم جدید" galleryHref={routes.form.templates} bandRef={bandRef}>
        <StartCard label="فرم خالی" onClick={() => startCreate()} busy={creating === 'blank'} disabled={Boolean(creating)}>
          <BlankThumb />
        </StartCard>
        {FEATURED.map((id) => FORM_TEMPLATES.find((t) => t.id === id))
          .filter((t) => t !== undefined)
          .map((t) => (
            <StartCard key={t.id} label={t.title} onClick={() => startCreate(t)} busy={creating === t.id} disabled={Boolean(creating)}>
              <FormThumb preview={TEMPLATE_PREVIEWS.get(t.id)!} title={t.title} />
            </StartCard>
          ))}
      </StartBand>

      {error || createError ? (
        <Alert variant="destructive">
          <AlertDescription>{createError ?? error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="flex flex-col">
        <RecentHeader title={query ? `نتیجه‌ی جست‌وجوی «${query}»` : 'فرم‌های اخیر'} prefs={prefs} />
        {shown === null && !error ? (
          prefs.view === 'grid' ? (
            <ItemGridSkeleton count={8} />
          ) : (
            <ItemTableSkeleton count={8} />
          )
        ) : shown && shown.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia>
                <MotionArt key={filtered ? 'filtered' : 'empty'} name={filtered ? 'no-results' : 'empty-forms'} className="size-28" />
              </EmptyMedia>
              <EmptyTitle>{filtered ? 'فرمی پیدا نشد' : 'هنوز فرمی ندارید'}</EmptyTitle>
              <EmptyDescription>
                {filtered ? 'جست‌وجو یا فیلتر مالک را تغییر دهید.' : 'یک فرم خالی بسازید یا از قالب‌های بالا شروع کنید.'}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : shown && prefs.view === 'grid' ? (
          <ItemGrid>
            {shown.map((f) => (
              <ItemCard
                key={f.id}
                href={routes.form.editor(f.id)}
                title={f.title}
                thumb={<FormThumb preview={f.preview} title={f.title} />}
                icon={<FileTypeIcon type="form" className="size-5 shrink-0" />}
                meta={`ویرایش ${formatShort(f.updatedAt)}`}
                badges={badge(f)}
                menu={menu(f)}
              />
            ))}
          </ItemGrid>
        ) : shown ? (
          <ItemTable
            rows={shown.map((f) => ({
              id: f.id,
              href: routes.form.editor(f.id),
              title: f.title,
              icon: <FileTypeIcon type="form" className="size-7 shrink-0" />,
              owner: ownerLabel(f.createdBy, f.createdByName, me.id),
              updatedAt: f.updatedAt,
              badges: badge(f),
              menu: menu(f),
            }))}
          />
        ) : null}
      </section>

      <NewFab show={!bandInView} label="فرم جدید" onClick={() => startCreate()} busy={creating === 'blank'} />

      <ChannelDialog open={channelOpen} onOpenChange={setChannelOpen} onChoose={chooseChannel} />

      <FormDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="حذف فرم"
        description={toDelete ? `«${toDelete.title}» با همه‌ی نسخه‌ها و پاسخ‌هایش برای همیشه حذف می‌شود.` : ''}
        submitLabel="حذف"
        doneLabel="فرم حذف شد"
        onSubmit={(e) => {
          e.preventDefault();
          void remove();
        }}
        busy={deleting}
        error={null}
      >
        {null}
      </FormDialog>
    </div>
  );
}
