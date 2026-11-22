'use client';

import { useState } from 'react';
import {
  LINK_TEMPLATE_CATEGORIES,
  LINK_TEMPLATE_CATEGORY_LABELS,
  type LinkTemplate,
  type LinkTemplateCategory,
} from '@noroset/norolink/ui';
import { Alert, AlertDescription, Button, cn, Skeleton } from '@noroset/ui';
import { routes } from '@/lib/routes';
import { PageHeader } from '@/components/settings-ui';
import { BlankThumb, StartCard } from '../../product-home';
import { TemplateThumb } from '../link-thumb';
import { useCreateLink, useLinkTemplates } from '../create-link';
import { PUBLIC_FILES_BASE } from '../links-shared';
import { TemplatePreviewDialog } from './template-preview-dialog';

const faNum = (n: number) => n.toLocaleString('fa-IR');

/** گالری قالب‌های صفحه‌ی لینک: فیلتر دسته‌بندی، صفحه‌ی خالی، پیش‌نمایش در ابعاد مناسب و ساخت صفحه از قالب. */
export default function LinkTemplatesPage() {
  const { create, dialog } = useCreateLink();
  const { templates, error } = useLinkTemplates();
  const [filter, setFilter] = useState<'all' | LinkTemplateCategory>('all');
  const [previewTemplate, setPreviewTemplate] = useState<LinkTemplate | null>(null);
  const card = 'w-auto sm:w-auto';
  const all = templates ?? [];

  const visibleCategories =
    filter === 'all'
      ? LINK_TEMPLATE_CATEGORIES
      : LINK_TEMPLATE_CATEGORIES.filter((c) => c === filter);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        back={{ href: routes.link.home, label: 'صفحه‌های لینک' }}
        title="گالری قالب‌ها"
        description="با یک قالب آماده شروع کنید؛ لینک‌ها، متن‌ها و ظاهر در ویرایشگر قابل تغییرند."
      />

      {/* فیلتر دسته‌بندی */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={filter === 'all' ? 'secondary' : 'ghost'}
          size="sm"
          className={cn('rounded-full text-xs font-normal', filter === 'all' && 'font-medium')}
          onClick={() => setFilter('all')}
        >
          همه
          <span className="ms-1.5 text-xs opacity-70">({faNum(all.length)})</span>
        </Button>
        {LINK_TEMPLATE_CATEGORIES.map((cat) => {
          const count = all.filter((t) => t.category === cat).length;
          const active = filter === cat;
          return (
            <Button
              key={cat}
              variant={active ? 'secondary' : 'ghost'}
              size="sm"
              className={cn('rounded-full text-xs font-normal', active && 'font-medium')}
              onClick={() => setFilter(cat)}
            >
              {LINK_TEMPLATE_CATEGORY_LABELS[cat]}
              <span className="ms-1.5 text-xs opacity-70">({faNum(count)})</span>
            </Button>
          );
        })}
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {filter === 'all' ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-medium">شروع از صفر</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-4">
            <StartCard className={card} label="صفحه‌ی خالی" onClick={() => create()}>
              <BlankThumb />
            </StartCard>
          </div>
        </section>
      ) : null}

      {templates === null && !error ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 shadow-xs">
              <Skeleton className="aspect-[3/4] w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
            </div>
          ))}
        </div>
      ) : null}

      {templates
        ? visibleCategories.map((category) => {
            const items = templates.filter((t) => t.category === category);
            return items.length ? (
              <section key={category} className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-medium">{LINK_TEMPLATE_CATEGORY_LABELS[category]}</h2>
                  <span className="text-xs text-muted-foreground">{faNum(items.length)} قالب</span>
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-4">
                  {items.map((t) => (
                    <StartCard
                      key={t.id}
                      className={card}
                      label={t.title}
                      description={t.description}
                      onClick={() => setPreviewTemplate(t)}
                    >
                      <TemplateThumb template={t} assetBaseUrl={PUBLIC_FILES_BASE} />
                    </StartCard>
                  ))}
                </div>
              </section>
            ) : null;
          })
        : null}

      <TemplatePreviewDialog
        template={previewTemplate}
        open={previewTemplate !== null}
        onClose={() => setPreviewTemplate(null)}
        onUseTemplate={(t) => create(t)}
      />

      {dialog}
    </div>
  );
}
