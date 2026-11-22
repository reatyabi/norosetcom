import type { AnyElement, ModerationReason, ModerationStatus, PageContent, ReportReason, ReportStatus } from '@noroset/norolink/ui';

// پاسخ‌های API کنترل صفحه‌ها (products/norolink/api/moderation؛ docs/architecture.md §9.13).

export interface ModerationState {
  status: ModerationStatus;
  /** محدودیت موقتِ مهلت‌گذشته ← none. */
  effective: ModerationStatus;
  reason: ModerationReason | null;
  notice: string | null;
  until: string | null;
  at: string | null;
}

export interface ModerationPageItem {
  id: string;
  slug: string;
  title: string;
  status: 'draft' | 'published';
  publishedAt: string | null;
  tenant: { id: string; name: string; slug: string; status: 'active' | 'suspended' };
  moderation: ModerationState;
  openReports: number;
}

export interface PageReportItem {
  id: string;
  pageId: string;
  slug: string;
  reason: ReportReason;
  details: string;
  contact: string | null;
  status: ReportStatus;
  createdAt: string;
  resolvedAt: string | null;
  resolvedByName: string | null;
  resolutionNote: string | null;
  page: { title: string; moderation: ModerationStatus } | null;
}

export interface ModerationPageDetail extends ModerationPageItem {
  snapshot: { content: PageContent; elements: AnyElement[] };
  assetBaseUrl: string;
  reports: PageReportItem[];
}
