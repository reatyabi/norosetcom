'use client';

import { useState, type FormEvent } from 'react';
import { MessageSquareIcon, ReplyIcon, XIcon } from 'lucide-react';
import { Alert, AlertDescription, Button, cn, Field, FieldDescription, FieldLabel, Input, Textarea } from '@noroset/ui';
import type { PublicComment } from '@noroset/blog/shared';
import { api, errorMessage } from '@/lib/api';

// نظرهای مقاله: فقط نظرهای تأییدشده؛ نظر تازه پس از تأیید مدیر نمایش داده می‌شود (docs/architecture.md §9.12).

const date = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Tehran' });
const fa = (n: number) => n.toLocaleString('fa-IR');

function CommentItem({ c, onReply, reply }: { c: PublicComment; onReply?: () => void; reply?: boolean }) {
  return (
    <div className={cn('flex gap-3', reply && 'ms-8 sm:ms-12')}>
      <span
        aria-hidden
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold',
          c.fromAdmin ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
        )}
      >
        {c.authorName.slice(0, 1)}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold">{c.authorName}</span>
          {c.fromAdmin ? <span className="rounded bg-primary/10 px-1.5 text-xs text-primary">نویسنده</span> : null}
          <time dateTime={c.createdAt} className="text-xs text-muted-foreground">
            {date.format(new Date(c.createdAt))}
          </time>
        </div>
        <p className="text-sm leading-7 whitespace-pre-line">{c.body}</p>
        {onReply ? (
          <button type="button" onClick={onReply} className="flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-primary">
            <ReplyIcon className="size-3.5" />
            پاسخ
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function Comments({ slug, comments, allowComments }: { slug: string; comments: PublicComment[]; allowComments: boolean }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [body, setBody] = useState('');
  const [website, setWebsite] = useState('');
  const [replyTo, setReplyTo] = useState<PublicComment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const roots = comments.filter((c) => !c.parentId);
  const replies = (id: string) => comments.filter((c) => c.parentId === id);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(`/blog/public/posts/${encodeURIComponent(slug)}/comments`, {
        method: 'POST',
        body: { name, email: email.trim() || null, body, parentId: replyTo?.id ?? null, website },
      });
      setBody('');
      setReplyTo(null);
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="comments" aria-labelledby="comments-title" className="flex scroll-mt-24 flex-col gap-6">
      <h2 id="comments-title" className="flex items-center gap-2 text-xl font-bold">
        <MessageSquareIcon className="size-5 text-primary" aria-hidden />
        نظرها {comments.length ? <span className="text-base font-normal text-muted-foreground">({fa(comments.length)})</span> : null}
      </h2>

      {roots.length ? (
        <ol className="flex flex-col gap-6">
          {roots.map((c) => (
            <li key={c.id} className="flex flex-col gap-4">
              <CommentItem
                c={c}
                onReply={
                  allowComments
                    ? () => {
                        setReplyTo(c);
                        setSent(false);
                        document.getElementById('comment-body')?.focus();
                      }
                    : undefined
                }
              />
              {replies(c.id).map((r) => (
                <CommentItem key={r.id} c={r} reply />
              ))}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">{allowComments ? 'هنوز نظری ثبت نشده؛ اولین نفر باشید.' : 'نظری ثبت نشده است.'}</p>
      )}

      {allowComments ? (
        <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-6">
          <h3 className="font-semibold">{replyTo ? `پاسخ به ${replyTo.authorName}` : 'نظر خود را بنویسید'}</h3>
          {replyTo ? (
            <button type="button" onClick={() => setReplyTo(null)} className="-mt-2 flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <XIcon className="size-3" />
              انصراف از پاسخ
            </button>
          ) : null}
          {sent ? (
            <Alert>
              <AlertDescription>نظر شما ثبت شد و پس از بررسی نمایش داده می‌شود. ممنون!</AlertDescription>
            </Alert>
          ) : null}
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>نام</FieldLabel>
              <Input required value={name} maxLength={80} autoComplete="name" onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>ایمیل (اختیاری)</FieldLabel>
              <Input type="email" dir="ltr" value={email} maxLength={200} autoComplete="email" onChange={(e) => setEmail(e.target.value)} />
              <FieldDescription>منتشر نمی‌شود.</FieldDescription>
            </Field>
          </div>
          <Field>
            <FieldLabel>نظر</FieldLabel>
            <Textarea id="comment-body" required rows={4} value={body} minLength={2} maxLength={3000} onChange={(e) => setBody(e.target.value)} />
          </Field>
          {/* honeypot: برای انسان پنهان */}
          <div aria-hidden className="absolute -start-[9999px] h-0 w-0 overflow-hidden">
            <label>
              وب‌سایت
              <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} name="website" />
            </label>
          </div>
          <Button type="submit" className="self-start" loading={busy} disabled={!name.trim() || body.trim().length < 2}>
            ارسال نظر
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">ثبت نظر برای این مقاله بسته است.</p>
      )}
    </section>
  );
}
