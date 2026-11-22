'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { CheckIcon, ExternalLinkIcon, MessageSquareReplyIcon, Trash2Icon, XIcon } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  MotionArt,
  Segmented,
  Textarea,
} from '@noroset/ui';
import type { AdminComment, AdminCommentList, CommentStatus } from '@noroset/blog/shared';
import { api, errorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { routes } from '@/lib/routes';
import { ItemTableSkeleton } from '../../../_components/page-skeletons';
import { AdminPage, fa, Pager, query, useAdminResource } from '../../_components/admin-ui';
import { BlogTabs } from '../_components/blog-admin';

const LIMIT = 30;
const STATUS_LABEL: Record<CommentStatus, string> = { pending: 'در انتظار', approved: 'تأییدشده', rejected: 'ردشده' };

function CommentCard({ c, onChanged, onError }: { c: AdminComment; onChanged: () => Promise<void>; onError: (msg: string) => void }) {
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  async function run(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    try {
      await fn();
      await onChanged();
    } catch (err) {
      onError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  const setStatus = (status: CommentStatus) => run(status, () => api(`/blog/admin/comments/${c.id}/status`, { method: 'POST', body: { status } }));

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold">{c.authorName}</span>
            {c.fromAdmin ? <Badge variant="info">پاسخ تیم</Badge> : null}
            {c.authorEmail ? (
              <a dir="ltr" href={`mailto:${c.authorEmail}`} className="text-xs text-muted-foreground hover:text-foreground">
                {c.authorEmail}
              </a>
            ) : null}
            <span className="text-xs text-muted-foreground">{formatDateTime(c.createdAt)}</span>
            {c.parentId ? <Badge variant="outline">پاسخ</Badge> : null}
          </div>
          <Link href={routes.admin.blogPost(c.post.id)} className="max-w-full truncate text-xs text-primary hover:underline">
            {c.post.title || 'بدون عنوان'}
          </Link>
        </div>
        <p className="text-sm leading-7 whitespace-pre-line">{c.body}</p>
        <div className="flex flex-wrap gap-2">
          {c.status !== 'approved' ? (
            <Button size="sm" onClick={() => void setStatus('approved')} loading={busy === 'approved'}>
              <CheckIcon />
              تأیید
            </Button>
          ) : null}
          {c.status !== 'rejected' ? (
            <Button size="sm" variant="secondary" onClick={() => void setStatus('rejected')} loading={busy === 'rejected'}>
              <XIcon />
              رد
            </Button>
          ) : null}
          {c.post.status === 'published' ? (
            <>
              <Button size="sm" variant="secondary" onClick={() => setReplying((v) => !v)}>
                <MessageSquareReplyIcon />
                پاسخ
              </Button>
              <Button size="sm" variant="ghost" nativeButton={false} render={<a href={`${routes.blog.post(c.post.slug)}#comments`} target="_blank" rel="noreferrer" />}>
                <ExternalLinkIcon />
                مقاله
              </Button>
            </>
          ) : null}
          <Button size="sm" variant="destructive" className="ms-auto" onClick={() => void run('delete', () => api(`/blog/admin/comments/${c.id}`, { method: 'DELETE' }))} loading={busy === 'delete'}>
            <Trash2Icon />
            حذف
          </Button>
        </div>
        {replying ? (
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void run('reply', async () => {
                await api(`/blog/admin/comments/${c.id}/reply`, { method: 'POST', body: { body: reply } });
                setReply('');
                setReplying(false);
              });
            }}
          >
            <Textarea autoFocus rows={3} value={reply} maxLength={3000} onChange={(e) => setReply(e.target.value)} placeholder="پاسخ با نام «تیم نوروست»؛ نظر در انتظار هم تأیید می‌شود." />
            <Button type="submit" size="sm" className="self-end" disabled={reply.trim().length < 2} loading={busy === 'reply'}>
              ارسال پاسخ
            </Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CommentsList() {
  const params = useSearchParams();
  const router = useRouter();
  const postId = params.get('post') ?? undefined;
  const [status, setStatus] = useState<CommentStatus>('pending');
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const comments = useAdminResource<AdminCommentList>(`/blog/admin/comments${query({ status, postId, limit: LIMIT, offset })}`);
  const counts = comments.data?.counts;

  return (
    <AdminPage title="بلاگ" description="نظرهای خوانندگان؛ فقط نظر تأییدشده در سایت دیده می‌شود">
      <BlogTabs />
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          value={status}
          onChange={(v) => {
            setStatus(v);
            setOffset(0);
          }}
          items={(['pending', 'approved', 'rejected'] as const).map((s) => ({ value: s, label: counts ? `${STATUS_LABEL[s]} (${fa(counts[s])})` : STATUS_LABEL[s] }))}
          className="w-full sm:w-auto"
        />
        {postId ? (
          <Button size="sm" variant="secondary" onClick={() => router.replace(routes.admin.blogComments)}>
            <XIcon />
            همه‌ی مقاله‌ها
          </Button>
        ) : null}
      </div>
      {error || comments.error ? (
        <Alert variant="destructive">
          <AlertDescription>{error ?? comments.error}</AlertDescription>
        </Alert>
      ) : null}
      {!comments.data && !comments.error ? (
        <ItemTableSkeleton count={4} />
      ) : comments.data && comments.data.items.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia>
              <MotionArt name="no-results" className="size-28" />
            </EmptyMedia>
            <EmptyTitle>{status === 'pending' ? 'نظر در انتظاری نیست' : 'نظری نیست'}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : comments.data ? (
        <section className="flex flex-col gap-3">
          {comments.data.items.map((c) => (
            <CommentCard
              key={c.id}
              c={c}
              onChanged={async () => {
                setError(null);
                await comments.reload();
              }}
              onError={setError}
            />
          ))}
          <Pager offset={offset} limit={LIMIT} total={comments.data.total} shown={comments.data.items.length} noun="نظر" onChange={setOffset} />
        </section>
      ) : null}
    </AdminPage>
  );
}

export default function BlogCommentsPage() {
  return (
    <Suspense>
      <CommentsList />
    </Suspense>
  );
}
