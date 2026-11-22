import type { ReactElement } from 'react';
import { ImageIcon, MapPinIcon, MousePointerClickIcon, Share2Icon, TypeIcon, VideoIcon } from 'lucide-react';
import { ELEMENT_LABELS, type ElementKind } from '@noroset/norolink/ui';

export interface ElementMeta {
  kind: ElementKind;
  label: string;
  /** نام کوتاه زیر آیکون در نوار پایین موبایل. */
  short: string;
  description: string;
  icon: ReactElement;
  /** رنگ ملایم دکمه‌ی افزودن (پس‌زمینه‌ی کم‌رنگ + آیکون پررنگ‌تر از همان خانواده؛ روشن/تیره). */
  tone: string;
}

export const ELEMENT_GROUPS: { title: string; items: ElementMeta[] }[] = [
  {
    title: 'لینک',
    items: [
      {
        kind: 'link_button',
        label: 'دکمه لینک',
        short: 'دکمه لینک',
        description: 'دکمه لینک به هر صفحه یا شبکه',
        icon: <MousePointerClickIcon />,
        tone: 'max-md:bg-tone-sky/15 max-md:dark:bg-tone-sky/20 md:bg-tone-sky/12 text-tone-sky hover:bg-tone-sky/22 dark:text-tone-sky',
      },
      {
        kind: 'social_icons',
        label: ELEMENT_LABELS.social_icons,
        short: 'شبکه‌ها',
        description: 'ردیف آیکون شبکه‌ها',
        icon: <Share2Icon />,
        tone: 'max-md:bg-tone-rose/15 max-md:dark:bg-tone-rose/20 md:bg-tone-rose/12 text-tone-rose hover:bg-tone-rose/22 dark:text-tone-rose',
      },
    ],
  },
  {
    title: 'محتوا',
    items: [
      {
        kind: 'rich_text',
        label: ELEMENT_LABELS.rich_text,
        short: 'متن',
        description: 'تیتر، پاراگراف و فهرست',
        icon: <TypeIcon />,
        tone: 'max-md:bg-tone-amber/15 max-md:dark:bg-tone-amber/20 md:bg-warning/14 text-tone-amber hover:bg-warning/24 dark:text-tone-amber',
      },
      {
        kind: 'image',
        label: ELEMENT_LABELS.image,
        short: 'تصویر',
        description: 'تصویر با لینک اختیاری',
        icon: <ImageIcon />,
        tone: 'max-md:bg-tone-emerald/15 max-md:dark:bg-tone-emerald/20 md:bg-success/12 text-success hover:bg-success/22 dark:text-tone-emerald',
      },
    ],
  },
  {
    title: 'امبد',
    items: [
      {
        kind: 'video_embed',
        label: ELEMENT_LABELS.video_embed,
        short: 'ویدیو',
        description: 'آپارات، یوتیوب، ویمیو',
        icon: <VideoIcon />,
        tone: 'max-md:bg-tone-rose/15 max-md:dark:bg-tone-rose/20 md:bg-tone-rose/12 text-tone-rose hover:bg-tone-rose/22 dark:text-tone-rose',
      },
      {
        kind: 'map_embed',
        label: ELEMENT_LABELS.map_embed,
        short: 'نقشه',
        description: 'گوگل‌مپ، نشان، بلد',
        icon: <MapPinIcon />,
        tone: 'max-md:bg-tone-violet/15 max-md:dark:bg-tone-violet/20 md:bg-tone-violet/12 text-tone-violet hover:bg-tone-violet/22 dark:text-tone-violet',
      },
    ],
  },
];

export const ELEMENT_META = Object.fromEntries(ELEMENT_GROUPS.flatMap((g) => g.items).map((m) => [m.kind, m])) as Record<
  ElementKind,
  ElementMeta
>;
