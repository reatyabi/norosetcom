import { defaultContent, type PageContent } from './content';
import {
  defaultSettings,
  parseSettings,
  LUCIDE_NAME,
  type AnyElement,
  type ElementKind,
  type LinkButtonSettings,
} from './elements';
import type { MapProvider, VideoProvider } from './embeds';
import { parseRichText, type RichDoc } from './rich-text';
import { ICON_PRESETS, type IconPreset, type SocialPlatform } from './social';
import type { Background, ButtonStyle, Font, Radius, TextSize } from './theme';

// قالب‌های آماده‌ی صفحه‌ی لینک (گالری قالب‌ها در پنل). داده‌ی ثابت در کد: محتوای صفحه (پروفایل و قالب
// ظاهری) و المان‌ها فقط با تفاوت از تنظیمات پیش‌فرض؛ سرور هنگام ساخت همان‌ها را مثل ویرایش validate
// می‌کند (POST /norolink/pages با content و elements).

export const LINK_TEMPLATE_CATEGORIES = ['personal', 'business', 'creator'] as const;
export type LinkTemplateCategory = (typeof LINK_TEMPLATE_CATEGORIES)[number];

export const LINK_TEMPLATE_CATEGORY_LABELS: Record<LinkTemplateCategory, string> = {
  personal: 'شخصی',
  business: 'کسب‌وکار',
  creator: 'تولید محتوا و رویداد',
};

export interface TemplateElement {
  kind: ElementKind;
  /** فقط تفاوت با تنظیمات پیش‌فرض همان نوع. */
  settings?: Record<string, unknown>;
}

export interface LinkTemplate {
  id: string;
  title: string;
  description: string;
  category: LinkTemplateCategory;
  content: PageContent;
  elements: TemplateElement[];
  /** تصویر بندانگشتی گالری (`platform/{uuid}`)؛ فقط قالب‌های مدیریت پلتفرم. قالب‌های کد تصویر ثابت وب دارند. */
  thumb?: string;
}

const p = (text: string): RichDoc['blocks'][number] => ({ type: 'p', content: [{ text }] });
const h = (text: string): RichDoc['blocks'][number] => ({ type: 'h', level: 2, content: [{ text }] });
const text = (...blocks: RichDoc['blocks']): TemplateElement => ({ kind: 'rich_text', settings: { doc: { blocks } } });
const md = (markdown: string): TemplateElement => ({ kind: 'rich_text', settings: { doc: parseRichText(markdown) } });

type IconSpec = string | IconPreset | { kind: 'lucide'; value: string } | { kind: 'preset'; value: IconPreset };

function resolveIcon(icon?: IconSpec): LinkButtonSettings['icon'] {
  if (!icon) return null;
  if (typeof icon === 'object' && 'kind' in icon) return icon;
  if (typeof icon === 'string') {
    if (LUCIDE_NAME.test(icon)) return { kind: 'lucide', value: icon };
    if ((ICON_PRESETS as readonly string[]).includes(icon)) return { kind: 'preset', value: icon as IconPreset };
  }
  return null;
}

interface ButtonOptions {
  bg_color?: string | null;
  open_in_new_tab?: boolean;
  track_clicks?: boolean;
}

const button = (
  label: string,
  icon?: IconSpec,
  url: string = '',
  options?: ButtonOptions,
): TemplateElement => ({
  kind: 'link_button',
  settings: {
    label,
    url,
    icon: resolveIcon(icon),
    open_in_new_tab: options?.open_in_new_tab ?? true,
    track_clicks: options?.track_clicks ?? true,
    style: { bg_color: options?.bg_color ?? null },
  },
});

const social = (...items: { platform: SocialPlatform; value: string }[]): TemplateElement => ({
  kind: 'social_icons',
  settings: { items },
});

const img = (
  file_id: string,
  alt: string,
  width: number = 1200,
  height: number = 675,
  aspect: 'auto' | '1:1' | '4:3' | '16:9' = '16:9',
  link: string = '',
): TemplateElement => ({
  kind: 'image',
  settings: {
    image: { file_id, width, height },
    alt,
    link,
    aspect,
    crop: { x: 50, y: 50, zoom: 1 },
    slides: [],
  },
});

interface SlideItem {
  file_id: string;
  alt?: string;
  link?: string;
  width?: number;
  height?: number;
  crop?: { x: number; y: number; zoom: number };
}

const slider = (
  items: SlideItem[],
  aspect: 'auto' | '1:1' | '4:3' | '16:9' = '16:9',
): TemplateElement => {
  const [first, ...rest] = items;
  if (!first) throw new Error('Slider needs at least one slide');
  return {
    kind: 'image',
    settings: {
      image: { file_id: first.file_id, width: first.width ?? 1200, height: first.height ?? 675 },
      alt: first.alt ?? '',
      link: first.link ?? '',
      aspect,
      crop: first.crop ?? { x: 50, y: 50, zoom: 1 },
      slides: rest.map((s) => ({
        image: { file_id: s.file_id, width: s.width ?? 1200, height: s.height ?? 675 },
        alt: s.alt ?? '',
        link: s.link ?? '',
        crop: s.crop ?? { x: 50, y: 50, zoom: 1 },
      })),
    },
  };
};

const map = (
  label: string,
  lat: number = 35.6997,
  lng: number = 51.338,
  options?: {
    provider?: MapProvider;
    source_url?: string;
    height?: 'sm' | 'md' | 'lg';
    zoom?: number;
    place_token?: string;
    pb?: string;
  },
): TemplateElement => {
  const provider = options?.provider ?? 'google';
  const zoom = options?.zoom ?? 15;
  const height = options?.height ?? 'md';
  const source_url =
    options?.source_url ??
    (provider === 'balad' && options?.place_token
      ? `https://balad.ir/p/${options.place_token}`
      : provider === 'neshan'
        ? `https://neshan.org/maps/@${lat},${lng},${zoom}z`
        : `https://maps.google.com/?q=${lat},${lng}`);

  return {
    kind: 'map_embed',
    settings: {
      source_url,
      label,
      location: {
        provider,
        lat,
        lng,
        zoom,
        ...(options?.place_token ? { place_token: options.place_token } : {}),
        ...(options?.pb ? { pb: options.pb } : {}),
      },
      height,
    },
  };
};

const video = (source_url: string, provider: VideoProvider, video_id: string): TemplateElement => ({
  kind: 'video_embed',
  settings: { source_url, video: { provider, video_id } },
});

const bgImage = (
  file_id: string,
  overlay: number,
  tone: 'dark' | 'light' = 'dark',
): Background => ({
  kind: 'image',
  image: { file_id, width: 1200, height: 675 },
  overlay,
  tone,
  tone_source: 'manual',
  focal: { x: 50, y: 50 },
  luma: null,
});

interface ThemeConfig {
  accent?: string | null;
  overrides?: {
    button_style?: ButtonStyle;
    radius?: Radius;
    font?: Font;
    background?: Background;
  };
  text_size?: TextSize;
}

function content(
  name: string,
  bio: string,
  preset: string,
  avatarPath: string | null = null,
  layout: PageContent['profile']['layout'] = 'stacked',
  themeConfig?: ThemeConfig,
): PageContent {
  const base = defaultContent(name);
  const avatar = avatarPath ? { file_id: avatarPath, width: 256, height: 256 } : null;
  return {
    ...base,
    profile: { ...base.profile, bio, avatar, layout },
    theme: {
      ...base.theme,
      preset,
      accent: themeConfig?.accent ?? null,
      text_size: themeConfig?.text_size,
      overrides: themeConfig?.overrides ?? {},
    },
    seo: { title: name, description: bio, og_image: avatar, indexable: false, entity: null },
  };
}

export const LINK_TEMPLATES: readonly LinkTemplate[] = [
  {
    id: 'bio',
    title: 'بیوی شخصی و برند فردی',
    description: 'معرفی حرفه‌ای، شبکه‌های اجتماعی، پورتفولیو و کلیدی‌ترین لینک‌ها در یک قاب شیک.',
    category: 'personal',
    content: content(
      'سارا رادمنش',
      'مشاور ارشد استراتژی محتوا و برندسازی • میزبان پادکست نبض بازار • شیفته‌ی دیزاین مینیمال و قهوه تخصصی',
      'lavender',
      '/images/templates/bio-sara-avatar.jpg',
      'side_right',
      {
        overrides: {
          button_style: 'tonal',
          radius: 'full',
          background: bgImage('/images/templates/bio-sara-avatar.jpg', 0.15),
        },
      },
    ),
    elements: [
      social(
        { platform: 'instagram', value: 'sara.radmanesh' },
        { platform: 'telegram', value: 'sararad_channel' },
        { platform: 'linkedin', value: 'sara-radmanesh' },
        { platform: 'x', value: 'sara_radmanesh' },
      ),
      button('رزرو جلسه مشاوره ۳۰ دقیقه‌ای', 'CalendarCheck', 'https://sararad.ir/consultation', { bg_color: '#6d28d9' }),
      button('مشاهده پورتفولیو و رزومه (PDF)', 'FileText', 'https://sararad.ir/resume.pdf'),
      button('شنیدن آخرین اپیزود پادکست نبض بازار', 'Headphones', 'https://castbox.fm'),
      button('عضویت در خبرنامه هفتگی استراتژی محتوا', 'Sparkles', 'https://sararad.ir/newsletter'),
      button('یادداشت‌ها و مقالات تحلیلی در وبلاگ', 'Globe', 'https://sararad.ir/blog'),
    ],
  },
  {
    id: 'portfolio',
    title: 'نمونه‌کار دیزاین و محصول',
    description: 'برای طراحان محصول، فریلنسرها و متخصصان خلاق: نمایش کارهای برگزیده و رزرو همکاری.',
    category: 'personal',
    content: content(
      'نیما کاوه',
      'طراح ارشد محصول و سیستم‌های طراحی (Lead Product Designer) • بیش از ۶ سال تجربه در فین‌تک، نئوبانک و پلتفرم‌های ابری',
      'mono',
      '/images/templates/portfolio-nima-avatar.jpg',
      'side_right',
      {
        overrides: {
          button_style: 'outline',
          radius: 'none',
          background: bgImage('/images/templates/portfolio-ui-showcase.jpg', 0.65),
        },
      },
    ),
    elements: [
      md(`## تخصص‌ها و مهارت‌های کلیدی
- طراحی دیزاین‌سیستم‌های مقیاس‌پذیر و توکن‌های طراحی
- بازطراحی رابط و تجربه کاربری (UI/UX) وب و موبایل
- تحقیقات کاربری داده‌محور، تست کاربردپذیری و پروتوتایپ پیشرفته`),
      img(
        '/images/templates/portfolio-ui-showcase.jpg',
        'کیس‌استادی طراحی اپلیکیشن مالی و سرمایه‌گذاری نئوبانک',
        1200,
        675,
        '16:9',
        'https://dribbble.com',
      ),
      button('درخواست همکاری در پروژه‌های جدید', 'Briefcase', 'https://nimakaveh.design/contact', { bg_color: '#2563eb' }),
      button('مشاهده کیس‌استادی‌ها و شات‌ها در دریبل', 'Sparkles', 'https://dribbble.com'),
      button('دانلود فایل کامل رزومه و سوابق کاری (CV)', 'FileDown', 'https://nimakaveh.design/resume.pdf'),
      button('مطالعه مقالات تخصصی دیزاین در ویرگول', 'BookOpen', 'https://virgool.io'),
      social(
        { platform: 'linkedin', value: 'nima-kaveh-ui' },
        { platform: 'instagram', value: 'nima.kaveh.design' },
        { platform: 'telegram', value: 'nimakaveh_design' },
        { platform: 'email', value: 'nima@kaveh.design' },
      ),
    ],
  },
  {
    id: 'cafe',
    title: 'کافه و رستوران تخصصی',
    description: 'منوی دیجیتال، عکس‌های فضا، رزرو آنلاین میز، آدرس روی نقشه و سفارش بیرون‌بر.',
    category: 'business',
    content: content(
      'کافه گالری روبرو',
      'قهوه‌ی تخصصی نسل سوم، شیرینی‌های روزپخت فرانسوی و صبحانه ارگانیک • هر روز از ساعت ۸:۰۰ تا ۲۳:۳۰',
      'sand',
      '/images/templates/cafe-rooberoo-avatar.jpg',
      'stacked',
      {
        overrides: {
          button_style: 'soft',
          radius: 'lg',
          background: bgImage('/images/templates/cafe-hero-showcase.jpg', 0.15),
        },
      },
    ),
    elements: [
      slider(
        [
          {
            file_id: '/images/templates/cafe-hero-showcase.jpg',
            alt: 'میز صبحانه تازه و لاته آرت کافه روبرو',
            link: 'https://caferooberoo.menu',
          },
          {
            file_id: '/images/templates/cafe-rooberoo-avatar.jpg',
            alt: 'فضای گرم و دنج کافه گالری روبرو',
          },
        ],
        '16:9',
      ),
      button('مشاهده منوی دیجیتال و قیمت‌های روز', 'Utensils', 'https://caferooberoo.menu', { bg_color: '#8a5a3c' }),
      button('سفارش بیرون‌بر از اسنپ‌فود (ارسال سریع)', 'ShoppingBag', 'https://snappfood.ir'),
      button('رزرو آنلاین میز (آخر هفته و جلسات)', 'CalendarCheck', 'https://caferooberoo.ir/reserve'),
      md(`### ویژگی‌ها و امکانات کافه
- اینترنت پرسرعت فیبر نوری اختصاصی برای دورکاری
- فضای باز و روف‌گاردن چهارفصل با سیستم گرمایشی تابشی`),
      map(
        'تهران، خیابان ولیعصر، بالاتر از پارک ساعی، بن‌بست چمن',
        35.738,
        51.412,
        { provider: 'balad', height: 'md', place_token: 'caferooberoo' },
      ),
      social(
        { platform: 'instagram', value: 'cafe.rooberoo' },
        { platform: 'bale', value: 'caferooberoo' },
        { platform: 'whatsapp', value: '989120000000' },
        { platform: 'phone', value: '02188880000' },
      ),
    ],
  },
  {
    id: 'shop',
    title: 'فروشگاه آنلاین و لایف‌استایل',
    description: 'ورود به فروشگاه، پیشنهاد ویژه، پیگیری مرسوله پستی و پشتیبانی سریع سفارش‌ها.',
    category: 'business',
    content: content(
      'استودیو چرم الوند',
      'محصولات دست‌دوز چرم طبیعی و اکسسوری مدرن • ارسال رایگان با پست پیشتاز برای خریدهای بالای ۸۰۰ هزار تومان',
      'rose',
      '/images/templates/shop-leather-avatar.jpg',
      'stacked',
      {
        overrides: {
          button_style: 'filled',
          radius: 'full',
          background: bgImage('/images/templates/shop-leather-showcase.jpg', 0.60),
        },
      },
    ),
    elements: [
      slider(
        [
          {
            file_id: '/images/templates/shop-leather-showcase.jpg',
            alt: 'کالکشن جدید کیف و اکسسوری چرم دست‌دوز الوند',
            link: 'https://alvandleather.com',
          },
          {
            file_id: '/images/templates/shop-leather-avatar.jpg',
            alt: 'کیف و جاکارتی چرم طبیعی دست‌دوز الوند',
          },
        ],
        '16:9',
      ),
      button('ورود به فروشگاه اینترنتی و خرید آنلاین', 'ShoppingBag', 'https://alvandleather.com', { bg_color: '#be185d' }),
      button('پیشنهاد ویژه‌ی جشنواره فصلی (تا ۴۰٪ تخفیف)', 'Sparkles', 'https://alvandleather.com/sale'),
      button('پیگیری مرسوله با کد رهگیری پستی', 'PackageCheck', 'https://tracking.post.ir'),
      md(`### تعهدات و ضمانت‌های خرید
- ضمانت اصالت ۱۰۰٪ چرم طبیعی و دوخت دست‌دوز
- بسته‌بندی کادویی لوکس اختصاصی برای تمام سفارش‌ها
- امکان تعویض و مرجوعی آسان تا ۷ روز پس از دریافت`),
      social(
        { platform: 'instagram', value: 'alvand.leather' },
        { platform: 'eitaa', value: 'alvand_leather' },
        { platform: 'rubika', value: 'alvand_leather' },
        { platform: 'telegram', value: 'alvand_leather' },
        { platform: 'whatsapp', value: '989123456789' },
      ),
    ],
  },
  {
    id: 'clinic',
    title: 'مطب و کلینیک تخصصی',
    description: 'نوبت‌دهی آنلاین ۲۴ ساعته، ساعات کاری، گالری درمان، مسیریابی و راه‌های تماس.',
    category: 'business',
    content: content(
      'کلینیک دندانپزشکی دکتر پارسا',
      'متخصص جراحی لثه و ایمپلنت‌های دیجیتال • عضو انجمن دندانپزشکان ایران • نظام پزشکی: ۱۲۴۸۵۰',
      'ocean',
      '/images/templates/clinic-doctor-avatar.jpg',
      'side_right',
      {
        overrides: {
          button_style: 'glass',
          radius: 'lg',
          background: bgImage('/images/templates/clinic-interior-showcase.jpg', 0.65),
        },
      },
    ),
    elements: [
      button('نوبت‌دهی آنلاین ۲۴ ساعته (رزرو سریع)', 'CalendarCheck', 'https://drparsa.clinic/book', { bg_color: '#0f766e' }),
      button('مشاهده گالری قبل و بعد درمان‌ها و لبخند', 'Sparkles', 'https://drparsa.clinic/results'),
      button('تعرفه‌ها و بیمه‌های تکمیلی طرف قرارداد', 'FileText', 'https://drparsa.clinic/insurance'),
      img(
        '/images/templates/clinic-interior-showcase.jpg',
        'فضای درمانی آرام‌بخش و تجهیزات مدرن کلینیک دکتر پارسا',
        1200,
        675,
        '16:9',
      ),
      md(`## ساعات کاری و ویزیت بیماران
- **شنبه تا چهارشنبه:** ۱۵:۰۰ الی ۲۱:۰۰
- **پنج‌شنبه‌ها:** ۱۰:۰۰ الی ۱۵:۰۰
*(پذیرش بیماران صرفاً با تعیین وقت قبلی انجام می‌شود)*`),
      map(
        'تهران، سعادت‌آباد، میدان کاج، پلاک ۲۴، ساختمان پزشکان، طبقه ۳',
        35.778,
        51.372,
        { provider: 'neshan', height: 'md' },
      ),
      social(
        { platform: 'phone', value: '02122000000' },
        { platform: 'whatsapp', value: '989120000000' },
        { platform: 'eitaa', value: 'drparsa_clinic' },
        { platform: 'instagram', value: 'dr.parsa.clinic' },
      ),
    ],
  },
  {
    id: 'creator',
    title: 'تولیدکننده‌ی محتوا و پادکست',
    description: 'آخرین قسمت پادکست، پخش ویدیو، حمایت مالی اختیاری و همه‌ی شبکه‌های فعال.',
    category: 'creator',
    content: content(
      'پادکست راه‌کار با آرش',
      'گفت‌وگو با هم‌بنیان‌گذاران استارتاپ‌ها و مدیران نوآوری • فصل چهارم: استراتژی رشد و مقیاس‌پذیری محصول',
      'aurora',
      '/images/templates/creator-podcaster-avatar.jpg',
      'stacked',
      {
        overrides: {
          button_style: 'glass',
          radius: 'lg',
          background: bgImage('/images/templates/creator-podcaster-avatar.jpg', 0.70),
        },
      },
    ),
    elements: [
      video('https://www.aparat.com/v/rahkar', 'aparat', 'rahkar'),
      button('شنیدن قسمت تازه در کست‌باکس', 'Headphones', 'https://castbox.fm', { bg_color: '#4f46e5' }),
      button('حمایت مالی اختیاری از پادکست (حامی‌باش)', 'Heart', 'https://hamibash.com/rahkar'),
      button('عضویت در کانال تلگرام برای دانلود اسلایدها', 'Send', 'https://t.me/rahkar_podcast'),
      button('تماشای ویدیوهای پشت‌صحنه در آپارات', 'Tv', 'https://aparat.com/rahkarpodcast'),
      social(
        { platform: 'aparat', value: 'rahkarpodcast' },
        { platform: 'youtube', value: 'rahkarpodcast' },
        { platform: 'rubika', value: 'rahkar_podcast' },
        { platform: 'telegram', value: 'rahkar_podcast' },
        { platform: 'instagram', value: 'rahkar.podcast' },
      ),
    ],
  },
  {
    id: 'event',
    title: 'رویداد و کنفرانس تخصصی',
    description: 'خرید بلیت زودهنگام، جدول زمان‌بندی سخنرانی‌ها، آدرس سالن و کانال اخبار.',
    category: 'creator',
    content: content(
      'همایش دیزاین و فرانت‌اند تهران ۲۰۲۶',
      'بزرگ‌ترین رویداد تخصصی مهندسان وب و طراحان محصول ایران • ۲۸ و ۲۹ آبان • سالن همایش‌های بین‌المللی رازی',
      'sunset',
      '/images/templates/event-summit-avatar.jpg',
      'stacked',
      {
        overrides: {
          button_style: 'glass',
          radius: 'full',
          background: bgImage('/images/templates/event-stage-showcase.jpg', 0.15),
        },
      },
    ),
    elements: [
      img(
        '/images/templates/event-stage-showcase.jpg',
        'سالن اصلی و صحنه همایش تخصصی تهران F&D ۲۰۲۶',
        1200,
        675,
        '16:9',
        'https://tehranfe.ir',
      ),
      button('خرید بلیت زودهنگام با تخفیف ویژه (ایوند)', 'Ticket', 'https://evand.com/tehran-fe', { bg_color: '#ea580c' }),
      button('دانلود جدول زمان‌بندی و برنامه سخنرانی‌ها (PDF)', 'FileDown', 'https://tehranfe.ir/schedule.pdf'),
      button('درخواست اسپانسری و رزرو غرفه نمایشگاهی', 'Building2', 'https://tehranfe.ir/sponsor'),
      md(`## محورهای کلیدی همایش امسال
- هوش مصنوعی مولد در طراحی رابط کاربری و توسعه فرانت‌اند
- بهینه‌سازی عملکرد (Core Web Vitals) و معماری میکرواپ‌ها
- شبکه‌سازی با بیش از ۱,۲۰۰ متخصص و رهبران فناوری`),
      map(
        'تهران، بزرگراه همت، جنب برج میلاد، دانشگاه علوم پزشکی، سالن همایش‌های رازی',
        35.748,
        51.378,
        { provider: 'balad', height: 'md', place_token: 'raziconference' },
      ),
      social(
        { platform: 'telegram', value: 'tehran_fe' },
        { platform: 'bale', value: 'tehran_fe' },
        { platform: 'instagram', value: 'tehran.fe' },
        { platform: 'linkedin', value: 'tehran-fe-summit' },
      ),
    ],
  },
  {
    id: 'course',
    title: 'مدرس و آکادمی تخصصی',
    description: 'سرفصل‌های دوره جامع، ثبت‌نام آنلاین، دانلود جلسات رایگان و مشاوره تا استخدام.',
    category: 'creator',
    content: content(
      'آکادمی کدنویسی کیان',
      'آموزش پروژه‌محور ری‌اکت، نکست و معماری مدرن فرانت‌اند برای ورود به بازار کار بین‌المللی • ۲,۰۰۰+ فارغ‌التحصیل',
      'forest',
      '/images/templates/course-instructor-avatar.jpg',
      'side_right',
      {
        overrides: {
          button_style: 'tonal',
          radius: 'full',
          background: bgImage('/images/templates/course-instructor-avatar.jpg', 0.70),
        },
      },
    ),
    elements: [
      video('https://www.aparat.com/v/kiancode', 'aparat', 'kiancode'),
      button('مشاهده سرفصل‌ها و ثبت‌نام در دوره با تخفیف', 'GraduationCap', 'https://kianacademy.ir/fullstack', { bg_color: '#16a34a' }),
      button('دانلود رایگان ویدیوهای ۳ جلسه اول دوره', 'PlayCircle', 'https://kianacademy.ir/free-preview'),
      button('مشاوره اختصاصی رایگان انتخاب مسیر در تلگرام', 'MessageCircle', 'https://t.me/kian_consult'),
      md(`## مزایای کلیدی دوره جامع
- انجام ۴ پروژه واقعی در ابعاد سازمانی و سطح بین‌المللی
- منتورشیپ هفتگی، کد ریویو فردی و رفع اشکال مستقیم
- معرفی برترین دانشجویان دوره به شرکت‌های همکار جهت استخدام`),
      social(
        { platform: 'eitaa', value: 'kianacademy' },
        { platform: 'telegram', value: 'kianacademy' },
        { platform: 'aparat', value: 'kiancode' },
        { platform: 'youtube', value: 'kiancode' },
        { platform: 'instagram', value: 'kian.academy' },
      ),
    ],
  },
  {
    id: 'fitness',
    title: 'مربی و تناسب اندام',
    description: 'دریافت برنامه تمرینی اختصاصی، رژیم غذایی آنلاین، مشاوره و نتایج شاگردان.',
    category: 'personal',
    content: content(
      'سینا راد • مربی بین‌المللی فیتنس',
      'مربی رسمی فدراسیون و متخصص تغذیه ورزشی • طراحی برنامه‌های تمرینی و اصلاحی آنلاین با بیش از ۸ سال سابقه',
      'midnight',
      '/images/templates/fitness-coach-avatar.jpg',
      'stacked',
      {
        overrides: {
          button_style: 'filled',
          radius: 'lg',
          background: bgImage('/images/templates/fitness-club-showcase.jpg', 0.65),
        },
      },
    ),
    elements: [
      slider(
        [
          {
            file_id: '/images/templates/fitness-club-showcase.jpg',
            alt: 'فضای تمرینی و تجهیزات اختصاصی آکادمی فیتنس',
            link: 'https://sinafit.ir/plans',
          },
          {
            file_id: '/images/templates/fitness-coach-avatar.jpg',
            alt: 'سینا راد مربی رسمی فیتنس و تغذیه ورزشی',
          },
        ],
        '16:9',
      ),
      button('دریافت برنامه تمرین و تغذیه اختصاصی', 'Dumbbell', 'https://sinafit.ir/plans', { bg_color: '#4f46e5' }),
      button('مشاهده تغییرات و تصاویر قبل و بعد شاگردان', 'Trophy', 'https://sinafit.ir/transformations'),
      button('عضویت در کانال تمرینات روزانه در منزل', 'Sparkles', 'https://t.me/sinafit_daily'),
      md(`## چرا کوچینگ آنلاین با من؟
- طراحی تمرین و تغذیه بر اساس تیپ بدنی و آزمایش خون
- پایش هفتگی وزن و سایز به همراه پشتیبانی مستقیم در واتساپ
- ارسال ویدیوهای آموزشی اختصاصی برای اجرای صحیح حرکات`),
      social(
        { platform: 'instagram', value: 'sina.fitness' },
        { platform: 'rubika', value: 'sina_fitness' },
        { platform: 'telegram', value: 'sinafit_daily' },
        { platform: 'whatsapp', value: '989120000000' },
      ),
    ],
  },
  {
    id: 'beauty',
    title: 'سالن زیبایی و اسپا',
    description: 'رزرو آنلاین نوبت، کاتالوگ خدمات، نمونه کارها، قیمت‌ها و لوکیشن سالن.',
    category: 'business',
    content: content(
      'استودیو زیبایی ملینا',
      'مرکز تخصصی رنگ و لایت، میکاپ عروس، هیرکات مدرن و فیشیال پوست • همه روزه ۱۰ تا ۱۹ با تعیین وقت قبلی',
      'rose',
      '/images/templates/beauty-salon-avatar.jpg',
      'stacked',
      {
        overrides: {
          button_style: 'soft',
          radius: 'full',
          background: bgImage('/images/templates/beauty-salon-showcase.jpg', 0.15),
        },
      },
    ),
    elements: [
      slider(
        [
          {
            file_id: '/images/templates/beauty-salon-showcase.jpg',
            alt: 'فضای شیک و اتاق‌های خدمات تخصصی استودیو ملینا',
          },
          {
            file_id: '/images/templates/beauty-salon-avatar.jpg',
            alt: 'خدمات تخصصی استودیو زیبایی ملینا',
          },
        ],
        '16:9',
      ),
      button('رزرو آنلاین نوبت و مشاهده زمان‌های خالی', 'Sparkles', 'https://melinabeauty.ir/booking', { bg_color: '#db2777' }),
      button('مشاهده کاتالوگ خدمات و تعرفه‌ها (PDF)', 'FileDown', 'https://melinabeauty.ir/services.pdf'),
      button('گالری مدل‌های عروس، رنگ مو و کراتین', 'Crown', 'https://melinabeauty.ir/gallery'),
      md(`### استانداردهای خدمات استودیو
- استفاده از معتبرترین برندهای ارگانیک و بدون فرمالدئید
- رعایت پروتکل‌های بهداشتی استریل و پک‌های یک‌بارمصرف`),
      map(
        'تهران، شهرک غرب، بلوار دادمان، ساختمان آرن، پلاک ۲۸',
        35.762,
        51.352,
        { provider: 'balad', height: 'md', place_token: 'melinabeauty' },
      ),
      social(
        { platform: 'instagram', value: 'melina.beautystudio' },
        { platform: 'rubika', value: 'melinabeauty' },
        { platform: 'whatsapp', value: '989120000000' },
        { platform: 'phone', value: '02188000000' },
      ),
    ],
  },
  {
    id: 'realestate',
    title: 'املاک و سرمایه‌گذاری',
    description: 'فایل‌های اکازیون روز، رزرو مشاوره ملکی، کاتالوگ پنت‌هاوس‌ها و تماس مستقیم.',
    category: 'business',
    content: content(
      'گروه املاک پردیس نوین',
      'کارگزاری رسمی خرید، فروش و پیش‌فروش آپارتمان‌ها و پنت‌هاوس‌های لوکس در منطقه ۱ و ۲ تهران',
      'minimal',
      '/images/templates/realestate-agency-avatar.jpg',
      'side_right',
      {
        overrides: {
          button_style: 'tonal',
          radius: 'md',
          background: bgImage('/images/templates/realestate-penthouse-showcase.jpg', 0.15),
        },
      },
    ),
    elements: [
      slider(
        [
          {
            file_id: '/images/templates/realestate-penthouse-showcase.jpg',
            alt: 'پنت‌هاوس مدرن با چشم‌انداز ۳۶۰ درجه البرز در فرمانیه',
            link: 'https://pardisrealestate.ir',
          },
          {
            file_id: '/images/templates/realestate-agency-avatar.jpg',
            alt: 'دفتر مرکزی کارگزاری املاک پردیس نوین',
          },
        ],
        '16:9',
      ),
      button('مشاهده فایل‌های اکازیون هفته (خرید و رهن)', 'Building2', 'https://pardisrealestate.ir/exclusive', { bg_color: '#0f172a' }),
      button('درخواست کارشناسی و قیمت‌گذاری تخصصی ملک', 'FileText', 'https://pardisrealestate.ir/valuation'),
      button('رزرو جلسه مشاوره حقوقی و سرمایه‌گذاری حضوری', 'CalendarCheck', 'https://pardisrealestate.ir/consult'),
      md(`## خدمات ویژه کارگزاری
- تنظیم مبایعه‌نامه و اسناد زیر نظر وکلای ارشد ملکی
- کارشناسی سازه، متریال ساختمانی و استعلامات ثبتی
- دسترسی اختصاصی به پنت‌هاوس‌های لوکس قبل از آگهی عمومی`),
      map(
        'تهران، زعفرانیه، خیابان آصف، برج اداری گرند، طبقه ۶',
        35.808,
        51.415,
        { provider: 'neshan', height: 'md' },
      ),
      social(
        { platform: 'phone', value: '02126000000' },
        { platform: 'whatsapp', value: '989121111111' },
        { platform: 'bale', value: 'pardis_realestate' },
        { platform: 'instagram', value: 'pardis.realestate.tehran' },
      ),
    ],
  },
  {
    id: 'book',
    title: 'نویسنده و باشگاه کتاب',
    description: 'معرفی رمان‌ها، خرید نسخه امضاشده، پادکست رادیو کتاب و گردهمایی‌های ادبی.',
    category: 'creator',
    content: content(
      'مریم رستمی • نویسنده و منتقد',
      'نویسنده رمان‌های «قصه‌های ناگفته» و «کوچه‌های باران» • میزبان جلسات ماهانه نقد کتاب و پادکست رادیو کتاب',
      'brutal',
      '/images/templates/book-author-avatar.jpg',
      'side_right',
      {
        overrides: {
          button_style: 'shadow',
          radius: 'none',
          background: bgImage('/images/templates/book-reading-showcase.jpg', 0.15),
        },
      },
    ),
    elements: [
      img(
        '/images/templates/book-reading-showcase.jpg',
        'میز مطالعه و کتاب‌های تازه منتشرشده نشر چشمه',
        1200,
        675,
        '16:9',
        'https://maryamrostami.ir',
      ),
      button('سفارش مستقیم رمان با دست‌خط و امضای نویسنده', 'ShoppingBag', 'https://maryamrostami.ir/order', { bg_color: '#0a0a0a' }),
      button('عضویت در باشگاه کتاب‌خوانی و جلسات ماهانه', 'Users', 'https://maryamrostami.ir/bookclub'),
      button('شنیدن قسمت جدید پادکست رادیو کتاب', 'Headphones', 'https://castbox.fm'),
      md(`## درباره رمان تازه «قصه‌های ناگفته»
روایتی پرکشش از سرنوشت سه نسل در محله‌های قدیمی طهران، برنده جایزه رمان اول سال ۱۴۰۲.
- نامزد جایزه مهرگان ادب و چاپ چهارم در کمتر از ۶ ماه
- برگزاری جلسات نقد با حضور صاحب‌نظران ادبیات داستانی`),
      social(
        { platform: 'instagram', value: 'maryam.rostami.writer' },
        { platform: 'telegram', value: 'maryams_bookclub' },
        { platform: 'soroush', value: 'maryam_rostami' },
        { platform: 'email', value: 'maryam@rostami.ir' },
      ),
    ],
  },
];

export function linkTemplate(id: string): LinkTemplate | undefined {
  return LINK_TEMPLATES.find((t) => t.id === id);
}

/** المان‌های کامل قالب (با پیش‌فرض‌ها) برای پیش‌نمایش؛ شناسه‌ها فقط برای رندر. */
export function templateElements(template: LinkTemplate): AnyElement[] {
  return template.elements.flatMap((el, i) => {
    const parsed = parseSettings(el.kind, { ...defaultSettings(el.kind), ...el.settings });
    return parsed.ok ? [{ id: `${template.id}-${i}`, kind: el.kind, settings: parsed.value } as AnyElement] : [];
  });
}
