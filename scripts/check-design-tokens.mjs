#!/usr/bin/env node
/**
 * گارد دیزاین‌سیستم (فاز ۱ مهاجرت) — فقط Node stdlib.
 *
 *   node scripts/check-design-tokens.mjs            # گزارش (خروج ۰)
 *   node scripts/check-design-tokens.mjs --strict   # شکست در صورت تخلف
 *   node scripts/check-design-tokens.mjs --json     # خروجی JSON
 *
 * قواعد: پالت خام Tailwind، توکن/کلاس منسوخ Fluent، hex خام، transition-all، z-index دلبخواه.
 * allowlist صریح برای داده‌ی محصول (تم‌های فرم/لینک)، مارکتینگ و رنگ‌های دسته‌ای.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const STRICT = process.argv.includes('--strict');
const JSON_OUT = process.argv.includes('--json');

const SCAN_DIRS = ['apps/web/src', 'packages/ui/src', 'products'];
const EXT = /\.(tsx?|css)$/;
const SKIP = /(^|[\\/])(node_modules|\.next|dist|coverage)([\\/]|$)/;

/** allowlist: زیررشته‌ی مسیر نرمال‌شده → قواعدی که در آن فایل مجازند. */
const ALLOW = [
  // داده‌ی محصول: تم‌های آماده (hex مجاز، انتخاب کاربر است)
  { path: 'form/templates.ts', rules: ['raw-hex', 'raw-palette'] },
  { path: 'form/form-thumb.tsx', rules: ['raw-hex', 'raw-palette'] },
  { path: 'editor/_components/dialogs.tsx', rules: ['raw-palette', 'raw-hex'] },
  { path: 'editor/_components/types.ts', rules: ['raw-hex'] },
  { path: 'editor/_components/element-form.tsx', rules: ['raw-hex'] },
  { path: 'admin/blog/[id]/_components/seo-panel.tsx', rules: ['raw-hex'] },
  { path: 'app/layout.tsx', rules: ['raw-hex'] },
  { path: 'n8l/_components/qr-modal.tsx', rules: ['raw-hex'] },
  { path: 'components/brand-paths.ts', rules: ['raw-hex'] },
  { path: 'products/norolink/ui/styles.ts', rules: ['raw-hex'] },
  { path: 'link/templates/template-preview-dialog.tsx', rules: ['raw-palette'] },
  { path: 'editor/_components/theme-panel.tsx', rules: ['raw-hex', 'raw-palette'] },
  { path: 'editor/_components/background-dialog.tsx', rules: ['raw-hex'] },
  { path: 'editor/_components/board.tsx', rules: ['raw-hex'] },
  { path: 'editor/_components/publish-dialog.tsx', rules: ['raw-hex'] },
  { path: 'lib/submissions-print.ts', rules: ['raw-hex'] },
  { path: 'lib/support.ts', rules: ['raw-hex'] },
  // مارکتینگ: اسکین برند (فاز ۳ یکپارچه می‌شود)
  { path: '(marketing)/', rules: ['raw-palette', 'raw-hex', 'transition-all'] },
  { path: 'n8l/_components/', rules: ['raw-palette'] },
  { path: 'nls/', rules: ['raw-hex'] },
  // رنگ دسته‌ای (تیِر اشتراک/آواتار/برند فایل) — با سند مجاز است
  { path: 'shell-menus.tsx', rules: ['raw-palette'] },
  { path: 'link-showcase.tsx', rules: ['raw-palette'] },
  { path: 'file-type-icon.tsx', rules: ['raw-hex'] },
  { path: 'blog-prose.css', rules: ['raw-palette'] },
  // منبع توکن‌ها: تعریف hex در همین فایل‌ها مجاز است
  { path: 'packages/ui/src/styles/globals.css', rules: ['raw-hex', 'raw-palette', 'legacy-fluent'] },
  // داده‌ی محصول و artwork: hex بخشی از داده است، نه تصمیم UI
  { path: 'products/norolink/shared/', rules: ['raw-hex'] },
  { path: 'products/norolink/test/', rules: ['raw-hex'] },
  { path: 'products/noroform/ui/theme.ts', rules: ['raw-hex'] },
  { path: 'products/noroform/ui/background.tsx', rules: ['raw-hex'] },
  { path: 'products/noroform/test/', rules: ['raw-hex'] },
  { path: 'packages/ui/src/components/motion-art.tsx', rules: ['raw-hex'] },
  { path: 'packages/ui/src/components/system-icon.tsx', rules: ['raw-hex'] },
  { path: 'packages/ui/src/lib/theme.ts', rules: ['raw-hex'] },
  { path: 'product-home.tsx', rules: ['raw-hex'] },
  { path: '(marketing)/marketing.css', rules: ['raw-hex', 'raw-palette'] },
  { path: 'n8f/n8f.css', rules: ['raw-hex', 'raw-palette'] },
  { path: 'lib/fonts.ts', rules: ['raw-hex'] },
];

const RULES = {
  'raw-palette': {
    label: 'raw Tailwind palette (use tokens)',
    test: (line) =>
      /\b(?:bg|text|border|ring|from|to|via|fill|stroke|outline|decoration|divide|placeholder|shadow|accent)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|[1-9]00|950)\b/.exec(line)?.[0],
    severity: 'error',
  },
  'legacy-fluent': {
    label: 'legacy Fluent token/class (remove in phase 2-3)',
    test: (line) =>
      /\b(?:ring-)?(?:stroke-card|stroke-input|stroke-control-bottom)\b|\bbg-control\b|\bshadow-(?:card|flyout|dialog)\b|\brounded-overlay\b|\bacrylic\b|\bbg-layer\b/.exec(line)?.[0],
    severity: 'error',
  },
  'raw-hex': {
    label: 'raw hex color in UI logic',
    test: (line) => /#[0-9a-fA-F]{6}\b/.exec(line)?.[0],
    severity: 'warn',
  },
  'transition-all': {
    label: 'transition-all (limit to transform/opacity/color)',
    test: (line) => /\btransition-all\b/.exec(line)?.[0],
    severity: 'warn',
  },
  'z-arbitrary': {
    label: 'z-index off-scale (0/10/20/30/40/50/60/100/110)',
    test: (line) => {
      const m = /z-\[(\d+)\]/.exec(line);
      if (!m) return null;
      const allowed = [0, 10, 20, 30, 40, 50, 60, 100, 110];
      return allowed.includes(Number(m[1])) ? null : m[0];
    },
    severity: 'error',
  },
};

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const full = join(dir, name);
    if (SKIP.test(full)) continue;
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (EXT.test(name)) out.push(full);
  }
  return out;
}

function allowed(relPath, rule) {
  return ALLOW.some((entry) => relPath.includes(entry.path) && entry.rules.includes(rule));
}

const findings = [];
const files = SCAN_DIRS.flatMap((d) => walk(join(ROOT, d)));

for (const file of files) {
  const relPath = relative(ROOT, file).replace(/\\/g, '/');
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const [rule, def] of Object.entries(RULES)) {
      const hit = def.test(line);
      if (!hit) continue;
      if (allowed(relPath, rule)) continue;
      findings.push({ rule, severity: def.severity, file: relPath, line: i + 1, match: hit });
    }
  });
}

const byRule = findings.reduce((acc, f) => {
  acc[f.rule] = (acc[f.rule] ?? 0) + 1;
  return acc;
}, {});

if (JSON_OUT) {
  console.log(JSON.stringify({ files: files.length, total: findings.length, byRule, findings }, null, 2));
} else {
  console.log(`\nDesign token guard - scanned ${files.length} files\n`);
  if (!findings.length) {
    console.log('OK: no violations.');
  } else {
    for (const [rule, count] of Object.entries(byRule).sort((a, b) => b[1] - a[1])) {
      console.log(`• ${RULES[rule].label}: ${count}`);
    }
    console.log('\n--- first 25 ---');
    for (const f of findings.slice(0, 25)) {
      console.log(`  ${f.file}:${f.line}  [${f.rule}]  ${f.match}`);
    }
    const rest = findings.length - 25;
    if (rest > 0) console.log(`  … و ${rest} مورد دیگر (خروجی کامل: --json)`);
  }
}

if (STRICT && findings.some((f) => f.severity === 'error')) process.exit(1);
