'use client';

import { ShieldAlertIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@noroset/ui';
import { MODERATION_REASON_LABELS, MODERATION_STATUS_LABELS } from '@noroset/norolink/ui';
import { formatDateTime } from '@/lib/format';
import type { LinkModeration } from './links-shared';

// اعلان درون پنل برای مالک صفحه‌ای که مدیریت پلتفرم محدود کرده است (docs/architecture.md §9.13). یادداشت داخلی ادمین و
// گزارش‌ها هرگز به مالک نمی‌رسند؛ فقط وضعیت، دسته‌ی دلیل، پیام عمومی و مهلت.

const EFFECT: Record<LinkModeration['status'], string> = {
  delisted: 'صفحه باز است ولی در دایرکتوری n8l.ir و نتایج موتورهای جستجو نمایش داده نمی‌شود.',
  warning: 'بازدیدکننده‌ها پیش از دیدن صفحه هشدار می‌بینند. انتشار، تغییر نشانی و حذف صفحه تا رفع محدودیت ممکن نیست.',
  suspended: 'صفحه برای بازدیدکننده‌ها نمایش داده نمی‌شود. انتشار، تغییر نشانی و حذف صفحه تا رفع محدودیت ممکن نیست.',
};

export function ModerationBanner({ moderation, className }: { moderation: LinkModeration; className?: string }) {
  return (
    <Alert variant={moderation.status === 'delisted' ? 'default' : 'destructive'} className={className}>
      <ShieldAlertIcon />
      <AlertTitle>
        این صفحه توسط مدیریت نوروست محدود شده است: {MODERATION_STATUS_LABELS[moderation.status]} ({MODERATION_REASON_LABELS[moderation.reason]})
      </AlertTitle>
      <AlertDescription>
        <p>{EFFECT[moderation.status]}</p>
        {moderation.notice ? <p>{moderation.notice}</p> : null}
        {moderation.until ? <p>پایان محدودیت: {formatDateTime(moderation.until)}</p> : null}
        <p>اگر فکر می‌کنید اشتباهی رخ داده، از «پشتیبانی» در منوی بالای پنل با ما تماس بگیرید. می‌توانید پیش‌نویس را اصلاح کنید.</p>
      </AlertDescription>
    </Alert>
  );
}
