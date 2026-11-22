// @noroset/norofile/ui — قراردادهای نمایشی پنل فایل‌ها (بدون React/Nest؛ وب سورس را مستقیم transpile می‌کند).

export { canBePublic } from '../api/limits';

export type FileKind = 'image' | 'document' | 'archive';
export type FileVisibility = 'private' | 'public';

export interface FileItem {
  id: string;
  name: string;
  kind: FileKind;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  visibility: FileVisibility;
  url: string | null;
  source: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  /** آپلودکننده (فیلتر «مالک»). */
  uploadedBy: string | null;
  uploadedByName: string | null;
}

export interface FileUsage {
  ownerType: string;
  ownerId: string;
  createdAt: string;
}

export interface FileDetail extends FileItem {
  usages: FileUsage[];
}

export interface FileList {
  items: FileItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface StorageUsage {
  usedBytes: number;
  quotaBytes: number;
  fileCount: number;
  maxUploadBytes: number;
}

/** پسوندهای قابل انتخاب در input فایل (اعتبارسنجی واقعی در سرور از محتوا). */
export const ACCEPT = '.png,.jpg,.jpeg,.webp,.gif,.pdf,.docx,.xlsx,.pptx,.zip';

export const KIND_LABELS: Record<FileKind, string> = {
  image: 'تصویر',
  document: 'سند',
  archive: 'فشرده',
};

export const SOURCE_LABELS: Record<string, string> = {
  norofile: 'نوروفایل',
  norolink: 'نورولینک',
  noroform: 'نوروفرم',
};

export const OWNER_LABELS: Record<string, string> = {
  norolink_page: 'صفحه‌ی نورولینک',
};

const faNumber = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 });

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${faNumber.format(bytes)} بایت`;
  if (bytes < 1024 * 1024) return `${faNumber.format(bytes / 1024)} کیلوبایت`;
  if (bytes < 1024 * 1024 * 1024) return `${faNumber.format(bytes / (1024 * 1024))} مگابایت`;
  return `${faNumber.format(bytes / (1024 * 1024 * 1024))} گیگابایت`;
}
