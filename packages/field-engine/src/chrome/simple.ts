import { z } from 'zod';
import type { ChromeRuntimeState, ChromeType } from '../contract';

const noSettings = z.strictObject({});
type NoSettings = z.output<typeof noSettings>;

/** موقعیت صفحه‌ی جاری بین صفحات main قابل‌نمایش (۱-مبنا)؛ برای غیر main ← null. */
export function mainPagePosition(state: ChromeRuntimeState): { current: number; total: number } | null {
  const index = state.visibleMainPages.findIndex((p) => p.page_id === state.page.page_id);
  return index < 0 ? null : { current: index + 1, total: state.visibleMainPages.length };
}

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
