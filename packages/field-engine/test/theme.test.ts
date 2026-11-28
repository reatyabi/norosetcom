import { describe, expect, it } from 'vitest';
import {
  FORM_THEME_PRESET_DEFINITIONS,
  FORM_THEME_PRESET_ITEMS,
  getCanvasContrast,
  getLuminance,
  getReadableForeground,
  resolveFontFamily,
  resolveFormThemeTokens,
  resolveRadius,
  resolveTextScale,
} from '../src/theme';
import { FORM_THEME_PRESETS, formThemeSchema, type FormTheme } from '../src/schema';

describe('theme system & resolveFormThemeTokens', () => {
  it('defines all 12 presets with complete semantic tokens', () => {
    expect(FORM_THEME_PRESETS).toHaveLength(12);
    expect(FORM_THEME_PRESET_ITEMS).toHaveLength(12);

    for (const preset of FORM_THEME_PRESETS) {
      const def = FORM_THEME_PRESET_DEFINITIONS[preset];
      expect(def).toBeDefined();
      expect(def.id).toBe(preset);
      expect(def.label).toBeTruthy();
      expect(def.theme.preset).toBe(preset);

      const tokens = def.defaultTokens;
      expect(tokens['--nf-canvas-bg']).toBeTruthy();
      expect(tokens['--nf-card-bg']).toBeTruthy();
      expect(tokens['--nf-card-fg']).toBeTruthy();
      expect(tokens['--nf-muted']).toBeTruthy();
      expect(tokens['--nf-border']).toBeTruthy();
      expect(tokens['--nf-shadow-card']).toBeTruthy();
      expect(tokens['--nf-primary']).toBeTruthy();
    }
  });

  it('enforces surface distinction: --nf-card-bg must distinctly differ from --nf-canvas-bg in light presets', () => {
    const lightPresets = ['paper', 'mocha', 'peach', 'lavender', 'turquoise', 'sunset', 'forest', 'mono', 'brutal'] as const;

    for (const id of lightPresets) {
      const def = FORM_THEME_PRESET_DEFINITIONS[id];
      const resolved = resolveFormThemeTokens(def.theme);

      expect(resolved.contrast, `${id} should be light`).toBe('light');
      expect(
        resolved.tokens['--nf-card-bg'].toLowerCase(),
        `card bg and canvas bg should differ in ${id}`,
      ).not.toBe(resolved.tokens['--nf-canvas-bg'].toLowerCase());

      // کارتهای تمهای روشن سفید خالص هستند تا روی بوم شناور بمانند
      expect(resolved.tokens['--nf-card-bg'].toLowerCase()).toBe('#ffffff');
    }
  });

  it('configures dark presets with full dark palette and contrast: dark', () => {
    const darkPresets = ['midnight', 'aurora', 'neon'] as const;

    for (const id of darkPresets) {
      const def = FORM_THEME_PRESET_DEFINITIONS[id];
      const resolved = resolveFormThemeTokens(def.theme);

      expect(resolved.contrast, `${id} should be dark`).toBe('dark');
      expect(getLuminance(resolved.tokens['--nf-canvas-bg'])).toBeLessThan(0.15);
      expect(getLuminance(resolved.tokens['--nf-card-bg'])).toBeLessThan(0.15);
      expect(resolved.tokens['--nf-on-canvas']).toBe('#ffffff');
    }
  });

  it('applies distinct border and shadow for brutalist preset', () => {
    const def = FORM_THEME_PRESET_DEFINITIONS.brutal;
    const resolved = resolveFormThemeTokens(def.theme);

    expect(resolved.tokens['--nf-border']).toBe('#000000');
    expect(resolved.tokens['--nf-shadow-card']).toBe('4px 4px 0px #000000');
    expect(resolved.tokens['--nf-radius-card']).toBe('0px');
    expect(resolved.tokens['--nf-radius-control']).toBe('0px');
  });

  it('calculates readable primary foreground based on luminance', () => {
    expect(getReadableForeground('#ffffff')).toBe('#0f172a');
    expect(getReadableForeground('#facc15')).toBe('#0f172a'); // yellow
    expect(getReadableForeground('#a3e635')).toBe('#0f172a'); // neon green
    expect(getReadableForeground('#000000')).toBe('#ffffff');
    expect(getReadableForeground('#4f46e5')).toBe('#ffffff'); // indigo
    expect(getReadableForeground('#be185d')).toBe('#ffffff'); // deep pink
  });

  it('accurately maps radius options to card and control tokens', () => {
    expect(resolveRadius('none')).toEqual({ card: '0px', control: '0px' });
    expect(resolveRadius('md')).toEqual({ card: '1rem', control: '0.5rem' });
    expect(resolveRadius('lg')).toEqual({ card: '1.25rem', control: '0.625rem' });
    expect(resolveRadius('full')).toEqual({ card: '1.75rem', control: '9999px' });
  });

  it('accurately maps text scale and font family', () => {
    expect(resolveTextScale('sm')).toBe(0.875);
    expect(resolveTextScale('md')).toBe(1);
    expect(resolveTextScale('lg')).toBe(1.125);

    expect(resolveFontFamily('vazirmatn')).toBe('var(--font-sans)');
    expect(resolveFontFamily('system')).toContain('system-ui');
  });

  it('applies user customization overrides cleanly over base preset', () => {
    const customTheme: FormTheme = formThemeSchema.parse({
      preset: 'paper',
      primary_color: '#f59e0b', // amber
      background_color: '#1e293b', // slate 800 (custom dark bg)
      radius: 'full',
      text_size: 'lg',
      font: 'system',
    });

    const resolved = resolveFormThemeTokens(customTheme);

    expect(resolved.tokens['--nf-primary']).toBe('#f59e0b');
    expect(resolved.tokens['--nf-primary-fg']).toBe('#0f172a'); // dark text on bright amber
    expect(resolved.tokens['--nf-canvas-bg']).toBe('#1e293b');
    expect(resolved.contrast).toBe('dark'); // dark custom background detected
    expect(resolved.tokens['--nf-radius-card']).toBe('1.75rem');
    expect(resolved.tokens['--nf-radius-control']).toBe('9999px');
    expect(resolved.tokens['--nf-text-scale']).toBe('1.125');
    expect(resolved.tokens['--nf-font-family']).toContain('system-ui');
  });
});
