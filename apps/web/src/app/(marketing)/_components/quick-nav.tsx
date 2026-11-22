'use client';

import Link from 'next/link';
import {
  FileTextIcon,
  LinkIcon,
  FolderIcon,
  LayoutDashboardIcon,
  ArrowLeftIcon,
} from 'lucide-react';
import { routes } from '@/lib/routes';

const QUICK_ITEMS = [
  {
    title: 'مدیریت فرم‌ها',
    productName: 'نوروفرم',
    englishName: 'Noroform',
    slogan: 'فرم‌ساز هوشمند سازمانی',
    brandColor: 'text-purple-600 dark:text-purple-400',
    href: routes.form.home,
    icon: FileTextIcon,
    accent: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white',
  },
  {
    title: 'مدیریت پیوندها',
    productName: 'نورولینک',
    englishName: 'Norolink',
    slogan: 'درگاه هوشمند پیوندها و بیو',
    brandColor: 'text-tone-rose dark:text-tone-rose',
    href: routes.link.home,
    icon: LinkIcon,
    accent: 'bg-tone-rose/10 text-tone-rose dark:text-tone-rose group-hover:bg-pink-600 group-hover:text-white',
  },
  {
    title: 'مدیریت فایل‌ها',
    productName: 'نوروفایل',
    englishName: 'Norofile',
    slogan: 'میزبان امن داده‌های شما',
    brandColor: 'text-warning dark:text-tone-amber',
    href: routes.file.home,
    icon: FolderIcon,
    accent: 'bg-warning/10 text-warning dark:text-tone-amber group-hover:bg-warning group-hover:text-slate-950',
  },
  {
    title: 'مدیریت فضای کاری',
    productName: 'نوروست',
    englishName: 'Noroset',
    slogan: 'پلتفرم یکپارچه ابزارهای ابری',
    brandColor: 'text-primary',
    href: routes.link.home,
    icon: LayoutDashboardIcon,
    accent: 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground',
  },
];

export function QuickNav() {
  return (
    <section id="products" className="py-6 border-b border-border/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
          {QUICK_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                href={item.href}
                className="group flex h-full min-h-[148px] flex-col justify-between rounded-2xl border border-border/60 bg-card p-4 transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <div className="flex items-center justify-between">
                  <div className={`flex size-11 items-center justify-center rounded-xl transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-300 ${item.accent}`}>
                    <Icon className="size-5" />
                  </div>
                  <ArrowLeftIcon className="size-4 text-muted-foreground opacity-0 transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-300 group-hover:opacity-100 group-hover:-translate-x-1" />
                </div>
                <div className="mt-4">
                  <div className="flex items-center gap-1 text-[11px] font-bold">
                    <span className={item.brandColor}>{item.productName}</span>
                    <span className="text-[10px] font-mono text-muted-foreground/70">({item.englishName})</span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-foreground mt-0.5">{item.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{item.slogan}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
