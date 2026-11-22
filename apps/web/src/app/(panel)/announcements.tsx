'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { CircleAlertIcon, CircleCheckIcon, InfoIcon, XIcon } from 'lucide-react';
import { cn } from '@noroset/ui';
import type { AnnouncementTone, PanelAnnouncement } from '@noroset/admin/ui';
import { api } from '@/lib/api';
import { useSession } from './session';

const TONE: Record<AnnouncementTone, { className: string; icon: ReactNode }> = {
  info: { className: 'bg-info/10 text-foreground', icon: <InfoIcon className="size-4 shrink-0 text-info" /> },
  warning: { className: 'bg-warning/15 text-foreground', icon: <CircleAlertIcon className="size-4 shrink-0 text-warning" /> },
  success: { className: 'bg-success/10 text-foreground', icon: <CircleCheckIcon className="size-4 shrink-0 text-success" /> },
};

/**
 * اعلان‌های درون پنل برای فضای کاری جاری (docs/architecture.md §9.11، ۱۱.۷). هدف‌گیری در سرور است؛ بستن
 * به‌ازای کاربر در سرور ذخیره می‌شود.
 */
export function Announcements() {
  const { tenant } = useSession();
  const [items, setItems] = useState<PanelAnnouncement[]>([]);
  const tenantId = tenant?.tenantId;

  useEffect(() => {
    if (!tenantId) return;
    let current = true;
    api<PanelAnnouncement[]>('/announcements', { tenantId }).then(
      (rows) => {
        if (current) setItems(rows);
      },
      () => undefined,
    );
    return () => {
      current = false;
    };
  }, [tenantId]);

  if (!tenantId || items.length === 0) return null;

  function dismiss(id: string) {
    setItems((list) => list.filter((a) => a.id !== id));
    void api(`/announcements/${encodeURIComponent(id)}/dismiss`, { method: 'POST', tenantId }).catch(() => undefined);
  }

  return (
    <div className="flex flex-col">
      {items.map((a) => (
        <div key={a.id} role="status" className={cn('flex items-start gap-3 border-b px-4 py-2.5 text-sm', TONE[a.tone].className)}>
          {TONE[a.tone].icon}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="font-medium">{a.title}</span>
            {a.body ? <span className="whitespace-pre-line text-muted-foreground">{a.body}</span> : null}
            {a.linkUrl ? (
              a.linkUrl.startsWith('/') ? (
                <Link href={a.linkUrl} className="w-fit font-medium text-primary underline-offset-4 hover:underline">
                  {a.linkLabel || 'بیشتر'}
                </Link>
              ) : (
                <a href={a.linkUrl} target="_blank" rel="noopener noreferrer" className="w-fit font-medium text-primary underline-offset-4 hover:underline">
                  {a.linkLabel || 'بیشتر'}
                </a>
              )
            ) : null}
          </div>
          <button type="button" onClick={() => dismiss(a.id)} aria-label="بستن اعلان" className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <XIcon className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
