// بررسی تصویر آپلودی بدون وابستگی: نوع از محتوا (magic bytes، نه Content-Type کاربر)، ابعاد،
// و حذف متادیتا (EXIF/GPS، XMP، متن PNG). جهت تصویر JPEG (EXIF Orientation) حفظ می‌شود.
// SVG عمداً پشتیبانی نمی‌شود (اسکریپت درون‌خطی). سقف حجم را فراخواننده بررسی می‌کند.

export const MAX_IMAGE_SIDE = 20000;

export type ImageType = 'png' | 'jpg' | 'webp' | 'gif';

export const IMAGE_MIME: Record<ImageType, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

export interface ProcessedImage {
  type: ImageType;
  width: number;
  height: number;
  body: Uint8Array;
}

export class InvalidImageError extends Error {}

const ascii = (b: Uint8Array, at: number, len: number) => String.fromCharCode(...b.subarray(at, at + len));
const u16be = (b: Uint8Array, at: number) => (b[at]! << 8) | b[at + 1]!;
const u32be = (b: Uint8Array, at: number) => ((b[at]! << 24) | (b[at + 1]! << 16) | (b[at + 2]! << 8) | b[at + 3]!) >>> 0;
const u16le = (b: Uint8Array, at: number) => b[at]! | (b[at + 1]! << 8);
const u24le = (b: Uint8Array, at: number) => b[at]! | (b[at + 1]! << 8) | (b[at + 2]! << 16);
const u32le = (b: Uint8Array, at: number) => (b[at]! | (b[at + 1]! << 8) | (b[at + 2]! << 16) | (b[at + 3]! << 24)) >>> 0;

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

export function sniffImage(b: Uint8Array): ImageType | null {
  if (b.length >= 8 && u32be(b, 0) === 0x89504e47 && u32be(b, 4) === 0x0d0a1a0a) return 'png';
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.length >= 12 && ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP') return 'webp';
  if (b.length >= 6 && (ascii(b, 0, 6) === 'GIF87a' || ascii(b, 0, 6) === 'GIF89a')) return 'gif';
  return null;
}

const PNG_DROP = new Set(['tEXt', 'zTXt', 'iTXt', 'eXIf', 'tIME']);

function processPng(b: Uint8Array): Omit<ProcessedImage, 'type'> {
  if (b.length < 33 || ascii(b, 12, 4) !== 'IHDR') throw new InvalidImageError('png');
  const parts: Uint8Array[] = [b.subarray(0, 8)];
  let i = 8;
  while (i + 12 <= b.length) {
    const len = u32be(b, i);
    const end = i + 12 + len;
    if (end > b.length) throw new InvalidImageError('png chunk');
    const type = ascii(b, i + 4, 4);
    if (!PNG_DROP.has(type)) parts.push(b.subarray(i, end));
    i = end;
    if (type === 'IEND') break;
  }
  return { width: u32be(b, 16), height: u32be(b, 20), body: concat(parts) };
}

/** مقدار تگ Orientation (0x0112) از segment APP1 EXIF؛ نبود = null. */
function exifOrientation(seg: Uint8Array): number | null {
  // seg: داده‌ی APP1 بعد از طول ("Exif\0\0" + TIFF)
  if (seg.length < 14 || ascii(seg, 0, 4) !== 'Exif') return null;
  const t = seg.subarray(6);
  const le = ascii(t, 0, 2) === 'II';
  const r16 = (at: number) => (le ? u16le(t, at) : u16be(t, at));
  const r32 = (at: number) => (le ? u32le(t, at) : u32be(t, at));
  const ifd = r32(4);
  if (ifd + 2 > t.length) return null;
  const count = r16(ifd);
  for (let k = 0; k < count; k++) {
    const e = ifd + 2 + k * 12;
    if (e + 12 > t.length) return null;
    if (r16(e) === 0x0112) {
      const v = r16(e + 8);
      return v >= 1 && v <= 8 ? v : null;
    }
  }
  return null;
}

/** APP1 حداقلی که فقط Orientation دارد. */
function orientationApp1(orientation: number): Uint8Array {
  const tiff = [0x4d, 0x4d, 0x00, 0x2a, 0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, orientation, 0, 0, 0, 0, 0, 0];
  const data = [...[0x45, 0x78, 0x69, 0x66, 0, 0], ...tiff];
  const len = data.length + 2;
  return new Uint8Array([0xff, 0xe1, len >> 8, len & 255, ...data]);
}

const JPEG_SOF = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
/** APP1 (EXIF/XMP)، APP13 (IPTC) و COM حذف می‌شوند؛ APP0/APP2(ICC)/APP14 می‌مانند. */
const JPEG_DROP = new Set([0xe1, 0xed, 0xfe]);

function processJpeg(b: Uint8Array): Omit<ProcessedImage, 'type'> {
  const parts: Uint8Array[] = [b.subarray(0, 2)];
  let width = 0;
  let height = 0;
  let orientation: number | null = null;
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) throw new InvalidImageError('jpeg marker');
    while (b[i] === 0xff) i++;
    const marker = b[i++]!;
    if (marker === 0xd9) {
      parts.push(new Uint8Array([0xff, 0xd9]));
      break;
    }
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      parts.push(new Uint8Array([0xff, marker]));
      continue;
    }
    if (i + 2 > b.length) throw new InvalidImageError('jpeg length');
    const len = u16be(b, i);
    const end = i + len;
    if (len < 2 || end > b.length) throw new InvalidImageError('jpeg segment');
    if (JPEG_SOF.has(marker) && len >= 7) {
      height = u16be(b, i + 3);
      width = u16be(b, i + 5);
    }
    if (marker === 0xe1) orientation ??= exifOrientation(b.subarray(i + 2, end));
    if (marker === 0xda) {
      // بعد از SOS داده‌ی فشرده تا انتهای فایل کپی می‌شود.
      if (orientation && orientation !== 1) parts.splice(1, 0, orientationApp1(orientation));
      parts.push(b.subarray(i - 2));
      return { width, height, body: concat(parts) };
    }
    if (!JPEG_DROP.has(marker)) parts.push(b.subarray(i - 2, end));
    i = end;
  }
  if (orientation && orientation !== 1) parts.splice(1, 0, orientationApp1(orientation));
  return { width, height, body: concat(parts) };
}

function processWebp(b: Uint8Array): Omit<ProcessedImage, 'type'> {
  const chunks: Uint8Array[] = [];
  let width = 0;
  let height = 0;
  let vp8x: Uint8Array | null = null;
  let i = 12;
  while (i + 8 <= b.length) {
    const type = ascii(b, i, 4);
    const len = u32le(b, i + 4);
    const end = i + 8 + len + (len & 1);
    if (i + 8 + len > b.length) throw new InvalidImageError('webp chunk');
    const d = i + 8;
    if (type === 'VP8X' && len >= 10) {
      width = u24le(b, d + 4) + 1;
      height = u24le(b, d + 7) + 1;
      vp8x = b.slice(i, Math.min(end, b.length));
      chunks.push(vp8x);
    } else if (type === 'VP8 ' && len >= 10 && !width) {
      width = u16le(b, d + 6) & 0x3fff;
      height = u16le(b, d + 8) & 0x3fff;
      chunks.push(b.subarray(i, Math.min(end, b.length)));
    } else if (type === 'VP8L' && len >= 5 && !width) {
      const bits = u32le(b, d + 1);
      width = (bits & 0x3fff) + 1;
      height = ((bits >> 14) & 0x3fff) + 1;
      chunks.push(b.subarray(i, Math.min(end, b.length)));
    } else if (type !== 'EXIF' && type !== 'XMP ') {
      chunks.push(b.subarray(i, Math.min(end, b.length)));
    }
    i = end;
  }
  // پرچم‌های EXIF (0x08) و XMP (0x04) در VP8X پاک می‌شوند چون chunkها حذف شده‌اند.
  if (vp8x) vp8x[8] = vp8x[8]! & ~0x0c;
  const payload = concat(chunks);
  const header = new Uint8Array(12);
  header.set(b.subarray(0, 4), 0);
  const size = payload.length + 4;
  header.set([size & 255, (size >> 8) & 255, (size >> 16) & 255, (size >>> 24) & 255], 4);
  header.set(b.subarray(8, 12), 8);
  return { width, height, body: concat([header, payload]) };
}

function processGif(b: Uint8Array): Omit<ProcessedImage, 'type'> {
  if (b.length < 10) throw new InvalidImageError('gif');
  return { width: u16le(b, 6), height: u16le(b, 8), body: b };
}

export function processImage(input: Uint8Array): ProcessedImage {
  const type = sniffImage(input);
  if (!type) throw new InvalidImageError('type');
  const r =
    type === 'png' ? processPng(input) : type === 'jpg' ? processJpeg(input) : type === 'webp' ? processWebp(input) : processGif(input);
  if (!(r.width >= 1 && r.height >= 1 && r.width <= MAX_IMAGE_SIDE && r.height <= MAX_IMAGE_SIDE)) {
    throw new InvalidImageError('dimensions');
  }
  return { type, ...r };
}
