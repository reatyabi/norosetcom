'use client';

import { useRef, useState } from 'react';
import { EyeOffIcon, Trash2Icon } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Button,
  cn,
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
  Input,
  Segmented,
  Textarea,
} from '@noroset/ui';
import { LINK_TEMPLATE_CATEGORIES, LINK_TEMPLATE_CATEGORY_LABELS, type LinkTemplateCategory, type PageContent } from '@noroset/norolink/ui';
import { formatDateTime } from '@/lib/format';
import { MAX_PAGE_NAME } from '../../../new-link-page';
import type { ClaimLinkView, EditorElement, LinkStatus } from '../../../links-shared';
import { ClaimLinkPanel } from './claim-link-panel';
import type { TemplateMeta } from './link-editor';

const MAX_DESCRIPTION = 300;
const CATEGORY_ITEMS = LINK_TEMPLATE_CATEGORIES.map((value) => ({ value, label: LINK_TEMPLATE_CATEGORY_LABELS[value] }));

/**
 * دیالوگ «انتشار» ادیتور در حالت قالب: مشخصات قالب در گالری (ذخیره‌ی خودکار) و انتشار، لغو انتشار و حذف.
 * انتشار پیش‌نویس را در گالری می‌گذارد و دیالوگ باز می‌ماند تا نتیجه دیده شود؛ تغییرات بعدی تا انتشار دوباره به کاربران نمی‌رسد.
 * تب «واگذاری به مشتری» لینک تحویل همین پیش‌نویس را می‌سازد.
 */
export function TemplateDialog({
  open,
  onOpenChange,
  ...props
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: string;
  title: string;
  description: string;
  category: LinkTemplateCategory;
  status: LinkStatus;
  pendingChanges: boolean;
  publishedAt: string | null;
  publishing: boolean;
  onMeta: (meta: Partial<TemplateMeta>) => void;
  /** خطا را برمی‌گرداند یا null در صورت موفقیت. */
  onPublish: () => Promise<string | null>;
  onUnpublish: () => Promise<string | null>;
  onDelete: () => Promise<void>;
  claimLink: ClaimLinkView | null;
  claimedAt: string | null;
  /** پیش‌نویس قالب برای پیشنهاد نام کسب‌وکار و نشانی. */
  content: PageContent;
  elements: EditorElement[];
  onClaim: (claim: { claimLink: ClaimLinkView | null }) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup dir="rtl" className="max-w-[30rem]" initialFocus={closeRef}>
        {/* key: خطا و مرحله‌ی تأیید با هر بار باز شدن از نو */}
        <Body key={open ? 'open' : 'closed'} closeRef={closeRef} onClose={() => onOpenChange(false)} {...props} />
      </DialogPopup>
    </Dialog>
  );
}

type BodyProps = Omit<Parameters<typeof TemplateDialog>[0], 'open' | 'onOpenChange'> & {
  onClose: () => void;
  closeRef: React.RefObject<HTMLButtonElement | null>;
};

function Body({ id, title, description, category, status, pendingChanges, publishedAt, publishing, onMeta, onPublish, onUnpublish, onDelete, claimLink, claimedAt, content, elements, onClaim, onClose, closeRef }: BodyProps) {
  const [tab, setTab] = useState<'publish' | 'claim'>('publish');
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<'unpublish' | 'delete' | null>(null);
  const [busy, setBusy] = useState(false);
  const published = status === 'published';
  const upToDate = published && !pendingChanges;
  const statusText = upToDate
    ? `در گالری قالب‌ها${publishedAt ? ` · آخرین انتشار ${formatDateTime(publishedAt)}` : ''}`
    : published
      ? 'تغییراتی دارید که هنوز به گالری نرسیده‌اند.'
      : 'هنوز منتشر نشده؛ تا انتشار فقط مدیران پلتفرم آن را می‌بینند.';

  const run = async (action: () => Promise<string | null>) => {
    setError(null);
    setError(await action());
  };

  const runConfirmed = async () => {
    setBusy(true);
    if (confirm === 'delete') await onDelete();
    else await run(onUnpublish);
    setBusy(false);
    setConfirm(null);
  };

  return (
    <>
      <DialogHeader className="gap-1.5 pe-14">
        <DialogTitle className="text-lg">انتشار قالب</DialogTitle>
        <DialogDescription className={cn(upToDate && 'text-success')}>{statusText}</DialogDescription>
        <Segmented
          className="mt-2"
          value={tab}
          onChange={setTab}
          items={[
            { value: 'publish', label: 'انتشار در گالری' },
            { value: 'claim', label: 'واگذاری به مشتری' },
          ]}
        />
      </DialogHeader>

      {tab === 'claim' ? (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-4">
          <ClaimLinkPanel id={id} claimLink={claimLink} claimedAt={claimedAt} content={content} elements={elements} onChange={onClaim} />
        </div>
      ) : (
      <div className="flex flex-col gap-4 px-6 pb-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          عنوان قالب
          <Input value={title} maxLength={MAX_PAGE_NAME} onChange={(e) => onMeta({ title: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          توضیح در گالری
          <Textarea rows={3} value={description} maxLength={MAX_DESCRIPTION} placeholder="این قالب برای چه کسانی مناسب است؟" onChange={(e) => onMeta({ description: e.target.value })} />
        </label>
        <div className="flex flex-col gap-1.5 text-sm font-medium">
          دسته‌بندی
          <Segmented value={category} onChange={(next) => onMeta({ category: next })} items={CATEGORY_ITEMS} />
        </div>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </div>
      )}

      {tab === 'claim' ? (
        <DialogFooter>
          <Button ref={closeRef} variant="ghost" onClick={onClose}>
            بستن
          </Button>
        </DialogFooter>
      ) : confirm ? (
        <DialogFooter className={cn('flex-wrap justify-end gap-y-3', confirm === 'delete' && 'bg-destructive/10')}>
          <span className="flex min-w-0 flex-1 basis-56 flex-col text-sm">
            <span className="font-semibold">{confirm === 'delete' ? `حذف قالب «${title}»؟` : 'قالب از گالری برداشته شود؟'}</span>
            <span className="text-xs text-muted-foreground">
              {confirm === 'delete' ? 'قالب برای همیشه حذف می‌شود؛ صفحه‌هایی که از آن ساخته شده‌اند دست نمی‌خورند.' : 'پیش‌نویس می‌ماند و صفحه‌های ساخته‌شده از آن دست نمی‌خورند.'}
            </span>
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              انصراف
            </Button>
            <Button variant={confirm === 'delete' ? 'destructive' : 'default'} loading={busy} onClick={() => void runConfirmed()}>
              {confirm === 'delete' ? 'حذف برای همیشه' : 'لغو انتشار'}
            </Button>
          </div>
        </DialogFooter>
      ) : (
        <DialogFooter className="justify-between">
          <div className="flex items-center gap-0.5">
            {published ? (
              <Button variant="ghost" title="لغو انتشار" onClick={() => setConfirm('unpublish')}>
                <EyeOffIcon />
                <span className="max-sm:sr-only">لغو انتشار</span>
              </Button>
            ) : null}
            <Button variant="ghost" title="حذف قالب" className="text-destructive hover:bg-destructive/10" onClick={() => setConfirm('delete')}>
              <Trash2Icon />
              <span className="max-sm:sr-only">حذف</span>
            </Button>
          </div>
          <div className="flex gap-2">
            <Button ref={closeRef} variant="ghost" onClick={onClose}>
              بستن
            </Button>
            {upToDate ? null : (
              <Button loading={publishing} disabled={!title.trim()} onClick={() => void run(onPublish)}>
                {published ? 'انتشار تغییرات' : 'انتشار در گالری'}
              </Button>
            )}
          </div>
        </DialogFooter>
      )}
    </>
  );
}
