import { z } from 'zod';
import type { ChromeType } from '../contract';
import { mainPagePosition } from './simple';

// متن دکمه‌ها قابل تنظیم است؛ رفتار (کدام دکمه‌ها) ثابت و از وضعیت اجرا محاسبه می‌شود.

const label = (fallback: string) => z.string().trim().min(1).max(50).default(fallback);

const settingsSchema = z.strictObject({
  start_label: label('شروع'),
  prev_label: label('قبلی'),
  next_label: label('بعدی'),
  submit_label: label('ارسال'),
});

type Settings = z.output<typeof settingsSchema>;

export type NavButton = { action: 'start' | 'prev' | 'next' | 'submit'; label: string };

export const navButtonsChrome: ChromeType<Settings, { buttons: NavButton[] }> = {
  kind: 'chrome',
  type: 'nav_buttons',
  settingsSchema,
  defaultSettings: settingsSchema.parse({}),
  allowedAreas: ['header', 'footer', 'bottomBar'],
  allowedPageKinds: ['welcome', 'main'],
  view: (settings, state) => {
    if (state.page.kind === 'welcome') {
      return { buttons: [{ action: 'start', label: settings.start_label }] };
    }
    const pos = mainPagePosition(state);
    if (!pos) return { buttons: [] };
    const buttons: NavButton[] = [];
    if (pos.current > 1) buttons.push({ action: 'prev', label: settings.prev_label });
    buttons.push(
      pos.current < pos.total
        ? { action: 'next', label: settings.next_label }
        : { action: 'submit', label: settings.submit_label },
    );
    return { buttons };
  },
};

