import { describe, expect, it } from 'vitest';
import { fluid, FLUID_MAX_WIDTH, FLUID_MIN_WIDTH, NL_CSS, SIZE_TOKENS } from '../ui/styles';

/** مقدار clamp(...) تولیدشده در عرض صفحه‌ی width (px)؛ cqi = ۱٪ عرض. */
function evaluate(css: string, width: number): number {
  const m = /^clamp\((-?[\d.]+)px,calc\((-?[\d.]+)px \+ (-?[\d.]+)cqi\),(-?[\d.]+)px\)$/.exec(css);
  if (!m) return Number.parseFloat(css);
  const [lo, base, slope, hi] = m.slice(1).map(Number) as [number, number, number, number];
  return Math.min(hi, Math.max(lo, base + (slope * width) / 100));
}

describe('page frame', () => {
  it('keeps the photo background out of the page height', () => {
    expect(NL_CSS).toMatch(/.nl-bg{position:absolute;inset:0/);
    expect(NL_CSS).toMatch(/.nl-frame{[^}]*position:relative/);
  });

  it('pushes the badge to the end of a short page', () => {
    expect(NL_CSS).toMatch(/.nl-frame{[^}]*min-height:100svh/);
    expect(NL_CSS).toMatch(/.nl-footer{margin-top:auto/);
  });
});

describe('fluid sizes', () => {
  it('hits min at the mobile width, max at the desktop width, and clamps outside', () => {
    const css = fluid(16, 20);
    expect(evaluate(css, FLUID_MIN_WIDTH)).toBeCloseTo(16, 2);
    expect(evaluate(css, FLUID_MAX_WIDTH)).toBeCloseTo(20, 2);
    expect(evaluate(css, (FLUID_MIN_WIDTH + FLUID_MAX_WIDTH) / 2)).toBeCloseTo(18, 2);
    expect(evaluate(css, 320)).toBe(16);
    expect(evaluate(css, 1200)).toBe(20);
  });

  it('is a fixed size when min equals max', () => {
    expect(fluid(8, 8)).toBe('8px');
  });

  it('keeps every token monotonic and within the system rules', () => {
    for (const [name, [min, max]] of Object.entries(SIZE_TOKENS)) {
      expect(max, name).toBeGreaterThanOrEqual(min);
      // تایپ و اجزا رشد ملایم دارند (≤ ۱.۴×)؛ حاشیه‌ها و فاصله‌های صفحه عمداً بیشتر باز می‌شوند
      if (!name.startsWith('pad-') && !name.startsWith('sp-')) expect(max / min, name).toBeLessThanOrEqual(1.4);
    }
    expect(SIZE_TOKENS['fs-body']![0]).toBeGreaterThanOrEqual(16);
    expect(SIZE_TOKENS.social![0]).toBeGreaterThanOrEqual(44);
    expect(SIZE_TOKENS['btn-h']![0]).toBeGreaterThanOrEqual(44);
  });

  it('keeps the type hierarchy at every width', () => {
    for (const w of [320, 360, 420, 480, 540, 600, 900]) {
      const v = (t: string) => evaluate(fluid(...SIZE_TOKENS[t]!), w);
      expect(v('fs-sm')).toBeLessThan(v('fs-body'));
      expect(v('fs-body')).toBeLessThan(v('fs-h3'));
      expect(v('fs-h3')).toBeLessThan(v('fs-h2'));
      expect(v('fs-h2')).toBeLessThan(v('fs-h1'));
      expect(v('fs-h1')).toBeLessThanOrEqual(v('fs-name') + 0.01);
    }
  });

  it('scales only text tokens by the text size, keeping body and button text readable', () => {
    expect(NL_CSS).toContain('--nl-fs-body:max(16px,calc(');
    expect(NL_CSS).toContain('--nl-fs-btn:max(15px,calc(');
    expect(NL_CSS).toMatch(/--nl-fs-h1:calc\([^;]*\* var\(--nl-type-scale,1\)\)/);
    expect(NL_CSS).not.toMatch(/--nl-btn-h:[^;]*type-scale/);
  });

  it('declares every token on .nl-root', () => {
    for (const name of Object.keys(SIZE_TOKENS)) expect(NL_CSS).toContain(`--nl-${name}:`);
  });
});
