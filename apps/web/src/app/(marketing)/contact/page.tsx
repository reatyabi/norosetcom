import type { Metadata } from 'next';
import { ArrowLeftIcon, PhoneCallIcon } from 'lucide-react';
import { SUPPORT_CHANNELS_DATA, SUPPORT_PHONE, SUPPORT_PHONE_FORMATTED } from '@/lib/support';
import { BaleIcon, TelegramIcon, WhatsAppIcon } from '@/components/support-channels';
import { CopyPhoneButton } from './_copy-phone-button';

export const metadata: Metadata = {
  title: 'پشتیبانی | نوروست',
  description: 'با پشتیبانی نوروست از طریق بله، واتس‌اپ، تلگرام یا تماس تلفنی در ارتباط باشید.',
};

const ICONS = { bale: BaleIcon, whatsapp: WhatsAppIcon, telegram: TelegramIcon } as const;

export default function ContactPage() {
  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-16" dir="rtl">
      <div className="w-full max-w-lg">
        {/* سرتیتر */}
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <PhoneCallIcon className="size-8" />
          </div>
          <h1 className="mb-2 text-2xl font-extrabold text-foreground">پشتیبانی نوروست</h1>
          <p className="text-sm text-muted-foreground">
            از هر کانالی که راحت‌ترید با ما در ارتباط باشید. معمولاً در کمتر از یک ساعت پاسخ می‌دهیم.
          </p>
        </div>

        {/* کارت‌های کانال‌ها */}
        <div className="mb-6 flex flex-col gap-3">
          {SUPPORT_CHANNELS_DATA.map((channel) => {
            const Icon = ICONS[channel.id];
            return (
              <a
                key={channel.id}
                href={channel.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 shadow-xs transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-200 hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <span
                    className="flex size-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105"
                    style={{ backgroundColor: `${channel.themeColor}18`, color: channel.themeColor }}
                  >
                    <Icon className="size-6" />
                  </span>
                  <div>
                    <p className="font-bold text-foreground">{channel.title}</p>
                    <p className="text-xs text-muted-foreground">{channel.description}</p>
                  </div>
                </div>
                <ArrowLeftIcon className="size-5 text-muted-foreground/50 transition-transform duration-200 group-hover:-translate-x-1 group-hover:text-foreground" />
              </a>
            );
          })}
        </div>

        {/* بخش تلفن */}
        <div className="rounded-2xl border border-border bg-card px-5 py-4 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <PhoneCallIcon className="size-5" />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">تماس تلفنی مستقیم</p>
                <p
                  dir="ltr"
                  style={{ direction: 'ltr', unicodeBidi: 'isolate' }}
                  className="font-mono text-base font-bold tracking-wider text-foreground select-all"
                >
                  {SUPPORT_PHONE_FORMATTED}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CopyPhoneButton phone={SUPPORT_PHONE} />
              <a
                href={`tel:${SUPPORT_PHONE}`}
                className="flex h-9 items-center gap-1.5 rounded-xl bg-primary/10 px-4 text-sm font-bold text-primary transition-colors hover:bg-primary/20"
              >
                تماس
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
