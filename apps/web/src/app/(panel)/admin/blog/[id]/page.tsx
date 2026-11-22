'use client';

import '@/components/blog-prose.css';
import './editor.css';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { EyeIcon, ExternalLinkIcon, SendIcon, Trash2Icon, Undo2Icon } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  Field,
  FieldDescription,
  FieldLabel,
  ImagePickerField,
  Input,
  NativeSelect,
  NativeSelectOption,
  Skeleton,
  Switch,
  Textarea,
} from '@noroset/ui';
import {
  BlogContent,
  readingStats,
  slugify,
  type AdminCategory,
  type AdminPost,
  type AdminTag,
  type BlogDoc,
  type PostSeo,
  type PublishIssue,
  type StoredImage,
} from '@noroset/blog/ui';
import { api, ApiError, errorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { blogImageSource } from '@/lib/file-sources';
import { routes } from '@/lib/routes';
import { FormDialog } from '@/components/settings-ui';
import { AdminPage, fa, useAdminResource } from '../../_components/admin-ui';
import { ISSUE_LABEL, PostStatusBadge } from '../_components/blog-admin';
import { RichEditor } from './_components/rich-editor';
import { SeoPanel } from './_components/seo-panel';
import { TagsInput } from './_components/tags-input';

// ادیتور مقاله (docs/architecture.md §9.12). ذخیره صریح (دکمه یا Ctrl+S)؛ ویرایش مقاله‌ی منتشرشده با «به‌روزرسانی»
// همان لحظه در سایت دیده می‌شود. تحلیل سئو هنگام نوشتن در مرورگر اجرا می‌شود.

const COVER_OPTIONS = { accept: ['image' as const], maxBytes: 5 * 1024 * 1024, requirePublic: true, image: { shape: 'rect' as const, maxSize: 2000, quality: 0.85 } };

interface Draft {
  title: string;
  slug: string;
  excerpt: string;
  content: BlogDoc;
  cover: (StoredImage & { url: string; alt: string }) | null;
  categoryId: string | null;
  tags: string[];
  featured: boolean;
  allowComments: boolean;
  seo: PostSeo;
  ogImageUrl: string | null;
}

function draftOf(p: AdminPost): Draft {
  return {
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    content: p.content,
    cover: p.cover,
    categoryId: p.categoryId,
    tags: p.tags.map((t) => t.name),
    featured: p.featured,
    allowComments: p.allowComments,
    seo: p.seo,
    ogImageUrl: p.ogImageUrl,
  };
}

/** نشانی هنوز خودکار است اگر مقاله منتشر نشده و نشانی از عنوان (یا تصادفی) ساخته شده باشد. */
const autoSlug = (p: AdminPost) => !p.publishedAt && (/^post-[0-9a-f]{6}$/.test(p.slug) || (!!p.title && p.slug.startsWith(slugify(p.title))));

const payload = (d: Draft) => ({
  title: d.title,
  slug: d.slug,
  excerpt: d.excerpt,
  content: d.content,
  cover: d.cover ? { fileId: d.cover.file_id, alt: d.cover.alt, width: d.cover.width, height: d.cover.height } : null,
  categoryId: d.categoryId,
  tags: d.tags,
  featured: d.featured,
  allowComments: d.allowComments,
  seo: d.seo,
});

export default function BlogPostEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<AdminPost | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [baseline, setBaseline] = useState('');
  const [slugIsAuto, setSlugIsAuto] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<PublishIssue[]>([]);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [preview, setPreview] = useState(false);
  const [confirm, setConfirm] = useState<'delete' | 'unpublish' | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  const categories = useAdminResource<AdminCategory[]>('/blog/admin/categories').data ?? [];
  const tagSuggestions = (useAdminResource<AdminTag[]>('/blog/admin/tags').data ?? []).map((t) => t.name);

  const apply = useCallback((p: AdminPost) => {
    const d = draftOf(p);
    setPost(p);
    setDraft(d);
    setBaseline(JSON.stringify(payload(d)));
    setSlugIsAuto(autoSlug(p));
  }, []);

  useEffect(() => {
    let current = true;
    api<AdminPost>(`/blog/admin/posts/${id}`).then(
      (p) => current && apply(p),
      (err: unknown) => current && setLoadError(errorMessage(err)),
    );
    return () => {
      current = false;
    };
  }, [id, apply]);

  const dirty = draft ? JSON.stringify(payload(draft)) !== baseline : false;
  const stats = useMemo(() => (draft ? readingStats(draft.content) : { wordCount: 0, readingMinutes: 0 }), [draft]);

  const update = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  const save = useCallback(async (): Promise<AdminPost | null> => {
    if (!draft) return null;
    setSaving(true);
    setError(null);
    try {
      const p = await api<AdminPost>(`/blog/admin/posts/${id}`, { method: 'PATCH', body: payload(draft) });
      // محتوای ادیتور دست نمی‌خورد (نشانگر می‌ماند)؛ فقط مبنای «ذخیره‌نشده» عوض می‌شود
      setPost(p);
      setDraft((d) => (d ? { ...draftOf(p), content: d.content } : d));
      setBaseline(JSON.stringify(payload({ ...draftOf(p), content: draft.content })));
      setSlugIsAuto(autoSlug(p));
      return p;
    } catch (err) {
      setError(errorMessage(err));
      return null;
    } finally {
      setSaving(false);
    }
  }, [draft, id]);

  async function publish() {
    setIssues([]);
    if (dirty && !(await save())) return;
    setPublishing(true);
    setError(null);
    try {
      apply(await api<AdminPost>(`/blog/admin/posts/${id}/publish`, { method: 'POST' }));
    } catch (err) {
      const body = err instanceof ApiError ? (err.body as { issues?: PublishIssue[] } | null) : null;
      if (body?.issues?.length) setIssues(body.issues);
      else setError(errorMessage(err));
    } finally {
      setPublishing(false);
    }
  }

  async function confirmAction() {
    setConfirmBusy(true);
    try {
      if (confirm === 'delete') {
        await api(`/blog/admin/posts/${id}`, { method: 'DELETE' });
        setBaseline(JSON.stringify(payload(draft!)));
        router.push(routes.admin.blog);
      } else {
        apply(await api<AdminPost>(`/blog/admin/posts/${id}/unpublish`, { method: 'POST' }));
        setEditorKey((k) => k + 1);
      }
      setConfirm(null);
    } catch (err) {
      setError(errorMessage(err));
      setConfirm(null);
    } finally {
      setConfirmBusy(false);
    }
  }

  // Ctrl+S
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (dirty && !saving) void save();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dirty, saving, save]);

  // ترک صفحه با تغییر ذخیره‌نشده
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  if (loadError) {
    return (
      <AdminPage title="مقاله" back={{ href: routes.admin.blog, label: 'بلاگ' }}>
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      </AdminPage>
    );
  }

  if (!post || !draft) {
    return (
      <AdminPage title="مقاله" back={{ href: routes.admin.blog, label: 'بلاگ' }}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Skeleton className="h-[32rem] rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </AdminPage>
    );
  }

  const published = post.status === 'published';
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const publicUrl = `${origin}${routes.blog.post(post.slug)}`;
  const statusLine = saving ? 'در حال ذخیره…' : dirty ? 'تغییرات ذخیره نشده' : `ذخیره‌شده ${formatDateTime(post.updatedAt)}`;

  return (
    <AdminPage
      title={draft.title || 'مقاله‌ی بی‌عنوان'}
      back={{ href: routes.admin.blog, label: 'بلاگ' }}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground" aria-live="polite">
            {statusLine}
          </span>
          <Button variant="secondary" onClick={() => setPreview(true)}>
            <EyeIcon />
            پیش‌نمایش
          </Button>
          <Button variant="secondary" onClick={() => void save()} loading={saving} disabled={!dirty}>
            {published ? 'به‌روزرسانی' : 'ذخیره‌ی پیش‌نویس'}
          </Button>
          {published ? null : (
            <Button onClick={() => void publish()} loading={publishing}>
              <SendIcon />
              انتشار
            </Button>
          )}
        </div>
      }
    >
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {issues.length ? (
        <Alert variant="destructive">
          <AlertDescription>
            مقاله هنوز قابل انتشار نیست:
            <ul className="mt-1 list-disc ps-5">
              {issues.map((i) => (
                <li key={i}>{ISSUE_LABEL[i]}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card className="gap-0 overflow-visible py-0">
            <textarea
              value={draft.title}
              rows={1}
              maxLength={200}
              placeholder="عنوان مقاله"
              aria-label="عنوان مقاله"
              onChange={(e) => {
                const title = e.target.value.replace(/\n/g, ' ');
                update(slugIsAuto ? { title, slug: slugify(title) || draft.slug } : { title });
              }}
              className="field-sizing-content w-full resize-none bg-transparent px-4 pt-6 pb-3 text-2xl leading-relaxed font-bold outline-none placeholder:text-muted-foreground/60 sm:px-8 sm:text-3xl"
            />
            <RichEditor key={editorKey} initial={draft.content} assetBaseUrl={post.assetBaseUrl} onChange={(content) => update({ content })} />
            <div className="flex justify-between gap-3 border-t border-border px-4 py-2 text-xs text-muted-foreground sm:px-8">
              <span>
                {fa(stats.wordCount)} کلمه · حدود {fa(stats.readingMinutes)} دقیقه مطالعه
              </span>
              <span className="hidden sm:inline">Ctrl+S ذخیره · Ctrl+K لینک</span>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>سئو</CardTitle>
            </CardHeader>
            <CardContent>
              <SeoPanel
                title={draft.title}
                slug={draft.slug}
                excerpt={draft.excerpt}
                doc={draft.content}
                coverUrl={draft.cover?.url ?? null}
                seo={draft.seo}
                ogImageUrl={draft.ogImageUrl}
                siteOrigin={origin}
                onChange={(patch, ogImageUrl) => update({ seo: { ...draft.seo, ...patch }, ...(ogImageUrl !== undefined ? { ogImageUrl } : {}) })}
              />
            </CardContent>
          </Card>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                انتشار
                <PostStatusBadge status={post.status} />
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {post.publishedAt ? <p className="text-xs text-muted-foreground">{published ? 'منتشرشده' : 'آخرین انتشار'}: {formatDateTime(post.publishedAt)}</p> : null}
              <Field>
                <FieldLabel>نشانی</FieldLabel>
                <div className="flex items-center rounded-lg border border-input bg-background focus-within:border-primary" dir="ltr">
                  <span className="ps-2 text-xs text-muted-foreground">/blog/</span>
                  <input
                    value={draft.slug}
                    maxLength={120}
                    aria-label="نشانی مقاله"
                    onChange={(e) => {
                      setSlugIsAuto(false);
                      update({ slug: e.target.value.toLowerCase().replace(/\s+/g, '-') });
                    }}
                    onBlur={() => update({ slug: slugify(draft.slug) || draft.slug })}
                    className="h-8 min-w-0 flex-1 bg-transparent px-1 text-sm outline-none"
                  />
                </div>
                <FieldDescription>
                  {published ? 'با تغییر نشانی، نشانی قبلی با ریدایرکت دائمی به نشانی تازه می‌رود.' : 'فارسی یا انگلیسی؛ تا انتشار از عنوان ساخته می‌شود.'}
                  {post.previousSlugs.length ? ` نشانی‌های قبلی: ${post.previousSlugs.join('، ')}` : ''}
                </FieldDescription>
              </Field>
              <label className="flex items-center justify-between gap-3 text-sm">
                مقاله‌ی ویژه (بالای بلاگ)
                <Switch checked={draft.featured} onCheckedChange={(featured) => update({ featured })} />
              </label>
              <label className="flex items-center justify-between gap-3 text-sm">
                نظرها باز باشد
                <Switch checked={draft.allowComments} onCheckedChange={(allowComments) => update({ allowComments })} />
              </label>
              <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                {published ? (
                  <>
                    <Button variant="secondary" size="sm" nativeButton={false} render={<a href={publicUrl} target="_blank" rel="noreferrer" />}>
                      <ExternalLinkIcon />
                      مشاهده
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setConfirm('unpublish')}>
                      <Undo2Icon />
                      لغو انتشار
                    </Button>
                  </>
                ) : null}
                <Button variant="destructive" size="sm" onClick={() => setConfirm('delete')}>
                  <Trash2Icon />
                  حذف
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>دسته و برچسب</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Field>
                <FieldLabel>دسته</FieldLabel>
                <NativeSelect value={draft.categoryId ?? ''} onChange={(e) => update({ categoryId: e.target.value || null })}>
                  <NativeSelectOption value="">بدون دسته</NativeSelectOption>
                  {categories.map((c) => (
                    <NativeSelectOption key={c.id} value={c.id}>
                      {c.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldDescription>
                  <Link href={routes.admin.blogTerms} className="text-primary hover:underline">
                    مدیریت دسته‌ها
                  </Link>
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel>برچسب‌ها</FieldLabel>
                <TagsInput value={draft.tags} onChange={(tags) => update({ tags })} suggestions={tagSuggestions} />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>تصویر شاخص</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <ImagePickerField
                previewUrl={draft.cover?.url ?? null}
                source={blogImageSource()}
                options={COVER_OPTIONS}
                title="تصویر شاخص"
                errorMessage={errorMessage}
                onPick={(f) => update({ cover: { file_id: f.id, width: f.width, height: f.height, url: f.url ?? '', alt: draft.cover?.alt || draft.title } })}
                onRemove={draft.cover ? () => update({ cover: null }) : undefined}
              />
              {draft.cover ? (
                <Field>
                  <FieldLabel>متن جایگزین (alt)</FieldLabel>
                  <Input value={draft.cover.alt} maxLength={300} onChange={(e) => update({ cover: { ...draft.cover!, alt: e.target.value } })} />
                </Field>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>خلاصه</CardTitle>
            </CardHeader>
            <CardContent>
              <Field>
                <Textarea rows={4} value={draft.excerpt} maxLength={500} onChange={(e) => update({ excerpt: e.target.value })} aria-label="خلاصه" />
                <FieldDescription>
                  در کارت مقاله و (اگر توضیح متا خالی باشد) در نتایج گوگل می‌آید. {fa(draft.excerpt.length)}/۵۰۰
                </FieldDescription>
              </Field>
            </CardContent>
          </Card>
        </aside>
      </div>

      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogPopup dir="rtl" className="sm:max-w-3xl">
          <DialogTitle className="sr-only">پیش‌نمایش مقاله</DialogTitle>
          <DialogPanel className="pt-10">
            <article className="mx-auto flex max-w-2xl flex-col gap-6">
              <h1 className="text-3xl leading-snug font-bold">{draft.title || 'بدون عنوان'}</h1>
              {draft.excerpt ? <p className="text-lg text-muted-foreground">{draft.excerpt}</p> : null}
              {draft.cover ? (
                // eslint-disable-next-line @next/next/no-img-element -- فایل پلتفرم norofile
                <img src={draft.cover.url} alt={draft.cover.alt} className="w-full rounded-xl" />
              ) : null}
              <BlogContent doc={draft.content} assetBaseUrl={post.assetBaseUrl} />
            </article>
          </DialogPanel>
        </DialogPopup>
      </Dialog>

      <FormDialog
        open={confirm !== null}
        onOpenChange={(open) => (open ? null : setConfirm(null))}
        title={confirm === 'delete' ? 'حذف مقاله' : 'لغو انتشار'}
        description={
          confirm === 'delete'
            ? 'مقاله با همه‌ی نظرهایش برای همیشه حذف می‌شود و نشانی آن ۴۰۴ می‌شود.'
            : 'مقاله از سایت برداشته می‌شود و به پیش‌نویس برمی‌گردد؛ نظرها و نشانی می‌مانند.'
        }
        onSubmit={(e) => {
          e.preventDefault();
          void confirmAction();
        }}
        submitLabel={confirm === 'delete' ? 'حذف' : 'لغو انتشار'}
        submitVariant="destructive"
        busy={confirmBusy}
        error={null}
      >
        {null}
      </FormDialog>
    </AdminPage>
  );
}
