'use client';

/**
 * تأیید پیش از کار برگشت‌ناپذیر (حذف صفحه/المان).
 * واگردی در ادیتور نیست، پس حذف باید یک قدم تأیید داشته باشد تا کلیک اشتباه داده از دست نرود.
 */

import { Button, Dialog, DialogDescription, DialogFooter, DialogHeader, DialogPopup, DialogTitle } from '@noroset/ui';

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogPopup dir="rtl" className="sm:max-w-sm">
        <DialogHeader className="gap-1.5 pe-14">
          <DialogTitle className="text-lg">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            انصراف
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
