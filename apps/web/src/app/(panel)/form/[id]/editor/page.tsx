'use client';

import { use, useEffect, useRef, useState } from 'react';
import { EyeIcon, PaletteIcon, PlusIcon } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Button,
  cn,
  ScrollArea,
  Sheet,
  SheetContent,
  SheetTitle,
  useMediaQuery,
  TooltipProvider,
} from '@noroset/ui';
import { api, ApiError, errorMessage } from '@/lib/api';
import { publicFormUrl, routes } from '@/lib/routes';
import { useTenant } from '../../../session';
import { canManage } from '../../../session';
import { type FormSummary } from '../../forms-shared';
import { type EditorField, type EditorPage, type ElementDef, copyField, fa, makeField, newId } from './_components/types';
import { readEditorDocument, writeEditorDocument } from './_components/editor-document';
import { hoverScroll } from '@/components/editor-ui';
import { ElementsPanel } from './_components/elements-panel';
import { FieldCard, FormCanvas, SkeletonFieldCard } from './_components/canvas';
import { ConfirmDialog } from './_components/confirm-dialog';
import { EditorHeader } from './_components/editor-header';
import { PublishIssues } from './_components/publish-issues';
import { issueTarget, moveField, renamePage } from './_components/editor-ops';
import { SettingsDrawer } from './_components/settings-drawer';
import { ThemePanel } from './_components/theme-panel';
import { ElementPreview, FormPreview } from './_components/dialogs';
import { PublishDialog, type PublishSettings } from './_components/publish-dialog';
import { HeaderEditor } from './_components/header-editor';
import { EditorBackground } from './_components/editor-background';
import {
  formDefaultsSchema,
  formLayoutSchema,
  type FormDefaults,
  type FormLayout,
  type FormZones,
  type HeaderDefaults,
  type TopBarDefaults,
  type SidebarDefaults,
  type BottomBarDefaults,
  type FooterDefaults,
} from '@noroset/field-engine';
import { DEFAULT_FORM_THEME } from '@noroset/noroform/ui';
import type { FormTheme } from '@noroset/field-engine';
import type { DefinitionIssue } from '@noroset/field-engine';

type FormEditorDetail = FormSummary & { draftDefinition: unknown; issues: DefinitionIssue[] };
type SaveState = 'saved' | 'dirty' | 'saving' | 'error';

const makePage = (title: string): EditorPage => ({
  id: newId('page'),
  title,
  kind: 'main',
  fields: [],
  source: {},
});

const initialPages = (): EditorPage[] => [makePage('صفحه ۱')];

/** اسکرول نرم، مگر کاربر در سیستم «کاهش حرکت» را روشن کرده باشد. */
const scrollBehavior = (): ScrollBehavior =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

export default function FormEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const tenant = useTenant();
  const [form, setForm] = useState<FormSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [pages, setPages] = useState<EditorPage[]>(initialPages);
  const [pageId, setPageId] = useState(() => pages[0]!.id);
  const [source, setSource] = useState<Record<string, unknown>>({});
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [elementsOpen, setElementsOpen] = useState(false);
  const isCompact = useMediaQuery('max-lg');
  const [preview, setPreview] = useState(false);
  const [elementPreview, setElementPreview] = useState<ElementDef | null>(null);
  const [theme, setTheme] = useState<FormTheme>(DEFAULT_FORM_THEME);
  const [themeDirty, setThemeDirty] = useState(false);
  const [layout, setLayout] = useState<FormLayout>(() => formLayoutSchema.parse({}));
  const [defaults, setDefaults] = useState<FormDefaults>(() => formDefaultsSchema.parse({}));
  const [publishing, setPublishing] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishIssues, setPublishIssues] = useState<DefinitionIssue[] | null>(null);
  const [copiedPublicUrl, setCopiedPublicUrl] = useState(false);
  // تأیید حذف برگشت‌ناپذیر: صفحه یا المان
  const [pendingDelete, setPendingDelete] = useState<{ kind: 'page' | 'field'; id: string; name: string } | null>(null);

  const [titleDraft, setTitleDraft] = useState('');
  const [titleState, setTitleState] = useState<'idle' | 'saving' | 'error'>('idle');
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveRetry, setSaveRetry] = useState(0);
  const savedSnapshot = useRef('');
  const saveSequence = useRef(0);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const editorKey = `${id}:${tenant.tenantId}`;

  const internalUrlValue = form && form.status === 'published' && form.channel === 'internal'
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}${routes.form.internal(form.id)}`
    : null;
  const publicFormUrlValue = form && form.status === 'published' && form.channel === 'external'
    ? publicFormUrl(
        typeof window !== 'undefined' && window.location.hostname.endsWith('localhost') ? 'n8f.localhost' : 'n8f.ir',
        form.slug,
        typeof window !== 'undefined' ? window.location.port || undefined : undefined,
      )
    : null;

  const publishedUrlValue = internalUrlValue ?? publicFormUrlValue;

  useEffect(() => {
    let active = true;
    saveSequence.current += 1;
    api<FormEditorDetail>(`/noroform/forms/${id}`, { tenantId: tenant.tenantId })
      .then((f) => {
        if (!active) return;
        let document: ReturnType<typeof readEditorDocument>;
        try {
          document = readEditorDocument(f.draftDefinition);
        } catch (err) {
          if (active) setError(err instanceof Error ? err.message : 'ساختار پیش‌نویس قابل ویرایش نیست.');
          return;
        }
        const firstPage = document.pages[0]!;
        savedSnapshot.current = JSON.stringify(f.draftDefinition);
        setForm(f);
        setTitleDraft(f.title);
        setSource(document.source);
        setPages(document.pages);
        setPageId(firstPage.id);
        setTheme(document.theme);
        setLayout(document.layout);
        const loadedHeader = document.defaults.header;
        setDefaults({
          ...document.defaults,
          header: {
            ...loadedHeader,
            brand_title: loadedHeader.brand_title?.trim() ? loadedHeader.brand_title : tenant.name,
            brand_subtitle: loadedHeader.brand_subtitle?.trim() ? loadedHeader.brand_subtitle : tenant.name,
          },
        });
        setThemeDirty(false);
        setSaveState('saved');
        setSaveError(null);
        setLoadedKey(editorKey);
      })
      .catch((err: unknown) => {
        if (active) setError(errorMessage(err));
      });
    return () => {
      active = false;
    };
  }, [editorKey, id, tenant.name, tenant.tenantId]);

  const documentLoaded = loadedKey === editorKey;
  useEffect(() => {
    if (!documentLoaded) return;
    const draftDefinition = writeEditorDocument(
      source,
      pages,
      theme,
      themeDirty,
      layout,
      defaults,
    );
    const snapshot = JSON.stringify(draftDefinition);
    if (snapshot === savedSnapshot.current) return;

    setSaveState('dirty');
    setSaveError(null);
    const sequence = ++saveSequence.current;
    const timer = window.setTimeout(() => {
      setSaveState('saving');
      saveQueue.current = saveQueue.current
        .catch(() => undefined)
        .then(async () => {
          await api<FormEditorDetail>(`/noroform/forms/${id}`, {
            tenantId: tenant.tenantId,
            method: 'PATCH',
            body: { draftDefinition },
          });
          if (saveSequence.current === sequence) {
            savedSnapshot.current = snapshot;
            setSource(draftDefinition);
            setThemeDirty(false);
            setSaveState('saved');
            setSaveError(null);
          }
        })
        .catch((err: unknown) => {
          if (saveSequence.current === sequence) {
            setSaveState('error');
            setSaveError(errorMessage(err));
          }
        });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [documentLoaded, id, layout, defaults, pages, saveRetry, source, tenant.tenantId, theme, themeDirty]);

  const updateLayout = (patch: Partial<FormLayout>) => {
    setLayout((prev) => ({ ...prev, ...patch }));
  };

  const updateZones = (patch: Partial<FormZones>) => {
    setLayout((prev) => ({ ...prev, zones: { ...prev.zones, ...patch } }));
  };

  const updateDefaults = (patch: Partial<FormDefaults>) => {
    setDefaults((prev) => ({ ...prev, ...patch }));
  };

  const updateTopBarDefaults = (patch: Partial<TopBarDefaults>) => {
    setDefaults((prev) => ({ ...prev, top_bar: { ...prev.top_bar, ...patch } }));
  };

  const updateSidebarDefaults = (patch: Partial<SidebarDefaults>) => {
    setDefaults((prev) => ({ ...prev, sidebar: { ...prev.sidebar, ...patch } }));
  };

  const updateBottomBarDefaults = (patch: Partial<BottomBarDefaults>) => {
    setDefaults((prev) => ({ ...prev, bottom_bar: { ...prev.bottom_bar, ...patch } }));
  };

  const updateFooterDefaults = (patch: Partial<FooterDefaults>) => {
    setDefaults((prev) => ({ ...prev, footer: { ...prev.footer, ...patch } }));
  };

  const saveTitle = () => {
    if (!form) return;
    const next = titleDraft.trim();
    if (!next || next === form.title) {
      setTitleDraft(form.title);
      return;
    }
    setTitleState('saving');
    api<FormSummary>(`/noroform/forms/${id}`, {
      tenantId: tenant.tenantId,
      method: 'PATCH',
      body: { title: next },
    })
      .then((f) => {
        setForm((prev) => (prev ? { ...prev, title: f.title } : prev));
        setTitleDraft(f.title);
        setTitleState('idle');
      })
      .catch(() => {
        setTitleDraft(form.title);
        setTitleState('error');
      });
  };

  const publish = async (settings?: PublishSettings): Promise<boolean> => {
    if (!form || publishing || saveState !== 'saved' || titleState === 'saving' || !canManage(tenant.role)) return false;
    setPublishing(true);
    setPublishError(null);
    setPublishIssues(null);
    try {
      if (settings) {
        const saved = await api<FormEditorDetail>(`/noroform/forms/${id}`, {
          method: 'PATCH',
          tenantId: tenant.tenantId,
          body: settings,
        });
        setForm(saved);
      }
      const updated = await api<FormEditorDetail>(`/noroform/forms/${id}/publish`, {
        method: 'POST',
        tenantId: tenant.tenantId,
      });
      setForm(updated);
      setPublishIssues(updated.issues.length ? updated.issues : null);
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.code === 'invalid_definition') {
        const body = err.body as { issues?: DefinitionIssue[] } | null;
        if (Array.isArray(body?.issues) && body.issues.length) setPublishIssues(body.issues);
        else setPublishError('فرم هنوز کامل نیست و قابل انتشار نیست.');
      } else {
        setPublishError(errorMessage(err));
      }
      return false;
    } finally {
      setPublishing(false);
    }
  };

  const copyPublicUrl = async () => {
    if (!form || !publishedUrlValue) return;
    try {
      await navigator.clipboard.writeText(publishedUrlValue);
      setCopiedPublicUrl(true);
      window.setTimeout(() => setCopiedPublicUrl(false), 2000);
    } catch {
      setPublishError('کپی نشانی ممکن نشد؛ نشانی را دستی کپی کنید.');
    }
  };

  const changeTheme = (next: FormTheme) => {
    setTheme(next);
    setThemeDirty(true);
  };

  const updateHeaderDefaults = (patch: Partial<HeaderDefaults>) =>
    setDefaults((prev) => ({ ...prev, header: { ...prev.header, ...patch } }));

  const saveLabel = {
    saved: 'پیش‌نویس ذخیره شد',
    dirty: 'تغییرها ذخیره نشده‌اند',
    saving: 'در حال ذخیره‌ی پیش‌نویس…',
    error: 'ذخیره‌ی پیش‌نویس ناموفق بود',
  }[saveState];

  // دلیل غیرفعال‌بودن «انتشار» تا کاربر بداند منتظر چه چیزی باشد (دکمه‌ی بی‌دلیل غیرفعال ممنوع).
  const loading = !form || !documentLoaded;
  const publishBlockedReason = loading
    ? 'در حال بارگذاری فرم…'
    : publishing
      ? 'در حال انتشار…'
      : saveState === 'saving'
        ? 'در حال ذخیره‌ی پیش‌نویس…'
        : saveState === 'dirty'
          ? 'تا ذخیره‌ی خودکار پیش‌نویس صبر کنید.'
          : saveState === 'error'
            ? 'ذخیره‌ی پیش‌نویس ناموفق بود؛ ابتدا «تلاش دوباره» را بزنید.'
            : titleState === 'saving'
              ? 'در حال ذخیره‌ی عنوان…'
              : null;

  const pageIndex = Math.max(0, pages.findIndex((p) => p.id === pageId));
  const page = pages[pageIndex]!;
  const activeField = page.fields.find((f) => f.id === activeId) ?? null;
  // §8.4: شرط فقط به فیلد صفحه‌های قبلی یا همین صفحه پیش از المان اشاره می‌کند.
  const previousFields = activeField
    ? [...pages.slice(0, pageIndex).flatMap((p) => p.fields), ...page.fields.slice(0, page.fields.indexOf(activeField))]
    : [];

  const updateFields = (fn: (fields: EditorField[]) => EditorField[]) =>
    setPages((ps) => ps.map((p) => (p.id === page.id ? { ...p, fields: fn(p.fields) } : p)));

  // دیالوگ پیشرفته پایین بوم باز می‌شود؛ کارت المان در حال ویرایش بالای آن نگه داشته می‌شود
  // (scroll-margin کارت جای دیالوگ را کنار می‌گذارد).
  useEffect(() => {
    if (!drawer || !activeId) return;
    const frame = requestAnimationFrame(() =>
      document.getElementById(`card-${activeId}`)?.scrollIntoView({ block: 'nearest', behavior: scrollBehavior() }),
    );
    return () => cancelAnimationFrame(frame);
  }, [drawer, activeId]);

  const patchField = (fid: string, patch: Partial<EditorField>) =>
    updateFields((fs) =>
      fs.map((x) =>
        x.id === fid
          ? {
              ...x,
              ...patch,
              dirtyKeys: [...new Set([...(x.dirtyKeys ?? []), ...Object.keys(patch)])],
              ...(Object.hasOwn(patch, 'condition') ? { conditionDirty: true } : {}),
            }
          : x,
      ),
    );

  const addField = (def: ElementDef) => {
    const f = makeField(def);
    updateFields((fs) => [...fs, f]);
    setActiveId(f.id);
    setElementPreview(null);
    setElementsOpen(false);
    // المان تازه به انتهای فهرست اضافه می‌شود؛ بوم به همان کارت می‌رود تا از دید خارج نشود.
    requestAnimationFrame(() => {
      document.getElementById(`card-${f.id}`)?.scrollIntoView({ block: 'nearest', behavior: scrollBehavior() });
    });
  };

  const duplicateField = (fid: string) =>
    updateFields((fs) => {
      const i = fs.findIndex((f) => f.id === fid);
      const copy = copyField(fs[i]!);
      return [...fs.slice(0, i + 1), copy, ...fs.slice(i + 1)];
    });

  const removeField = (fid: string) => {
    updateFields((fs) => fs.filter((f) => f.id !== fid));
    if (activeId === fid) {
      setActiveId(null);
      setDrawer(false);
    }
  };

  /** جابه‌جایی یک پله؛ شرط‌هایی که به المان‌های بعدی اشاره می‌کنند در «انتشار» گزارش می‌شوند (§۸.۴). */
  const moveFieldInPage = (fid: string, dir: 1 | -1) => updateFields((fs) => moveField(fs, fid, dir));

  /** نام صفحه در فرم عمومی زیر عنوان فرم دیده می‌شود؛ خالی‌کردن نام نادیده گرفته می‌شود. */
  const renamePageInEditor = (pid: string, title: string) => setPages((ps) => renamePage(ps, pid, title));

  const stepField = (dir: 1 | -1) => {
    const i = page.fields.findIndex((f) => f.id === activeId);
    const next = page.fields[(i + dir + page.fields.length) % page.fields.length];
    if (next) setActiveId(next.id);
  };

  const addPage = () => {
    const p = makePage(`صفحه ${fa(pages.length + 1)}`);
    setPages((ps) => [...ps, p]);
    setPageId(p.id);
  };

  /** جابه‌جایی بین صفحه‌ها: کارت باز و دیالوگ صفحه‌ی قبلی بسته می‌شود تا حالت کهنه نماند. */
  const selectPage = (pid: string) => {
    setPageId(pid);
    setActiveId(null);
    setDrawer(false);
  };

  const duplicatePage = (pid: string) =>
    setPages((ps) => {
      const i = ps.findIndex((p) => p.id === pid);
      const src = ps[i]!;
      const copy = {
        ...src,
        id: newId('page'),
        title: `${src.title} (کپی)`,
        source: {},
        // شرط‌های کپی همچنان به فیلدهای صفحه‌ی اصلی اشاره می‌کنند (که قبل از آن‌اند).
        fields: src.fields.map(copyField),
      };
      return [...ps.slice(0, i + 1), copy, ...ps.slice(i + 1)];
    });

  const removePage = (pid: string) => {
    const rest = pages.filter((p) => p.id !== pid);
    setPages(rest);
    if (pid === pageId) selectPage(rest[0]!.id);
  };

  /** حذف فقط پس از تأیید (واگردی در ادیتور نیست). */
  const requestRemovePage = (pid: string) => {
    if (pages.length < 2) return;
    const target = pages.find((p) => p.id === pid);
    if (target) setPendingDelete({ kind: 'page', id: pid, name: target.title });
  };

  const requestRemoveField = (field: EditorField) =>
    setPendingDelete({
      kind: 'field',
      id: field.id,
      name: field.family === 'field' ? field.label.trim() || field.typeLabel : field.typeLabel,
    });

  /** خطای «انتشار» را به همان صفحه/المان می‌برد و فوکوس را روی دکمه‌ی تنظیمات پیشرفته می‌گذارد. */
  const focusIssue = (issue: DefinitionIssue) => {
    const target = issueTarget(issue.path, pages);
    if (!target) return;
    setPageId(target.pageId);
    setDrawer(false);
    if (!target.fieldId) {
      setActiveId(null);
      return;
    }
    setActiveId(target.fieldId);
    requestAnimationFrame(() => {
      const card = document.getElementById(`card-${target.fieldId}`);
      card?.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
      // ورودی اصلاح خطا: دکمه‌ی «تنظیمات پیشرفته» همان کارت (در حالت نامعتبر با آیکن هشدار).
      document.getElementById(`settings-${target.fieldId}`)?.focus({ preventScroll: true });
    });
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    if (pendingDelete.kind === 'page') removePage(pendingDelete.id);
    else removeField(pendingDelete.id);
    setPendingDelete(null);
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const title = form?.title ?? '';

  return (
    <TooltipProvider>
      <div className="flex h-dvh min-h-0 flex-1 flex-col overflow-hidden bg-background">

        {/* ─── هدر ویرایشگر ─── */}
        <EditorHeader
          form={form}
          draft={titleDraft}
          loading={loading}
          titleState={titleState}
          saveState={saveState}
          saveLabel={saveLabel}
          saveError={saveError}
          onOpenElements={() => setElementsOpen(true)}
          onDraftChange={(value) => {
            setTitleDraft(value);
            if (titleState === 'error') setTitleState('idle');
          }}
          onSave={saveTitle}
          onRevert={() => setTitleDraft(form?.title ?? '')}
          onRetry={() => setSaveRetry((attempt) => attempt + 1)}
          actions={
            <>
              <Button
                variant="secondary"
                aria-label="قالب"
                aria-pressed={themeOpen}
                className={cn(
                  'py-1.5 px-2 sm:px-3 gap-1.5 text-xs font-semibold [&_svg]:size-3.5',
                  themeOpen && 'bg-muted',
                )}
                onClick={() => setThemeOpen((v) => !v)}
              >
                <PaletteIcon />
                <span className="hidden sm:inline">قالب</span>
              </Button>
              <Button
                variant="secondary"
                aria-label="پیش‌نمایش"
                className="py-1.5 px-2 sm:px-3 gap-1.5 text-xs font-semibold [&_svg]:size-3.5"
                onClick={() => setPreview(true)}
              >
                <EyeIcon />
                <span className="hidden sm:inline">پیش‌نمایش</span>
              </Button>

              {canManage(tenant.role) && (
                <Button
                  disabled={publishBlockedReason !== null}
                  title={publishBlockedReason ?? undefined}
                  className="py-1.5 px-2.5 sm:px-4 gap-1.5 text-xs font-semibold shrink-0"
                  onClick={() => setPublishOpen(true)}
                >
                  {publishing ? 'در حال انتشار…' : form?.status === 'published' ? 'انتشار تغییرات' : 'انتشار'}
                </Button>
              )}
            </>
          }
        />

        {/* ─── بدنه‌ی اصلی ─── */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden gap-2 p-2 md:gap-3 md:p-3">
          {publishError && (
            <Alert variant="destructive">
              <AlertDescription>{publishError}</AlertDescription>
            </Alert>
          )}
        {publishIssues && publishIssues.length > 0 && (
          <PublishIssues issues={publishIssues} pages={pages} onFocusIssue={focusIssue} />
        )}
        {form?.status === 'published' && publishedUrlValue && (
          <Alert>
            <AlertDescription className="flex flex-wrap items-center gap-2">
              <span>نسخه‌ی {fa(form.currentVersionNumber ?? 1)} منتشر شده است.</span>
              <a className="min-w-0 flex-1 truncate text-primary underline" dir="ltr" href={publishedUrlValue} target="_blank" rel="noopener noreferrer">{publishedUrlValue}</a>
              <Button variant="secondary" size="sm" onClick={() => void copyPublicUrl()}>{copiedPublicUrl ? 'کپی شد' : 'کپی نشانی'}</Button>
            </AlertDescription>
          </Alert>
        )}
        <div className="relative flex min-h-0 flex-1 gap-3">
          {/* سایدبار المان‌ها (در دسکتاپ ثابت، در تبلت و موبایل مخفی) */}
          <ElementsPanel
            className="max-lg:hidden"
            loading={loading}
            onAdd={addField}
            onPreview={setElementPreview}
          />

          {/* بوم طراحی (بوم داخل main پوسته است؛ main تودرتو مجاز نیست) */}
          <section aria-label="بوم فرم" className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl">
            <EditorBackground theme={theme} />
            <FormCanvas
              theme={theme}
              header={
                <HeaderEditor
                  value={defaults.header}
                  formTitle={title}
                  sticky={layout.header_sticky}
                  onStickyChange={(sticky) => updateLayout({ header_sticky: sticky })}
                  onChange={updateHeaderDefaults}
                  loading={loading}
                />
              }
              formTitle={titleDraft}
              onTitleChange={(value) => {
                setTitleDraft(value);
                if (titleState === 'error') setTitleState('idle');
              }}
              onTitleBlur={saveTitle}
              pages={pages}
              activePageIndex={pageIndex}
              activePageId={page.id}
              onSelectPage={selectPage}
              onAddPage={addPage}
              onRemovePage={requestRemovePage}
              onDuplicatePage={duplicatePage}
              onRenamePage={renamePageInEditor}
              layout={layout}
              defaults={defaults}
              onLayoutChange={updateLayout}
              onTopBarChange={updateTopBarDefaults}
              onSidebarChange={updateSidebarDefaults}
              onBottomBarChange={updateBottomBarDefaults}
              drawerOpen={drawer && !!activeField}
            >
              {loading ? (
                [0, 1, 2].map((i) => <SkeletonFieldCard key={i} />)
              ) : page.fields.length === 0 ? (
                <div className="rounded-xl border border-dashed border-foreground/20 bg-card/50 px-4 py-8 text-center">
                  <p className="text-sm font-medium">هنوز المانی در این صفحه نیست.</p>
                  <p className="mt-1 text-xs text-muted-foreground">از فهرست المان‌ها یکی را انتخاب کن تا به پایان صفحه اضافه شود.</p>
                </div>
              ) : (
                page.fields.map((f, index) => (
                  <FieldCard
                    key={f.id}
                    field={f}
                    active={f.id === activeId}
                    onSelect={() => setActiveId(f.id)}
                    onDuplicate={() => duplicateField(f.id)}
                    onRemove={() => requestRemoveField(f)}
                    onChange={(patch) => patchField(f.id, patch)}
                    onOpenSettings={() => {
                      setActiveId(f.id);
                      setDrawer(true);
                    }}
                    onMoveUp={() => moveFieldInPage(f.id, -1)}
                    onMoveDown={() => moveFieldInPage(f.id, 1)}
                    canMoveUp={index > 0}
                    canMoveDown={index < page.fields.length - 1}
                    onCollapse={() => setActiveId(null)}
                    settingsOpen={drawer && f.id === activeId}
                  />
                ))
              )}
            </FormCanvas>

            {/* دراور تنظیمات پیشرفته */}
            {drawer && activeField && (
              <SettingsDrawer
                key={activeField.id}
                field={activeField}
                previousFields={previousFields}
                onChange={(patch) => patchField(activeField.id, patch)}
                onClose={() => setDrawer(false)}
                onPrev={() => stepField(-1)}
                onNext={() => stepField(1)}
              />
            )}

            {!drawer && (
              <Button
                className="absolute end-3 bottom-3 z-10 shadow-lg lg:hidden"
                disabled={loading}
                onClick={() => setElementsOpen(true)}
              >
                <PlusIcon />
                افزودن المان
              </Button>
            )}
          </section>

          {/* پنل تم دسکتاپ */}
          {themeOpen && !isCompact && (
            <ThemePanel
              className="max-lg:hidden max-xl:absolute max-xl:end-0 max-xl:top-0 max-xl:z-20 max-xl:shadow-lg"
              loading={loading}
              tenantId={tenant.tenantId}
              onClose={() => setThemeOpen(false)}
              theme={theme}
              onChange={changeTheme}
              layout={layout}
              onLayoutChange={updateLayout}
            />
          )}
        </div>
      </div>
    </div>

      {/* نمای موبایل و تبلت: پنل‌ها در Sheet */}
      <Sheet open={isCompact && elementsOpen} onOpenChange={setElementsOpen}>
        {/* بدون SheetTrigger جهت به Sheet نمی‌رسد؛ RTL و لبه‌ی فیزیکی صریح داده می‌شود. */}
        <SheetContent side="right" dir="rtl" showCloseButton={false} className="w-72 sm:w-80 max-w-[85vw] gap-0 p-0">
          <SheetTitle className="sr-only">المان‌ها</SheetTitle>
          <ElementsPanel
            className="w-full flex-1 rounded-none shadow-none ring-0 border-0"
            loading={loading}
            onAdd={addField}
            onPreview={(d) => {
              setElementsOpen(false);
              setElementPreview(d);
            }}
          />
        </SheetContent>
      </Sheet>
      <Sheet open={isCompact && themeOpen} onOpenChange={setThemeOpen}>
        <SheetContent side="left" dir="rtl" showCloseButton={false} className="w-80 max-w-[85vw] gap-0 p-0">
          <SheetTitle className="sr-only">قالب فرم</SheetTitle>
          <ThemePanel
            className="w-full flex-1 self-stretch overflow-y-auto rounded-none shadow-none ring-0 border-0"
            loading={loading}
            tenantId={tenant.tenantId}
            onClose={() => setThemeOpen(false)}
            theme={theme}
            onChange={changeTheme}
            layout={layout}
            onLayoutChange={updateLayout}
          />
        </SheetContent>
      </Sheet>

      {/* دیالوگ‌ها */}
      {preview && (
        <FormPreview
          title={title}
          pages={pages}
          startPage={pageIndex}
          theme={theme}
          layout={layout}
          defaults={defaults}
          onClose={() => setPreview(false)}
        />
      )}
      {publishOpen && form ? (
        <PublishDialog
          form={form}
          publishing={publishing}
          error={publishError}
          issues={publishIssues}
          onClose={() => setPublishOpen(false)}
          onPublish={publish}
        />
      ) : null}
      {elementPreview && (
        <ElementPreview
          def={elementPreview}
          color={theme.primary_color}
          onClose={() => setElementPreview(null)}
          onAdd={() => addField(elementPreview)}
        />
      )}
      {pendingDelete && (
        <ConfirmDialog
          title={pendingDelete.kind === 'page' ? 'حذف صفحه' : 'حذف المان'}
          description={
            pendingDelete.kind === 'page'
              ? `صفحه‌ی «${pendingDelete.name}» با همه‌ی المان‌هایش حذف می‌شود. این کار برگشت‌پذیر نیست.`
              : `«${pendingDelete.name}» و تنظیماتش از این فرم حذف می‌شود. این کار برگشت‌پذیر نیست.`
          }
          confirmLabel={pendingDelete.kind === 'page' ? 'حذف صفحه' : 'حذف المان'}
          onConfirm={confirmDelete}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </TooltipProvider>
  );
}
