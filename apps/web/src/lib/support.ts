export const SUPPORT_PHONE = '09396655322';
export const SUPPORT_PHONE_INTL = '+989396655322';
export const SUPPORT_PHONE_FORMATTED = '۰۹۳۹ ۶۶۵ ۵۳۲۲';
export const SUPPORT_PHONE_DISPLAY = '۰۹۳۹۶۶۵۵۳۲۲';

export interface SupportChannelData {
  id: 'bale' | 'whatsapp' | 'telegram';
  name: string;
  title: string;
  description: string;
  href: string;
  badge: string;
  themeColor: string;
  badgeClass: string;
  hoverClass: string;
}

export const SUPPORT_CHANNELS_DATA: SupportChannelData[] = [
  {
    id: 'bale',
    name: 'بله',
    title: 'پیام‌رسان بله',
    description: 'ارسال پیام مستقیم در پیام‌رسان بله',
    href: `https://ble.ir/${SUPPORT_PHONE_INTL}`,
    badge: 'داخلی و پرسرعت',
    themeColor: '#00a693',
    badgeClass: 'bg-tone-teal/10 text-tone-teal dark:text-tone-teal border-tone-teal/20',
    hoverClass: 'hover:border-tone-teal/30 hover:bg-tone-teal/5',
  },
  {
    id: 'whatsapp',
    name: 'واتس‌اپ',
    title: 'واتس‌اپ',
    description: 'چت و ارسال پیام به پشتیبانی واتس‌اپ',
    href: `https://wa.me/98${SUPPORT_PHONE.slice(1)}`,
    badge: 'پاسخگویی آنلاین',
    themeColor: '#25d366',
    badgeClass: 'bg-tone-emerald/10 text-success dark:text-success border-tone-emerald/20',
    hoverClass: 'hover:border-tone-emerald/30 hover:bg-tone-emerald/5',
  },
  {
    id: 'telegram',
    name: 'تلگرام',
    title: 'تلگرام',
    description: 'ارتباط مستقیم با کارشناس در تلگرام',
    href: `https://t.me/${SUPPORT_PHONE_INTL}`,
    badge: 'ارتباط مستقیم',
    themeColor: '#24a1de',
    badgeClass: 'bg-tone-sky/10 text-tone-sky dark:text-tone-sky border-tone-sky/20',
    hoverClass: 'hover:border-tone-sky/30 hover:bg-tone-sky/5',
  },
];
