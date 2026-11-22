'use client';

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import {
  AlertCircleIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  LoaderCircleIcon,
  PanelLeftIcon,
  PanelRightIcon,
  PanelTopIcon,
  Trash2Icon,
  UserIcon,
  XIcon,
} from 'lucide-react';
import { cn, Skeleton, useIsMobile } from '@noroset/ui';
import {
  assetUrlFor,
  isHttpUrl,
  LinkPage,
  normalizeEmbedSource,
  normalizeHttpUrl,
  parseVideoUrl,
  IMAGE_TEXT,
  imageSlides,
  MAX_OVERLAY,
  resolveTheme,
  type PageContent,
  type ProfileLayout,
} from '@noroset/norolink/ui';
import { applyLinkUrl, type EditorElement } from '../../../links-shared';
import { useLucideIcon, usesLucide } from '@/lib/lucide-icons';
import type { UploadContext } from './fields';
import { ElementEditor, ImageLinkRow, ProfileEditor, SourceRow } from './inline';
import { ELEMENT_META } from './meta';
import { ElementForm, ProfileForm } from './element-form';

// بوم طراحی: یک سطح واحد (همان صفحه با تم). المان فعال درون یک «کارت ویرایش» قرار می‌گیرد که خود
// المان را احاطه می‌کند: سرتیتر (نوع و ابزار)، المان با ویرایش درجا، منبع (لینک/ویدیو/نقشه) و فوتر
// (کلیدها). ردیف «ظاهر» بین منبع و فوتر تنظیمات ظاهری همان المان را دارد. رنگ‌های کارت از تم صفحه مشتق می‌شوند، نه از پلتفرم.

export type Selection = { type: 'element'; id: string } | { type: 'profile' } | null;

const stop = (e: MouseEvent) => e.stopPropagation();

/** استایل کروم ویرایش؛ فقط در ادیتور و فقط با متغیرهای تم (--nl-*). */
const EDITOR_CSS = `
.nl-ec{scroll-margin:24px 0 96px;position:relative;margin:0 -10px;padding:10px;border-radius:18px;cursor:default;
  background:var(--nl-ec-bg,color-mix(in srgb,var(--nl-fg) 5%,transparent));
  -webkit-backdrop-filter:var(--nl-ec-filter,none);backdrop-filter:var(--nl-ec-filter,none);
  outline:2px solid color-mix(in srgb,var(--nl-fg) 55%,transparent);outline-offset:0}
.nl-ec-bar{display:flex;align-items:center;flex-wrap:wrap;gap:6px 14px;font-family:var(--font-sans,inherit);font-size:12px;
  line-height:1.4;color:var(--nl-muted)}
.nl-ec-bar--top{margin-bottom:10px}
.nl-ec-bar--bottom{margin-top:10px;padding-top:10px;border-top:1px solid color-mix(in srgb,var(--nl-fg) 14%,transparent)}
.nl-ec-type{display:flex;align-items:center;gap:6px;font-weight:600}
.nl-ec-type svg{width:14px;height:14px}
.nl-ec-spacer{flex:1}
.nl-ec-tools{display:flex;gap:2px}
.nl-ec-btn{all:unset;box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:5px;height:28px;min-width:28px;
  padding:0 6px;border-radius:8px;color:var(--nl-muted);cursor:pointer;font-size:12px}
.nl-ec-btn svg{width:15px;height:15px}
.nl-ec-btn:hover,.nl-ec-btn:focus-visible{background:color-mix(in srgb,var(--nl-fg) 10%,transparent);color:var(--nl-fg)}
.nl-ec-btn[aria-disabled=true]{opacity:.35;pointer-events:none}
.nl-ec-btn--danger:hover{color:#d13438}
.nl-ec-btn--active{background:color-mix(in srgb,var(--nl-fg) 14%,transparent);color:var(--nl-fg)}
.nl-ec:focus{outline:2px solid color-mix(in srgb,var(--nl-fg) 55%,transparent)}
.nl-crop{cursor:grab;touch-action:none;outline:2px solid var(--nl-accent);outline-offset:2px}
.nl-crop:active{cursor:grabbing}
.nl-crop:focus-visible{outline-width:3px}
.nl-crop-grid{position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(to right,transparent 33.2%,rgba(255,255,255,.55) 33.3%,rgba(255,255,255,.55) 33.5%,transparent 33.6%,transparent 66.5%,rgba(255,255,255,.55) 66.6%,rgba(255,255,255,.55) 66.8%,transparent 66.9%),
  linear-gradient(to bottom,transparent 33.2%,rgba(255,255,255,.55) 33.3%,rgba(255,255,255,.55) 33.5%,transparent 33.6%,transparent 66.5%,rgba(255,255,255,.55) 66.6%,rgba(255,255,255,.55) 66.8%,transparent 66.9%)}
.nl-crop-bar{display:flex;align-items:center;gap:6px;margin-top:8px;font-family:var(--font-sans,inherit);font-size:12px;color:var(--nl-muted)}
.nl-crop-zoom{display:flex;align-items:center;gap:8px}
.nl-crop-zoom input{width:140px;accent-color:var(--nl-accent)}
.nl-rt-bar{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-bottom:8px;font-family:var(--font-sans,inherit)}
.nl-rt-group{display:flex;gap:2px;padding:2px;border-radius:10px;background:color-mix(in srgb,var(--nl-fg) 7%,transparent)}
.nl-rt-select{box-sizing:border-box;height:32px;padding:0 8px;border:0;border-radius:10px;font:inherit;font-size:13px;color:var(--nl-fg);cursor:pointer;
  background:color-mix(in srgb,var(--nl-fg) 7%,transparent)}
.nl-rt-select option{color:#111;background:#fff}
@media (pointer:coarse){.nl-rt-select{height:48px}}
.nl-rt-link{display:flex;align-items:center;gap:2px;margin-bottom:8px;font-family:var(--font-sans,inherit)}
.nl-rt-link input{all:unset;box-sizing:border-box;flex:1;min-width:0;height:32px;padding:0 8px;border-radius:8px;font-size:14px;color:var(--nl-fg);
  background:color-mix(in srgb,var(--nl-fg) 7%,transparent)}
.nl-rich{position:relative;min-height:100px;cursor:text;border-radius:6px;outline:1px dashed color-mix(in srgb,currentColor 45%,transparent);outline-offset:3px}
.nl-rich:focus{outline:2px solid color-mix(in srgb,currentColor 70%,transparent)}
.nl-text h1{font-weight:700}.nl-text h2{font-weight:700}.nl-text h3{font-weight:600}
.nl-text b,.nl-text strong{font-weight:700}.nl-text i,.nl-text em{font-style:italic}.nl-text li{display:list-item}
.nl-rich[data-empty]::before{content:attr(data-placeholder);position:absolute;opacity:.5;pointer-events:none}
.nl-rt-count{margin-inline-start:auto;font-size:11px;color:var(--nl-muted)}
.nl-rt-count--max{color:#d13438}
.nl-slot--add.nl-social-btn{background:transparent;color:var(--nl-fg);box-shadow:none;outline-style:dashed}
.nl-slot--add.nl-social-btn svg{width:45%;height:45%}
.nl-social-warn{position:absolute;top:2px;inset-inline-end:2px;width:9px;height:9px;border-radius:50%;background:#d13438;
  box-shadow:0 0 0 2px var(--nl-bg-solid,#fff);pointer-events:none}
.nl-ec-status{display:flex;align-items:center;gap:4px;font-weight:400;font-size:11px;opacity:.85}
.nl-ec-status svg{width:12px;height:12px}
.nl-ec-status--error{color:#d13438;opacity:1}
@keyframes nl-spin{to{transform:rotate(360deg)}}
.nl-ec-spin{animation:nl-spin 1s linear infinite}
.nl-ec-link{all:unset;display:inline-flex;align-items:center;gap:5px;cursor:pointer;font-family:var(--font-sans,inherit);font-size:12px;
  color:var(--nl-muted);padding:4px 6px;border-radius:8px}
.nl-ec-link:hover,.nl-ec-link:focus-visible{background:color-mix(in srgb,var(--nl-fg) 10%,transparent);color:var(--nl-fg)}
.nl-ec-link svg{width:14px;height:14px}
@media (pointer:coarse){.nl-ec-btn{height:44px;min-width:44px}.nl-ec-toggle{min-height:44px}}
.nl-ec-toggle{all:unset;display:flex;align-items:center;gap:7px;cursor:pointer;color:var(--nl-fg)}
.nl-ec-track{position:relative;width:30px;height:17px;border-radius:999px;transition:background .15s;
  background:color-mix(in srgb,var(--nl-fg) 22%,transparent)}
.nl-ec-track::after{content:"";position:absolute;top:2px;inset-inline-start:2px;width:13px;height:13px;border-radius:50%;
  background:var(--nl-bg-solid,#fff);box-shadow:0 1px 2px rgba(0,0,0,.25);transition:inset-inline-start .15s}
.nl-ec-toggle[aria-checked=true] .nl-ec-track{background:var(--nl-accent)}
.nl-ec-toggle[aria-checked=true] .nl-ec-track::after{inset-inline-start:15px;background:var(--nl-accent-fg)}
.nl-ec-toggle:focus-visible .nl-ec-track{outline:2px solid var(--nl-fg);outline-offset:2px}
.nl-ec-source{margin-top:10px}
.nl-ec-opts{margin-top:10px;display:flex;flex-direction:column;gap:8px;font-family:var(--font-sans,inherit);font-size:12px;color:var(--nl-muted)}
.nl-ec-opt{display:flex;align-items:center;flex-wrap:wrap;gap:6px 10px}
.nl-ec-opt-label{min-width:72px}
.nl-ec-seg{display:flex;gap:2px;padding:2px;border-radius:10px;background:color-mix(in srgb,var(--nl-fg) 7%,transparent)}
.nl-ec-swatch{all:unset;box-sizing:border-box;width:28px;height:28px;border-radius:8px;cursor:pointer;overflow:hidden;
  box-shadow:0 0 0 1px color-mix(in srgb,var(--nl-fg) 22%,transparent)}
.nl-ec-swatch::-webkit-color-swatch-wrapper{padding:0}
.nl-ec-swatch::-webkit-color-swatch{border:none}
.nl-ec-swatch:focus-visible{outline:2px solid var(--nl-fg);outline-offset:2px}
.nl-ec-hint{font-size:11px;opacity:.85}
.nl-ec-source label{background:color-mix(in srgb,var(--nl-fg) 7%,transparent);color:var(--nl-fg);box-shadow:none;--tw-ring-color:transparent}
.nl-ec-source label:focus-within{outline:2px solid color-mix(in srgb,var(--nl-fg) 55%,transparent)}
.nl-ec-source input::placeholder,.nl-ec-source svg{color:var(--nl-muted)}
.nl-ec-source span{color:var(--nl-muted)}
.nl-ec-issues{margin-top:8px;display:flex;flex-direction:column;gap:2px;font-family:var(--font-sans,inherit);font-size:12px;color:#d13438}
.nl-ec-issues li{display:flex;align-items:center;gap:5px;list-style:none}
.nl-ec-issues svg{width:14px;height:14px;flex:none}
.nl-pop{border-radius:14px;background:var(--nl-surface);color:var(--nl-surface-fg);font-family:var(--font-sans,inherit);
  box-shadow:0 12px 32px rgba(0,0,0,.22),0 0 0 1px color-mix(in srgb,var(--nl-surface-fg) 14%,transparent)}
.nl-pop input,.nl-pop select{background:color-mix(in srgb,currentColor 7%,transparent)!important;color:inherit!important;
  border-color:color-mix(in srgb,currentColor 22%,transparent)!important;box-shadow:none!important}
.nl-pop select option{color:#111;background:#fff}
.nl-pop [data-slot=segmented]{background:color-mix(in srgb,currentColor 8%,transparent)}
.nl-pop [data-slot=segmented] button{color:color-mix(in srgb,currentColor 65%,transparent)}
.nl-pop [data-slot=segmented] button[data-state=active]{background:var(--nl-surface);color:inherit;box-shadow:0 1px 2px rgba(0,0,0,.15)}
.nl-pop .grid button,.nl-pop .border-t button{box-shadow:0 0 0 1px color-mix(in srgb,currentColor 18%,transparent);color:inherit}
.nl-pop button[aria-pressed=true]{background:var(--nl-accent)!important;color:var(--nl-accent-fg)!important;box-shadow:none}
.nl-slide-thumb{all:unset;box-sizing:border-box;flex:none;width:44px;height:44px;border-radius:8px;overflow:hidden;cursor:pointer;
  display:flex;align-items:center;justify-content:center;opacity:.7;transition:opacity .15s ease,box-shadow .15s ease;
  box-shadow:0 0 0 1px color-mix(in srgb,var(--nl-fg) 20%,transparent)}
.nl-slide-thumb img{width:100%;height:100%;object-fit:cover;display:block}
.nl-slide-thumb:hover,.nl-slide-thumb:focus-visible{opacity:1}
.nl-slide-thumb[aria-pressed=true]{opacity:1;box-shadow:0 0 0 2px var(--nl-fg)}
.nl-slide-thumb--add{opacity:1;box-shadow:none;border:1.5px dashed color-mix(in srgb,var(--nl-fg) 40%,transparent);color:var(--nl-muted)}
.nl-slide-thumb--add:hover{color:var(--nl-fg);border-color:var(--nl-fg)}
.nl-slide-thumb--add svg{width:18px;height:18px}
.nl-pop .border-t{border-color:color-mix(in srgb,currentColor 14%,transparent)}
.nl-pop .nl-icon-grid button{background:none!important;box-shadow:none!important;color:color-mix(in srgb,currentColor 70%,transparent)!important;transition:transform .15s ease,color .15s ease}
.nl-pop .nl-icon-grid button:hover,.nl-pop .nl-icon-grid button:focus-visible{color:inherit!important;transform:scale(1.1)}
.nl-pop .nl-icon-grid button[aria-pressed=true]{color:inherit!important;transform:scale(1.1);
  background:color-mix(in srgb,currentColor 12%,transparent)!important;box-shadow:inset 0 0 0 2px currentColor!important}
.nl-pop [data-slot=button]{color:inherit}
.nl-pop [data-slot=button]:hover{background:color-mix(in srgb,currentColor 10%,transparent)}
.nl-hover{position:relative;border-radius:14px;cursor:pointer;outline:1px dashed transparent;outline-offset:6px;transition:outline-color .15s}
.nl-hover:hover{outline-color:color-mix(in srgb,var(--nl-fg) 40%,transparent)}
.nl-hover--warn{outline-color:color-mix(in srgb,#d13438 70%,transparent)}
.nl-hover--active{outline:2px solid var(--nl-accent, currentColor);outline-offset:4px}
`;

const PROFILE_LAYOUT_TOOLS: { layout: ProfileLayout; label: string; icon: typeof PanelTopIcon }[] = [
  { layout: 'side_right', label: 'افقی (راست)', icon: PanelRightIcon },
  { layout: 'side_left', label: 'افقی (چپ)', icon: PanelLeftIcon },
  { layout: 'stacked', label: 'عمودی (وسط چین)', icon: PanelTopIcon },
];

function Tool({
  label,
  onClick,
  disabled,
  danger,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn('nl-ec-btn', danger && 'nl-ec-btn--danger', active && 'nl-ec-btn--active')}
      aria-pressed={active}
      aria-label={label}
      title={label}
      aria-disabled={disabled || undefined}
      onClick={(e) => {
        stop(e);
        if (!disabled) onClick();
      }}
    >
      {children}
    </button>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className="nl-ec-toggle"
      onClick={(e) => {
        stop(e);
        onChange(!checked);
      }}
    >
      <span className="nl-ec-track" />
      {label}
    </button>
  );
}

export type SaveStatus = 'saving' | 'saved' | 'error';

function SaveBadge({ status }: { status: SaveStatus }) {
  return (
    <span aria-live="polite" className={cn('nl-ec-status', status === 'error' && 'nl-ec-status--error')}>
      {status === 'saving' ? (
        <>
          <LoaderCircleIcon className="nl-ec-spin" />
          در حال ذخیره…
        </>
      ) : status === 'saved' ? (
        <>
          <CheckIcon />
          ذخیره شد
        </>
      ) : (
        <>
          <AlertCircleIcon />
          ذخیره نشد
        </>
      )}
    </span>
  );
}

/** کارت ویرایش که المان را احاطه می‌کند. */
function EditCard({
  type,
  tools,
  source,
  options,
  issues,
  footer,
  children,
  onClose,
  status,
  onShortcut,
  reveal,
}: {
  onClose: () => void;
  /** المان تازه یا پرش از دیالوگ انتشار: کارت باید دیده شود. */
  reveal?: boolean;
  /** وضعیت ذخیره‌ی همین المان (در سرتیتر). */
  status?: SaveStatus;
  /** میانبرهای صفحه‌کلید وقتی فوکوس روی کارت است (نه داخل فیلد). */
  onShortcut?: (action: 'up' | 'down' | 'duplicate' | 'remove') => void;
  type: ReactNode;
  tools: ReactNode;
  source?: ReactNode;
  options?: ReactNode;
  issues?: string[];
  footer: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // کارت تازه‌باز فوکوس می‌گیرد تا میانبرها کار کنند (مگر فیلدی داخلش خودش فوکوس گرفته باشد)
  useEffect(() => {
    const el = ref.current;
    if (el && !el.contains(document.activeElement)) el.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    if (reveal) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [reveal]);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const t = e.target instanceof Element ? e.target : null;
    // Escape کارت را می‌بندد، مگر داخل پاپ‌اوور (آن خودش بسته می‌شود)
    if (e.key === 'Escape' && !t?.closest('.nl-pop')) {
      e.stopPropagation();
      onClose();
      return;
    }
    if (!onShortcut || t?.closest('input, textarea, select, [contenteditable="true"], .nl-pop')) return;
    const mod = e.ctrlKey || e.metaKey;
    const action =
      e.altKey && e.key === 'ArrowUp'
        ? 'up'
        : e.altKey && e.key === 'ArrowDown'
          ? 'down'
          : mod && e.key.toLowerCase() === 'd'
            ? 'duplicate'
            : e.key === 'Delete' || e.key === 'Backspace'
              ? 'remove'
              : null;
    if (!action) return;
    e.preventDefault();
    onShortcut(action);
  };
  return (
    <div ref={ref} className="nl-ec" tabIndex={-1} onClick={stop} onKeyDown={onKeyDown}>
      <div className="nl-ec-bar nl-ec-bar--top">
        <span className="nl-ec-type">{type}</span>
        {status ? <SaveBadge status={status} /> : null}
        <span className="nl-ec-spacer" />
        <span className="nl-ec-tools">{tools}</span>
      </div>
      {children}
      {source ? <div className="nl-ec-source">{source}</div> : null}
      {options ? <div className="nl-ec-opts">{options}</div> : null}
      {issues?.length ? (
        <ul className="nl-ec-issues" role="alert">
          {issues.map((x) => (
            <li key={x}>
              <AlertCircleIcon />
              {x}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="nl-ec-bar nl-ec-bar--bottom">{footer}</div>
    </div>
  );
}

/** دراور پایین ویرایش المان در حالت موبایل با ژست کشیدن به پایین (Swipe-to-Dismiss) و مدیریت هوشمند کیبورد مجازی */
function MobileEditDrawer({
  open,
  onClose,
  type,
  status,
  tools,
  issues,
  fitContent,
  noScroll,
  children,
}: {
  open: boolean;
  onClose: () => void;
  type: ReactNode;
  status?: SaveStatus;
  tools?: ReactNode;
  issues?: string[];
  fitContent?: boolean;
  noScroll?: boolean;
  children: ReactNode;
}) {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const startTimeRef = useRef(0);
  const contentRef = useRef<HTMLDivElement>(null);

  // بستن با کلید Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // ریست وضعیت کشیدن هنگام باز شدن مجدد
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setDragY(0);
      setIsDragging(false);
      setIsClosing(false);
    }
  }

  // مدیریت ژست لمسی کشیدن به پایین (Swipe down to dismiss)
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    startYRef.current = e.clientY;
    currentYRef.current = e.clientY;
    startTimeRef.current = Date.now();
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    currentYRef.current = e.clientY;
    const delta = e.clientY - startYRef.current;
    if (delta > 0) {
      // کشیدن به پایین: همراهی مستقیم با انگشت
      setDragY(delta);
    } else {
      // مقاومت فنری در صورت کشیدن به بالا
      setDragY(delta * 0.12);
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore if pointer capture was already released
    }

    const delta = currentYRef.current - startYRef.current;
    const duration = Date.now() - startTimeRef.current;
    const velocity = delta / Math.max(1, duration);

    // اگر بیش از ۷۰ پیکسل کشیده شد یا با سرعت به پایین پرتاب شد، دراور بسته می‌شود
    if (delta > 70 || (delta > 30 && velocity > 0.45)) {
      setIsClosing(true);
      setDragY(window.innerHeight * 0.6);
      setTimeout(() => {
        onClose();
      }, 180);
    } else {
      // بازگشت فنری به جایگاه اصلی
      setDragY(0);
    }
  };

  // مدیریت کیبورد مجازی موبایل: هنگام فوکوس روی فیلدها، فیلد فعال درون دراور اسکرول و متمرکز می‌شود
  const handleFocusCapture = (e: React.FocusEvent) => {
    const target = e.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      (target instanceof HTMLElement && target.getAttribute('contenteditable') === 'true')
    ) {
      setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 200);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* دراور شناور از پایین با ارتفاع متناسب یا ۵۰ درصد ویوپورت، پایداری در برابر کیبورد مجازی و ژست سوایپ */}
      <div
        data-slot="element-mobile-drawer"
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-3xl border-t border-border/80 bg-popover text-popover-foreground shadow-2xl shadow-black/40 touch-pan-y',
          fitContent ? 'h-auto max-h-[85dvh]' : 'h-[50svh] min-h-[300px] max-h-[85dvh] overscroll-contain',
          isDragging
            ? 'transition-none select-none'
            : isClosing
              ? 'transition-transform duration-200 ease-in'
              : 'transition-transform duration-250 ease-out animate-in slide-in-from-bottom',
        )}
        style={{
          transform: `translate3d(0, ${Math.max(0, dragY)}px, 0)`,
        }}
        onClick={stop}
        onFocusCapture={handleFocusCapture}
        dir="rtl"
      >
        {/* دستگیره دراور با قابلیت کشیدن لمسی (Drag Handle) */}
        <div
          className="group flex cursor-grab active:cursor-grabbing justify-center pt-3 pb-1.5 touch-none select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          title="برای بستن به پایین بکشید"
          aria-label="برای بستن به پایین بکشید"
        >
          <span
            className={cn(
              'h-1.5 w-12 rounded-full bg-muted-foreground/35 transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-150',
              isDragging && 'w-16 bg-muted-foreground/60 scale-y-110',
            )}
          />
        </div>

        {/* سرتیتر دراور: نوع المان، وضعیت ذخیره، ابزارها و دکمه بستن */}
        <div
          className="flex items-center gap-2 border-b border-border/50 px-4 py-1.5 font-sans text-xs select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span className="flex items-center gap-1.5 font-semibold text-sm text-foreground">
            {type}
          </span>
          {status ? <SaveBadge status={status} /> : null}
          <span className="flex-1" />
          <div className="flex items-center gap-1" onPointerDown={stop}>
            {tools}
            <button
              type="button"
              className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="بستن"
              title="بستن"
              onClick={(e) => {
                stop(e);
                onClose();
              }}
            >
              <XIcon className="size-4" />
            </button>
          </div>
        </div>

        {/* بدنه دراور با قابلیت کنترل اسکرول */}
        <div
          ref={contentRef}
          className={cn(
            'px-4 flex flex-col',
            noScroll
              ? 'overflow-hidden py-2.5 gap-2 pb-[max(1.25rem,env(safe-area-inset-bottom))]'
              : 'flex-1 overflow-y-auto py-3 gap-2.5 pb-[max(1rem,env(safe-area-inset-bottom))] overscroll-contain',
          )}
        >
          {children}
          {issues?.length ? (
            <ul className="flex flex-col gap-1 rounded-xl border border-destructive/20 bg-destructive/10 p-2 text-[11px] text-destructive" role="alert">
              {issues.map((x) => (
                <li key={x} className="flex items-center gap-1.5">
                  <AlertCircleIcon className="size-3.5 shrink-0" />
                  {x}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </>
  );
}

export type CanvasViewport = 'mobile' | 'desktop';

/** فضای ریل افزودن المان کنار بوم دسکتاپ (دو طرف، تا بوم وسط بماند). */
export const RAIL_SPACE_PX = 160;

/** عرض بوم در هر نما: موبایل = عرض گوشی؛ دسکتاپ = فضای باقی‌مانده کنار پنل‌ها تا ۱۱۰۰px با جای ریل. */
const CANVAS_WIDTH: Record<CanvasViewport, string> = {
  mobile: 'md:max-w-[430px]',
  desktop: 'md:max-w-[min(100%-10rem,1100px)]',
};
/** نیم‌پهنای بوم برای جای ریل افزودن المان (element-rail.tsx)؛ درصد نسبت به عرض بدنه‌ی ویرایشگر. */
export const CANVAS_HALF: Record<CanvasViewport, string> = { mobile: '215px', desktop: 'min(50% - 5rem, 550px)' };

export interface BoardProps {
  content: PageContent;
  elements: EditorElement[];
  forceLicense: boolean;
  viewport: CanvasViewport;
  selection: Selection;
  issuesOf: (id: string) => string[];
  errorOf: (id: string) => string | null;
  upload: UploadContext;
  onSelect: (s: Selection) => void;
  onContent: (c: PageContent) => void;
  onChange: (id: string, settings: EditorElement['settings']) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onToggle: (el: EditorElement) => void;
  onDuplicate: (el: EditorElement) => void;
  onRemove: (id: string) => void;
  /** المان تازه‌افزوده که فیلد اصلی‌اش باید فوکوس بگیرد. */
  focusId?: string | null;
  /** وضعیت ذخیره‌ی هر المان. */
  statusOf?: (id: string) => SaveStatus | undefined;
  /** آیا در حالت موبایل است؟ */
  isMobile?: boolean;
}

/** گزینه‌ی تک‌انتخابی فشرده با رنگ‌های تم. */
function Choice<T extends string>({
  label,
  value,
  items,
  onChange,
}: {
  label: string;
  value: T;
  items: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="nl-ec-opt">
      <span className="nl-ec-opt-label">{label}</span>
      <span className="nl-ec-seg" role="radiogroup" aria-label={label}>
        {items.map((it) => (
          <Tool key={it.value} label={it.label} active={value === it.value} onClick={() => onChange(it.value)}>
            {it.label}
          </Tool>
        ))}
      </span>
    </div>
  );
}

/** ردیف «ظاهر»: تنظیمات ظاهری هر المان (جایگزین دراور تنظیمات پیشرفته). */
function optionsOf(el: EditorElement, set: (s: EditorElement['settings']) => void): ReactNode {
  if (el.kind === 'link_button') {
    const s = el.settings;
    return (
      <div className="nl-ec-opt">
        <span className="nl-ec-opt-label">رنگ دکمه</span>
        <input
          type="color"
          aria-label="رنگ دکمه"
          className="nl-ec-swatch"
          value={s.style.bg_color ?? '#111111'}
          onClick={stop}
          onChange={(e) => set({ ...s, style: { bg_color: e.target.value } })}
        />
        <Tool label="رنگ قالب" active={!s.style.bg_color} onClick={() => set({ ...s, style: { bg_color: null } })}>
          رنگ قالب
        </Tool>
        <span className="nl-ec-hint">رنگ متن و آیکون خودکار با کنتراست بالا</span>
      </div>
    );
  }
  if (el.kind === 'image') {
    const s = el.settings;
    return (
      <Choice
        label="نسبت ابعاد"
        value={s.aspect}
        onChange={(aspect) => set({ ...s, aspect })}
        items={[
          { value: 'auto', label: 'اصلی' },
          { value: '1:1', label: '۱:۱' },
          { value: '4:3', label: '۴:۳' },
          { value: '16:9', label: '۱۶:۹' },
        ]}
      />
    );
  }
  if (el.kind === 'map_embed') {
    const s = el.settings;
    return (
      <Choice
        label="ارتفاع نقشه"
        value={s.height}
        onChange={(height) => set({ ...s, height })}
        items={[
          { value: 'sm', label: 'کم' },
          { value: 'md', label: 'متوسط' },
          { value: 'lg', label: 'زیاد' },
        ]}
      />
    );
  }
  return null;
}

/** ردیف منبع هر المان (فقط المان‌هایی که نشانی دارند)؛ ورودی بدون https هم پذیرفته و نرمال می‌شود. */
function sourceOf(el: EditorElement, set: (s: EditorElement['settings']) => void, autoFocus: boolean, saveStatus?: SaveStatus): ReactNode {
  if (el.kind === 'link_button') {
    const s = el.settings;
    return (
      <SourceRow
        label="لینک دکمه"
        placeholder="example.com یا لینک کامل"
        value={s.url}
        autoFocus={autoFocus}
        normalize={normalizeHttpUrl}
        validate={isHttpUrl}
        openable
        onChange={(url) => set({ ...s, url })}
        onCommit={(url) => set(applyLinkUrl(s, url))}
      />
    );
  }
  if (el.kind === 'image') {
    const s = el.settings;
    // اسلایدر: لینک هر اسلاید در خود کارت تصویر (ImageEditor) ویرایش می‌شود
    if (imageSlides(s).length > 1) return null;
    return <ImageLinkRow key={el.id} value={s.link} onChange={(link) => set({ ...s, link })} />;
  }
  if (el.kind === 'video_embed') {
    const s = el.settings;
    const ok = s.source_url ? !!parseVideoUrl(normalizeHttpUrl(s.source_url)) : null;
    return (
      <SourceRow
        label="لینک ویدیو"
        placeholder="لینک ویدیو در آپارات، یوتیوب یا ویمیو"
        value={s.source_url}
        autoFocus={autoFocus}
        normalize={normalizeHttpUrl}
        onChange={(source_url) => set({ ...s, source_url })}
        status={ok === null ? null : { ok, text: ok ? 'شناخته شد' : 'لینک ویدیو نیست' }}
      />
    );
  }
  if (el.kind === 'map_embed') {
    const s = el.settings;
    return (
      <SourceRow
        label="لینک مکان"
        placeholder="لینک یا کد iframe مکان در گوگل‌مپ، نشان یا بلد"
        value={s.source_url}
        autoFocus={autoFocus}
        normalize={normalizeEmbedSource}
        onChange={(source_url) => set({ ...s, source_url })}
        status={
          !s.source_url
            ? null
            : saveStatus === 'saving'
              ? { ok: null, text: 'در حال یافتن مکان…' }
              : s.location
                ? { ok: true, text: 'مکان پیدا شد' }
                : { ok: false, text: 'مکان پیدا نشد' }
        }
      />
    );
  }
  return null;
}

/** بوم: صفحه‌ی واقعی با تم؛ هر المان مستقیم روی بوم انتخاب و درجا ویرایش می‌شود. */
export function Board(props: BoardProps) {
  const { content, elements, selection, upload } = props;
  const isMobileDevice = useIsMobile();
  const isMobile = props.isMobile ?? isMobileDevice;
  const byId = new Map(elements.map((e) => [e.id, e]));
  const assetUrl = assetUrlFor(upload.assetBaseUrl);
  const theme = resolveTheme(content.theme, assetUrl);
  const lucideIcon = useLucideIcon(usesLucide(elements));
  // فقط در ادیتور: زیر کارت ویرایش درجا روی عکس، لایه‌ی هم‌رنگ با دو برابر شدت لایه‌ی عکس تا فیلدها خوانا بمانند
  const editCardVars = theme.image
    ? {
      '--nl-ec-bg': `rgba(${IMAGE_TEXT[theme.image.tone].tint},${Math.min(MAX_OVERLAY, theme.image.amount * 2)})`,
      '--nl-ec-filter': 'blur(12px)',
    }
    : undefined;

  const activeSortIndex = selection?.type === 'element' ? elements.findIndex((e) => e.id === selection.id) : -1;
  const activeSortKey = selection?.type === 'element' ? byId.get(selection.id)?.sortKey ?? null : null;

  // هنگام فعال شدن دراور یا جابه‌جایی المان (دکمه‌های بالا/پایین)، اسکرول صفحه روی المان فعال متمرکز می‌شود
  useEffect(() => {
    if (!isMobile || !selection) return;

    const targetId = selection.type === 'element' ? selection.id : 'profile';

    const scrollIntoFocus = () => {
      const el = document.querySelector(`[data-editor-element-id="${targetId}"]`) as HTMLElement | null;
      if (!el) return;

      const getScrollParent = (node: HTMLElement): HTMLElement => {
        let parent: HTMLElement | null = node.parentElement;
        while (parent && parent !== document.body) {
          if (parent.getAttribute('data-slot') === 'scroll-area-viewport') return parent;
          const style = window.getComputedStyle(parent);
          if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && parent.scrollHeight > parent.clientHeight) {
            return parent;
          }
          parent = parent.parentElement;
        }
        return (document.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement | null) || document.documentElement;
      };

      const scrollContainer = getScrollParent(el);
      const isDoc = scrollContainer === document.documentElement || scrollContainer === document.body;

      const containerRect = isDoc
        ? { top: 0, bottom: window.innerHeight }
        : scrollContainer.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();

      const drawerEl = document.querySelector('[data-slot="element-mobile-drawer"]') as HTMLElement | null;
      const drawerTop = drawerEl ? drawerEl.getBoundingClientRect().top : window.innerHeight * 0.5;

      // فضای دید آزاد بالای دراور
      const visibleTop = containerRect.top + 16;
      const visibleBottom = Math.min(containerRect.bottom, drawerTop) - 16;
      const visibleHeight = Math.max(visibleBottom - visibleTop, 80);

      // قرار دادن المان درست در مرکز فضای آزاد بالای دراور
      const targetCenterY = visibleTop + visibleHeight / 2;
      const elCenterY = elRect.top + elRect.height / 2;

      const delta = elCenterY - targetCenterY;

      if (Math.abs(delta) > 4) {
        if (isDoc) {
          window.scrollBy({ top: delta, behavior: 'smooth' });
        } else {
          scrollContainer.scrollBy({ top: delta, behavior: 'smooth' });
        }
      }
    };

    const frame = requestAnimationFrame(scrollIntoFocus);
    const timer1 = setTimeout(scrollIntoFocus, 60);
    const timer2 = setTimeout(scrollIntoFocus, 180);
    const timer3 = setTimeout(scrollIntoFocus, 360);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [selection, isMobile, activeSortIndex, activeSortKey]);

  const wrapElement = (raw: { id: string }, node: ReactNode) => {
    const el = byId.get(raw.id)!;
    const i = elements.indexOf(el);
    const active = selection?.type === 'element' && selection.id === el.id;
    const issues = props.issuesOf(el.id);
    const error = props.errorOf(el.id);
    const meta = ELEMENT_META[el.kind];
    const set = (s: EditorElement['settings']) => props.onChange(el.id, s);

    if (!active || isMobile) {
      return (
        <div
          data-editor-element-id={el.id}
          className={cn(
            'nl-hover transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-200',
            active && isMobile && 'nl-hover--active ring-2 ring-primary ring-offset-2 ring-offset-background rounded-xl shadow-md',
            (issues.length > 0 || !!error) && 'nl-hover--warn',
          )}
          role="button"
          tabIndex={0}
          aria-label={`ویرایش ${meta.label}`}
          onClick={(e) => {
            stop(e);
            props.onSelect({ type: 'element', id: el.id });
          }}
          onKeyDown={(e) => e.key === 'Enter' && props.onSelect({ type: 'element', id: el.id })}
        >
          <div className={cn(!el.visible && 'opacity-40')}>{node}</div>
          {!el.visible ? (
            <span className="absolute top-1.5 start-1.5 rounded-md bg-popover px-1.5 py-0.5 font-sans text-[10px] text-muted-foreground shadow-xs">
              پنهان
            </span>
          ) : null}
        </div>
      );
    }

    return (
      <div data-editor-element-id={el.id}>
        <EditCard
          onClose={() => props.onSelect(null)}
          type={
            <>
              {meta.icon}
              {meta.label}
            </>
          }
          tools={
            <>
              <Tool label="بالا (Alt+↑)" disabled={i === 0} onClick={() => props.onMove(el.id, 'up')}>
                <ArrowUpIcon />
              </Tool>
              <Tool label="پایین (Alt+↓)" disabled={i === elements.length - 1} onClick={() => props.onMove(el.id, 'down')}>
                <ArrowDownIcon />
              </Tool>
              <Tool label="حذف (Delete)" danger onClick={() => props.onRemove(el.id)}>
                <Trash2Icon />
              </Tool>
            </>
          }
          source={sourceOf(el, set, props.focusId === el.id, props.statusOf?.(el.id))}
          status={props.statusOf?.(el.id)}
          reveal={props.focusId === el.id}
          onShortcut={(action) => {
            if (action === 'up' && i > 0) props.onMove(el.id, 'up');
            else if (action === 'down' && i < elements.length - 1) props.onMove(el.id, 'down');
            else if (action === 'duplicate') props.onDuplicate(el);
            else if (action === 'remove') props.onRemove(el.id);
          }}
          options={optionsOf(el, set)}
          issues={[...(error ? [error] : []), ...issues]}
          footer={
            <>
              <Toggle label="نمایش در صفحه" checked={el.visible} onChange={() => props.onToggle(el)} />
              {el.kind === 'link_button' ? (
                <>
                  <Toggle label="تب جدید" checked={el.settings.open_in_new_tab} onChange={(v) => set({ ...el.settings, open_in_new_tab: v })} />
                  <Toggle label="شمارش کلیک" checked={el.settings.track_clicks} onChange={(v) => set({ ...el.settings, track_clicks: v })} />
                </>
              ) : null}
            </>
          }
        >
          <div className={cn(!el.visible && 'opacity-50')}>
            <ElementEditor el={el} theme={theme} assetUrl={assetUrl} lucideIcon={lucideIcon} upload={upload} onChange={set} />
          </div>
        </EditCard>
      </div>
    );
  };

  const wrapProfile = (node: ReactNode) => {
    const active = selection?.type === 'profile';
    if (!active || isMobile) {
      return (
        <div
          data-editor-element-id="profile"
          className={cn(
            'nl-hover transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-200',
            active && isMobile && 'nl-hover--active rounded-2xl',
            !content.profile.name && 'nl-hover--warn',
          )}
          role="button"
          tabIndex={0}
          aria-label="ویرایش پروفایل"
          onClick={(e) => {
            stop(e);
            props.onSelect({ type: 'profile' });
          }}
          onKeyDown={(e) => e.key === 'Enter' && props.onSelect({ type: 'profile' })}
        >
          {node}
        </div>
      );
    }
    const avatar = content.profile.avatar;
    return (
      <div data-editor-element-id="profile">
        <EditCard
          onClose={() => props.onSelect(null)}
          type={
            <>
              <UserIcon />
              پروفایل
            </>
          }
          tools={
            <>
              {PROFILE_LAYOUT_TOOLS.map(({ layout, label, icon: Icon }) => (
                <Tool
                  key={layout}
                  label={label}
                  active={content.profile.layout === layout}
                  onClick={() => props.onContent({ ...content, profile: { ...content.profile, layout } })}
                >
                  <Icon />
                </Tool>
              ))}
            </>
          }
          issues={content.profile.name ? [] : ['نام پروفایل خالی است.']}
          footer={
            <>
              <span>برای تعویض تصویر روی آن کلیک کنید؛ نام و بیو را روی صفحه بنویسید.</span>
              <span className="nl-ec-spacer" />
              {avatar ? (
                <Tool label="حذف تصویر" danger onClick={() => props.onContent({ ...content, profile: { ...content.profile, avatar: null } })}>
                  <Trash2Icon />
                  حذف تصویر
                </Tool>
              ) : null}
            </>
          }
        >
          <ProfileEditor content={content} assetUrl={assetUrl} upload={upload} onChange={props.onContent} />
        </EditCard>
      </div>
    );
  };

  // المان یا پروفایل فعال برای دراور حالت موبایل
  const activeElement = selection?.type === 'element' ? byId.get(selection.id) : null;
  const isProfileActive = selection?.type === 'profile';

  let mobileDrawerContent: ReactNode = null;
  if (isMobile && activeElement) {
    const el = activeElement;
    const i = elements.indexOf(el);
    const issues = props.issuesOf(el.id);
    const error = props.errorOf(el.id);
    const meta = ELEMENT_META[el.kind];
    const set = (s: EditorElement['settings']) => props.onChange(el.id, s);

    mobileDrawerContent = (
      <MobileEditDrawer
        open={true}
        onClose={() => props.onSelect(null)}
        type={
          <>
            {meta.icon}
            {meta.label}
          </>
        }
        status={props.statusOf?.(el.id)}
        tools={
          <>
            <Tool label="بالا (Alt+↑)" disabled={i === 0} onClick={() => props.onMove(el.id, 'up')}>
              <ArrowUpIcon />
            </Tool>
            <Tool label="پایین (Alt+↓)" disabled={i === elements.length - 1} onClick={() => props.onMove(el.id, 'down')}>
              <ArrowDownIcon />
            </Tool>
            <Tool label="حذف (Delete)" danger onClick={() => props.onRemove(el.id)}>
              <Trash2Icon />
            </Tool>
          </>
        }
        issues={[...(error ? [error] : []), ...issues]}
      >
        <ElementForm
          el={el}
          upload={upload}
          assetUrl={assetUrl}
          lucideIcon={lucideIcon}
          onChange={set}
          onToggleVisible={() => props.onToggle(el)}
        />
      </MobileEditDrawer>
    );
  } else if (isMobile && isProfileActive) {
    mobileDrawerContent = (
      <MobileEditDrawer
        open={true}
        onClose={() => props.onSelect(null)}
        fitContent
        noScroll
        type={
          <>
            <UserIcon />
            پروفایل
          </>
        }
        issues={content.profile.name ? [] : ['نام پروفایل خالی است.']}
      >
        <ProfileForm
          profile={content.profile}
          upload={upload}
          assetUrl={assetUrl}
          onChange={(profile) => props.onContent({ ...content, profile })}
        />
      </MobileEditDrawer>
    );
  }

  return (
    <>
      <div
        className={cn(
          'mx-auto flex min-h-[calc(100svh-11rem)] w-full flex-col overflow-clip rounded-[20px] shadow-lg ring-1 ring-border transition-[max-width,padding] duration-300 ease-fluent max-md:min-h-[calc(100svh-8rem)] max-md:rounded-none max-md:shadow-none max-md:ring-0',
          CANVAS_WIDTH[props.viewport],
          isMobile && selection && 'pb-[55svh]',
        )}
        data-nl-canvas
        onClick={() => props.onSelect(null)}
        style={editCardVars as CSSProperties | undefined}
      >
        <style>{EDITOR_CSS}</style>
        <LinkPage
          content={content}
          elements={elements}
          assetBaseUrl={upload.assetBaseUrl}
          forceLicense={props.forceLicense}
          preview
          wrapElement={wrapElement}
          wrapProfile={wrapProfile}
          lucideIcon={lucideIcon}
        />
      </div>
      {mobileDrawerContent}
    </>
  );
}

export function BoardSkeleton({ viewport }: { viewport: CanvasViewport }) {
  return (
    <div className={cn('mx-auto flex w-full flex-col items-center gap-3 rounded-[20px] bg-card p-10 ring-1 ring-border', CANVAS_WIDTH[viewport])}>
      <Skeleton className="size-24 rounded-full" />
      <Skeleton className="h-5 w-32" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-14 w-full rounded-xl" />
      ))}
    </div>
  );
}
