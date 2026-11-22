// انواع و برچسب‌های مشترک صفحه‌های فرم (پنل).
import type { ComponentProps } from 'react';
import type { Badge } from '@noroset/ui';
import type { FormPreview } from '@noroset/field-engine';

export type FormStatus = 'draft' | 'published' | 'closed';
export type FormChannel = 'internal' | 'external';
export type ResponseAccess = 'internal' | 'external';
export type ResponseAuth = 'link' | 'key' | 'otp';

export interface FormSummary {
  id: string;
  title: string;
  slug: string;
  status: FormStatus;
  channel: FormChannel;
  responseAccess: ResponseAccess;
  responseAuth: ResponseAuth | null;
  responseAccessTtlDays: number;
  currentVersionNumber: number | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  createdByName: string | null;
}

/** ردیف فهرست با داده‌ی تصویر بندانگشتی (`formPreview` field-engine روی پیش‌نویس). */
export interface FormListItem extends FormSummary {
  preview: FormPreview;
}

type BadgeVariant = NonNullable<ComponentProps<typeof Badge>['variant']>;

export const STATUS: Record<FormStatus, { label: string; variant: BadgeVariant }> = {
  draft: { label: 'پیش‌نویس', variant: 'secondary' },
  published: { label: 'منتشرشده', variant: 'info' },
  closed: { label: 'بسته', variant: 'outline' },
};
