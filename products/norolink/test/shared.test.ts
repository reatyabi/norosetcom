import { describe, expect, it } from 'vitest';
import {
  contrastText,
  isShortMapLink,
  keyBetween,
  FRAME_SOURCES,
  mapEmbedSchema,
  mapEmbedUrl,
  mapLinkUrl,
  normalizeEmbedSource,
  applySocialInput,
  parseMapUrl,
  parseRichText,
  parseSettings,
  parseVideoUrl,
  pageContentSchema,
  publishIssues,
  resolveTheme,
  serializeRichText,
  defaultContent,
  defaultSettings,
  videoEmbedUrl,
  PRESETS,
  relativeLuminance,
  classifyPastedLink,
  imageCropStyle,
  detectSocialPlatform,
  isBlockedUrl,
  isHttpUrl,
  normalizeHttpUrl,
  normalizeSocialValue,
  suggestLinkLabel,
  imageRefSchema,
  assetUrlFor,
  imageFileIds,
  IMAGE_TEXT,
  autoTone,
  grayLuminance,
  lumaStats,
  minOverlay,
  ratio,
  mixHex,
  TONAL_MIX,
  buttonColorVars,
  CARD_MAX_OVERLAY,
  elementImages,
  imageSlides,
  MAX_IMAGE_SLIDES,
  withImageSlides,
  isSearchIndexable,
  jsonLdScript,
  profileJsonLd,
  SEO_DESCRIPTION_MIN,
  seoDescriptionLength,
  type AnyElement,
  type Theme,
} from '../shared';
import { parseBaladPlaceHtml, resolveMapUrl, type Fetcher } from '../api/embeds/map-resolver';

describe('sort keys', () => {
  it('generates strictly ordered keys in byte order', () => {
    const keys: string[] = [];
    let last: string | null = null;
    for (let i = 0; i < 50; i++) keys.push((last = keyBetween(last, null)));
    expect([...keys].sort()).toEqual(keys);
    // درج‌های پیاپی بین دو کلید مجاور
    let a = keys[0]!;
    const b = keys[1]!;
    for (let i = 0; i < 30; i++) {
      const m = keyBetween(a, b);
      expect(a < m && m < b).toBe(true);
      expect(m).toMatch(/^[0-9A-Za-z]+$/);
      expect(m.endsWith('0')).toBe(false);
      a = m;
    }
    expect(keyBetween(null, keys[0]!) < keys[0]!).toBe(true);
  });
});

describe('rich text', () => {
  it('parses the light markup into structured JSON and back', () => {
    const src = '# سلام\n\nمتن **پررنگ** و *کج* با [لینک](https://example.com)\n\n- یک\n- دو\n\n1. اول\n2. دوم';
    const doc = parseRichText(src);
    expect(doc.blocks).toEqual([
      { type: 'h', level: 1, content: [{ text: 'سلام' }] },
      {
        type: 'p',
        content: [
          { text: 'متن ' },
          { text: 'پررنگ', bold: true },
          { text: ' و ' },
          { text: 'کج', italic: true },
          { text: ' با ' },
          { text: 'لینک', href: 'https://example.com' },
        ],
      },
      { type: 'ul', items: [[{ text: 'یک' }], [{ text: 'دو' }]] },
      { type: 'ol', items: [[{ text: 'اول' }], [{ text: 'دوم' }]] },
    ]);
    expect(parseRichText(serializeRichText(doc))).toEqual(doc);
  });

  it('never turns javascript: or html into links/markup', () => {
    const doc = parseRichText('[x](javascript:alert(1)) <b>hi</b>');
    expect(doc.blocks[0]).toEqual({ type: 'p', content: [{ text: '[x](javascript:alert(1)) <b>hi</b>' }] });
  });
});

describe('video embeds', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?t=3', 'youtube', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'youtube', 'dQw4w9WgXcQ'],
    ['https://vimeo.com/76979871', 'vimeo', '76979871'],
    ['https://www.aparat.com/v/abc12XY', 'aparat', 'abc12XY'],
  ])('%s', (url, provider, id) => {
    expect(parseVideoUrl(url)).toEqual({ provider, video_id: id });
  });

  it('rejects other hosts and bad ids; builds fixed embed URLs', () => {
    expect(parseVideoUrl('https://evil.com/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(parseVideoUrl('https://youtube.com/watch?v=<script>')).toBeNull();
    expect(parseVideoUrl('javascript:alert(1)')).toBeNull();
    expect(videoEmbedUrl({ provider: 'youtube', video_id: 'dQw4w9WgXcQ' })).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  });
});

describe('map links', () => {
  it.each([
    ['https://www.google.com/maps/place/Tehran/@35.6892,51.3890,12z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d35.7000!4d51.4000', 'google', 35.7, 51.4],
    ['https://www.google.com/maps/@35.6892,51.389,15z', 'google', 35.6892, 51.389],
    ['https://maps.google.com/?q=35.6892,51.3890', 'google', 35.6892, 51.389],
    ['https://neshan.org/maps/@35.6997,51.3380,15.0z,0.0p', 'neshan', 35.6997, 51.338],
    ['https://balad.ir/location?latitude=35.7&longitude=51.41&zoom=16', 'balad', 35.7, 51.41],
    ['https://balad.ir/#15/35.71/51.42', 'balad', 35.71, 51.42],
    ['https://balad.ir/maps/tehran#9.65/35.7253/51.5245', 'balad', 35.7253, 51.5245],
    ['https://neshan.org/maps/places/170380ab42cc5cdbbac3716044c66b14#c35.689-51.389-11z-0p', 'neshan', 35.689, 51.389],
    ['https://neshan.org/maps/share/35.79,51.41', 'neshan', 35.79, 51.41],
    ['https://nshn.ir/?lat=35.79&lng=51.41', 'neshan', 35.79, 51.41],
    ['https://nshn.ir?origin=35.7,51.3&destination=35.79,51.41&vehicle=d', 'neshan', 35.79, 51.41],
  ])('%s', (url, provider, lat, lng) => {
    const loc = parseMapUrl(url);
    expect(loc).toMatchObject({ provider, lat, lng });
  });

  it('rejects non-map hosts and links without coordinates', () => {
    expect(parseMapUrl('https://example.com/@35.7,51.4,15z')).toBeNull();
    expect(parseMapUrl('https://balad.ir/p/some-place')).toBeNull();
    expect(isShortMapLink('https://maps.app.goo.gl/AbC123')).toBe(true);
    expect(mapEmbedUrl({ lat: 35.7, lng: 51.4, zoom: 15 })).toBe(
      'https://maps.google.com/maps?q=35.700000%2C51.400000&z=15&output=embed',
    );
  });

  describe('Balad place links', () => {
    const page = (lat: number, lng: number) =>
      `<script>{"centerPoint":{"type":"Point","coordinates":[51.1,35.1]},"geo":{"@type":"GeoCoordinates","addressCountry":"IR","longitude":${lng},"latitude":${lat}}}</script>`;
    const site = (urls: string[]): Fetcher =>
      async (url) => {
        urls.push(url);
        if (url === 'https://balad.ir/p/3e0tebjkiJDSan') {
          return { status: 301, headers: { get: () => '/p/%D9%BE%D8%A7%D9%84%D8%A7%D8%AF%DB%8C%D9%88%D9%85-tehran_shopping-mall-3e0tebjkiJDSan' } };
        }
        if (url.startsWith('https://balad.ir/p/%D9')) return { status: 200, headers: { get: () => null }, text: async () => page(35.7978885, 51.4129159) };
        if (url === 'https://balad.ir/p/evil') return { status: 302, headers: { get: () => 'http://169.254.169.254/p/x' } };
        return { status: 404, headers: { get: () => null } };
      };

    it('reads the pin from the place page behind the share link', async () => {
      const urls: string[] = [];
      expect(await resolveMapUrl('https://balad.ir/p/3e0tebjkiJDSan', site(urls))).toEqual({ provider: 'balad', lat: 35.7978885, lng: 51.4129159, zoom: 16, place_token: '3e0tebjkiJDSan' });
      expect(urls).toHaveLength(2);
    });

    it('prefers the pin over the map center in the address bar hash', async () => {
      expect(await resolveMapUrl('https://balad.ir/p/3e0tebjkiJDSan#15/35.79872/51.41721', site([]))).toMatchObject({ lat: 35.7978885, lng: 51.4129159 });
    });

    it('falls back to the hash when the place page fails', async () => {
      expect(await resolveMapUrl('https://balad.ir/p/gone#15/35.79/51.41', site([]))).toEqual({ provider: 'balad', lat: 35.79, lng: 51.41, zoom: 15 });
      expect(await resolveMapUrl('https://balad.ir/p/gone', site([]))).toBeNull();
    });

    it('never leaves Balad and ignores look-alike hosts', async () => {
      const urls: string[] = [];
      expect(await resolveMapUrl('https://balad.ir/p/evil', site(urls))).toBeNull();
      expect(urls).toEqual(['https://balad.ir/p/evil']);
      const other: string[] = [];
      expect(await resolveMapUrl('https://balad.ir.evil.com/p/x', site(other))).toBeNull();
      expect(await resolveMapUrl('https://balad.ir:8443/p/x', site(other))).toBeNull();
      expect(await resolveMapUrl('https://balad.ir@evil.com/p/x', site(other))).toBeNull();
      expect(other).toEqual([]);
    });

    it('ignores nearby places and malformed data', () => {
      expect(parseBaladPlaceHtml('{"centerPoint":{"type":"Point","coordinates":[51.1,35.1]}}')).toBeNull();
      expect(parseBaladPlaceHtml('{"geo":{"@type":"GeoCoordinates","longitude":999,"latitude":35}}')).toBeNull();
    });
  });

  describe('live social input', () => {
    it.each([
      ['instagram', '@a', 'instagram', 'https://instagram.com/a'],
      ['instagram', 'ali.reza', 'instagram', 'https://instagram.com/ali.reza'],
      ['instagram', 't.me/ali', 'telegram', 'https://t.me/ali'],
      ['website', 'eitaa.com/ali', 'eitaa', 'https://eitaa.com/ali'],
      ['whatsapp', '09121234567', 'whatsapp', 'https://wa.me/989121234567'],
      ['instagram', '09121234567', 'phone', '+989121234567'],
      ['telegram', 'ali@example.com', 'email', 'ali@example.com'],
      ['telegram', '', 'telegram', ''],
    ] as const)('%s + %j → %s %s', (current, input, platform, value) => {
      expect(applySocialInput(current, input)).toEqual({ platform, value });
    });

    it('keeps a platform that another item already uses', () => {
      expect(applySocialInput('instagram', 't.me/ali', { taken: ['telegram'] })).toEqual({ platform: 'instagram', value: 'https://t.me/ali' });
    });

    it('never overrides a platform the user picked', () => {
      expect(applySocialInput('telegram', '12345678', { pinned: true })).toEqual({ platform: 'telegram', value: 'https://t.me/12345678' });
    });
  });

  describe('pasted iframe code', () => {
    const balad = '<iframe src="https://balad.ir/embed?p=3e0tebjkiJDSan" title="مشاهده روی نقشه بلد" width="600" height="450" frameborder="0" style="border:0;" allowfullscreen="" aria-hidden="false" tabindex="0"></iframe>';
    const pb = '!1m18!1m12!1m3!1d3237.6!2d51.4129159!3d35.7978885!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3f8e0!2sPalladium%20Mall!5e0!3m2!1sfa!2s!4v1';
    const google = `<iframe src="https://www.google.com/maps/embed?pb=${pb}" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;

    it.each([
      [balad, 'https://balad.ir/embed?p=3e0tebjkiJDSan'],
      [google, `https://www.google.com/maps/embed?pb=${pb}`],
      ["<IFRAME width=600 SRC='https://neshan.org/maps/iframe/35.79/51.41'></IFRAME>", 'https://neshan.org/maps/iframe/35.79/51.41'],
      ['<iframe src=https://neshan.org/maps/iframe/35.79/51.41 width=600></iframe>', 'https://neshan.org/maps/iframe/35.79/51.41'],
      ['<iframe src="https://maps.google.com/maps?q=35.7,51.4&amp;output=embed"></iframe>', 'https://maps.google.com/maps?q=35.7,51.4&output=embed'],
      ['<iframe width="600"></iframe>', ''],
      ['https://balad.ir/p/x', 'https://balad.ir/p/x'],
    ])('keeps only the src of %j', (input, out) => expect(normalizeEmbedSource(input)).toBe(out));

    it('never keeps the HTML, whatever the attributes hold', () => {
      const parsed = mapEmbedSchema.parse({ source_url: '<iframe srcdoc="<script>alert(1)</script>" onload="alert(1)"></iframe>' });
      expect(parsed.source_url).toBe('');
      const evil = mapEmbedSchema.parse({ source_url: '<iframe onload="alert(1)" src="javascript:alert(1)"></iframe>' });
      expect(evil.source_url).toBe('javascript:alert(1)');
      expect(parseMapUrl(evil.source_url)).toBeNull();
    });

    it.each([
      '<iframe src="https://evil.com/maps/embed?pb=!2d51.4!3d35.7"></iframe>',
      '<iframe src="https://balad.ir.evil.com/embed?p=3e0tebjkiJDSan"></iframe>',
      '<iframe src="https://neshan.org.evil.com/maps/iframe/35.7/51.4"></iframe>',
    ])('rejects look-alike hosts: %s', async (code) => {
      const urls: string[] = [];
      const fetcher: Fetcher = async (url) => {
        urls.push(url);
        return { status: 404, headers: { get: () => null } };
      };
      expect(await resolveMapUrl(normalizeEmbedSource(code), fetcher)).toBeNull();
      expect(urls).toEqual([]);
    });

    it('rebuilds Balad from the token behind the embed code', async () => {
      const fetcher: Fetcher = async (url) =>
        url === 'https://balad.ir/p/3e0tebjkiJDSan'
          ? { status: 200, headers: { get: () => null }, text: async () => '{"geo":{"@type":"GeoCoordinates","longitude":51.41,"latitude":35.79}}' }
          : { status: 404, headers: { get: () => null } };
      const loc = (await resolveMapUrl(normalizeEmbedSource(balad), fetcher))!;
      expect(loc).toEqual({ provider: 'balad', lat: 35.79, lng: 51.41, zoom: 16, place_token: '3e0tebjkiJDSan' });
      expect(mapEmbedUrl(loc)).toBe('https://balad.ir/embed?p=3e0tebjkiJDSan');
      expect(mapLinkUrl('https://balad.ir/embed?p=3e0tebjkiJDSan', loc)).toBe('https://balad.ir/p/3e0tebjkiJDSan');
    });

    it('rebuilds Google from pb, with the pin coordinates for the route link', () => {
      const src = normalizeEmbedSource(google);
      const loc = parseMapUrl(src)!;
      expect(loc).toMatchObject({ provider: 'google', lat: 35.7978885, lng: 51.4129159, pb });
      expect(mapEmbedUrl(loc)).toBe(src);
      expect(mapLinkUrl(src, loc)).toBe('https://www.google.com/maps/search/?api=1&query=35.7978885,51.4129159');
    });

    it('takes only the coordinates from Neshan code, whose iframe cannot show them', () => {
      const src = 'https://neshan.org/maps/iframe/places/_bZOU4pGfCn6#c35.798-51.413-15z-0p/35.79/51.41';
      expect(parseMapUrl('https://neshan.org/maps/iframe/35.79/51.41')).toMatchObject({ provider: 'neshan', lat: 35.79, lng: 51.41 });
      const loc = parseMapUrl(src)!;
      expect(loc).toMatchObject({ provider: 'neshan', lat: 35.79, lng: 51.41 });
      expect(mapEmbedUrl(loc)).toContain('https://maps.google.com/maps?q=');
      expect(mapLinkUrl(src, loc)).toBe('https://neshan.org/maps/@35.79,51.41,16z');
      expect(mapLinkUrl('https://neshan.org/maps/@35.79,51.41,15z', loc)).toBe('https://neshan.org/maps/@35.79,51.41,15z');
    });

    it('only allows template data in stored locations', () => {
      const location = { provider: 'google', lat: 35, lng: 51, zoom: 15 };
      expect(() => mapEmbedSchema.parse({ source_url: '', location: { ...location, pb: '"><script>alert(1)</script>' } })).toThrow();
      expect(() => mapEmbedSchema.parse({ source_url: '', location: { ...location, provider: 'balad', place_token: '../../evil' } })).toThrow();
    });

    it('classifies pasted code by what is inside it', () => {
      expect(classifyPastedLink(balad)).toBe('map_embed');
      expect(classifyPastedLink(google)).toBe('map_embed');
      expect(classifyPastedLink('<iframe src="https://evil.com/x"></iframe>')).toBeNull();
    });

    it('allows the map services in the public page CSP', () => {
      expect(FRAME_SOURCES).toEqual(expect.arrayContaining(['https://balad.ir', 'https://www.google.com']));
      expect(FRAME_SOURCES).not.toContain('https://neshan.org');
    });
  });

  it('keeps Neshan place links without coordinates unresolved', async () => {
    expect(await resolveMapUrl('https://neshan.org/maps/places/170380ab42cc5cdbbac3716044c66b14', async () => ({ status: 200, headers: { get: () => null } }))).toBeNull();
  });

  it('follows short links only within map hosts', async () => {
    const calls: string[] = [];
    const fetcher = (map: Record<string, string>): Fetcher =>
      async (url) => {
        calls.push(url);
        return { status: 302, headers: { get: (n: string) => (n === 'location' ? (map[url] ?? null) : null) } };
      };
    const ok = await resolveMapUrl(
      'https://maps.app.goo.gl/AbC',
      fetcher({ 'https://maps.app.goo.gl/AbC': 'https://www.google.com/maps/@35.7,51.4,14z' }),
    );
    expect(ok).toEqual({ provider: 'google', lat: 35.7, lng: 51.4, zoom: 14 });

    const evil = await resolveMapUrl(
      'https://nshn.ir/xyz',
      fetcher({ 'https://nshn.ir/xyz': 'http://169.254.169.254/latest/@35.7,51.4,14z' }),
    );
    expect(evil).toBeNull();
    // لینک غیرکوتاه بدون مختصات هرگز درخواست شبکه نمی‌سازد.
    calls.length = 0;
    expect(await resolveMapUrl('https://example.com/x', fetcher({}))).toBeNull();
    expect(calls).toEqual([]);
  });
});

describe('theme and contrast', () => {
  it('picks the higher-contrast text color', () => {
    expect(contrastText('#ffffff')).toBe('#111111');
    expect(contrastText('#005fb8')).toBe('#ffffff');
    expect(contrastText('#facc15')).toBe('#111111');
  });

  it('resolves presets, accent and overrides into css variables', () => {
    const r = resolveTheme(
      { preset: 'neon', accent: '#ffffff', overrides: { radius: 'none' } },
      (i) => `https://cdn/${i.file_id}`,
    );
    expect(r.vars['--nl-accent']).toBe('#ffffff');
    expect(r.vars['--nl-accent-fg']).toBe('#111111');
    expect(r.vars['--nl-radius']).toBe('0px');
    expect(r.vars['--nl-bg']).toBe('#09090b');
  });

  it('keeps muted text readable over the worst part of a photo with the minimum overlay', () => {
    const muted = { light: relativeLuminance(IMAGE_TEXT.light.muted), dark: relativeLuminance(IMAGE_TEXT.dark.muted) };
    const worst = (tone: 'light' | 'dark', a: number, l: { lo: number; hi: number }) =>
      tone === 'light' ? grayLuminance(a + (1 - a) * l.lo) : grayLuminance((1 - a) * l.hi);
    for (const luma of [{ lo: 0, hi: 1 }, { lo: 0.2, hi: 0.6 }, { lo: 0.55, hi: 0.95 }, { lo: 0.05, hi: 0.3 }]) {
      for (const tone of ['light', 'dark'] as const) {
        const a = minOverlay(tone, luma);
        expect(ratio(muted[tone], worst(tone, a, luma))).toBeGreaterThanOrEqual(4.5);
        if (a > 0) expect(ratio(muted[tone], worst(tone, a - 0.01, luma))).toBeLessThan(4.5);
      }
    }
    expect(autoTone({ lo: 0.9, hi: 1 })).toEqual({ tone: 'light', overlay: 0 });
    expect(autoTone({ lo: 0, hi: 0.1 })).toEqual({ tone: 'dark', overlay: 0 });
  });

  it('measures luma percentiles and skips transparent pixels', () => {
    const px = (n: number, rgba: number[]) => Array.from({ length: n }, () => rgba).flat();
    expect(lumaStats(px(100, [255, 255, 255, 255]))).toEqual({ lo: 1, hi: 1 });
    expect(lumaStats([...px(50, [0, 0, 0, 255]), ...px(50, [255, 255, 255, 255]), ...px(50, [9, 9, 9, 0])])).toEqual({ lo: 0, hi: 1 });
    expect(lumaStats([])).toEqual({ lo: 0, hi: 1 });
  });

  it('renders a photo background as its own layer with tone-driven text colors', () => {
    const image = { file_id: '/images/templates/a.jpg', width: 1, height: 1 };
    const theme = (background: unknown) =>
      resolveTheme({ preset: 'minimal', accent: null, overrides: { background } } as Theme, (i) => i.file_id);
    const light = theme({ kind: 'image', image, overlay: 0, tone: 'light', tone_source: 'auto', focal: { x: 20, y: 70 }, luma: { lo: 0, hi: 1 } });
    expect(light.vars['--nl-bg']).toBe('transparent');
    expect(light.vars['--nl-fg']).toBe(IMAGE_TEXT.light.fg);
    expect(light.image).toEqual({
      url: '/images/templates/a.jpg',
      tone: 'light',
      amount: 0,
      position: '20% 70%',
      // شدت همان انتخاب کاربر است (بدون حداقل اجباری)
      tint: 'rgba(255,255,255,0)',
      fallback: IMAGE_TEXT.light.fallback,
    });
    // snapshot پیش از لایه‌ی هوشمند: تیره با همان شدت، وسط عکس
    const legacy = theme({ kind: 'image', image, overlay: 0.4 });
    expect(legacy.image).toMatchObject({ position: '50% 50%', tint: 'rgba(0,0,0,0.4)' });
    expect(legacy.vars['--nl-fg']).toBe(IMAGE_TEXT.dark.fg);
    expect(theme(undefined).image).toBeNull();
  });

  it('fills defaults for legacy photo backgrounds and bounds the overlay', () => {
    const image = { file_id: '/images/templates/a.jpg', width: 1, height: 1 };
    const parse = (background: unknown) =>
      pageContentSchema.safeParse({ ...defaultContent('x'), theme: { preset: 'minimal', accent: null, overrides: { background } } });
    const legacy = parse({ kind: 'image', image, overlay: 0.4 });
    expect(legacy.success && legacy.data.theme.overrides.background).toEqual({
      kind: 'image',
      image,
      overlay: 0.4,
      tone: 'dark',
      tone_source: 'auto',
      focal: { x: 50, y: 50 },
      luma: null,
    });
    expect(parse({ kind: 'image', image, overlay: 0.96 }).success).toBe(false);
    expect(parse({ kind: 'image', image, overlay: 0.4, tone: 'grey' }).success).toBe(false);
  });

  it('never shows a container without a photo, whatever was stored', () => {
    for (const p of PRESETS) {
      const r = resolveTheme({ preset: p.id, accent: null, container: 'card', overrides: {} }, () => '');
      expect(r.card, p.id).toBe(false);
      expect(r.vars['--nl-card-bg'], p.id).toBeUndefined();
    }
    expect(pageContentSchema.safeParse({ ...defaultContent('x'), theme: { preset: 'minimal', accent: null, container: 'box', overrides: {} } }).success).toBe(false);
  });

  it('turns the photo container on at 15% overlay or less, with just enough glass for readable text', () => {
    const image = { file_id: '/images/templates/a.jpg', width: 1, height: 1 };
    const luma = { lo: 0.1, hi: 0.85 };
    const resolve = (tone: 'light' | 'dark', overlay: number, l: typeof luma | null = luma) =>
      resolveTheme(
        { preset: 'minimal', accent: null, overrides: { background: { kind: 'image', image, overlay, tone, tone_source: 'auto', focal: { x: 50, y: 50 }, luma: l } } },
        () => '',
      );
    for (const tone of ['light', 'dark'] as const) {
      const readable = minOverlay(tone, luma);
      for (const overlay of [0, 0.05, CARD_MAX_OVERLAY]) {
        const r = resolve(tone, overlay);
        expect(r.card, `${tone} ${overlay}`).toBe(true);
        const tint = Number(/,([\d.]+)\)$/.exec(r.vars['--nl-card-bg']!)![1]);
        expect(r.vars['--nl-card-bg']).toMatch(tone === 'light' ? /^rgba\(255,255,255,/ : /^rgba\(0,0,0,/);
        // لایه و کانتینر روی هم به حد خوانایی می‌رسند
        expect(1 - (1 - overlay) * (1 - tint)).toBeGreaterThanOrEqual(readable - 1e-9);
      }
      expect(resolve(tone, CARD_MAX_OVERLAY + 0.01).card).toBe(false);
      expect(resolve(tone, 0.6).card).toBe(false);
    }
    // عکس قبلی بدون آمار روشنایی هم با همان مرز
    expect(resolve('dark', 0.1, null).card).toBe(true);
    // محوشدن عکس با شدت لایه
    expect(resolve('dark', 0.1).image?.amount).toBe(0.1);
    expect(resolve('dark', 0.7).image?.amount).toBe(0.7);
  });

  it('keeps outline and tonal text readable for any accent on every preset', () => {
    const accents = ['#111111', '#ffffff', '#facc15', '#a3e635', '#005fb8', '#e11d48', '#7c3aed', '#0891b2'];
    for (const p of PRESETS) {
      const bg = p.background;
      const backdrops =
        bg.kind === 'solid' ? [bg.color] : bg.kind === 'gradient' ? [bg.from, bg.to] : bg.kind === 'mesh' ? [bg.base, ...bg.colors] : [];
      for (const accent of accents) {
        const r = resolveTheme({ preset: p.id, accent, overrides: {} }, () => '');
        const ink = relativeLuminance(r.vars['--nl-accent-ink']!);
        const mix = Number.parseInt(r.vars['--nl-tonal-mix']!, 10) / 100;
        expect(mix).toBeLessThanOrEqual(TONAL_MIX);
        for (const b of backdrops.flatMap((c) => [c, mixHex(c, accent, mix)])) {
          expect(ratio(ink, relativeLuminance(b)), `${p.id} ${accent} on ${b}`).toBeGreaterThanOrEqual(4.5);
        }
        expect(buttonColorVars(accent, r)).toMatchObject({ '--nl-btn-ink': r.vars['--nl-accent-ink'], '--nl-btn-mix': r.vars['--nl-tonal-mix'] });
      }
    }
    // رنگی که خودش خواناست دست نمی‌خورد
    const blue = resolveTheme({ preset: 'minimal', accent: '#005fb8', overrides: {} }, () => '').vars;
    expect([blue['--nl-accent-ink'], blue['--nl-tonal-mix']]).toEqual(['#005fb8', '16%']);
  });

  it('page content schema is strict', () => {
    expect(pageContentSchema.safeParse(defaultContent('x')).success).toBe(true);
    expect(pageContentSchema.safeParse({ ...defaultContent('x'), extra: 1 }).success).toBe(false);
    expect(
      pageContentSchema.safeParse({ ...defaultContent('x'), theme: { preset: 'nope', accent: null, overrides: {} } }).success,
    ).toBe(false);
  });
});

describe('element settings', () => {
  it('turns an image element into a slider of up to 10 images, compatible with older data', () => {
    const img = (n: number) => ({ file_id: `/images/templates/s${n}.jpg`, width: 800, height: 600 });
    const slide = (n: number, extra: object = {}) => ({ image: img(n), ...extra });
    const base = { ...defaultSettings('image'), image: img(0), alt: 'اول' };
    // داده‌ی قبلی بدون slides هم معتبر است
    const legacy = parseSettings('image', { image: img(0), alt: 'a', link: '', aspect: 'auto', crop: { x: 50, y: 50, zoom: 1 } });
    expect(legacy.ok && legacy.value.slides).toEqual([]);
    const nine = parseSettings('image', { ...base, slides: Array.from({ length: 9 }, (_, i) => slide(i + 1)) });
    expect(nine.ok).toBe(true);
    expect(parseSettings('image', { ...base, slides: Array.from({ length: 10 }, (_, i) => slide(i + 1)) }).ok).toBe(false);

    const parsed = parseSettings('image', { ...base, slides: [slide(1), slide(2, { link: 'example.com' })] });
    if (!parsed.ok) throw new Error('parse');
    const s = parsed.value;
    const all = imageSlides(s);
    expect(all.map((x) => x.image.file_id)).toEqual(['/images/templates/s0.jpg', '/images/templates/s1.jpg', '/images/templates/s2.jpg']);
    expect(all[2]!.link).toBe('https://example.com');
    // ترتیب جدید ← اولی به فیلدهای بالایی
    const swapped = withImageSlides(s, [all[2]!, all[0]!, all[1]!]);
    expect(swapped.image?.file_id).toBe('/images/templates/s2.jpg');
    expect(swapped.slides.map((x) => x.image.file_id)).toEqual(['/images/templates/s0.jpg', '/images/templates/s1.jpg']);
    expect(withImageSlides(s, [])).toMatchObject({ image: null, slides: [] });
    expect(withImageSlides(s, Array.from({ length: 12 }, () => all[0]!)).slides).toHaveLength(MAX_IMAGE_SLIDES - 1);

    // alt برای همه‌ی تصاویر اختیاری است؛ لینک نامعتبر هر اسلاید مانع انتشار
    const el = (settings: object) => ({ id: 'e', kind: 'image', settings }) as AnyElement;
    expect(publishIssues(defaultContent('x'), [el({ ...base, alt: '' })])).toEqual([]);
    expect(publishIssues(defaultContent('x'), [el({ ...s, alt: '' })])).toEqual([]);
    expect(publishIssues(defaultContent('x'), [el({ ...s, slides: [{ ...s.slides[0]!, link: 'not a link' }] })]).map((i) => i.code)).toEqual(['invalid_url']);
    expect(publishIssues(defaultContent('x'), [el({ ...s, slides: [{ ...s.slides[0]!, link: 'https://1.2.3.4/pay' }] })]).map((i) => i.code)).toEqual(['blocked_url']);
    expect(elementImages(el(s)).map((i) => i.file_id)).toHaveLength(3);
  });

  it('accepts any Lucide icon name in icons-key form, nothing else', () => {
    const icon = (value: string) => parseSettings('link_button', { ...defaultSettings('link_button'), icon: { kind: 'lucide', value } }).ok;
    for (const ok of ['Coffee', 'ArrowUpRight', 'Grid2x2', 'CircleSlash2']) expect(icon(ok), ok).toBe(true);
    for (const bad of ['coffee', 'arrow-up-right', '<svg>', '', 'A'.repeat(65), 'Coffee Cup']) expect(icon(bad), bad).toBe(false);
  });

  it('sets the page text scale from the theme (medium by default)', () => {
    const scale = (text_size?: 'sm' | 'md' | 'lg') =>
      resolveTheme({ preset: 'minimal', accent: null, overrides: {}, ...(text_size ? { text_size } : {}) }, () => '').vars['--nl-type-scale'];
    expect([scale(), scale('sm'), scale('md'), scale('lg')]).toEqual(['1', '0.9', '1', '1.15']);
    expect(pageContentSchema.safeParse({ ...defaultContent('x'), theme: { preset: 'minimal', accent: null, overrides: {}, text_size: 'xl' } }).success).toBe(false);
  });

  it('accepts drafts, flags incomplete elements for publishing', () => {
    const btn = parseSettings('link_button', defaultSettings('link_button'));
    expect(btn.ok).toBe(true);
    const issues = publishIssues(defaultContent('ali'), [
      { id: 'e1', kind: 'link_button', settings: defaultSettings('link_button') },
      { id: 'e2', kind: 'image', settings: defaultSettings('image') },
    ]);
    expect(issues).toEqual([
      { elementId: 'e1', code: 'missing_url' },
      { elementId: 'e2', code: 'missing_image' },
    ]);
  });

  it('rejects unsafe urls and unknown keys', () => {
    // لینک نامعتبر ذخیره می‌شود (تا بقیه‌ی تغییرات از دست نروند) ولی انتشار را رد می‌کند
    const js = parseSettings('link_button', { ...defaultSettings('link_button'), label: 'x', url: 'javascript:alert(1)' });
    expect(js.ok && js.value.url).toBe('javascript:alert(1)');
    expect(js.ok && publishIssues(defaultContent('ali'), [{ id: 'e1', kind: 'link_button', settings: js.value }])).toEqual([
      { elementId: 'e1', code: 'invalid_url' },
    ]);
    expect(parseSettings('link_button', { ...defaultSettings('link_button'), html: '<b>' }).ok).toBe(false);
    expect(parseSettings('social_icons', { items: [{ platform: 'email', value: 'a@b.co' }] }).ok).toBe(true);
    const ig = parseSettings('social_icons', { items: [{ platform: 'instagram', value: '@not-a-url' }] });
    expect(ig.ok && ig.value.items[0]?.value).toBe('https://instagram.com/not-a-url');
    const bad = parseSettings('social_icons', { items: [{ platform: 'email', value: 'nope' }] });
    expect(bad.ok && publishIssues(defaultContent('ali'), [{ id: 's', kind: 'social_icons', settings: bad.value }])).toEqual([
      { elementId: 's', code: 'invalid_social' },
    ]);
  });
});

describe('smart links', () => {
  it.each([
    ['example.com', 'https://example.com'],
    ['www.digikala.com/product/1?x=2', 'https://www.digikala.com/product/1?x=2'],
    ['HTTP://Example.com', 'http://Example.com'],
    ['//cdn.example.com/a', 'https://cdn.example.com/a'],
    ['  https://a.ir  ', 'https://a.ir'],
    ['hello world', 'hello world'],
    ['javascript:alert(1)', 'javascript:alert(1)'],
    ['', ''],
  ])('normalizeHttpUrl(%j) = %j', (input, out) => expect(normalizeHttpUrl(input)).toBe(out));

  it('isHttpUrl needs a scheme and a dotted host', () => {
    expect(isHttpUrl('https://example.com')).toBe(true);
    expect(isHttpUrl('https://localhost')).toBe(false);
    expect(isHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpUrl('example.com')).toBe(false);
  });

  it.each([
    ['instagram', '@ali.reza', 'https://instagram.com/ali.reza'],
    ['instagram', 'ali_reza', 'https://instagram.com/ali_reza'],
    ['instagram', 'instagram.com/ali', 'https://instagram.com/ali'],
    ['telegram', '@noroset', 'https://t.me/noroset'],
    ['youtube', '@chan', 'https://youtube.com/@chan'],
    ['whatsapp', '0912 123 4567', 'https://wa.me/989121234567'],
    ['whatsapp', '۰۹۱۲۱۲۳۴۵۶۷', 'https://wa.me/989121234567'],
    ['phone', '09121234567', '+989121234567'],
    ['phone', 'tel:+98 21 1234 5678', '+982112345678'],
    ['email', 'MAILTO:Ali@Example.com', 'ali@example.com'],
    ['website', 'noroset.com', 'https://noroset.com'],
    ['phone', '021 1234 5678', '+982112345678'],
    ['phone', '+۹۸ ۹۱۲ ۱۲۳ ۴۵۶۷', '+989121234567'],
    ['whatsapp', '021 1234 5678', 'https://wa.me/982112345678'],
    ['eitaa', '@noroset', 'https://eitaa.com/noroset'],
    ['rubika', 'noroset', 'https://rubika.ir/noroset'],
    ['bale', '@noroset', 'https://ble.ir/noroset'],
    ['soroush', '@noroset', 'https://splus.ir/noroset'],
    ['igap', 'noroset', 'https://igap.net/noroset'],
    ['aparat', 'aparat.com/noroset', 'https://aparat.com/noroset'],
  ] as const)('normalizeSocialValue(%s, %j) = %j', (platform, input, out) => expect(normalizeSocialValue(platform, input)).toBe(out));

  it.each([
    ['https://www.instagram.com/ali', 'instagram'],
    ['t.me/noroset', 'telegram'],
    ['https://youtu.be/dQw4w9WgXcQ', 'youtube'],
    ['twitter.com/x', 'x'],
    ['ali@example.com', 'email'],
    ['0912 123 4567', 'phone'],
    ['https://example.com', null],
    ['eitaa.com/x', 'eitaa'],
    ['https://ble.ir/x', 'bale'],
    ['splus.ir/x', 'soroush'],
    ['https://profile.igap.net/x', 'igap'],
    ['٠٩١٢١٢٣٤٥٦٧', 'phone'],
  ])('detectSocialPlatform(%j) = %j', (input, out) => expect(detectSocialPlatform(input)).toBe(out));

  it('suggests a button label from the link', () => {
    expect(suggestLinkLabel('instagram.com/ali')).toBe('اینستاگرام');
    expect(suggestLinkLabel('https://www.digikala.com/x')).toBe('digikala.com');
    expect(suggestLinkLabel('nope')).toBeNull();
  });

  it.each([
    ['youtube.com/watch?v=dQw4w9WgXcQ', 'video_embed'],
    ['https://www.aparat.com/v/abc123', 'video_embed'],
    ['https://maps.app.goo.gl/abc', 'map_embed'],
    ['https://www.google.com/maps/@35.7,51.4,15z', 'map_embed'],
    ['https://neshan.org/maps/places/x', 'map_embed'],
    ['https://www.google.com/search?q=x', 'link_button'],
    ['digikala.com', 'link_button'],
    ['just some text', null],
  ])('classifyPastedLink(%j) = %j', (input, out) => expect(classifyPastedLink(input)).toBe(out));
});

describe('image crop', () => {
  it('defaults to a centred, unzoomed frame and validates bounds', () => {
    const r = parseSettings('image', { ...defaultSettings('image'), crop: undefined });
    expect(r.ok && r.value.crop).toEqual({ x: 50, y: 50, zoom: 1 });
    expect(parseSettings('image', { ...defaultSettings('image'), crop: { x: 101, y: 0, zoom: 1 } }).ok).toBe(false);
    expect(parseSettings('image', { ...defaultSettings('image'), crop: { x: 0, y: 0, zoom: 4 } }).ok).toBe(false);
  });

  it('styles only fixed aspects', () => {
    expect(imageCropStyle('auto', { x: 10, y: 20, zoom: 2 })).toEqual({});
    expect(imageCropStyle('1:1', { x: 10, y: 20, zoom: 1 })).toEqual({ objectPosition: '10% 20%' });
    expect(imageCropStyle('16:9', { x: 10, y: 20, zoom: 1.5 })).toEqual({
      objectPosition: '10% 20%',
      transform: 'scale(1.5)',
      transformOrigin: '10% 20%',
    });
  });
});

describe('image refs', () => {
  const ref = (file_id: string) => imageRefSchema.safeParse({ file_id, width: 10, height: 10 }).success;
  const uuid = '2f1c6a4e-8b7d-4c3a-9e1f-0a2b3c4d5e6f';

  it('accepts only norofile ids and bundled template images', () => {
    expect(ref(uuid)).toBe(true);
    expect(ref('/images/templates/cafe-hero-showcase.jpg')).toBe(true);
    expect(ref('https://evil.example/pixel.png')).toBe(false);
    expect(ref('//evil.example/a.jpg')).toBe(false);
    expect(ref('/images/templates/a.jpg") ; background:url("https://x')).toBe(false);
    expect(ref('/images/../api/x.jpg')).toBe(false);
  });

  it('resolves urls and syncs only norofile ids', () => {
    const url = assetUrlFor('https://api.test/files/');
    const tpl = { file_id: '/images/templates/a.jpg', width: 1, height: 1 };
    expect(url({ file_id: uuid, width: 1, height: 1 })).toBe(`https://api.test/files/${uuid}`);
    expect(url(tpl)).toBe('/images/templates/a.jpg');
    expect(imageFileIds([{ file_id: uuid, width: 1, height: 1 }, tpl])).toEqual([uuid]);
  });
});

describe('preset templates', () => {
  const ratio = (a: string, b: string) => {
    const [x, y] = [relativeLuminance(a), relativeLuminance(b)].sort((m, n) => n - m) as [number, number];
    return (x + 0.05) / (y + 0.05);
  };
  /** همه‌ی رنگ‌هایی که متن ممکن است رویشان بیفتد (دو سر گرادیان، پایه و لکه‌های mesh). */
  const bgColors = (p: (typeof PRESETS)[number]): string[] => {
    const b = p.background;
    if (b.kind === 'solid') return [b.color];
    if (b.kind === 'gradient') return [b.from, b.to];
    if (b.kind === 'mesh') return [b.base, ...b.colors];
    return [];
  };

  it('ids are unique and include every id stored by earlier versions', () => {
    const ids = PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const old of ['minimal', 'midnight', 'sand', 'forest', 'sunset', 'ocean', 'rose', 'mono']) expect(ids).toContain(old);
  });

  it.each(PRESETS.map((p) => [p.id, p] as const))('%s meets WCAG contrast', (_id, p) => {
    for (const bg of bgColors(p)) {
      // متن اصلی (و متن دکمه‌ی شیشه‌ای) روی همه‌ی رنگ‌های پس‌زمینه ≥ AA؛ متن کم‌رنگ ≥ ۳
      expect(ratio(p.foreground, bg), 'fg on ' + bg).toBeGreaterThanOrEqual(4.5);
      expect(ratio(p.muted, bg), 'muted on ' + bg).toBeGreaterThanOrEqual(3);
      if (p.buttonStyle === 'outline') expect(ratio(p.accent, bg), 'outline on ' + bg).toBeGreaterThanOrEqual(3);
    }
    if (p.buttonStyle === 'filled') expect(ratio(p.accent, contrastText(p.accent))).toBeGreaterThanOrEqual(4.5);
    if (p.buttonStyle === 'soft' || p.buttonStyle === 'shadow') expect(ratio(p.surface, contrastText(p.surface))).toBeGreaterThanOrEqual(4.5);
  });

  it('renders mesh backgrounds as layered radial gradients over the base', () => {
    const r = resolveTheme({ preset: 'aurora', accent: null, overrides: {} }, () => '');
    expect(r.vars['--nl-bg']).toMatch(/^radial-gradient\(at 15% 10%, #3730a3 0px, transparent 60%\),.*#0b1026$/);
    expect(r.buttonStyle).toBe('glass');
  });
});

describe('templates', () => {
  it('every template has valid content and elements within the free plan', async () => {
    const { LINK_TEMPLATES, templateElements } = await import('../shared');
    const ids = new Set<string>();
    for (const t of LINK_TEMPLATES) {
      expect(ids.has(t.id)).toBe(false);
      ids.add(t.id);
      expect(pageContentSchema.safeParse(t.content).success).toBe(true);
      // هیچ تنظیمی از پیش‌فرض‌ها جا نمی‌افتد و همه‌ی المان‌ها parse می‌شوند.
      expect(templateElements(t)).toHaveLength(t.elements.length);
      expect(t.elements.length).toBeLessThanOrEqual(30);
    }
  });
});

describe('isBlockedUrl', () => {
  it('blocks raw IPs and payment brand impersonation', () => {
    expect(isBlockedUrl('https://45.1.2.3/login')).toBe(true);
    expect(isBlockedUrl('https://[2001:db8::1]/')).toBe(true);
    expect(isBlockedUrl('https://shaparak-pay.example/x')).toBe(true);
    expect(isBlockedUrl('https://zarinpal.example.com')).toBe(true);
  });

  it('allows official payment domains and ordinary links', () => {
    expect(isBlockedUrl('https://bpm.shaparak.ir/pay')).toBe(false);
    expect(isBlockedUrl('https://zarinpal.com/x')).toBe(false);
    expect(isBlockedUrl('https://payment.zarinpal.com/pg')).toBe(false);
    expect(isBlockedUrl('https://example.com/shop')).toBe(false);
    expect(isBlockedUrl('not a link')).toBe(false);
  });
});

describe('search engines (seo)', () => {
  const desc = 'نانوایی سنتی محله با نان تازه‌ی هر صبح، سفارش آنلاین و ارسال سریع در شهر.';
  const content = (seo: Partial<ReturnType<typeof defaultContent>['seo']> = {}) => {
    const c = defaultContent('نانوایی سحر');
    return { ...c, profile: { ...c.profile, bio: 'نان تازه هر روز' }, seo: { ...c.seo, indexable: true, description: desc, ...seo } };
  };
  const assetUrl = (ref: { file_id: string }) => `https://files.test/${ref.file_id}`;
  const url = 'https://sahar.n8l.ir';
  const el = (kind: string, settings: unknown) => ({ id: kind, kind, settings }) as unknown as AnyElement;

  it('counts the description in characters after trim and needs the minimum', () => {
    expect(seoDescriptionLength('  سلام  ')).toBe(4);
    expect(seoDescriptionLength('😀a')).toBe(2);
    const exact = 'ن'.repeat(SEO_DESCRIPTION_MIN);
    expect(isSearchIndexable(content({ description: exact }), true)).toBe(true);
    expect(isSearchIndexable(content({ description: exact.slice(1) }), true)).toBe(false);
    expect(isSearchIndexable(content(), false)).toBe(false);
    expect(isSearchIndexable(content({ indexable: false }), true)).toBe(false);
    // snapshot قدیمی بدون entity هم پذیرفته می‌شود
    expect(pageContentSchema.parse({ ...content(), seo: { title: '', description: '', og_image: null, indexable: false } }).seo.entity).toBeNull();
  });

  it('builds ProfilePage JSON-LD only for an indexable page with a chosen owner', () => {
    const elements = [
      el('social_icons', {
        items: [
          { platform: 'instagram', value: 'https://instagram.com/sahar' },
          { platform: 'telegram', value: 'https://t.me/sahar' },
          { platform: 'instagram', value: 'https://instagram.com/sahar' },
          { platform: 'whatsapp', value: 'https://wa.me/989121234567' },
          { platform: 'email', value: 'a@b.ir' },
          { platform: 'phone', value: '+982188776655' },
        ],
      }),
      el('map_embed', { source_url: 'x', location: { provider: 'google', lat: 35.7, lng: 51.4, zoom: 15 }, label: '', height: 'md' }),
    ];
    expect(profileJsonLd(content(), elements, url, assetUrl, true)).toBeNull();
    expect(profileJsonLd(content({ entity: 'person', indexable: false }), elements, url, assetUrl, true)).toBeNull();
    expect(profileJsonLd(content({ entity: 'person', description: 'کوتاه' }), elements, url, assetUrl, true)).toBeNull();
    expect(profileJsonLd(content({ entity: 'person' }), elements, url, assetUrl, false)).toBeNull();

    const org = profileJsonLd(content({ entity: 'organization' }), elements, url, assetUrl, true)!;
    expect(org).toMatchObject({ '@context': 'https://schema.org', '@type': 'ProfilePage', url, description: desc });
    expect(org.mainEntity).toEqual({
      '@type': 'Organization',
      name: 'نانوایی سحر',
      url,
      description: 'نان تازه هر روز',
      // فقط پروفایل‌ها، بدون تکرار؛ واتس‌اپ و ایمیل و تلفن نه
      sameAs: ['https://instagram.com/sahar', 'https://t.me/sahar'],
      telephone: '+982188776655',
      location: { '@type': 'Place', geo: { '@type': 'GeoCoordinates', latitude: 35.7, longitude: 51.4 } },
    });
    const person = profileJsonLd(content({ entity: 'person' }), elements, url, assetUrl, true)!;
    expect(person.mainEntity).toMatchObject({ '@type': 'Person' });
    expect(person.mainEntity).not.toHaveProperty('location');
  });

  it('escapes user text so it cannot leave the script tag', () => {
    const LS = String.fromCharCode(0x2028);
    const c = content({ entity: 'person' });
    const evil = { ...c, profile: { ...c.profile, name: '</script><script>alert(1)</script>', bio: `a${LS}b & c` } };
    const html = jsonLdScript(profileJsonLd(evil, [], url, assetUrl, true)!);
    expect(html).not.toMatch(/[<>]/);
    expect(html).not.toContain(LS);
    expect(JSON.parse(html)).toMatchObject({ mainEntity: { name: '</script><script>alert(1)</script>', description: `a${LS}b & c` } });
  });
});
