/* global process, console, fetch, setTimeout */
// تصاویر ثابت مارکتینگ و بندانگشتی قالب‌های کد را از روی همان کد می‌سازد (src/lib/marketing-shots.ts).
// فقط تصویرهایی که ورودی‌شان عوض شده (اثر انگشت scripts/shot-hash.mjs) دوباره ساخته می‌شوند؛ نام فایل نسخه‌دار
// است و نسخه‌ها در src/lib/shots.generated.json می‌آیند، پس بازدیدکننده همیشه آخرین تصویر را می‌بیند.
// اجرا پس از تغییر کد قالب‌ها/موکاپ‌ها: `pnpm --filter @noroset/web shots` (`-- --all` همه را می‌سازد). اگر سرور
// توسعه روی SHOTS_BASE (پیش‌فرض http://localhost:3000) بالا نباشد، خودش یکی روی پورت ۳۱۰۰ بالا می‌آورد.
// نیاز به Chrome: CHROME_PATH یا مسیر پیش‌فرض نصب.
import { execFile, spawn } from 'node:child_process';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { shotHash } from './shot-hash.mjs';

const run = promisify(execFile);
const SCALE = 2; // همان SHOT_SCALE
const webDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(webDir, '..', '..');
const publicDir = join(webDir, 'public');
const versionsFile = join(webDir, 'src', 'lib', 'shots.generated.json');
const all = process.argv.includes('--all');
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === 'win32'
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : process.platform === 'darwin'
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : 'google-chrome');

async function manifest(base) {
  try {
    const res = await fetch(`${base}/shots/manifest`);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

let base = process.env.SHOTS_BASE ?? 'http://localhost:3000';
let server = null;
let shots = await manifest(base);
if (!shots) {
  base = 'http://localhost:3100';
  console.log('سرور توسعه پیدا نشد؛ اجرای next dev روی ۳۱۰۰ ...');
  server = spawn('pnpm', ['exec', 'next', 'dev', '-p', '3100'], { cwd: webDir, shell: true, stdio: 'ignore' });
  for (let i = 0; i < 120 && !shots; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    shots = await manifest(base);
  }
  if (!shots) throw new Error('سرور توسعه بالا نیامد');
}

const versions = JSON.parse(await readFile(versionsFile, 'utf8'));
const next = {};
const work = await mkdtemp(join(tmpdir(), 'noroset-shots-'));
try {
  for (const [i, shot] of shots.entries()) {
    const hash = shotHash(shot, repoRoot);
    next[shot.file] = hash;
    const out = join(publicDir, shot.file.replace(/\.webp$/, `.${hash}.webp`));
    if (!all && versions[shot.file] === hash) {
      try {
        await readFile(out);
        continue;
      } catch {
        // فایل نیست؛ ساخته می‌شود
      }
    }
    const png = join(work, `${i}.png`);
    await run(chrome, [
      '--headless=new',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--hide-scrollbars',
      '--no-first-run',
      `--user-data-dir=${join(work, 'profile')}`,
      `--force-device-scale-factor=${SCALE}`,
      `--window-size=${shot.width},${shot.height}`,
      '--virtual-time-budget=20000',
      `--screenshot=${png}`,
      '--log-level=3',
      `${base}${shot.path}`,
    ], { maxBuffer: 256 * 1024 * 1024 });
    await mkdir(dirname(out), { recursive: true });
    await sharp(png)
      .resize(shot.width * SCALE, shot.height * SCALE, { fit: 'cover', position: 'left top' })
      .webp({ quality: 80 })
      .toFile(out);
    console.log(`✓ ${shot.file} (${hash})`);
  }

  // نسخه‌های قبلی و تصویرهای حذف‌شده از فهرست
  const keep = new Set(Object.entries(next).map(([file, hash]) => basename(file).replace(/\.webp$/, `.${hash}.webp`)));
  for (const dir of new Set(shots.map((s) => dirname(join(publicDir, s.file))))) {
    for (const name of await readdir(dir)) {
      if (name.endsWith('.webp') && !keep.has(name)) await rm(join(dir, name));
    }
  }
  const sorted = Object.fromEntries(Object.entries(next).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(versionsFile, `${JSON.stringify(sorted, null, 2)}\n`);
} finally {
  await rm(work, { recursive: true, force: true });
  if (server) {
    if (process.platform === 'win32') await run('taskkill', ['/pid', String(server.pid), '/T', '/F']).catch(() => undefined);
    else server.kill();
  }
}
