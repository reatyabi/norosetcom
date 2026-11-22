#!/usr/bin/env node
/**
 * تست کنتراست WCAG دیزاین‌سیستم نسخه ۲ — منبع مقادیر: packages/ui/src/styles/globals.css
 *   node scripts/check-contrast.mjs [--json]
 * ماتریس: ۵ base color × ۴ برند نمونه × ۲ تم.
 * توجه: color-mix با تقریب sRGB حساب می‌شود؛ برای همین آستانه‌ی متن ۴.۵ و حاشیه‌ی اطمینان ۰.۱ در نظر گرفته شده.
 */
import { readFileSync } from 'node:fs';

const CSS = readFileSync('packages/ui/src/styles/globals.css', 'utf8');
const JSON_OUT = process.argv.includes('--json');

const hex = (h) => h.toLowerCase();
const rgb = (h) => {
  const v = h.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
};
const toHex = (arr) =>
  '#' + arr.map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, percentA) => {
  const A = rgb(a);
  const B = rgb(b);
  return toHex(A.map((c, i) => (c * percentA + B[i] * (100 - percentA)) / 100));
};
const lum = (h) => {
  const [r, g, b] = rgb(h).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};
const pickOn = (bg) => (ratio(bg, '#ffffff') >= ratio(bg, '#0b1220') ? '#ffffff' : '#0b1220');

/* ---------- خواندن رامپ‌ها از CSS ---------- */
const brandHex = hex(/--brand:\s*(#[0-9a-fA-F]{6})/.exec(CSS)?.[1] ?? '#2563eb');
const ramps = {};
for (const m of CSS.matchAll(/html\[data-base='([a-z]+)'\][^{]*\{([^}]*)\}/g)) {
  const ramp = {};
  for (const d of m[2].matchAll(/--base-(\d+):\s*(#[0-9a-fA-F]{6})/g)) ramp[d[1]] = hex(d[2]);
  if (Object.keys(ramp).length === 11) ramps[m[1]] = ramp;
}

const brandRamp = (b) => ({
  50: mix(b, '#ffffff', 6),
  100: mix(b, '#ffffff', 12),
  200: mix(b, '#ffffff', 24),
  300: mix(b, '#ffffff', 40),
  400: mix(b, '#ffffff', 62),
  500: mix(b, '#ffffff', 82),
  600: b,
  700: mix(b, '#000000', 88),
  800: mix(b, '#000000', 76),
  900: mix(b, '#000000', 64),
  950: mix(b, '#000000', 50),
});

const STATUS = {
  success: { light: '#15803d', dark: '#4ade80' },
  warning: { light: '#b45309', dark: '#fbbf24' },
  info: null, // از برند
  destructive: { light: '#dc2626', dark: '#f87171' },
};

const BRANDS = { blue: brandHex, indigo: '#4f46e5', emerald: '#059669', amber: '#b45309' };

/** رنگ‌های دسته‌ای (هم‌راستا با :root در globals.css) برای تست متن روی کارت. */
const TONES = { sky: '#0369a1', violet: '#6d28d9', emerald: '#047857', amber: '#b45309', rose: '#be123c', teal: '#0f766e', slate: '#334155' };
/** هم‌راستا با .dark در globals.css */
const TONES_DARK = { sky: '#38bdf8', violet: '#a78bfa', emerald: '#34d399', amber: '#fbbf24', rose: '#fb7185', teal: '#2dd4bf', slate: '#94a3b8' };

function audit(baseName, base, brandName, brand) {
  const R = brandRamp(brand);
  const rows = [];
  const add = (name, fg, bg, min) => {
    const value = ratio(fg, bg);
    rows.push({ name, fg, bg, ratio: +value.toFixed(2), min, ok: value >= min - 0.005 });
  };

  /* --- روشن --- */
  const onPrimary = pickOn(R[600]);
  add('light / foreground on background', base[900], '#ffffff', 4.5);
  add('light / foreground on card', base[900], '#ffffff', 4.5);
  add('light / muted-foreground on background', base[600], '#ffffff', 4.5);
  add('light / muted-foreground on muted', base[600], base[100], 4.5);
  add('light / primary-foreground on primary', onPrimary, R[600], 4.5);
  add('light / white on destructive', '#ffffff', STATUS.destructive.light, 4.5);
  for (const key of ['success', 'warning', 'destructive']) {
    const c = STATUS[key].light;
    const surface = mix(c, '#ffffff', key === 'warning' ? 10 : 10);
    const ink = mix(c, '#000000', 85);
    add(`light / ${key} ink on surface`, ink, surface, 4.5);
  }
  add('light / info ink on surface', mix(R[600], '#000000', 85), mix(R[600], '#ffffff', 8), 4.5);
  // متن دسته‌ای (tone) روی کارت سفید باید AA بماند.
  for (const [name, hex] of Object.entries(TONES)) add(`light / text-tone-${name} on card`, hex, '#ffffff', 4.5);
  add('light / ring on background (non-text)', R[600], '#ffffff', 3);
  add('light / border on background (decorative)', base[200], '#ffffff', 1.2);

  /* --- تیره --- */
  const R950 = mix(brand, '#000000', 50);
  const R900 = mix(brand, '#000000', 64);
  const R800 = mix(brand, '#000000', 76);
  const bg = mix(base[950], R950, 88);
  const card = mix(base[900], R900, 90);
  const popover = mix(base[900], R950, 96);
  const muted = mix(base[900], R800, 88);
  const primary = R[400];
  add('dark / foreground on background', '#e6edf7', bg, 4.5);
  add('dark / foreground on card', '#e6edf7', card, 4.5);
  add('dark / muted-foreground on muted', base[400], muted, 4.5);
  add('dark / primary-foreground on primary', '#0b1220', primary, 4.5);
  add('dark / dark-on destructive', '#0b1220', STATUS.destructive.dark, 4.5);
  for (const key of ['success', 'warning', 'destructive']) {
    const c = STATUS[key].dark;
    add(`dark / ${key} ink on surface`, c, mix(c, popover, 16), 4.5);
  }
  add('dark / info ink on surface', R[400], mix(R[400], popover, 14), 4.5);
  for (const [name, hex] of Object.entries(TONES_DARK)) add(`dark / text-tone-${name} on card`, hex, card, 4.5);
  add('dark / ring on background (non-text)', R[400], bg, 3);
  add('dark / border on card (decorative)', mix(base[800], R800, 82), card, 1.2);

  return { baseName, brandName, rows };
}

const results = [];
for (const [baseName, base] of Object.entries(ramps)) {
  if (Object.keys(base).length !== 11) continue;
  for (const [brandName, brand] of Object.entries(BRANDS)) results.push(audit(baseName, base, brandName, brand));
}

const failures = results.flatMap((r) =>
  r.rows.filter((x) => !x.ok).map((x) => ({ base: r.baseName, brand: r.brandName, ...x })),
);

if (JSON_OUT) {
  console.log(JSON.stringify({ combos: results.length, failures: failures.length, details: results }, null, 2));
} else {
  console.log(`\nContrast audit - ${results.length} combos (base x brand) x 2 themes\n`);
  for (const r of results.slice(0, 2)) {
    console.log(`— ${r.baseName} / ${r.brandName} —`);
    for (const row of r.rows) console.log(`  ${row.ok ? '✅' : '❌'} ${row.ratio.toFixed(2)} (min ${row.min})  ${row.name}`);
    console.log('');
  }
  if (failures.length) {
    console.log(`FAIL: ${failures.length} violations`);
    for (const f of failures.slice(0, 20)) console.log(`  ${f.base}/${f.brand}: ${f.ratio} < ${f.min} — ${f.name}`);
  } else {
    console.log(`OK: all ${results.length} combos pass AA in both themes.`);
  }
}

if (failures.length) process.exit(1);
