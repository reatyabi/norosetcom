'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge, cn } from '@noroset/ui';
import type { AdminCommentList, PostStatus, PublishIssue } from '@noroset/blog/shared';
import { routes } from '@/lib/routes';
import { fa, useAdminResource } from '../../_components/admin-ui';

// اجزای مشترک صفحه‌های بلاگ در مدیریت پلتفرم (docs/architecture.md §9.12).

export const POST_STATUS: Record<PostStatus, { label: string; variant: 'secondary' | 'outline' }> = {
  published: { label: 'منتشرشده', variant: 'secondary' },
  draft: { label: 'پیش‌نویس', variant: 'outline' },
};

export const ISSUE_LABEL: Record<PublishIssue, string> = {
  missing_title: 'عنوان مقاله خالی است.',
  missing_slug: 'نشانی مقاله معتبر نیست.',
  empty_content: 'متن مقاله خالی است.',
};

export function PostStatusBadge({ status }: { status: PostStatus }) {
  return <Badge variant={POST_STATUS[status].variant}>{POST_STATUS[status].label}</Badge>;
}

/** زیرزبانه‌های بلاگ با شمار نظرهای در انتظار. */
export function BlogTabs() {
  const pathname = usePathname();
  const pending = useAdminResource<AdminCommentList>('/blog/admin/comments?status=pending&limit=1').data?.counts.pending ?? 0;
  const tabs = [
    { href: routes.admin.blog, label: 'مقاله‌ها', badge: 0 },
    { href: routes.admin.blogTerms, label: 'دسته‌ها و برچسب‌ها', badge: 0 },
    { href: routes.admin.blogComments, label: 'نظرها', badge: pending },
  ];
  return (
    <nav aria-label="بخش‌های بلاگ" className="flex gap-4 border-b border-border">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              '-mb-px flex items-center gap-1.5 border-b-2 px-1 pb-2 text-sm transition-colors',
              active ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
            {t.badge ? (
              <Badge variant="info" className="tabular-nums">
                {fa(t.badge)}
              </Badge>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
