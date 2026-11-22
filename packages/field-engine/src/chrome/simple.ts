import { z } from 'zod';
import type { ChromeRuntimeState, ChromeType } from '../contract';
import { httpsUrlSchema } from '../schema';

// chrome «زنده»: مقدار نمایشی از وضعیت اجرا محاسبه می‌شود، نه از تعریف.

const noSettings = z.strictObject({});
type NoSettings = z.output<typeof noSettings>;

/** موقعیت صفحه‌ی جاری بین صفحات main قابل‌نمایش (۱-مبنا)؛ برای غیر main ← null. */
export function mainPagePosition(state: ChromeRuntimeState): { current: number; total: number } | null {
  const index = state.visibleMainPages.findIndex((p) => p.page_id === state.page.page_id);
  return index < 0 ? null : { current: index + 1, total: state.visibleMainPages.length };
}

const logoTitleSettings = z.strictObject({
  title: z.string().max(200).default(''),
  logo_url: z.union([httpsUrlSchema, z.literal('')]).default(''),
  /** نام کوتاه فضای کاری/کسب‌وکار زیر عنوان؛ قابل ویرایش برای هر فرم. */
  subtitle: z.string().max(200).default(''),
  /** start = راست در RTL، center = وسط، end = چپ. */
  align: z.enum(['start', 'center', 'end']).default('start'),
  visible: z.boolean().default(true),
  show_logo: z.boolean().default(true),
  show_title: z.boolean().default(true),
  show_subtitle: z.boolean().default(true),
});

export const logoTitleChrome: ChromeType<
  z.output<typeof logoTitleSettings>,
  {
    title: string;
    subtitle: string;
    logo_url: string;
    align: 'start' | 'center' | 'end';
    visible: boolean;
    show_logo: boolean;
    show_title: boolean;
    show_subtitle: boolean;
  }
> = {
  kind: 'chrome',
  type: 'logo_title',
  settingsSchema: logoTitleSettings,
  defaultSettings: logoTitleSettings.parse({}),
  allowedAreas: ['header', 'footer', 'topBar', 'sidebar'],
  allowedPageKinds: ['welcome', 'main', 'ending'],
  view: (settings) => ({
    title: settings.title,
    subtitle: settings.subtitle,
    logo_url: settings.logo_url,
    align: settings.align,
    visible: settings.visible,
    show_logo: settings.show_logo,
    show_title: settings.show_title,
    show_subtitle: settings.show_subtitle,
  }),
};

export const pageNumberChrome: ChromeType<NoSettings, { current: number; total: number } | null> = {
  kind: 'chrome',
  type: 'page_number',
  settingsSchema: noSettings,
  defaultSettings: {},
  allowedAreas: ['header', 'footer', 'topBar', 'sidebar'],
  allowedPageKinds: ['main'],
  view: (_settings, state) => mainPagePosition(state),
};

type TimelineStep = { page_id: string; title: string; status: 'done' | 'current' | 'upcoming' };

export const progressTimelineChrome: ChromeType<NoSettings, { steps: TimelineStep[] }> = {
  kind: 'chrome',
  type: 'progress_timeline',
  settingsSchema: noSettings,
  defaultSettings: {},
  allowedAreas: ['header', 'footer', 'topBar', 'sidebar'],
  allowedPageKinds: ['main'],
  view: (_settings, state) => {
    const current = state.visibleMainPages.findIndex((p) => p.page_id === state.page.page_id);
    return {
      steps: state.visibleMainPages.map((p, i) => ({
        page_id: p.page_id,
        title: p.title,
        status: i < current ? 'done' : i === current ? 'current' : 'upcoming',
      })),
    };
  },
};

export const formNameChrome: ChromeType<NoSettings, { name: string }> = {
  kind: 'chrome',
  type: 'form_name',
  settingsSchema: noSettings,
  defaultSettings: {},
  allowedAreas: ['header', 'footer', 'topBar', 'sidebar'],
  allowedPageKinds: ['welcome', 'main', 'ending'],
  view: (_settings, state) => ({ name: state.formName }),
};

/** فقط نمایش زمان سپری‌شده؛ محدودیت زمانی ندارد. زمان از state تزریق می‌شود. */
export const elapsedTimerChrome: ChromeType<NoSettings, { elapsed_seconds: number }> = {
  kind: 'chrome',
  type: 'elapsed_timer',
  settingsSchema: noSettings,
  defaultSettings: {},
  allowedAreas: ['header', 'footer', 'topBar', 'sidebar'],
  allowedPageKinds: ['main'],
  view: (_settings, state) => ({
    elapsed_seconds:
      state.startedAtMs === undefined || state.nowMs === undefined
        ? 0
        : Math.max(0, Math.floor((state.nowMs - state.startedAtMs) / 1000)),
  }),
};

export const LICENSE_BADGE = { label: 'Powered by Noroset', href: 'https://noroset.com/form' } as const;

/** فقط فوتر. در پلن رایگان applyBranding آن را در رندر اجباری می‌کند. */
export const licenseBadgeChrome: ChromeType<NoSettings, typeof LICENSE_BADGE> = {
  kind: 'chrome',
  type: 'license_badge',
  settingsSchema: noSettings,
  defaultSettings: {},
  allowedAreas: ['footer'],
  allowedPageKinds: ['welcome', 'main', 'ending'],
  view: () => LICENSE_BADGE,
};

