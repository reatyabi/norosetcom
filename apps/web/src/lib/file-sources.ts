// پیاده‌سازی‌های FileSource کارت آپلود مشترک (@noroset/ui؛ docs/architecture.md §9.10).
// کتابخانه همیشه norofile همان tenant است؛ آپلود از endpoint همان کاربرد تا سقف/دسترسی آن اعمال شود.

import type { FileSource, PickedFile } from '@noroset/ui';
import type { FileItem, FileList } from '@noroset/norofile/ui';
import { api } from './api';

const toPicked = (f: FileItem): PickedFile => ({
  id: f.id,
  name: f.name,
  kind: f.kind,
  mimeType: f.mimeType,
  sizeBytes: f.sizeBytes,
  width: f.width,
  height: f.height,
  visibility: f.visibility,
  url: f.url,
});

const fileName = (name: string) => ({ 'x-file-name': encodeURIComponent(name) });
// نوع واقعی را سرور از محتوا تشخیص می‌دهد.
const raw = (blob: Blob) => blob.slice(0, blob.size, 'application/octet-stream');

function tenantLibrary(tenantId: string): Required<Pick<FileSource, 'list'>> {
  return {
    async list({ kind, q, offset, limit }) {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (kind) params.set('kind', kind);
      if (q) params.set('q', q);
      const r = await api<FileList>(`/norofile/files?${params}`, { tenantId });
      return { items: r.items.map(toPicked), total: r.total };
    },
  };
}

/** بارگذاری مستقیم در norofile (کتابخانه‌ی tenant). */
export function norofileSource(tenantId: string, visibility: 'private' | 'public' = 'private'): FileSource {
  return {
    ...tenantLibrary(tenantId),
    async upload(blob, name) {
      const f = await api<FileItem>(`/norofile/files${visibility === 'public' ? '?visibility=public' : ''}`, {
        method: 'POST',
        tenantId,
        rawBody: raw(blob),
        headers: fileName(name),
      });
      return toPicked(f);
    },
  };
}

/** تصویر صفحه‌ی نورولینک: کتابخانه‌ی tenant + آپلود public از مسیر خود نورولینک (≤ ۵MB). */
export function norolinkImageSource(tenantId: string, pageId: string): FileSource {
  return {
    ...tenantLibrary(tenantId),
    async upload(blob, name) {
      const r = await api<{ file_id: string; width: number; height: number; url: string }>(`/norolink/pages/${pageId}/uploads`, {
        method: 'POST',
        tenantId,
        rawBody: raw(blob),
      });
      return {
        id: r.file_id,
        name,
        kind: 'image',
        mimeType: blob.type,
        sizeBytes: blob.size,
        width: r.width,
        height: r.height,
        visibility: 'public',
        url: r.url,
      };
    },
  };
}

/** تصویر قالب آماده در فضای پلتفرم (بدون tenant و کتابخانه؛ فقط superadmin). */
export function templateImageSource(templateId: string): FileSource {
  return {
    async upload(blob, name) {
      const r = await api<{ file_id: string; width: number; height: number; url: string }>(`/norolink/admin/templates/${templateId}/uploads`, {
        method: 'POST',
        rawBody: raw(blob),
      });
      return {
        id: r.file_id,
        name,
        kind: 'image',
        mimeType: blob.type,
        sizeBytes: blob.size,
        width: r.width,
        height: r.height,
        visibility: 'public',
        url: r.url,
      };
    },
  };
}

/** آواتار کاربر در فضای شخصی (بدون کتابخانه). */
export function avatarSource(): FileSource {
  return {
    async upload(blob, name) {
      const r = await api<{ avatarUrl: string }>('/me/avatar', { method: 'PUT', rawBody: raw(blob), headers: fileName(name) });
      return {
        id: r.avatarUrl.split('/').pop() ?? '',
        name,
        kind: 'image',
        mimeType: blob.type,
        sizeBytes: blob.size,
        width: null,
        height: null,
        visibility: 'public',
        url: r.avatarUrl,
      };
    },
  };
}

/** تصویر مقاله‌ی بلاگ در فضای پلتفرم (بدون tenant و کتابخانه؛ فقط superadmin). */
export function blogImageSource(): FileSource {
  return {
    async upload(blob, name) {
      const r = await api<{ fileId: string; width: number; height: number; url: string }>('/blog/admin/uploads', { method: 'POST', rawBody: raw(blob) });
      return {
        id: r.fileId,
        name,
        kind: 'image',
        mimeType: blob.type,
        sizeBytes: blob.size,
        width: r.width,
        height: r.height,
        visibility: 'public',
        url: r.url,
      };
    },
  };
}
