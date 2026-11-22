'use client';

import { useState } from 'react';
import {
  ArrowUpLeftIcon,
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  Link2Icon,
  QrCodeIcon,
  Share2Icon,
} from 'lucide-react';
import type { DirectoryPageItem } from '../types';

interface PageCardProps {
  item: DirectoryPageItem;
  publicHost: string;
  devPort?: string;
  onOpenQr: (item: DirectoryPageItem, url: string) => void;
}

// گرادیان‌های هدر کارت بر اساس تم انتخاب‌شده
const THEME_RIBBONS: Record<string, string> = {
  ocean: 'from-blue-600 via-cyan-500 to-indigo-600',
  sunset: 'from-orange-500 via-rose-500 to-purple-600',
  cyber: 'from-fuchsia-600 via-purple-600 to-cyan-500',
  obsidian: 'from-zinc-900 via-slate-800 to-zinc-950',
  emerald: 'from-emerald-600 via-tone-teal/100 to-emerald-800',
  amber: 'from-amber-600 via-tone-amber/100 to-yellow-600',
  minimal: 'from-slate-300 via-slate-200 to-slate-400 dark:from-zinc-800 dark:via-zinc-700 dark:to-zinc-900',
  turquoise: 'from-teal-500 via-cyan-400 to-sky-600',
  neon: 'from-tone-emerald/100 via-cyan-500 to-blue-600',
  default: 'from-pink-600 via-rose-500 to-fuchsia-600',
};

export function PageCard({ item, publicHost, devPort, onOpenQr }: PageCardProps) {
  const [copied, setCopied] = useState(false);

  const pageHost = `${item.slug}.${publicHost}`;
  const pageUrl = publicHost.endsWith('localhost')
    ? `http://${pageHost}${devPort ? `:${devPort}` : ''}`
    : `https://${pageHost}`;

  const ribbonGradient = THEME_RIBBONS[item.themePreset] ?? THEME_RIBBONS.default;

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: item.title,
          text: item.bio || item.title,
          url: pageUrl,
        });
        return;
      } catch {
        // user cancelled or share failed, fallback to copy
      }
    }
    await handleCopyLink(e);
  };

  const initial = (item.name || item.title || 'ن').slice(0, 1);

  return (
    <article className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm shadow-sm transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-300 hover:-translate-y-1 hover:border-pink-500/40 hover:shadow-xl">
      {/* Top Banner Ribbon */}
      <div className={`h-16 w-full bg-gradient-to-r ${ribbonGradient} opacity-90 transition-opacity group-hover:opacity-100`}>
        <div className="flex h-full items-start justify-end p-2.5">
        </div>
      </div>

      {/* Profile Section */}
      <div className="relative px-5 pt-0 pb-4">
        {/* Avatar */}
        <div className="-mt-9 mb-3 flex items-end justify-between">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl border-4 border-card bg-muted shadow-md">
            {item.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.avatarUrl}
                alt={item.name}
                className="size-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex size-full items-center justify-center bg-gradient-to-br from-pink-500/20 to-rose-500/30 text-lg font-bold text-tone-rose dark:text-tone-rose">
                {initial}
              </div>
            )}
          </div>

          {/* Subdomain pill */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="group/pill inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-[11px] font-mono text-muted-foreground backdrop-blur-sm transition-colors hover:border-pink-500/50 hover:text-tone-rose dark:hover:text-tone-rose"
            title="کلیک برای کپی نشانی صفحه"
            dir="ltr"
          >
            <span className="font-medium text-foreground">{item.slug}</span>
            <span className="text-muted-foreground">.n8l.ir</span>
            {copied ? (
              <CheckIcon className="size-3 text-success animate-in zoom-in-50" />
            ) : (
              <CopyIcon className="size-3 opacity-60 group-hover/pill:opacity-100" />
            )}
          </button>
        </div>

        {/* Title and Bio */}
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-tone-rose dark:group-hover:text-tone-rose transition-colors">
            {item.title}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed min-h-[2.5rem]">
            {item.bio || 'صفحه پیوند اختصاصی در شبکه نورولینک'}
          </p>
        </div>

        {/* Links Preview */}
        {item.links && item.links.length > 0 && (
          <div className="mt-3 space-y-1.5 pt-2 border-t border-border/40">
            <span className="text-[10px] font-medium text-muted-foreground/80 block">پیوندهای برگزیده:</span>
            <div className="space-y-1">
              {item.links.map((link, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg bg-muted/40 px-2.5 py-1 text-[11px] text-foreground/90 transition-colors hover:bg-muted/70"
                >
                  <span className="truncate flex items-center gap-1.5">
                    <Link2Icon className="size-3 text-tone-rose dark:text-tone-rose shrink-0" />
                    <span className="truncate">{link.label}</span>
                  </span>
                  <ExternalLinkIcon className="size-2.5 text-muted-foreground shrink-0 opacity-60" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Social Platforms Row */}
        {item.socialPlatforms && item.socialPlatforms.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            {item.socialPlatforms.map((platform) => (
              <span
                key={platform}
                className="inline-flex items-center rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground capitalize"
              >
                {platform}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Card Action Bar */}
      <div className="flex items-center justify-between border-t border-border/40 bg-muted/20 px-4 py-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onOpenQr(item, pageUrl)}
            className="flex size-8 items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:border-pink-500/50 hover:bg-background hover:text-tone-rose dark:hover:text-tone-rose transition-colors"
            title="نمایش و اسکن کد QR"
            aria-label={`کد QR صفحه ${item.title}`}
          >
            <QrCodeIcon className="size-4" />
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="flex size-8 items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:border-pink-500/50 hover:bg-background hover:text-tone-rose dark:hover:text-tone-rose transition-colors"
            title="اشتراک‌گذاری نشانی"
            aria-label={`اشتراک‌گذاری صفحه ${item.title}`}
          >
            <Share2Icon className="size-4" />
          </button>
        </div>

        <a
          href={pageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl bg-pink-600 dark:bg-tone-rose px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-pink-700 dark:hover:bg-pink-600 active:scale-95 transition-[color,background-color,border-color,box-shadow,opacity,transform]"
        >
          <span>مشاهده صفحه</span>
          <ArrowUpLeftIcon className="size-3.5" />
        </a>
      </div>
    </article>
  );
}
