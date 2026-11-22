// شبکه‌های اجتماعی و آیکون‌های آماده‌ی دکمه.

export const SOCIAL_PLATFORMS = [
  'instagram',
  'telegram',
  'whatsapp',
  'x',
  'youtube',
  'linkedin',
  'aparat',
  'eitaa',
  'rubika',
  'bale',
  'soroush',
  'igap',
  'email',
  'phone',
  'website',
] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const SOCIAL_LABELS: Record<SocialPlatform, string> = {
  instagram: 'اینستاگرام',
  telegram: 'تلگرام',
  whatsapp: 'واتس‌اپ',
  x: 'ایکس',
  youtube: 'یوتیوب',
  linkedin: 'لینکدین',
  aparat: 'آپارات',
  eitaa: 'ایتا',
  rubika: 'روبیکا',
  bale: 'بله',
  soroush: 'سروش پلاس',
  igap: 'آی‌گپ',
  email: 'ایمیل',
  phone: 'تلفن',
  website: 'وب‌سایت',
};

/**
 * پس‌زمینه‌ی دایره‌ی آیکون هر شبکه (رنگ برند از آیکون رسمی؛ آیکون سفید). روبیکا و آی‌گپ مثل لوگوی خودشان
 * چندرنگ/گرادیان‌اند (مقدار CSS background). ایمیل/تلفن/وب‌سایت رنگ خنثی دارند.
 */
export const SOCIAL_COLORS: Record<SocialPlatform, string> = {
  instagram: '#e1306c',
  telegram: '#26a5e4',
  whatsapp: '#25d366',
  x: '#000000',
  youtube: '#ff0000',
  linkedin: '#0a66c2',
  aparat: '#ed145b',
  eitaa: '#ff7634',
  rubika:
    'conic-gradient(#6bb800,#00d9bc 40deg,#823e8b 70deg,#fa384a 100deg,#ff6c00 130deg,#b2d000 170deg,#6bb800 195deg,#0068a5 230deg,#513388 255deg,#823e8b 275deg,#fa3849 295deg,#ff6b00 315deg,#ffa600 330deg,#b1d100 345deg,#6bb800)',
  bale: '#00b894',
  soroush: '#196ff0',
  igap: 'linear-gradient(135deg,#b8d54f,#4cb35c)',
  email: '#64748b',
  phone: '#16a34a',
  website: '#475569',
};

export const GENERIC_ICONS = ['link', 'globe', 'shop', 'calendar', 'file', 'star', 'heart', 'gift', 'music', 'pin'] as const;
export type GenericIcon = (typeof GENERIC_ICONS)[number];

export const ICON_PRESETS = [...SOCIAL_PLATFORMS, ...GENERIC_ICONS] as const;
export type IconPreset = (typeof ICON_PRESETS)[number];

export const ICON_LABELS: Record<IconPreset, string> = {
  ...SOCIAL_LABELS,
  link: 'لینک',
  globe: 'کره',
  shop: 'فروشگاه',
  calendar: 'تقویم',
  file: 'فایل',
  star: 'ستاره',
  heart: 'قلب',
  gift: 'هدیه',
  music: 'موسیقی',
  pin: 'مکان',
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[0-9]{4,15}$/;

/** مقدار ورودی هر شبکه معتبر است؟ (ایمیل/تلفن مقدار خام، بقیه آدرس http/https) */
export function isValidSocialValue(platform: SocialPlatform, value: string): boolean {
  if (platform === 'email') return EMAIL.test(value);
  if (platform === 'phone') return PHONE.test(value);
  return /^https?:\/\/[^\s/?#]+\.[^\s/?#]+[^\s]*$/i.test(value);
}

export function socialHref(platform: SocialPlatform, value: string): string {
  if (platform === 'email') return `mailto:${value}`;
  if (platform === 'phone') return `tel:${value}`;
  return value;
}
