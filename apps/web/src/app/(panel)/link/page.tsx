'use client';

import { useCallback, useEffect, useState } from 'react';
import { BarChart3Icon, CopyIcon, ExternalLinkIcon, PencilIcon, Trash2Icon } from 'lucide-react';
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
  Skeleton,
} from '@noroset/ui';
import { linkTemplate, MODERATION_STATUS_LABELS, type LinkTemplate } from '@noroset/norolink/ui';
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
import { LinkThumb, TemplateThumb } from './link-thumb';
import { useCreateLink, useLinkTemplates } from './create-link';
import { TemplatePreviewDialog } from './templates/template-preview-dialog';
import { PUBLIC_FILES_BASE, publicUrl, STATUS, type LinkListItem } from './links-shared';

/** قالب‌های پیش‌فرض نوار «شروع صفحه‌ی جدید» (بقیه در گالری). */
const FEATURED = ['bio', 'portfolio', 'cafe', 'shop', 'creator', 'beauty'];
const FEATURED_COUNT = FEATURED.length;

/** قالب‌های تازه‌ی مدیریت پلتفرم اول (سرور جدیدترین را اول می‌دهد)؛ بعد قالب‌های پیش‌فرضی که از گالری برداشته نشده‌اند. */
function featuredTemplates(templates: LinkTemplate[]): LinkTemplate[] {
  const custom = templates.filter((t) => !linkTemplate(t.id));
  const builtin = FEATURED.flatMap((id) => templates.filter((t) => t.id === id));
  return [...custom, ...builtin].slice(0, FEATURED_COUNT);
}

export default function LinksPage() {
  const tenant = useTenant();
  return <LinksHome key={tenant.tenantId} />;
}

function LinksHome() {
  const tenant = useTenant();
  const { me } = useSession();
  const manage = canManage(tenant.role);
  const prefs = useHomePrefs('norolink');
  const query = useProductSearch();
  const { create, dialog: createDialog } = useCreateLink();
  const { templates } = useLinkTemplates();
  const [pages, setPages] = useState<LinkListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<LinkListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<LinkTemplate | null>(null);
  const [bandRef, bandInView] = useInView();

  const load = useCallback(() => {
    api<LinkListItem[]>('/norolink/pages', { tenantId: tenant.tenantId })
      .then(setPages)
      .catch((err: unknown) => setError(errorMessage(err)));
  }, [tenant.tenantId]);
  useEffect(load, [load]);
  useEffect(() => {
    document.title = 'نورولینک';
  }, []);

  async function remove() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api(`/norolink/pages/${toDelete.id}`, { method: 'DELETE', tenantId: tenant.tenantId });
      setToDelete(null);
      load();
    } catch (err) {
      setError(errorMessage(err));
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  const shown = pages ? arrange(pages, { query, sort: prefs.sort, owner: prefs.owner, me: me.id }) : null;
  const filtered = Boolean(query) || prefs.owner !== 'all';
  const hasNoPages = pages !== null && pages.length === 0;
  const menu = (p: LinkListItem) => (
    <ItemMenu label={p.title}>
      <ItemMenuItem render={<a href={routes.link.editor(p.slug)} />}>
        <PencilIcon />
        ویرایش
      </ItemMenuItem>
      <ItemMenuItem render={<a href={routes.link.analytics(p.slug)} />}>
        <BarChart3Icon />
        آمار
      </ItemMenuItem>
      {p.status === 'published' ? (
        <>
          <ItemMenuItem render={<a href={publicUrl(p.slug)} target="_blank" rel="noopener noreferrer" />}>
            <ExternalLinkIcon />
            مشاهده‌ی صفحه
          </ItemMenuItem>
          <ItemMenuItem onClick={() => void navigator.clipboard.writeText(publicUrl(p.slug))}>
            <CopyIcon />
            کپی نشانی
          </ItemMenuItem>
        </>
      ) : null}
      {manage ? (
        <>
          <DropdownMenuSeparator />
          <ItemMenuItem variant="destructive" onClick={() => setToDelete(p)}>
            <Trash2Icon />
            حذف
          </ItemMenuItem>
        </>
      ) : null}
    </ItemMenu>
  );
  const badges = (p: LinkListItem) => (
    <>
      <Badge variant={STATUS[p.status].variant}>{STATUS[p.status].label}</Badge>
      {p.status === 'published' && p.hasUnpublishedChanges ? <Badge variant="outline">تغییر منتشرنشده</Badge> : null}
      {p.moderation ? (
        <Badge variant={p.moderation.status === 'delisted' ? 'outline' : 'destructive'} title="محدودیت مدیریت نوروست؛ جزئیات در ویرایشگر">
          {MODERATION_STATUS_LABELS[p.moderation.status]}
        </Badge>
      ) : null}
    </>
  );

  const thumbAspect = hasNoPages ? 'aspect-[2/3]' : undefined;

  return (
    <div className="flex flex-col gap-2">
      <StartBand title="شروع صفحه‌ی جدید" galleryHref={routes.link.templates} bandRef={bandRef}>
        <StartCard label="صفحه‌ی خالی" onClick={() => create()} thumbClassName={thumbAspect}>
          <BlankThumb />
        </StartCard>
        {templates === null
          ? [1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex flex-col gap-1.5 shrink-0 w-36 sm:w-44">
                <Skeleton className={`w-full rounded-lg ${thumbAspect ?? 'aspect-[4/3]'}`} />
                <Skeleton className="h-4 w-3/4 rounded" />
              </div>
            ))
          : featuredTemplates(templates).map((t) => (
              <StartCard key={t.id} label={t.title} onClick={() => setPreviewTemplate(t)} thumbClassName={thumbAspect}>
                <TemplateThumb template={t} assetBaseUrl={PUBLIC_FILES_BASE} />
              </StartCard>
            ))}
      </StartBand>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="flex flex-col">
        <RecentHeader title={query ? `نتیجه‌ی جست‌وجوی «${query}»` : 'صفحه‌های اخیر'} prefs={prefs} />
        {shown === null && !error ? (
          prefs.view === 'grid' ? (
            <ItemGridSkeleton count={8} thumbAspect={thumbAspect} />
          ) : (
            <ItemTableSkeleton count={8} />
          )
        ) : shown && shown.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia>
                <MotionArt key={filtered ? 'filtered' : 'empty'} name={filtered ? 'no-results' : 'empty-links'} className="size-28" />
              </EmptyMedia>
              <EmptyTitle>{filtered ? 'صفحه‌ای پیدا نشد' : 'هنوز صفحه‌ی لینکی ندارید'}</EmptyTitle>
              <EmptyDescription>
                {filtered
                  ? 'جست‌وجو یا فیلتر مالک را تغییر دهید.'
                  : 'یک صفحه‌ی لینک برای بیوی شبکه‌های اجتماعی، روی زیردامنه‌ی اختصاصی شما؛ از صفحه‌ی خالی یا یک قالب شروع کنید.'}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : shown && prefs.view === 'grid' ? (
          <ItemGrid>
            {shown.map((p) => (
              <ItemCard
                key={p.id}
                href={routes.link.editor(p.slug)}
                title={p.title}
                thumb={<LinkThumb {...p.preview} />}
                icon={<FileTypeIcon type="link-page" className="size-5 shrink-0" />}
                meta={`ویرایش ${formatShort(p.updatedAt)}`}
                badges={badges(p)}
                menu={menu(p)}
              />
            ))}
          </ItemGrid>
        ) : shown ? (
          <ItemTable
            rows={shown.map((p) => ({
              id: p.id,
              href: routes.link.editor(p.slug),
              title: p.title,
              icon: <FileTypeIcon type="link-page" className="size-7 shrink-0" />,
              owner: ownerLabel(p.createdBy, p.createdByName, me.id),
              updatedAt: p.updatedAt,
              badges: badges(p),
              menu: menu(p),
            }))}
          />
        ) : null}
      </section>

      <NewFab show={!bandInView} label="صفحه‌ی جدید" onClick={() => create()} />
      {createDialog}

      <TemplatePreviewDialog
        template={previewTemplate}
        open={previewTemplate !== null}
        onClose={() => setPreviewTemplate(null)}
        onUseTemplate={(t) => create(t)}
      />

      <FormDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="حذف صفحه‌ی لینک"
        description={toDelete ? `«${toDelete.title}» با آمارش برای همیشه حذف می‌شود و نشانی آن دیگر کار نمی‌کند.` : ''}
        submitLabel="حذف"
        doneLabel="صفحه حذف شد"
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
