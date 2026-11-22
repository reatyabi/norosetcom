'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  ArrowRightIcon,
  CirclePlayIcon,
  EllipsisVerticalIcon,
  LayoutTemplateIcon,
  MonitorIcon,
  PaletteIcon,
  SmartphoneIcon,
} from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  buttonVariants,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  ScrollArea,
  Sheet,
  SheetContent,
  SheetTitle,
  Skeleton,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useIsMobile,
} from '@noroset/ui';
import {
  classifyPastedLink,
  defaultSettings,
  detectSocialPlatform,
  ELEMENT_LABELS,
  normalizeEmbedSource,
  normalizeHttpUrl,
  normalizeSocialValue,
  parseRichText,
  publishIssues,
  type ElementKind,
  type PageContent,
  type PublishIssue,
  type Theme,
  DESKTOP_MIN_WIDTH,
} from '@noroset/norolink/ui';
import { hoverScroll } from '@/components/editor-ui';
import { api, ApiError, errorMessage } from '@/lib/api';
import { captureLinkThumb } from '@/lib/capture-thumb';
import { TEMPLATE_THUMB } from '@/lib/marketing-shots';
import { norolinkImageSource, templateImageSource } from '@/lib/file-sources';
import { routes } from '@/lib/routes';
import { ProductBar } from '../../../../product-bar';
import { MAX_PAGE_NAME } from '../../../new-link-page';
import { applyLinkUrl, isPlanLimitText, ISSUE_LABELS, planLimitMessage, PUBLIC_FILES_BASE, publicUrl, STATUS, type EditorElement, type LinkDetail, type TemplateDetail } from '../../../links-shared';
import { ElementRail } from './element-rail';
import { Board, BoardSkeleton, CANVAS_HALF, RAIL_SPACE_PX, type CanvasViewport, type SaveStatus, type Selection } from './board';
import { PublishDialog, type PublishBlocker } from './publish-dialog';
import { ModerationBanner } from '../../../moderation-banner';
import { PublishToast, type PublishNotice } from './publish-toast';
import { ThemePanel } from './theme-panel';
import { TemplateDialog } from './template-dialog';
import { UNDO_MS, useUndo } from './undo';

const SAVE_DELAY_MS = 600;
/** این المان‌ها داده‌ی مشتق از سرور دارند (ویدیو/مختصات) و پاسخ PATCH جایگزین نسخه‌ی محلی می‌شود. */
const SERVER_DERIVED = new Set<ElementKind>(['video_embed', 'map_embed']);

const byKey = (a: EditorElement, b: EditorElement) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0);

/** خطای ذخیره‌ی المان به زبان کاربر (هرگز پیام خام سرور). */
function saveErrorText(err: unknown): string {
  if (err instanceof ApiError && (err.status === 400 || err.status === 422)) return 'این تغییر ذخیره نشد؛ مقدار واردشده معتبر نیست.';
  return planLimitMessage(err) ?? errorMessage(err);
}

/** در فیلد متنی یا دیالوگ؟ (چسباندن/Escape سراسری ادیتور آنجا دخالت نمی‌کند) */
function inField(target: EventTarget | null): boolean {
  if (document.querySelector('[role=dialog], [data-slot=file-picker-layer]')) return true;
  return target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]') !== null;
}

/** چه چیزی ویرایش می‌شود: صفحه‌ی لینک یک فضای کاری، یا قالب آماده در مدیریت پلتفرم (API هم‌شکل، بدون tenant و نشانی). */
export type EditorTarget =
  | { kind: 'page'; slug: string; tenantId: string; manage: boolean }
  | { kind: 'template'; id: string };

type EditorPage = LinkDetail & Partial<Pick<TemplateDetail, 'description' | 'category' | 'claimLink' | 'claimedAt'>>;
export type TemplateMeta = Pick<TemplateDetail, 'title' | 'description' | 'category'>;

const metaBody = ({ title, description, category }: EditorPage) => ({ title: title.trim() || undefined, description, category });

function ViewportSwitcher({
  value,
  onChange,
  className,
}: {
  value: CanvasViewport;
  onChange: (v: CanvasViewport) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="سوئیچ پیش‌نمایش بوم"
      className={cn(
        'flex items-center gap-0.5 rounded-full border border-border/60 bg-muted/60 p-0.5 shadow-2xs backdrop-blur-xs select-none',
        className,
      )}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              onClick={() => onChange('mobile')}
              aria-label="پیش‌نمایش موبایل"
              aria-pressed={value === 'mobile'}
              className={cn(
                'flex size-7 items-center justify-center rounded-full text-muted-foreground transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-150 ease-fluent',
                value === 'mobile'
                  ? 'bg-background text-foreground shadow-xs ring-1 ring-border/50'
                  : 'hover:bg-muted hover:text-foreground',
              )}
            >
              <SmartphoneIcon className="size-3.5" />
            </button>
          }
        />
        <TooltipContent side="bottom" sideOffset={6}>
          پیش‌نمایش موبایل
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              onClick={() => onChange('desktop')}
              aria-label="پیش‌نمایش دسکتاپ"
              aria-pressed={value === 'desktop'}
              className={cn(
                'flex size-7 items-center justify-center rounded-full text-muted-foreground transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-150 ease-fluent',
                value === 'desktop'
                  ? 'bg-background text-foreground shadow-xs ring-1 ring-border/50'
                  : 'hover:bg-muted hover:text-foreground',
              )}
            >
              <MonitorIcon className="size-3.5" />
            </button>
          }
        />
        <TooltipContent side="bottom" sideOffset={6}>
          پیش‌نمایش دسکتاپ
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export function LinkEditor({ target }: { target: EditorTarget }) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const isTemplate = target.kind === 'template';
  const tenantId = target.kind === 'page' ? target.tenantId : undefined;
  const manage = target.kind === 'template' || target.manage;
  const apiBase = isTemplate ? '/norolink/admin/templates' : '/norolink/pages';
  const loadPath = target.kind === 'page' ? `/norolink/pages/by-slug/${encodeURIComponent(target.slug)}` : `/norolink/admin/templates/${target.id}`;
  // تصویر قالب در فضای پلتفرم ذخیره می‌شود و کتابخانه‌ی فضای کاری ندارد
  const templateId = target.kind === 'template' ? target.id : null;
  const templateSource = useMemo(() => (templateId ? templateImageSource(templateId) : undefined), [templateId]);

  const [page, setPage] = useState<EditorPage | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>(null);
  /** دراور پایین: تنظیمات پیشرفته‌ی المان انتخاب‌شده یا تنظیمات صفحه. */
  // دیالوگ یکپارچه‌ی انتشار و تنظیمات صفحه (دکمه‌ی «انتشار» هدر)
  const [publishOpen, setPublishOpen] = useState(false);
  // اعلان ثابت نتیجه‌ی انتشار (فقط با بستن کاربر می‌رود)
  const [publishNotice, setPublishNotice] = useState<PublishNotice | null>(null);
  const [themeOpen, setThemeOpen] = useState(false);
  const [preferredViewport, setViewport] = useCanvasViewport();
  // نمای دسکتاپ فقط وقتی معنا دارد که بوم کنار پنل قالب و ریل به عرض دسکتاپ صفحه برسد
  const [canvasArea, canvasWidth] = useElementWidth<HTMLElement>();
  const desktopFits = !isMobile && (canvasWidth === null || canvasWidth - RAIL_SPACE_PX >= DESKTOP_MIN_WIDTH);
  const viewport: CanvasViewport = desktopFits ? preferredViewport : 'mobile';
  const [pending, setPending] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [elementErrors, setElementErrors] = useState<Record<string, string>>({});
  /** وضعیت ذخیره‌ی هر المان برای سرتیتر کارت؛ «ذخیره شد» چند ثانیه بعد محو می‌شود. */
  const [elementStatus, setElementStatus] = useState<Record<string, SaveStatus>>({});
  const setStatus = (id: string, status: SaveStatus | null) =>
    setElementStatus(({ [id]: _, ...rest }) => (status ? { ...rest, [id]: status } : rest));
  const [publishing, setPublishing] = useState(false);

  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  /** حذف‌های در مهلت بازگردانی: بعد از UNDO_MS، پیش از انتشار یا هنگام ترک صفحه اجرا می‌شوند. */
  const pendingDeletes = useRef(new Map<string, { timer: ReturnType<typeof setTimeout>; run: () => Promise<void> }>());
  const [focusId, setFocusId] = useState<string | null>(null);
  const showUndo = useUndo();

  useEffect(() => {
    const pending = pendingDeletes.current;
    return () => pending.forEach((d) => void d.run());
  }, []);

  useEffect(() => {
    api<EditorPage>(loadPath, { tenantId })
      .then((p) => {
        setPage({ ...p, elements: [...p.elements].sort(byKey) });
      })
      .catch((err: unknown) => setLoadError(errorMessage(err)));
  }, [loadPath, tenantId]);

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach((h) => clearTimeout(h));
  }, []);

  /** درخواست ذخیره با شمارنده‌ی «در حال ذخیره». */
  const track = useCallback(async <T,>(p: Promise<T>): Promise<T> => {
    setPending((n) => n + 1);
    try {
      const r = await p;
      setSaveError(null);
      return r;
    } catch (err) {
      setSaveError(planLimitMessage(err) ?? errorMessage(err));
      throw err;
    } finally {
      setPending((n) => n - 1);
    }
  }, []);

  const debounce = (key: string, fn: () => void) => {
    const t = timers.current.get(key);
    if (t) clearTimeout(t);
    timers.current.set(
      key,
      setTimeout(() => {
        timers.current.delete(key);
        fn();
      }, SAVE_DELAY_MS),
    );
  };

  /* ─── محتوای صفحه ─── */

  const updateContent = (content: PageContent) => {
    if (!page) return;
    // عنوان صفحه همان نام پروفایل است (سرور هم همین را نگه می‌دارد)؛ عنوان قالب مستقل از نام نمونه‌ی پروفایل است
    setPage({ ...page, content, title: isTemplate ? page.title : content.profile.name.trim() || page.title, hasUnpublishedChanges: true });
    debounce('content', () => {
      void track(api<LinkDetail>(`${apiBase}/${page.id}`, { method: 'PATCH', tenantId, body: { content } })).catch(() => undefined);
    });
  };

  const updateTheme = (theme: Theme) => page && updateContent({ ...page.content, theme });

  const updateName = (name: string) => page && updateContent({ ...page.content, profile: { ...page.content.profile, name } });

  /** عنوان، توضیح و دسته‌ی قالب (ذخیره‌ی خودکار). */
  const updateMeta = (meta: Partial<TemplateMeta>) => {
    if (!page) return;
    const next = { ...page, ...meta, hasUnpublishedChanges: true };
    setPage(next);
    debounce('meta', () => {
      void track(api(`${apiBase}/${page.id}`, { method: 'PATCH', tenantId, body: metaBody(next) })).catch(() => undefined);
    });
  };

  const changeSlug = async (next: string): Promise<string | null> => {
    if (!page) return null;
    try {
      const p = await track(api<LinkDetail>(`${apiBase}/${page.id}`, { method: 'PATCH', tenantId, body: { slug: next } }));
      setPage((cur) => (cur ? { ...cur, slug: p.slug, slugChanges: p.slugChanges } : cur));
      // فقط نشانی مرورگر عوض می‌شود (بدون ناوبری) تا ویرایشگر و دیالوگ انتشار باز بمانند
      window.history.replaceState(null, '', routes.link.editor(p.slug));
      return null;
    } catch (err) {
      return errorMessage(err);
    }
  };

  /* ─── المان‌ها ─── */

  const setElements = (fn: (els: EditorElement[]) => EditorElement[]) =>
    setPage((p) => (p ? { ...p, elements: fn(p.elements), hasUnpublishedChanges: true } : p));

  /** ساخت المان بعد از المان انتخاب‌شده (با تنظیمات اولیه‌ی اختیاری)، انتخاب و فوکوس فیلد اصلی‌اش. */
  const createElement = async (kind: ElementKind, settings?: EditorElement['settings']) => {
    if (!page) return null;
    const afterId = selection?.type === 'element' ? selection.id : undefined;
    try {
      let el = await track(api<EditorElement>(`${apiBase}/${page.id}/elements`, { method: 'POST', tenantId, body: { kind, afterId } }));
      if (settings) {
        el = await track(
          api<EditorElement>(`${apiBase}/${page.id}/elements/${el.id}`, { method: 'PATCH', tenantId, body: { settings } }),
        );
      }
      setElements((els) => [...els, el].sort(byKey));
      setSelection({ type: 'element', id: el.id });
      setFocusId(el.id);
      return el;
    } catch {
      return null; // پیام در نوار ذخیره نمایش داده می‌شود
    }
  };

  const addElement = async (kind: ElementKind) => {
    await createElement(kind);
  };


  const updateSettings = (id: string, settings: EditorElement['settings']) => {
    if (!page) return;
    const el = page.elements.find((e) => e.id === id);
    if (!el) return;
    setElements((els) => els.map((e) => (e.id === id ? ({ ...e, settings } as EditorElement) : e)));
    setStatus(id, 'saving');
    debounce(`el:${id}`, () => {
      void track(api<EditorElement>(`${apiBase}/${page.id}/elements/${id}`, { method: 'PATCH', tenantId, body: { settings } }))
        .then((saved) => {
          setElementErrors(({ [id]: _, ...rest }) => rest);
          setStatus(id, 'saved');
          setTimeout(() => setElementStatus((m) => (m[id] === 'saved' ? (({ [id]: _, ...rest }) => rest)(m) : m)), 2500);
          if (SERVER_DERIVED.has(saved.kind)) {
            setPage((p) =>
              p ? { ...p, elements: p.elements.map((e) => (e.id === id ? ({ ...e, settings: saved.settings } as EditorElement) : e)) } : p,
            );
          }
        })
        .catch((err: unknown) => {
          setStatus(id, 'error');
          setElementErrors((m) => ({ ...m, [id]: saveErrorText(err) }));
        });
    });
  };

  /**
   * چسباندن بیرون از فیلدها: روی المان انتخاب‌شده منبع همان را پر می‌کند؛ روی بوم المان مناسب می‌سازد
   * (ویدیو/نقشه/دکمه از روی لینک، متن برای متن ساده، تصویر برای فایل تصویر).
   */
  const handlePaste = async (file: File | null, text: string) => {
    if (!page) return;
    const sel = selection?.type === 'element' ? page.elements.find((e) => e.id === selection.id) : undefined;
    if (file) {
      if (sel && sel.kind !== 'image') return;
      try {
        const source = templateSource ?? norolinkImageSource(tenantId ?? '', page.id);
        const f = await track(source.upload(file, file.name || 'image'));
        if (!f.width || !f.height) return;
        const image = { file_id: f.id, width: f.width, height: f.height };
        if (sel?.kind === 'image') updateSettings(sel.id, { ...sel.settings, image });
        else await createElement('image', { ...defaultSettings('image'), image });
      } catch {
        // پیام در نوار ذخیره
      }
      return;
    }
    if (sel) {
      switch (sel.kind) {
        case 'link_button':
          return updateSettings(sel.id, applyLinkUrl(sel.settings, text));
        case 'video_embed':
          return updateSettings(sel.id, { ...sel.settings, source_url: normalizeHttpUrl(text) });
        case 'map_embed':
          return updateSettings(sel.id, { ...sel.settings, source_url: normalizeEmbedSource(text) });
        case 'image':
          return updateSettings(sel.id, { ...sel.settings, link: normalizeHttpUrl(text) });
        case 'social_icons': {
          const items = sel.settings.items;
          const platform = detectSocialPlatform(text) ?? 'website';
          if (items.length >= 12 || items.some((i) => i.platform === platform)) return;
          return updateSettings(sel.id, { items: [...items, { platform, value: normalizeSocialValue(platform, text) }] });
        }
        default:
          return;
      }
    }
    const kind = classifyPastedLink(text);
    if (kind === 'link_button') await createElement(kind, applyLinkUrl(defaultSettings('link_button'), text));
    else if (kind === 'video_embed') await createElement(kind, { ...defaultSettings('video_embed'), source_url: normalizeEmbedSource(text) });
    else if (kind === 'map_embed') await createElement(kind, { ...defaultSettings('map_embed'), source_url: normalizeEmbedSource(text) });
    else await createElement('rich_text', { doc: parseRichText(text) });
  };

  const pasteRef = useRef(handlePaste);
  useEffect(() => {
    pasteRef.current = handlePaste;
  });
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (inField(e.target)) return;
      const file = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith('image/')) ?? null;
      const text = (e.clipboardData?.getData('text/plain') ?? '').trim();
      if (!file && !text) return;
      e.preventDefault();
      void pasteRef.current(file, text);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !inField(e.target)) setSelection(null);
    };
    document.addEventListener('paste', onPaste);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const moveElement = (id: string, direction: 'up' | 'down') => {
    if (!page) return;
    const curElements = page.elements;
    const idx = curElements.findIndex((e) => e.id === id);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= curElements.length) return;

    // جابه‌جایی فوری محلی برای به‌روزرسانی آنی بوم و اسکرول
    const reordered = [...curElements];
    const [moved] = reordered.splice(idx, 1);
    if (moved) {
      reordered.splice(targetIdx, 0, moved);
      setElements(() => reordered);
    }

    void track(api<EditorElement>(`${apiBase}/${page.id}/elements/${id}/move`, { method: 'POST', tenantId, body: { direction } }))
      .then((saved) => setElements((els) => els.map((e) => (e.id === id ? { ...e, sortKey: saved.sortKey } : e)).sort(byKey)))
      .catch(() => undefined);
  };

  const toggleElement = (el: EditorElement) => {
    if (!page) return;
    setElements((els) => els.map((e) => (e.id === el.id ? { ...e, visible: !el.visible } : e)));
    void track(api(`${apiBase}/${page.id}/elements/${el.id}`, { method: 'PATCH', tenantId, body: { visible: !el.visible } })).catch(
      () => setElements((els) => els.map((e) => (e.id === el.id ? { ...e, visible: el.visible } : e))),
    );
  };

  /** حذف با مهلت بازگردانی: المان فوراً از بوم می‌رود و DELETE بعد از UNDO_MS فرستاده می‌شود. */
  const removeElement = (id: string) => {
    if (!page) return;
    const removed = page.elements.find((e) => e.id === id);
    if (!removed) return;
    const t = timers.current.get(`el:${id}`);
    if (t) clearTimeout(t);
    timers.current.delete(`el:${id}`);
    if (selection?.type === 'element' && selection.id === id) setSelection(null);
    setElements((els) => els.filter((e) => e.id !== id));
    const run = async () => {
      const d = pendingDeletes.current.get(id);
      if (!d) return;
      clearTimeout(d.timer);
      pendingDeletes.current.delete(id);
      await track(api(`${apiBase}/${page.id}/elements/${id}`, { method: 'DELETE', tenantId })).catch(() => undefined);
    };
    pendingDeletes.current.set(id, { timer: setTimeout(() => void run(), UNDO_MS), run });
    showUndo(`${ELEMENT_LABELS[removed.kind]} حذف شد`, () => {
      const d = pendingDeletes.current.get(id);
      if (!d) return;
      clearTimeout(d.timer);
      pendingDeletes.current.delete(id);
      setElements((els) => [...els, removed].sort(byKey));
      // تغییر ذخیره‌نشده‌ی پیش از حذف هم دوباره ذخیره شود
      if (t) updateSettings(id, removed.settings);
    });
  };

  /** کپی بلافاصله بعد از همان المان (ساخت + ذخیره‌ی همان تنظیمات). */
  const duplicateElement = async (el: EditorElement) => {
    if (!page) return;
    try {
      const copy = await track(
        api<EditorElement>(`${apiBase}/${page.id}/elements`, { method: 'POST', tenantId, body: { kind: el.kind, afterId: el.id } }),
      );
      const saved = await track(
        api<EditorElement>(`${apiBase}/${page.id}/elements/${copy.id}`, {
          method: 'PATCH',
          tenantId,
          body: { settings: el.settings, visible: el.visible },
        }),
      );
      setElements((els) => [...els, saved].sort(byKey));
      setSelection({ type: 'element', id: saved.id });
    } catch {
      // پیام در نوار ذخیره
    }
  };

  /* ─── انتشار ─── */

  const flush = async () => {
    // ذخیره‌های در صف فوراً اجرا شوند تا انتشار آخرین پیش‌نویس را ببیند.
    const pendingFns = [...timers.current.entries()];
    pendingFns.forEach(([, h]) => clearTimeout(h));
    timers.current.clear();
    if (!page) return;
    await Promise.all([...pendingDeletes.current.values()].map((d) => d.run()));
    await Promise.all([
      ...(pendingFns.some(([k]) => k === 'content')
        ? [api(`${apiBase}/${page.id}`, { method: 'PATCH', tenantId, body: { content: page.content } })]
        : []),
      ...(pendingFns.some(([k]) => k === 'meta') ? [api(`${apiBase}/${page.id}`, { method: 'PATCH', tenantId, body: metaBody(page) })] : []),
      ...pendingFns
        .filter(([k]) => k.startsWith('el:'))
        .map(([k]) => {
          const id = k.slice(3);
          const el = page.elements.find((e) => e.id === id);
          return el ? api(`${apiBase}/${page.id}/elements/${id}`, { method: 'PATCH', tenantId, body: { settings: el.settings } }) : null;
        }),
    ]);
  };

  /** بندانگشتی گالری قالب از همان چیزی که منتشر می‌شود؛ شکست مانع انتشار نیست (گالری زنده رندر می‌کند). */
  const templateThumb = async (p: EditorPage): Promise<string | undefined> => {
    const blob = await captureLinkThumb(p.content, p.elements.filter((e) => e.visible), PUBLIC_FILES_BASE, TEMPLATE_THUMB);
    if (!blob || !templateSource) return undefined;
    return templateSource.upload(blob, 'thumb.webp').then((f) => f.id, () => undefined);
  };

  /** انتشار؛ نتیجه در دیالوگ انتشار نشان داده می‌شود (خطا یا null). */
  const publish = async (): Promise<string | null> => {
    if (!page) return null;
    setPublishing(true);
    try {
      await flush();
      const thumb = isTemplate ? await templateThumb(page) : undefined;
      const p = await api<LinkDetail>(`${apiBase}/${page.id}/publish`, { method: 'POST', tenantId, body: thumb ? { thumb } : undefined });
      setPage((cur) => (cur ? { ...cur, status: p.status, publishedAt: p.publishedAt, hasUnpublishedChanges: false } : cur));
      return null;
    } catch (err) {
      const issues = err instanceof ApiError ? (err.body as { issues?: PublishIssue[] } | null)?.issues : undefined;
      return issues?.length ? 'برای انتشار، موارد مشخص‌شده را کامل کنید.' : errorMessage(err);
    } finally {
      setPublishing(false);
    }
  };

  const unpublish = async (): Promise<string | null> => {
    if (!page) return null;
    try {
      const p = await track(api<LinkDetail>(`${apiBase}/${page.id}/unpublish`, { method: 'POST', tenantId }));
      setPage((cur) => (cur ? { ...cur, status: p.status } : cur));
      return null;
    } catch (err) {
      return errorMessage(err);
    }
  };

  /** انتشار/لغو از دیالوگ: موفق ← بستن دیالوگ و اعلان ثابت؛ خطا ← همان‌جا در دیالوگ. */
  const announce = (kind: PublishNotice['kind']) => {
    if (!page) return;
    setPublishOpen(false);
    setPublishNotice({ kind, url: publicUrl(page.slug), title: page.title });
  };
  const publishFromDialog = async () => {
    const err = await publish();
    if (!err) announce('published');
    return err;
  };
  const unpublishFromDialog = async () => {
    const err = await unpublish();
    if (!err) announce('unpublished');
    return err;
  };

  const jumpTo = (target: PublishBlocker['target']) => {
    setPublishOpen(false);
    if (target?.type === 'element') {
      setSelection(target);
      setFocusId(target.id);
    } else if (target?.type === 'profile') {
      setSelection(target);
    }
  };

  const deletePage = async () => {
    if (!page) return;
    try {
      await track(api(`${apiBase}/${page.id}`, { method: 'DELETE', tenantId }));
      router.push(isTemplate ? routes.admin.templates : routes.link.home);
    } catch {
      // پیام در نوار ذخیره
    }
  };

  const issues = useMemo(
    () => (page ? publishIssues(page.content, page.elements.filter((e) => e.visible)) : []),
    [page],
  );

  /** موارد مانع انتشار با نام المان و جای آن (رفتن از دیالوگ انتشار به همان المان). */
  const blockers = (): PublishBlocker[] => [
    ...(page?.moderation?.locked ? [{ text: 'مدیریت نوروست انتشار این صفحه را تا رفع محدودیت قفل کرده است', where: null, target: null }] : []),
    ...issues.map((i): PublishBlocker => {
      const el = i.elementId ? page?.elements.find((e) => e.id === i.elementId) : undefined;
      const label = el?.kind === 'link_button' && el.settings.label ? ` «${el.settings.label}»` : '';
      return el
        ? { text: ISSUE_LABELS[i.code], where: ELEMENT_LABELS[el.kind] + label, target: { type: 'element', id: el.id } }
        : i.code === 'missing_name'
          ? { text: ISSUE_LABELS[i.code], where: 'پروفایل', target: { type: 'profile' } }
          : { text: ISSUE_LABELS[i.code], where: null, target: null };
    }),
  ];

  if (loadError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const loading = !page;
  const upload = page ? { pageId: page.id, tenantId: tenantId ?? '', assetBaseUrl: page.assetBaseUrl, source: templateSource } : null;
  const saveLabel = pending > 0 ? 'در حال ذخیره…' : saveError ? 'ذخیره نشد' : 'ذخیره شد';

  const themePanel = (className: string) => (
    <ThemePanel
      className={className}
      theme={page?.content.theme ?? null}
      upload={upload}
      onChange={updateTheme}
      onClose={() => setThemeOpen(false)}
    />
  );

  return (
    <TooltipProvider>
      <div className="flex min-h-0 flex-1 flex-col gap-2 pt-2 md:gap-3 md:p-3">
        {/* ─── هدر ویرایشگر ─── */}
        <ProductBar
          product="norolink"
          workspace={!isTemplate}
          className="max-md:px-2"
          actions={
            <>
              {/* سوئیچر بوم: ظریف، فول‌رادیوس، فقط با آیکون؛ وسط افقی و پایین نوار بالا (زیر نشان‌های وضعیت کنار عنوان، بالای بوم) */}
              <ViewportSwitcher
                value={viewport}
                onChange={setViewport}
                className={cn(
                  'absolute left-1/2 top-full -translate-x-1/2 -translate-y-2/3 z-10 max-md:hidden',
                  !desktopFits && 'hidden',
                )}
              />
              <Button
                variant="secondary"
                aria-label="قالب"
                aria-pressed={themeOpen}
                className={cn('h-10 gap-2 px-3.5 [&_svg]:size-[18px]', 'max-md:size-10 max-md:border-transparent max-md:bg-transparent max-md:px-0 max-md:shadow-none max-md:hover:bg-muted', themeOpen && 'md:bg-muted')}
                onClick={() => setThemeOpen((v) => !v)}
              >
                <PaletteIcon />
                <span className="max-md:hidden">قالب</span>
              </Button>
    
              <Button className="h-10 px-4" disabled={loading} onClick={() => setPublishOpen(true)}>
                {page?.status === 'published' && !page.hasUnpublishedChanges ? 'منتشرشده' : 'انتشار'}
              </Button>
              {isTemplate ? null : (
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="size-10 [&_svg]:size-[18px]" aria-label="بیشتر" />}>
                    <EllipsisVerticalIcon />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="bottom" align="end" className="min-w-48">
                    {/* هنوز ویدیویی نیست؛ با آماده‌شدن لینک فعال می‌شود. */}
                    <DropdownMenuItem disabled>
                      <CirclePlayIcon />
                      آموزش ویدیویی
                      <span className="ms-auto text-xs text-muted-foreground">به‌زودی</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem render={<Link href={routes.link.templates} />}>
                      <LayoutTemplateIcon />
                      گالری قالب‌های آماده
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          }
        >
          <div className="flex min-w-0 flex-1 flex-col">
            {loading ? (
              <Skeleton className="h-6 w-44" />
            ) : (
              <div className="flex min-w-0 items-center gap-2">
                {isTemplate ? (
                  <Link href={routes.admin.templates} aria-label="بازگشت به قالب‌ها" title="بازگشت به قالب‌ها" className={buttonVariants({ variant: 'ghost', size: 'icon', className: 'shrink-0' })}>
                    <ArrowRightIcon />
                  </Link>
                ) : null}
                <input
                  value={isTemplate ? page.title : page.content.profile.name}
                  placeholder={isTemplate ? 'عنوان قالب' : page.title}
                  onChange={(e) => (isTemplate ? updateMeta({ title: e.target.value }) : updateName(e.target.value))}
                  onBlur={() => {
                    if (isTemplate) {
                      if (!page.title.trim()) updateMeta({ title: 'قالب بدون عنوان' });
                    } else if (!page.content.profile.name.trim()) updateName(page.title);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                  aria-label={isTemplate ? 'عنوان قالب' : 'عنوان صفحه'}
                  maxLength={MAX_PAGE_NAME}
                  className="field-sizing-content max-w-full min-w-12 truncate rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-xl font-bold outline-none transition-colors duration-150 ease-fluent hover:border-input focus:border-input focus:bg-card md:max-w-72"
                />
                <Badge variant={STATUS[page.status].variant} className="max-md:hidden">
                  {STATUS[page.status].label}
                </Badge>
                {page.status === 'published' && page.hasUnpublishedChanges ? (
                  <Badge variant="outline" className="max-lg:hidden">
                    تغییر منتشرنشده
                  </Badge>
                ) : null}
              </div>
            )}
            <span className={cn('truncate px-1.5 text-xs', saveError ? 'text-destructive' : 'text-muted-foreground')} title={saveError ?? undefined}>
              {saveLabel}
              {saveError ? ` — ${saveError}` : ''}
            </span>
            {saveError && isPlanLimitText(saveError) ? (
              <Link href={routes.billing.home} className="shrink-0 text-xs font-medium text-primary underline underline-offset-4">
                ارتقای پلن
              </Link>
            ) : null}
          </div>
        </ProductBar>

        {page?.moderation ? <ModerationBanner moderation={page.moderation} className="mx-2 md:mx-0" /> : null}

        {/* ─── بدنه‌ی اصلی ─── */}
        <div className="relative flex min-h-0 flex-1 gap-3">

          <main ref={canvasArea} className="relative flex min-w-0 flex-1 flex-col" style={{ ['--canvas-half' as string]: CANVAS_HALF[viewport] }}>
            <ScrollArea className={cn('min-h-0 flex-1', hoverScroll)}>
              {/* بوم واحد: صفحه با تم؛ المان‌ها مستقیم روی بوم، با ابزار و پنل ویرایش هنگام انتخاب */}
              <div className="flex flex-col gap-3 pb-24 md:px-2 md:pt-5" onClick={() => setSelection(null)}>
                {!page || !upload ? (
                  <BoardSkeleton viewport={viewport} />
                ) : (
                  <>
                    <Board
                      content={page.content}
                      elements={page.elements}
                      forceLicense={page.limits.forceBranding}
                      viewport={viewport}
                      isMobile={isMobile}
                      selection={selection}
                      issuesOf={(id) => issues.filter((x) => x.elementId === id).map((x) => ISSUE_LABELS[x.code])}
                      errorOf={(id) => elementErrors[id] ?? null}
                      upload={upload}
                      onSelect={setSelection}
                      onContent={updateContent}
                      onChange={updateSettings}
                      onMove={moveElement}
                      onToggle={toggleElement}
                      onDuplicate={(el) => void duplicateElement(el)}
                      onRemove={removeElement}
                      focusId={focusId}
                      statusOf={(id) => elementStatus[id]}
                    />
                    {page.elements.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground">اولین المان را از نوار کنار بوم اضافه کنید، یا لینکی را روی بوم بچسبانید.</p>
                    ) : null}
                  </>
                )}
              </div>
            </ScrollArea>

            {/* ریل افزودن المان: absolute کنار بوم (دسکتاپ) / نوار پایین (موبایل)؛ در چیدمان بوم جا نمی‌گیرد */}
            <ElementRail loading={loading} onAdd={(k) => void addElement(k)} className={cn(isMobile && selection && 'max-md:hidden')} />

            {page && isTemplate ? (
              <TemplateDialog
                open={publishOpen}
                onOpenChange={setPublishOpen}
                id={page.id}
                title={page.title}
                description={page.description ?? ''}
                category={page.category ?? 'personal'}
                status={page.status}
                pendingChanges={page.hasUnpublishedChanges}
                publishedAt={page.publishedAt}
                publishing={publishing}
                onMeta={updateMeta}
                onPublish={publish}
                onUnpublish={unpublish}
                onDelete={deletePage}
                claimLink={page.claimLink ?? null}
                claimedAt={page.claimedAt ?? null}
                content={page.content}
                elements={page.elements}
                onClaim={(claim) => setPage((cur) => (cur ? { ...cur, ...claim } : cur))}
              />
            ) : null}
            {page && upload && !isTemplate ? (
              <PublishDialog
                open={publishOpen}
                onOpenChange={setPublishOpen}
                page={page}
                upload={upload}
                publicUrl={publicUrl(page.slug)}
                analyticsHref={routes.link.analytics(page.slug)}
                manage={manage}
                blockers={blockers()}
                publishing={publishing}
                onPublish={publishFromDialog}
                onUnpublish={unpublishFromDialog}
                onContent={updateContent}
                onSlug={changeSlug}
                onDelete={deletePage}
                onJump={jumpTo}
              />
            ) : null}

          </main>

          {/* پنل قالب کنار بوم جا می‌گیرد و بوم (و نمای دسکتاپ) با فضای باقی‌مانده اندازه می‌شود */}
          {themeOpen && !isMobile && themePanel('max-h-full bg-popover shadow-lg max-md:hidden')}

        </div>
      </div>

      {/* نمای موبایل: پنل‌ها در Sheet */}
      <Sheet open={isMobile && themeOpen} onOpenChange={setThemeOpen}>
        <SheetContent side="left" dir="rtl" showCloseButton={false} className="w-80 max-w-[90vw] gap-0 p-0">
          <SheetTitle className="sr-only">قالب صفحه</SheetTitle>
          {themePanel('w-full flex-1 self-stretch overflow-y-auto rounded-none shadow-none ring-0')}
        </SheetContent>
      </Sheet>

      <PublishToast notice={publishNotice} onClose={() => setPublishNotice(null)} />

    </TooltipProvider>
  );
}

const VIEWPORT_KEY = 'norolink.editor.viewport';

// نمای بوم (موبایل/دسکتاپ؛ کانتینر فقط در دسکتاپ دیده می‌شود) در localStorage همین مرورگر می‌ماند؛
// اگر در دسترس نبود فقط در حافظه‌ی همین صفحه.
const viewportListeners = new Set<() => void>();
let viewportFallback: CanvasViewport = 'desktop';

function readViewport(): CanvasViewport {
  try {
    return localStorage.getItem(VIEWPORT_KEY) === 'mobile' ? 'mobile' : 'desktop';
  } catch {
    return viewportFallback;
  }
}

function writeViewport(value: CanvasViewport): void {
  viewportFallback = value;
  try {
    localStorage.setItem(VIEWPORT_KEY, value);
  } catch {
    // ذخیره‌ی انتخاب فقط راحتی است
  }
  viewportListeners.forEach((l) => l());
}

function subscribeViewport(listener: () => void) {
  viewportListeners.add(listener);
  return () => viewportListeners.delete(listener);
}

function useCanvasViewport(): [CanvasViewport, (v: CanvasViewport) => void] {
  return [useSyncExternalStore(subscribeViewport, readViewport, () => 'desktop'), writeViewport];
}

/** عرض زنده‌ی یک عنصر (ResizeObserver)؛ پیش از اولین اندازه‌گیری null. */
function useElementWidth<T extends HTMLElement>(): [(el: T | null) => void, number | null] {
  const [width, setWidth] = useState<number | null>(null);
  const observer = useRef<ResizeObserver | null>(null);
  const ref = useCallback((el: T | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!el) return;
    observer.current = new ResizeObserver(([entry]) => entry && setWidth(entry.contentRect.width));
    observer.current.observe(el);
  }, []);
  return [ref, width];
}
