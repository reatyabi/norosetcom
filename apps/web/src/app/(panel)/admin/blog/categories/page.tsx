'use client';

import { useState, type FormEvent } from 'react';
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  Field,
  FieldDescription,
  FieldLabel,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from '@noroset/ui';
import { slugify, type AdminCategory, type AdminTag } from '@noroset/blog/shared';
import { api, errorMessage } from '@/lib/api';
import { routes } from '@/lib/routes';
import { FormDialog } from '@/components/settings-ui';
import { ItemTableSkeleton } from '../../../_components/page-skeletons';
import { AdminPage, fa, useAdminResource } from '../../_components/admin-ui';
import { BlogTabs } from '../_components/blog-admin';

interface CategoryForm {
  id: string | null;
  name: string;
  slug: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  sortOrder: string;
}

const EMPTY: CategoryForm = { id: null, name: '', slug: '', description: '', seoTitle: '', seoDescription: '', sortOrder: '0' };

type Removing = { kind: 'category' | 'tag'; id: string; name: string; postCount: number };

/** دسته‌ها (با سئوی صفحه‌ی دسته) و برچسب‌های بلاگ. */
export default function BlogTermsPage() {
  const categories = useAdminResource<AdminCategory[]>('/blog/admin/categories');
  const tags = useAdminResource<AdminTag[]>('/blog/admin/tags');
  const [form, setForm] = useState<CategoryForm | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [tagForm, setTagForm] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [removing, setRemoving] = useState<Removing | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  async function saveCategory(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setError(null);
    const body = {
      name: form.name,
      slug: form.slug || undefined,
      description: form.description,
      seoTitle: form.seoTitle,
      seoDescription: form.seoDescription,
      sortOrder: Number(form.sortOrder) || 0,
    };
    try {
      await api(form.id ? `/blog/admin/categories/${form.id}` : '/blog/admin/categories', { method: form.id ? 'PATCH' : 'POST', body });
      setForm(null);
      await categories.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function saveTag(e: FormEvent) {
    e.preventDefault();
    if (!tagForm) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/blog/admin/tags/${tagForm.id}`, { method: 'PATCH', body: { name: tagForm.name, slug: tagForm.slug } });
      setTagForm(null);
      await tags.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!removing) return;
    setBusy(true);
    setPageError(null);
    try {
      await api(`/blog/admin/${removing.kind === 'category' ? 'categories' : 'tags'}/${removing.id}`, { method: 'DELETE' });
      setRemoving(null);
      await (removing.kind === 'category' ? categories : tags).reload();
    } catch (err) {
      setPageError(errorMessage(err));
      setRemoving(null);
    } finally {
      setBusy(false);
    }
  }

  const openCategory = (c?: AdminCategory) => {
    setError(null);
    setSlugTouched(Boolean(c));
    setForm(
      c
        ? { id: c.id, name: c.name, slug: c.slug, description: c.description, seoTitle: c.seoTitle, seoDescription: c.seoDescription, sortOrder: String(c.sortOrder) }
        : EMPTY,
    );
  };

  return (
    <AdminPage title="بلاگ" description="دسته‌ها و برچسب‌های مقاله‌ها">
      <BlogTabs />
      {pageError || categories.error || tags.error ? (
        <Alert variant="destructive">
          <AlertDescription>{pageError ?? categories.error ?? tags.error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">دسته‌ها</h2>
          <Button size="sm" onClick={() => openCategory()}>
            <PlusIcon />
            دسته‌ی جدید
          </Button>
        </div>
        {!categories.data ? (
          <ItemTableSkeleton count={3} />
        ) : categories.data.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">هنوز دسته‌ای ندارید.</p>
        ) : (
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>نام</TableHead>
                  <TableHead className="hidden sm:table-cell">نشانی</TableHead>
                  <TableHead>مقاله</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.data.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <span className="font-medium">{c.name}</span>
                      {c.description ? <span className="block truncate text-xs text-muted-foreground">{c.description}</span> : null}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <a dir="ltr" href={routes.blog.category(c.slug)} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-foreground">
                        /blog/category/{c.slug}
                      </a>
                    </TableCell>
                    <TableCell className="tabular-nums">{fa(c.postCount)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="icon-sm" variant="ghost" aria-label={`ویرایش ${c.name}`} onClick={() => openCategory(c)}>
                          <PencilIcon />
                        </Button>
                        <Button size="icon-sm" variant="ghost" aria-label={`حذف ${c.name}`} onClick={() => setRemoving({ kind: 'category', id: c.id, name: c.name, postCount: c.postCount })}>
                          <Trash2Icon />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col">
          <h2 className="text-base font-semibold">برچسب‌ها</h2>
          <p className="text-sm text-muted-foreground">برچسب تازه هنگام ویرایش مقاله ساخته می‌شود.</p>
        </div>
        {!tags.data ? (
          <ItemTableSkeleton count={3} />
        ) : tags.data.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">هنوز برچسبی ندارید.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.data.map((t) => (
              <span key={t.id} className="flex items-center gap-1 rounded-lg border border-border bg-card py-1 ps-3 pe-1 text-sm">
                {t.name}
                <span className="text-xs text-muted-foreground tabular-nums">({fa(t.postCount)})</span>
                <Button size="icon-xs" variant="ghost" aria-label={`ویرایش ${t.name}`} onClick={() => {
                    setError(null);
                    setTagForm({ id: t.id, name: t.name, slug: t.slug });
                  }}>
                  <PencilIcon />
                </Button>
                <Button size="icon-xs" variant="ghost" aria-label={`حذف ${t.name}`} onClick={() => setRemoving({ kind: 'tag', id: t.id, name: t.name, postCount: t.postCount })}>
                  <Trash2Icon />
                </Button>
              </span>
            ))}
          </div>
        )}
      </section>

      <FormDialog
        open={!!form}
        onOpenChange={(open) => (open ? null : setForm(null))}
        title={form?.id ? 'ویرایش دسته' : 'دسته‌ی جدید'}
        description="صفحه‌ی هر دسته در /blog/category/{نشانی} است و سئوی جدا دارد."
        onSubmit={(e) => void saveCategory(e)}
        busy={busy}
        canSubmit={Boolean(form?.name.trim())}
        error={error}
      >
        {form ? (
          <div className="flex flex-col gap-4">
            <Field>
              <FieldLabel>نام</FieldLabel>
              <Input
                autoFocus
                value={form.name}
                maxLength={120}
                onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugTouched ? form.slug : slugify(e.target.value) })}
              />
            </Field>
            <Field>
              <FieldLabel>نشانی</FieldLabel>
              <Input
                dir="ltr"
                value={form.slug}
                maxLength={120}
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm({ ...form, slug: e.target.value });
                }}
              />
            </Field>
            <Field>
              <FieldLabel>توضیح</FieldLabel>
              <Textarea rows={2} value={form.description} maxLength={500} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <FieldDescription>بالای صفحه‌ی دسته نمایش داده می‌شود.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel>عنوان سئو</FieldLabel>
              <Input value={form.seoTitle} maxLength={120} placeholder="خالی = نام دسته" onChange={(e) => setForm({ ...form, seoTitle: e.target.value })} />
            </Field>
            <Field>
              <FieldLabel>توضیح متا</FieldLabel>
              <Textarea rows={2} value={form.seoDescription} maxLength={320} placeholder="خالی = توضیح دسته" onChange={(e) => setForm({ ...form, seoDescription: e.target.value })} />
            </Field>
            <Field>
              <FieldLabel>ترتیب</FieldLabel>
              <Input type="number" dir="ltr" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} className="w-28" />
              <FieldDescription>عدد کمتر جلوتر.</FieldDescription>
            </Field>
          </div>
        ) : null}
      </FormDialog>

      <FormDialog
        open={!!tagForm}
        onOpenChange={(open) => (open ? null : setTagForm(null))}
        title="ویرایش برچسب"
        description="صفحه‌ی هر برچسب در /blog/tag/{نشانی} است."
        onSubmit={(e) => void saveTag(e)}
        busy={busy}
        canSubmit={Boolean(tagForm?.name.trim())}
        error={error}
      >
        {tagForm ? (
          <div className="flex flex-col gap-4">
            <Field>
              <FieldLabel>نام</FieldLabel>
              <Input autoFocus value={tagForm.name} maxLength={80} onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })} />
            </Field>
            <Field>
              <FieldLabel>نشانی</FieldLabel>
              <Input dir="ltr" value={tagForm.slug} maxLength={120} onChange={(e) => setTagForm({ ...tagForm, slug: e.target.value })} />
            </Field>
          </div>
        ) : null}
      </FormDialog>

      <FormDialog
        open={!!removing}
        onOpenChange={(open) => (open ? null : setRemoving(null))}
        title={removing?.kind === 'category' ? 'حذف دسته' : 'حذف برچسب'}
        description={
          removing
            ? removing.kind === 'category'
              ? `«${removing.name}» حذف می‌شود و ${fa(removing.postCount)} مقاله‌ی آن بدون دسته می‌مانند.`
              : `«${removing.name}» از ${fa(removing.postCount)} مقاله برداشته و حذف می‌شود.`
            : ''
        }
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
