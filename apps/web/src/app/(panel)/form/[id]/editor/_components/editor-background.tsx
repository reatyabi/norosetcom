'use client';

import type { FormTheme } from '@noroset/field-engine';
import { FormBackground, type FormBackgroundValue } from '@noroset/noroform/ui';

function backgroundFromTheme(theme: FormTheme): FormBackgroundValue {
  return {
    mode: theme.background_style,
    color: theme.background_color,
    secondary_color: theme.background_secondary_color,
    angle: theme.background_angle,
    pattern_icon: theme.background_pattern_icon ?? '',
    pattern_size: theme.background_pattern_size ?? 36,
    pattern_color: theme.background_pattern_color ?? '',
    image_url: theme.background_image_url ?? '',
    image_opacity: theme.background_image_opacity ?? 1,
    focal_x: theme.background_focal_x ?? 50,
    focal_y: theme.background_focal_y ?? 50,
    overlay: theme.background_overlay ?? 'none',
    overlay_color: theme.background_overlay_color ?? '',
    overlay_opacity: theme.background_overlay_opacity ?? 0.45,
  };
}

/** پس‌زمینه‌ی فرم به‌عنوان لایه‌ی تمام‌عرض بوم ادیتور. */
export function EditorBackground({ theme }: { theme: FormTheme }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <FormBackground value={backgroundFromTheme(theme)} />
    </div>
  );
}