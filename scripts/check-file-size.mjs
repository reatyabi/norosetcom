#!/usr/bin/env node
/**
 * بودجه‌ی اندازه‌ی فایل (فاز ۵). قاعده: هر فایل UI یک مسئولیت؛ رشد بی‌سروصدا ممنوع.
 *   node scripts/check-file-size.mjs           # گزارش
 *   node scripts/check-file-size.mjs --strict  # شکست اگر فایل جدید > سقف یا فایل baseline بزرگ‌تر شود
 *
 * سقف: page.tsx = ۲۵KB، سایر فایل‌های UI = ۳۰KB.
 * BASELINE = وضعیت فعلی فایل‌های بزرگ (بدهی ثبت‌شده)؛ فقط کوچک‌شدن مجاز است.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const STRICT = process.argv.includes('--strict');
const PAGE_LIMIT = 25 * 1024;
const UI_LIMIT = 30 * 1024;
const DIRS = ['apps/web/src', 'packages/ui/src', 'products'];
const SKIP = /(node_modules|\.next|dist|coverage|\.test\.|\.spec\.)/;

/** allowlist: فایل‌های داده (نه منطق UI). */
const DATA_ALLOWLIST = ['products/norolink/shared/templates.ts', 'products/norolink/shared/theme.ts'];

/** بدهی فعلی: مسیر → حداکثر بایت مجاز (بدون رشد). فقط کوچک‌شدن مجاز است. */
const BASELINE = {
  'apps/web/src/app/(panel)/form/[id]/results/page.tsx': 147456,
  'apps/web/src/app/(panel)/billing/page.tsx': 44544,
  'apps/web/src/app/(panel)/link/[slug]/editor/_components/board.tsx': 46080,
  'apps/web/src/app/(panel)/link/[slug]/editor/_components/element-form.tsx': 41984,
  'apps/web/src/app/(marketing)/_components/desktop-mockup-screen.tsx': 41984,
  'apps/web/src/app/(panel)/link/[slug]/editor/_components/link-editor.tsx': 40960,
  'apps/web/src/app/(panel)/link/[slug]/editor/_components/inline.tsx': 38912,
  'apps/web/src/app/(panel)/form/[id]/editor/page.tsx': 34816,
  'products/noroform/ui/public-form.tsx': 33792,
  'apps/web/src/app/(panel)/link/[slug]/editor/_components/publish-dialog.tsx': 32768,
  'apps/web/src/app/(panel)/admin/campaigns/page.tsx': 31744,
  'apps/web/src/app/(panel)/shell-menus.tsx': 31744,
  'apps/web/src/app/(panel)/admin/billing/page.tsx': 27648,
  'apps/web/src/app/(panel)/file/page.tsx': 27648,
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
    else if (/\.(tsx?|css)$/.test(name)) out.push(full);
  }
  return out;
}

const files = DIRS.flatMap((d) => walk(join(ROOT, d)));
const rows = [];
const violations = [];
const overLimit = [];

for (const file of files) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  if (DATA_ALLOWLIST.includes(rel)) continue;
  const bytes = readFileSync(file).length;
  const isPage = rel.endsWith('/page.tsx') || rel.endsWith('/layout.tsx');
  const limit = isPage ? PAGE_LIMIT : UI_LIMIT;
  const allowed = Math.max(limit, BASELINE[rel] ?? 0);
  if (bytes > allowed) {
    violations.push({ rel, kb: +(bytes / 1024).toFixed(1), limitKb: +(limit / 1024).toFixed(0), ceilingKb: +(allowed / 1024).toFixed(0) });
  }
  if (bytes > limit) overLimit.push({ rel, kb: +(bytes / 1024).toFixed(1) });
  rows.push({ rel, kb: +(bytes / 1024).toFixed(1) });
}

rows.sort((a, b) => b.kb - a.kb);
console.log(`\nFile size budget - scanned ${files.length} files (page<=25KB, ui<=30KB)\n`);
console.log('Top 8:');
for (const r of rows.slice(0, 8)) console.log(`  ${r.kb.toString().padStart(6)}KB  ${r.rel}`);
if (violations.length) {
  console.log(`\nFAIL: ${violations.length} file(s) over budget:`);
  for (const v of violations) console.log(`  ${v.rel} = ${v.kb}KB (limit ${v.limitKb}KB, baseline ceiling ${v.ceilingKb}KB)`);
} else {
  console.log('\nOK: all files within budget.');
}
if (process.argv.includes('--list')) {
  console.log(`\nOver limit (${overLimit.length}) — baseline candidates:`);
  for (const r of overLimit) console.log(`  '${r.rel}': ${Math.ceil(r.kb) * 1024},`);
}

if (STRICT && violations.length) process.exit(1);
