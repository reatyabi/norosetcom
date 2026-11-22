// دیزاین سیستم صفحه‌ی لینک: مستقل از @noroset/ui و Tailwind پلتفرم. همه‌ی کلاس‌ها زیر .nl-root
// و همه‌ی رنگ‌ها/اندازه‌ها از متغیرهای تم (resolveTheme) و توکن‌های اندازه‌ی زیر می‌آیند.

/** بازه‌ی عرض صفحه (px) که اندازه‌ها در آن از مقدار موبایل به دسکتاپ می‌رسند. */
export const FLUID_MIN_WIDTH = 360;
/** عرض ستون دسکتاپ (§9.8): اندازه‌ها تا همین عرض بزرگ می‌شوند. */
export const FLUID_MAX_WIDTH = 720;
/** عرض قاب از آن به بالا «دسکتاپ» است (سوئیچ نمای دسکتاپ ادیتور فقط وقتی جا هست). */
export const DESKTOP_MIN_WIDTH = 640;

const round = (n: number) => Math.round(n * 1000) / 1000;

/**
 * اندازه‌ی سیال: در عرض ≤ FLUID_MIN_WIDTH برابر min، در ≥ FLUID_MAX_WIDTH برابر max و میان آن خطی.
 * بر پایه‌ی عرض خود صفحه (cqi روی .nl-frame)، نه viewport؛ پس بوم ادیتور، پیش‌نمایش و صفحه‌ی عمومی یکسان‌اند.
 * همه‌ی توکن‌ها یک بازه دارند تا با هم و هم‌نسبت تغییر کنند.
 */
export function fluid(min: number, max: number): string {
  if (min === max) return `${min}px`;
  const slope = (max - min) / (FLUID_MAX_WIDTH - FLUID_MIN_WIDTH);
  const base = round(min - slope * FLUID_MIN_WIDTH);
  return `clamp(${Math.min(min, max)}px,calc(${base}px + ${round(slope * 100)}cqi),${Math.max(min, max)}px)`;
}

/**
 * توکن‌های اندازه [موبایل، دسکتاپ] (دسکتاپ ≈ ۱.۲ برابر). تایپ: مقیاس Minor Third (۱.۲) با پایه‌ی ۱۶/۱۷؛
 * فاصله و اجزا روی شبکه‌ی ۴px. هدف لمسی هرگز < ۴۴px و متن بدنه هرگز < ۱۶px.
 * مقدار دسکتاپ در عرض ستون ۸۴۰px است (اجزا ≤ ۱.۴ برابر موبایل).
 */
export const SIZE_TOKENS: Record<string, readonly [number, number]> = {
  // تایپوگرافی
  'fs-sm': [13, 15],
  'fs-body': [16, 18],
  'fs-btn': [15, 17],
  'fs-h3': [18, 22],
  'fs-h2': [20, 26],
  'fs-h1': [24, 31],
  'fs-name': [24, 33],
  // فاصله (شبکه‌ی ۴px)
  'sp-1': [4, 4],
  'sp-2': [8, 8],
  'sp-3': [12, 16],
  'sp-4': [16, 20],
  'sp-5': [24, 32],
  'sp-6': [32, 48],
  'pad-x': [16, 32],
  'pad-top': [40, 72],
  'pad-bottom': [16, 24],
  // اجزا
  'btn-h': [48, 60],
  icon: [24, 30],
  // دایره‌ی آیکون شبکه و آیکون داخلش (~۶۲٪ دایره؛ فاصله‌ی داخلی کم)
  social: [64, 80],
  'social-icon': [40, 50],
  'avatar-stacked': [104, 144],
  'avatar-side': [96, 132],
  'map-sm': [180, 240],
  'map-md': [240, 330],
  'map-lg': [320, 440],
  // گوشه‌ها (گوشه‌ی تم کم/متوسط/زیاد از این‌ها می‌آید)
  'r-sm': [6, 8],
  'r-md': [12, 16],
  'r-lg': [16, 22],
};

/** کف توکن‌های متن با ضریب «اندازه‌ی متن» (--nl-type-scale): بدنه ≥ ۱۶ و متن دکمه ≥ ۱۵ (هدف خوانایی)، متن کوچک ≥ ۱۲. */
const TYPE_FLOOR: Record<string, number> = { 'fs-body': 16, 'fs-btn': 15, 'fs-sm': 12 };

const TOKEN_CSS = Object.entries(SIZE_TOKENS)
  .map(([name, [min, max]]) => {
    if (!name.startsWith('fs-')) return `--nl-${name}:${fluid(min, max)}`;
    const scaled = `calc(${fluid(min, max)} * var(--nl-type-scale,1))`;
    return `--nl-${name}:${TYPE_FLOOR[name] ? `max(${TYPE_FLOOR[name]}px,${scaled})` : scaled}`;
  })
  .join(';');

export const NL_CSS = `
.nl-frame{container-type:inline-size;position:relative;display:grid;grid-template:minmax(0,1fr)/100%;min-height:100svh}
/* absolute: عکس در ارتفاع صفحه اثر نگذارد (وگرنه صفحه به اندازه‌ی نسبت عکس کش می‌آید) */
.nl-bg{position:absolute;inset:0;overflow:clip}
.nl-bg-sticky{position:sticky;top:0;height:min(100svh,100%);overflow:clip}
/* محوشدن و بزرگ‌نمایی (برای پوشاندن لبه‌ی محو) با شدت لایه: لایه‌ی کم ← عکس واضح */
.nl-bg-sticky img{display:block;width:100%;height:100%;object-fit:cover;filter:blur(calc(${fluid(10, 24)} * var(--nl-bg-amount,.5)));transform:scale(calc(1 + .08 * var(--nl-bg-amount,.5)))}
.nl-bg-sticky::after{content:"";position:absolute;inset:0;background:var(--nl-bg-tint)}
.nl-root{${TOKEN_CSS};
  position:relative;background:var(--nl-bg);color:var(--nl-fg);font-family:var(--nl-font);direction:rtl;
  padding:var(--nl-pad-top) var(--nl-pad-x) var(--nl-pad-bottom);display:flex;flex-direction:column;align-items:center;
  font-size:var(--nl-fs-body);line-height:1.6;-webkit-font-smoothing:antialiased}
.nl-root,.nl-root *,.nl-root *::before,.nl-root *::after{box-sizing:border-box}
.nl-page{width:100%;max-width:${FLUID_MAX_WIDTH}px;display:flex;flex-direction:column;gap:var(--nl-sp-3)}
.nl-profile{--nl-avatar:var(--nl-avatar-stacked);display:flex;flex-direction:column;align-items:center;text-align:center;
  gap:var(--nl-sp-2);margin-bottom:var(--nl-sp-4)}
.nl-profile-text{display:flex;flex-direction:column;align-items:inherit;gap:var(--nl-sp-1);min-width:0}
.nl-profile--side_right,.nl-profile--side_left{--nl-avatar:var(--nl-avatar-side);flex-direction:row;align-items:center;gap:var(--nl-sp-4)}
.nl-profile--side_right{text-align:right}
.nl-profile--side_left{flex-direction:row-reverse;text-align:left}
.nl-profile--side_right .nl-profile-text{align-items:flex-start}
.nl-profile--side_left .nl-profile-text{align-items:flex-end}
.nl-profile--side_right .nl-avatar,.nl-profile--side_left .nl-avatar{flex-shrink:0}
.nl-profile--side_right .nl-name,.nl-profile--side_left .nl-name{margin:0}
.nl-avatar{width:var(--nl-avatar);height:var(--nl-avatar);border-radius:50%;object-fit:cover;background:var(--nl-surface);color:var(--nl-surface-fg);
  display:flex;align-items:center;justify-content:center;font-size:calc(var(--nl-avatar) * .38);font-weight:700;overflow:hidden}
.nl-avatar img{width:100%;height:100%;object-fit:cover;display:block}
.nl-name{font-size:var(--nl-fs-name);font-weight:700;margin:var(--nl-sp-1) 0 0;line-height:1.35}
.nl-bio{font-size:var(--nl-fs-body);color:var(--nl-muted);margin:0;white-space:pre-line;max-width:560px;line-height:1.7}
.nl-btn{display:flex;width:100%;align-items:center;gap:var(--nl-sp-3);min-height:var(--nl-btn-h);padding:var(--nl-sp-1) var(--nl-sp-4);
  border-radius:var(--nl-radius);text-decoration:none;font-weight:600;font-size:var(--nl-fs-btn);line-height:1.5;
  border:2px solid transparent;transition:transform .15s ease,filter .15s ease}
.nl-btn:hover{transform:translateY(-1px);filter:brightness(1.04)}
.nl-btn:active{transform:scale(.99)}
.nl-btn:focus-visible,.nl-social a:focus-visible,.nl-text a:focus-visible{outline:2px solid var(--nl-fg);outline-offset:3px}
.nl-btn--filled{background:var(--nl-btn-bg,var(--nl-accent));color:var(--nl-btn-fg,var(--nl-accent-fg))}
.nl-btn--outline{background:transparent;border-color:var(--nl-btn-ink,var(--nl-accent-ink));color:var(--nl-btn-ink,var(--nl-accent-ink))}
.nl-btn--tonal{background:color-mix(in srgb,var(--nl-btn-bg,var(--nl-accent)) var(--nl-btn-mix,var(--nl-tonal-mix)),transparent);color:var(--nl-btn-ink,var(--nl-accent-ink))}
.nl-btn--soft{background:var(--nl-btn-bg,var(--nl-surface));color:var(--nl-btn-fg,var(--nl-surface-fg))}
.nl-btn--glass{background:color-mix(in srgb,var(--nl-btn-bg,#ffffff) 16%,transparent);color:var(--nl-fg);
  border-color:color-mix(in srgb,var(--nl-fg) 26%,transparent);box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 4px 16px rgba(0,0,0,.08);
  -webkit-backdrop-filter:blur(14px) saturate(1.4);backdrop-filter:blur(14px) saturate(1.4)}
.nl-btn--glass:hover{filter:none;background:color-mix(in srgb,var(--nl-btn-bg,#ffffff) 24%,transparent)}
.nl-btn--shadow{background:var(--nl-btn-bg,var(--nl-surface));color:var(--nl-btn-fg,var(--nl-surface-fg));border-color:var(--nl-fg);
  box-shadow:4px 4px 0 var(--nl-fg);transition:transform .12s ease,box-shadow .12s ease}
.nl-btn--shadow:hover{transform:translate(-2px,-2px);box-shadow:6px 6px 0 var(--nl-fg);filter:none}
.nl-btn--shadow:active{transform:translate(2px,2px);box-shadow:2px 2px 0 var(--nl-fg)}
.nl-btn-icon,.nl-btn-spacer{width:calc(var(--nl-icon) + 8px);height:calc(var(--nl-icon) + 8px);flex:none;display:flex;align-items:center;justify-content:center}
.nl-btn-icon svg{width:var(--nl-icon);height:var(--nl-icon)}
.nl-btn-icon img{width:100%;height:100%;border-radius:var(--nl-r-sm);object-fit:cover;display:block}
.nl-btn-label{flex:1;min-width:0;text-align:center;overflow-wrap:anywhere}
.nl-social{display:flex;flex-wrap:wrap;justify-content:center;gap:var(--nl-sp-3) var(--nl-sp-4)}
.nl-social-item{display:flex;flex-direction:column;align-items:center;gap:var(--nl-sp-1);min-width:var(--nl-social);
  text-decoration:none;color:var(--nl-fg);border-radius:var(--nl-r-sm)}
.nl-social-circle,.nl-social-btn{width:var(--nl-social);height:var(--nl-social);display:flex;align-items:center;justify-content:center;
  border-radius:50%;background:var(--nl-social-bg,var(--nl-surface));color:#fff;flex:none;
  box-shadow:0 0 0 1px color-mix(in srgb,var(--nl-fg) 12%,transparent),0 2px 6px rgba(0,0,0,.12);transition:transform .15s ease,filter .15s ease}
a.nl-social-item:hover .nl-social-circle{transform:translateY(-2px);filter:brightness(1.08)}
.nl-social-circle svg,.nl-social-btn svg{width:var(--nl-social-icon);height:var(--nl-social-icon)}
.nl-social-label{font-size:var(--nl-fs-sm);line-height:1.3;white-space:nowrap}
.nl-el--break{margin-top:var(--nl-sp-3)}
.nl-text{font-size:var(--nl-fs-body);line-height:1.85;overflow-wrap:anywhere}
.nl-text>*{margin:0}
.nl-text>*+*{margin-top:var(--nl-sp-3)}
.nl-text h1{font-size:var(--nl-fs-h1);line-height:1.4}
.nl-text h2{font-size:var(--nl-fs-h2);line-height:1.45}
.nl-text h3{font-size:var(--nl-fs-h3);line-height:1.5}
.nl-text p{white-space:pre-line}
.nl-text ul,.nl-text ol{padding-inline-start:var(--nl-sp-5)}
.nl-text ul{list-style:disc}
.nl-text ol{list-style:decimal}
.nl-text a{color:inherit;text-decoration:underline;text-underline-offset:3px}
.nl-media{display:block;border-radius:min(var(--nl-radius),var(--nl-r-lg));overflow:hidden;background:var(--nl-surface);position:relative}
.nl-media img{display:block;width:100%;height:auto}
.nl-media[data-aspect] img{height:100%;object-fit:cover}
.nl-media[data-aspect="1:1"]{aspect-ratio:1/1}
.nl-media[data-aspect="4:3"]{aspect-ratio:4/3}
.nl-media[data-aspect="16:9"]{aspect-ratio:16/9}
.nl-embed{aspect-ratio:16/9}
/* اسلایدر المان تصویر (slider.tsx): کشیدن بومی با scroll-snap، شمارنده، فلش فقط روی دستگاه اشاره‌گر، نقطه‌ها */
.nl-slider{position:relative}
.nl-slider-track{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;overscroll-behavior-x:contain;scrollbar-width:none;
  border-radius:min(var(--nl-radius),var(--nl-r-lg));outline:none}
.nl-slider-track::-webkit-scrollbar{display:none}
.nl-slider-track:focus-visible{outline:2px solid var(--nl-fg);outline-offset:3px}
.nl-slide{flex:0 0 100%;min-width:0;scroll-snap-align:start}
.nl-slide .nl-media{border-radius:0}
.nl-slider-count{position:absolute;top:var(--nl-sp-2);inset-inline-end:var(--nl-sp-2);padding:2px 8px;border-radius:999px;
  background:rgba(0,0,0,.55);color:#fff;font-size:12px;line-height:20px;pointer-events:none;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.nl-slider-arrow{position:absolute;top:calc((100% - 28px) / 2 - 18px);width:36px;height:36px;border:0;border-radius:50%;padding:0;
  display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.45);color:#fff;cursor:pointer;
  -webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);transition:opacity .15s ease}
.nl-slider-arrow svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.nl-slider-arrow--prev{inset-inline-start:var(--nl-sp-2)}
.nl-slider-arrow--next{inset-inline-end:var(--nl-sp-2)}
.nl-slider-arrow:disabled{opacity:0!important;pointer-events:none}
.nl-slider-arrow:focus-visible{outline:2px solid #fff;outline-offset:2px}
@media (hover:hover){.nl-slider-arrow{display:flex;opacity:0}.nl-slider:hover .nl-slider-arrow,.nl-slider-arrow:focus-visible{opacity:1}}
.nl-slider-dots{display:flex;justify-content:center;align-items:center;height:24px;margin-top:4px}
.nl-slider-dot{all:unset;box-sizing:border-box;width:18px;height:24px;display:flex;align-items:center;justify-content:center;cursor:pointer}
.nl-slider-dot::before{content:"";width:6px;height:6px;border-radius:999px;background:var(--nl-fg);opacity:.3;transition:width .2s ease,opacity .2s ease}
.nl-slider-dot[aria-current=true]::before{width:16px;opacity:.9}
.nl-slider-dot:focus-visible{outline:2px solid var(--nl-fg);border-radius:6px}
.nl-embed iframe,.nl-map iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.nl-map[data-height="sm"]{height:var(--nl-map-sm)}
.nl-map[data-height="md"]{height:var(--nl-map-md)}
.nl-map[data-height="lg"]{height:var(--nl-map-lg)}
.nl-map-bar{display:flex;align-items:center;justify-content:space-between;gap:var(--nl-sp-2);font-size:var(--nl-fs-sm);
  margin-top:var(--nl-sp-2);color:var(--nl-muted)}
.nl-map-bar a{color:var(--nl-fg);font-weight:600;text-decoration:none}
.nl-placeholder{border:2px dashed color-mix(in srgb,var(--nl-fg) 30%,transparent);border-radius:min(var(--nl-radius),var(--nl-r-lg));
  padding:var(--nl-sp-4);text-align:center;font-size:var(--nl-fs-sm);color:var(--nl-muted)}
.nl-footer{margin-top:auto;padding-top:var(--nl-sp-4);font-size:var(--nl-fs-sm);color:var(--nl-muted);text-align:center}
.nl-footer a{color:inherit;text-decoration:none;font-weight:600}
.nl-footer .nl-report{display:block;width:fit-content;margin:var(--nl-sp-2) auto 0;padding:6px 8px;font-weight:400;opacity:.85}
.nl-footer .nl-report:hover,.nl-footer .nl-report:focus-visible{text-decoration:underline;opacity:1}
.nl-frame.nl-preview{min-height:100%;flex:1 0 auto}
.nl-preview a,.nl-preview iframe{pointer-events:none}
.nl-edit{all:unset;box-sizing:border-box;display:block;width:100%;min-width:2ch;font:inherit;color:inherit;text-align:inherit;
  line-height:inherit;white-space:pre-wrap;cursor:text;pointer-events:auto;border-radius:6px;
  outline:1px dashed color-mix(in srgb,currentColor 45%,transparent);outline-offset:3px;field-sizing:content}
.nl-edit::placeholder{color:inherit;opacity:.5}
.nl-edit:focus{outline:2px solid color-mix(in srgb,currentColor 70%,transparent)}
.nl-slot{background:none;border:0;padding:0;color:inherit;font:inherit;cursor:pointer;border-radius:8px;
  outline:1px dashed color-mix(in srgb,currentColor 45%,transparent);outline-offset:2px}
.nl-slot:hover,.nl-slot:focus-visible{outline:2px solid color-mix(in srgb,currentColor 70%,transparent)}
.nl-avatar.nl-slot{border-radius:50%;outline-offset:4px}
.nl-social-btn.nl-slot{border-radius:50%}
.nl-social-btn.nl-slot:not(.nl-slot--add){background:var(--nl-social-bg,var(--nl-surface));color:#fff;outline-color:color-mix(in srgb,var(--nl-fg) 45%,transparent)}
.nl-social-btn.nl-slot:not(.nl-slot--add):hover,.nl-social-btn.nl-slot:not(.nl-slot--add):focus-visible{outline-color:color-mix(in srgb,var(--nl-fg) 70%,transparent)}
.nl-slot--add{opacity:.6}
.nl-slot--block{display:block;width:100%;cursor:pointer;font:inherit}
.nl-caption{margin-top:var(--nl-sp-2);font-size:var(--nl-fs-sm);color:var(--nl-muted);text-align:center}
/* کانتینر خودکار روی عکس با لایه‌ی کم (resolveTheme)؛ موبایل و دسکتاپ */
.nl-root--card .nl-page{background:var(--nl-card-bg);border:1px solid var(--nl-card-border);border-radius:min(var(--nl-radius),var(--nl-r-lg));
  padding:var(--nl-sp-5);box-shadow:0 16px 48px rgba(0,0,0,.14);-webkit-backdrop-filter:var(--nl-card-filter);backdrop-filter:var(--nl-card-filter)}
.nl-root--card .nl-btn--soft{background:var(--nl-btn-bg,color-mix(in srgb,var(--nl-fg) 7%,var(--nl-surface)))}
.nl-root--card .nl-btn--glass{-webkit-backdrop-filter:none;backdrop-filter:none}
@media (prefers-reduced-motion:reduce){.nl-btn,.nl-social-circle,.nl-slider-dot::before{transition:none}.nl-btn:hover,a.nl-social-item:hover .nl-social-circle{transform:none}}
`;
