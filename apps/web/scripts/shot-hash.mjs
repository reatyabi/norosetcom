// اثر انگشت ورودی‌های هر تصویر ثابت (src/lib/marketing-shots.ts): داده + محتوای فایل‌های منبع. مشترک بین
// scripts/shots.mjs (نام نسخه‌دار فایل) و تست تازگی (test/marketing-shots.test.ts).
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SKIP = new Set(['node_modules', 'dist', '.next', 'test']);

function files(path) {
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path)
    .filter((name) => !SKIP.has(name))
    .sort()
    .flatMap((name) => files(join(path, name)));
}

/** ۱۰ کاراکتر hex؛ مسیرهای منبع نسبت به ریشه‌ی ریپو و پایان خط یکسان (CRLF ← LF). */
export function shotHash(shot, repoRoot) {
  const hash = createHash('sha256').update(shot.data);
  for (const source of shot.sources) {
    for (const file of files(join(repoRoot, source))) {
      hash.update(relative(repoRoot, file).replaceAll('\\', '/'));
      hash.update(readFileSync(file).toString('binary').replaceAll('\r\n', '\n'));
    }
  }
  return hash.digest('hex').slice(0, 10);
}
