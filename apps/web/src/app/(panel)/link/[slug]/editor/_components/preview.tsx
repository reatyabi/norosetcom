'use client';

import { useState } from 'react';
import { MonitorIcon, SmartphoneIcon, XIcon } from 'lucide-react';
import { cn, Segmented } from '@noroset/ui';
import { LinkPage, type AnyElement, type PageContent } from '@noroset/norolink/ui';
import { hoverNativeScroll, IconAction, Overlay } from '@/components/editor-ui';
import { useLucideIcon, usesLucide } from '@/lib/lucide-icons';

/** پیش‌نمایش تمام‌صفحه‌ی پیش‌نویس: دسکتاپ (تمام عرض) / موبایل (قاب گوشی)؛ قاب اسکرول خودش را دارد تا نوار برندینگ چسبان درست دیده شود. */
export function LinkPreview({
  content,
  elements,
  assetBaseUrl,
  forceLicense,
  onClose,
}: {
  content: PageContent;
  elements: AnyElement[];
  assetBaseUrl: string;
  forceLicense: boolean;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<'desktop' | 'mobile'>('mobile');
  const lucideIcon = useLucideIcon(usesLucide(elements));

  return (
    <Overlay onClose={onClose} className="inset-0 overflow-hidden rounded-none ring-0">
      <div className="flex items-center gap-2 border-b px-3.5 py-2.5">
        <span className="font-semibold">پیش‌نمایش</span>
        <div className="flex flex-1 justify-center">
          <div className="w-56 max-md:hidden">
            <Segmented
              value={mode}
              onChange={setMode}
              items={[
                { value: 'desktop', label: <><MonitorIcon />دسکتاپ</> },
                { value: 'mobile', label: <><SmartphoneIcon />موبایل</> },
              ]}
            />
          </div>
        </div>
        <IconAction label="بستن" onClick={onClose}>
          <XIcon />
        </IconAction>
      </div>

      <div className={cn('flex min-h-0 flex-1 justify-center bg-background', mode === 'mobile' && 'md:p-6')}>
        <div
          className={cn(
            'flex h-full w-full flex-col overflow-x-hidden overflow-y-auto',
            hoverNativeScroll,
            mode === 'mobile' && 'md:max-h-203 md:max-w-94 md:rounded-[28px] md:ring-1 md:ring-border',
          )}
        >
          <LinkPage content={content} elements={elements} assetBaseUrl={assetBaseUrl} forceLicense={forceLicense} lucideIcon={lucideIcon} preview />
        </div>
      </div>
    </Overlay>
  );
}
