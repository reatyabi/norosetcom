'use client';

import { Building2Icon, Globe2Icon } from 'lucide-react';
import { Dialog, DialogDescription, DialogHeader, DialogPopup, DialogTitle } from '@noroset/ui';
import type { FormChannel } from './forms-shared';

/** انتخاب اجباری نوع فرم پیش از ساخت؛ نوع، سطح رندر و آدرس را تعیین می‌کند. */
export function ChannelDialog({
  open,
  onOpenChange,
  onChoose,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChoose: (channel: FormChannel) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup dir="rtl" className="sm:max-w-lg">
        <DialogHeader className="gap-1.5 pe-14">
          <DialogTitle className="text-lg">نوع فرم را انتخاب کنید</DialogTitle>
          <DialogDescription>
            فرم داخلی در پنل و با ظاهر پلتفرم اجرا می‌شود؛ فرم خارجی روی دامنه‌ی عمومی n8f منتشر می‌شود. این انتخاب تا قبل از اولین انتشار قابل تغییر است.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 px-6 pt-1 pb-6 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onChoose('internal')}
            className="group flex flex-col items-start gap-2 rounded-xl border border-input bg-card p-4 text-start outline-none transition-colors hover:border-primary/50 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2Icon className="size-5" />
            </span>
            <span className="font-semibold">فرم داخلی</span>
            <span className="text-xs leading-6 text-muted-foreground">
              برای اعضای سازمان و فضای کاری؛ آدرس <span dir="ltr" className="font-mono">/f/&#123;id&#125;</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => onChoose('external')}
            className="group flex flex-col items-start gap-2 rounded-xl border border-input bg-card p-4 text-start outline-none transition-colors hover:border-primary/50 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Globe2Icon className="size-5" />
            </span>
            <span className="font-semibold">فرم خارجی</span>
            <span className="text-xs leading-6 text-muted-foreground">
              لینک عمومی برای مخاطبان بیرون سازمان؛ آدرس <span dir="ltr" className="font-mono">n8f.ir/&#123;slug&#125;</span>
            </span>
          </button>
        </div>
      </DialogPopup>
    </Dialog>
  );
}
