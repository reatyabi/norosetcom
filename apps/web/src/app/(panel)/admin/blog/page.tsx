'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ExternalLinkIcon, FileTextIcon, MessageSquareIcon, PencilIcon, PlusIcon, SearchIcon, StarIcon, Trash2Icon } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  DropdownMenuSeparator,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Input,
  MotionArt,
  NativeSelect,
  NativeSelectOption,
  Segmented,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@noroset/ui';
import type { AdminCategory, AdminPost, AdminPostItem, AdminPostList, PostStatus } from '@noroset/blog/shared';
import { api, errorMessage } from '@/lib/api';
import { formatShort } from '@/lib/format';
import { routes } from '@/lib/routes';
import { FormDialog } from '@/components/settings-ui';
import { ItemTableSkeleton } from '../../_components/page-skeletons';
import { ItemMenu, ItemMenuItem } from '../../product-home';
import { AdminPage, fa, Pager, query, useAdminResource, useDebounced } from '../_components/admin-ui';
import { BlogTabs, PostStatusBadge } from './_components/blog-admin';

const LIMIT = 30;
type StatusFilter = 'all' | PostStatus;

/** مقاله‌های بلاگ: فهرست، جست‌وجو، فیلتر وضعیت و دسته، ساخت و حذف. */
export default function AdminBlogPage() {
  const router = useRouter();
  const [status, setStatus] = useState<StatusFilter>('all');
  const [categoryId, setCategoryId] = useState('');
  const [text, setText] = useState('');
  const [offset, setOffset] = useState(0);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<AdminPostItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const q = useDebounced(text.trim());

  const posts = useAdminResource<AdminPostList>(
    `/blog/admin/posts${query({ q, status: status === 'all' ? undefined : status, categoryId: categoryId || undefined, limit: LIMIT, offset })}`,
  );
  const categories = useAdminResource<AdminCategory[]>('/blog/admin/categories').data ?? [];
  const counts = posts.data?.counts;
  const filtered = Boolean(q) || status !== 'all' || Boolean(categoryId);

  async function create() {
    setCreating(true);
    setError(null);
    try {
      const post = await api<AdminPost>('/blog/admin/posts', { method: 'POST', body: {} });
      router.push(routes.admin.blogPost(post.id));
    } catch (err) {
      setError(errorMessage(err));
      setCreating(false);
    }
  }

  async function remove() {
    if (!toDelete) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/blog/admin/posts/${toDelete.id}`, { method: 'DELETE' });
      setToDelete(null);
      await posts.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const statusItems: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: counts ? `همه (${fa(counts.all)})` : 'همه' },
    { value: 'published', label: counts ? `منتشرشده (${fa(counts.published)})` : 'منتشرشده' },
    { value: 'draft', label: counts ? `پیش‌نویس (${fa(counts.draft)})` : 'پیش‌نویس' },
  ];

  return (
    <AdminPage
      title="بلاگ"
      description="مقاله‌های noroset.com/blog: نوشتن، سئو، انتشار و نظرها"
      action={
        <Button onClick={() => void create()} loading={creating}>
          <PlusIcon />
          مقاله‌ی جدید
        </Button>
      }
    >
      <BlogTabs />

      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          value={status}
          onChange={(v) => {
            setStatus(v);
            setOffset(0);
          }}
          items={statusItems}
          className="w-full sm:w-auto"
        />
        <NativeSelect
          size="sm"
          aria-label="دسته"
          className="w-full sm:w-44"
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setOffset(0);
          }}
        >
          <NativeSelectOption value="">همه‌ی دسته‌ها</NativeSelectOption>
          {categories.map((c) => (
            <NativeSelectOption key={c.id} value={c.id}>
              {c.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <div className="relative w-full sm:w-72">
          <SearchIcon className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="جست‌وجوی مقاله"
            placeholder="عنوان یا متن مقاله"
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

      {error || posts.error ? (
        <Alert variant="destructive">
          <AlertDescription>{error ?? posts.error}</AlertDescription>
        </Alert>
      ) : null}

      {!posts.data && !posts.error ? (
        <ItemTableSkeleton count={6} />
      ) : posts.data && posts.data.items.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia>
              <MotionArt name={filtered ? 'no-results' : 'empty-forms'} className="size-28" />
            </EmptyMedia>
            <EmptyTitle>{filtered ? 'مقاله‌ای پیدا نشد' : 'هنوز مقاله‌ای ننوشته‌اید'}</EmptyTitle>
            {filtered ? null : <EmptyDescription>اولین مقاله را بنویسید؛ تا انتشار فقط در همین‌جا دیده می‌شود.</EmptyDescription>}
          </EmptyHeader>
          {filtered ? null : (
            <Button onClick={() => void create()} loading={creating}>
              <PlusIcon />
              مقاله‌ی جدید
            </Button>
          )}
        </Empty>
      ) : posts.data ? (
        <section className="flex flex-col gap-2">
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>مقاله</TableHead>
                  <TableHead className="hidden md:table-cell">دسته</TableHead>
                  <TableHead>وضعیت</TableHead>
                  <TableHead className="hidden sm:table-cell">نظرها</TableHead>
                  <TableHead className="hidden lg:table-cell">آخرین ویرایش</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.data.items.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="max-w-0 w-full">
                      <Link href={routes.admin.blogPost(p.id)} className="flex items-center gap-3">
                        {p.cover ? (
                          // eslint-disable-next-line @next/next/no-img-element -- فایل پلتفرم norofile
                          <img src={p.cover.url} alt="" className="hidden size-11 shrink-0 rounded-md object-cover sm:block" />
                        ) : (
                          <span className="hidden size-11 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground sm:flex">
                            <FileTextIcon className="size-5" />
                          </span>
                        )}
                        <span className="flex min-w-0 flex-col">
                          <span className="flex items-center gap-1.5 truncate font-medium">
                            {p.featured ? <StarIcon aria-label="ویژه" className="size-3.5 shrink-0 fill-warning text-warning" /> : null}
                            <span className="truncate">{p.title || 'بدون عنوان'}</span>
                          </span>
                          <span dir="ltr" className="truncate text-start text-xs text-muted-foreground">
                            /blog/{p.slug}
                          </span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">{p.category?.name ?? '—'}</TableCell>
                    <TableCell>
                      <PostStatusBadge status={p.status} />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Link href={`${routes.admin.blogComments}?post=${p.id}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                        <MessageSquareIcon className="size-3.5" />
                        <span className="tabular-nums">{fa(p.commentCount)}</span>
                        {p.pendingComments ? <Badge variant="info">{fa(p.pendingComments)} در انتظار</Badge> : null}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                      {formatShort(p.updatedAt)}
                      {p.updatedByName ? ` · ${p.updatedByName}` : ''}
                    </TableCell>
                    <TableCell>
                      <ItemMenu label={p.title || 'مقاله'}>
                        <ItemMenuItem render={<a href={routes.admin.blogPost(p.id)} />}>
                          <PencilIcon />
                          ویرایش
                        </ItemMenuItem>
                        {p.status === 'published' ? (
                          <ItemMenuItem render={<a href={routes.blog.post(p.slug)} target="_blank" rel="noreferrer" />}>
                            <ExternalLinkIcon />
                            مشاهده در سایت
                          </ItemMenuItem>
                        ) : null}
                        <DropdownMenuSeparator />
                        <ItemMenuItem variant="destructive" onClick={() => setToDelete(p)}>
                          <Trash2Icon />
                          حذف
                        </ItemMenuItem>
                      </ItemMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <Pager offset={offset} limit={LIMIT} total={posts.data.total} shown={posts.data.items.length} noun="مقاله" onChange={setOffset} />
        </section>
      ) : null}

      <FormDialog
        open={!!toDelete}
        onOpenChange={(open) => (open ? null : setToDelete(null))}
        title="حذف مقاله"
        description={`«${toDelete?.title || 'بدون عنوان'}» با همه‌ی نظرهایش برای همیشه حذف می‌شود و نشانی آن ۴۰۴ می‌شود.`}
        onSubmit={(e) => {
          e.preventDefault();
          void remove();
        }}
        submitLabel="حذف"
        submitVariant="destructive"
        doneLabel="حذف شد"
        busy={busy}
        error={null}
      >
        {null}
      </FormDialog>
    </AdminPage>
  );
}
