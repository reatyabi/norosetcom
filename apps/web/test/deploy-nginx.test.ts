import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// پاسخ فرم عمومی از مرورگر روی n8l.ir به /api/noroform/public/ می‌رود (apps/web/src/components/noroform/
// public-form-runtime.tsx). اگر nginx این پیشوند را روی دامنه‌ی کوتاه باز نکند، POST به «return 404» می‌خورد و
// errorMessage همان ۴۰۴ را «پیدا نشد.» نشان می‌دهد؛ یعنی فرم پر می‌شود ولی ثبت نمی‌شود. سقف بدنه‌ی همین
// location هم باید از ۶۴k دامنه بیشتر باشد، وگرنه پاسخ‌های بلند پیش از رسیدن به API ۴۱۳ می‌گیرند.

const CONF = readFileSync(join(__dirname, '..', '..', '..', 'deploy', 'nginx', 'noroset.conf'), 'utf8');

/** بدنه‌ی JSON در Fastify (پیش‌فرض Nest) ۱ مگابایت است؛ nginx نباید سخت‌گیرتر باشد. */
const FASTIFY_JSON_LIMIT = 1024 * 1024;

const BODY_UNITS: Record<string, number> = { '': 1, k: 1024, m: 1024 ** 2, g: 1024 ** 3 };

/** بلوک server دامنه‌ی کوتاه (n8l.ir و زیردامنه‌هایش). */
function publicServerBlock(): string {
  const block = CONF.split(/^server \{\r?$/m)
    .slice(1)
    .find((part) => /server_name\s+n8l\.ir\s+\*\.n8l\.ir;/.test(part));
  if (!block) throw new Error('بلوک server دامنه‌ی کوتاه (n8l.ir) در noroset.conf پیدا نشد');
  return block;
}

/** بلوک server دامنه‌ی خروجی عمومی نوروفرم (n8f.ir). */
function noroformServerBlock(): string {
  const block = CONF.split(/^server \{\r?$/m)
    .slice(1)
    .find((part) => /server_name\s+n8f\.ir;/.test(part));
  if (!block) throw new Error('بلوک server دامنه‌ی نوروفرم (n8f.ir) در noroset.conf پیدا نشد');
  return block;
}

/** متن یک location ساده (بدون بلوک تو در تو) از بلوک server. */
function locationBlock(server: string, prefix: string): string {
  const start = server.indexOf(`location ${prefix} {`);
  if (start < 0) return '';
  return server.slice(start, server.indexOf('}', start));
}

describe('nginx: API عمومی روی دامنه‌ی کوتاه', () => {
  it('closes the noroform public API on n8l.ir after moving forms to n8f', () => {
    const block = publicServerBlock();
    expect(block).not.toContain('location /api/noroform/public/');
    expect(block).toMatch(/location \/api\/ \{\s*return 404;/);
  });

  it('raises the body limit of the noroform route to the API JSON limit on n8f', () => {
    const noroform = locationBlock(noroformServerBlock(), '/api/noroform/public/');
    expect(noroform).not.toBe('');
    const limit = /client_max_body_size\s+(\d+)([kmg]?);/.exec(noroform);
    expect(limit).not.toBeNull();
    expect(Number(limit![1]) * BODY_UNITS[limit![2] ?? '']!).toBeGreaterThanOrEqual(FASTIFY_JSON_LIMIT);
  });

  it('keeps link analytics open and the rest of /api closed on the short domain', () => {
    const block = publicServerBlock();
    expect(block).toMatch(
      /location \/api\/norolink\/public\/ \{\s*proxy_pass http:\/\/127\.0\.0\.1:3001\/norolink\/public\/;/,
    );
    expect(block).toMatch(/location \/api\/ \{\s*return 404;/);
  });

  it('serves the noroform public API and response viewer on n8f.ir', () => {
    const block = noroformServerBlock();
    expect(block).toMatch(/location \/api\/noroform\/public\/ \{\s*client_max_body_size 1m;/);
    expect(block).toMatch(/proxy_pass http:\/\/127\.0\.0\.1:3001\/noroform\/public\/;/);
    expect(block).toMatch(/location \/api\/ \{\s*return 404;/);
    expect(block).toMatch(/location \/ \{\s*proxy_pass http:\/\/127\.0\.0\.1:3000;/);
  });
});
