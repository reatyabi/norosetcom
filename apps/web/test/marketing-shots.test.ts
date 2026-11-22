import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LINK_TEMPLATES } from '@noroset/norolink/ui';
import { shotHash } from '../scripts/shot-hash.mjs';
import { hasTemplateThumb, shotList, versioned } from '../src/lib/marketing-shots';
import versions from '../src/lib/shots.generated.json';

const web = join(__dirname, '..');
const repoRoot = join(web, '..', '..');

// تصاویر ثابت باید با کد منبعشان هم‌خوان باشند؛ شکست یعنی کد عوض شده و `pnpm --filter @noroset/web shots` اجرا نشده.
describe('marketing shots', () => {
  it.each(shotList().map((s) => [s.file, s] as const))('%s تازه است', (file, shot) => {
    expect((versions as Record<string, string>)[file], 'pnpm --filter @noroset/web shots').toBe(shotHash(shot, repoRoot));
    expect(existsSync(join(web, 'public', versioned(file)))).toBe(true);
  });

  it('تصاویر دستی بخش امکانات صفحه‌ی اصلی هستند', () => {
    for (const kind of ['link_button', 'social_icons', 'rich_text', 'image', 'video_embed', 'map_embed']) {
      expect(existsSync(join(web, 'public', 'images', 'features', `${kind}.webp`)), kind).toBe(true);
    }
  });

  it('هر قالب کد تصویر دارد', () => {
    expect(LINK_TEMPLATES.filter((t) => !hasTemplateThumb(t.id)).map((t) => t.id)).toEqual([]);
  });
});
