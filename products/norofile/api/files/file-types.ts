import type { FileKind } from '@noroset/core';
import { IMAGE_MIME, InvalidImageError, processImage } from './image';

// نوع فایل فقط از محتوا (magic bytes) تشخیص داده می‌شود؛ Content-Type و پسوند کاربر قابل اعتماد نیستند.
// پسوند نام فقط برای تفکیک اسناد Office از zip ساده لازم است (همه zip هستند).
// فهرست مجاز: تصویر (png/jpg/webp/gif، متادیتا حذف)، pdf، docx/xlsx/pptx، zip. SVG/HTML عمداً نه.

export class InvalidFileError extends Error {}

export interface DetectedFile {
  kind: FileKind;
  mimeType: string;
  extension: string;
  width: number | null;
  height: number | null;
  /** بدنه‌ی نهایی برای ذخیره (برای تصویر: بدون متادیتا). */
  body: Uint8Array;
}

const OFFICE: Record<string, { mime: string; marker: string }> = {
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', marker: 'word/' },
  xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', marker: 'xl/' },
  pptx: { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', marker: 'ppt/' },
};

const startsWith = (b: Uint8Array, bytes: number[]) => bytes.every((v, i) => b[i] === v);
const contains = (b: Uint8Array, text: string) => Buffer.from(b.buffer, b.byteOffset, b.byteLength).includes(text, 0, 'latin1');

export function extensionOf(name: string): string {
  const m = /\.([a-z0-9]{1,10})$/i.exec(name);
  return m ? m[1]!.toLowerCase() : '';
}

export function detectFile(body: Uint8Array, name: string, accept: 'image' | 'any'): DetectedFile {
  if (body.length === 0) throw new InvalidFileError('empty');
  try {
    const image = processImage(body);
    return { kind: 'image', mimeType: IMAGE_MIME[image.type], extension: image.type, width: image.width, height: image.height, body: image.body };
  } catch (err) {
    if (!(err instanceof InvalidImageError)) throw err;
    // فقط «نوع ناشناخته» به سراغ انواع دیگر می‌رود؛ تصویر خراب رد می‌شود.
    if (err.message !== 'type') throw new InvalidFileError('image');
  }
  if (accept === 'image') throw new InvalidFileError('type');

  const plain = (kind: FileKind, mimeType: string, extension: string): DetectedFile => ({
    kind,
    mimeType,
    extension,
    width: null,
    height: null,
    body,
  });

  if (startsWith(body, [0x25, 0x50, 0x44, 0x46, 0x2d])) return plain('document', 'application/pdf', 'pdf');
  if (startsWith(body, [0x50, 0x4b, 0x03, 0x04])) {
    const office = OFFICE[extensionOf(name)];
    if (office) {
      if (!contains(body, '[Content_Types].xml') || !contains(body, office.marker)) throw new InvalidFileError('office');
      return plain('document', office.mime, extensionOf(name));
    }
    return plain('archive', 'application/zip', 'zip');
  }
  throw new InvalidFileError('type');
}

// کنترل، جداکننده‌ی مسیر و کاراکترهای ممنوع نام فایل ویندوز.
// eslint-disable-next-line no-control-regex
const FORBIDDEN = /[\u0000-\u001f\u007f/\\:*?"<>|]/g;

/** نام نمایشی امن؛ پسوند واقعی (از محتوا) تضمین می‌شود. */
export function sanitizeName(raw: string | undefined, extension: string): string {
  let name = (raw ?? '').normalize('NFC').replace(FORBIDDEN, ' ').replace(/\s+/g, ' ').trim();
  if (!name || name === '.' || name === '..') name = 'file';
  const ext = extensionOf(name);
  const matches = ext === extension || (extension === 'jpg' && ext === 'jpeg');
  if (!matches) name = `${name}.${extension}`;
  if (name.length > 255) name = `${name.slice(0, 254 - extension.length)}.${extension}`;
  return name;
}

/** هدر Content-Disposition با نام ASCII جایگزین و `filename*` (RFC 6266). */
export function contentDisposition(type: 'inline' | 'attachment', name: string): string {
  const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  const encoded = encodeURIComponent(name).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
