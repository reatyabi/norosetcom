import type { FC, SVGProps } from 'react';
import {
  SUPPORT_CHANNELS_DATA,
  SUPPORT_PHONE,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_FORMATTED,
  SUPPORT_PHONE_INTL,
  type SupportChannelData,
} from '@/lib/support';

export {
  SUPPORT_PHONE,
  SUPPORT_PHONE_INTL,
  SUPPORT_PHONE_FORMATTED,
  SUPPORT_PHONE_DISPLAY,
};

type SvgIcon = FC<SVGProps<SVGSVGElement>>;

export function BaleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="2.8 2.8 18.4 18.4" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
      <path
        fillRule="evenodd"
        d="M4.625 12V5.55Q4.625 4.55 5.5 4.95L7.66 5.94A7.375 7.375 0 1 1 4.625 12ZM8.23 10.98A1.45 1.45 0 0 0 7.72 13.03L9.98 15.28A1.45 1.45 0 0 0 12.02 15.28L16.28 11.03A1.45 1.45 0 0 0 14.22 8.97L11 12.2L9.78 10.97A1.45 1.45 0 0 0 8.23 10.98Z"
      />
    </svg>
  );
}

export function WhatsAppIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.28-2.42 5.83a8.18 8.18 0 0 1-5.82 2.41h-.01c-1.48 0-2.93-.39-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.64c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.26-1.5-1.4-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.87.85-.87 2.07s.89 2.4 1.01 2.57c.13.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.53.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.17-.48-.29" />
    </svg>
  );
}

export function TelegramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38" />
    </svg>
  );
}

const ICONS: Record<SupportChannelData['id'], SvgIcon> = {
  bale: BaleIcon,
  whatsapp: WhatsAppIcon,
  telegram: TelegramIcon,
};

export interface SupportChannel extends SupportChannelData {
  icon: SvgIcon;
}

export const SUPPORT_CHANNELS: SupportChannel[] = SUPPORT_CHANNELS_DATA.map((item) => ({
  ...item,
  icon: ICONS[item.id],
}));
