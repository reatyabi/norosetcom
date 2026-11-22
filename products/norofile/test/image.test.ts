import { describe, expect, it } from 'vitest';
import { InvalidImageError, processImage, sniffImage } from '../api/files/image';

/** PNG حداقلی ۲×۳ با یک chunk متنی (متادیتا). */
function png(): Uint8Array {
  const chunk = (type: string, data: number[]) => {
    const len = data.length;
    return [len >>> 24, (len >> 16) & 255, (len >> 8) & 255, len & 255, ...[...type].map((c) => c.charCodeAt(0)), ...data, 0, 0, 0, 0];
  };
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ...chunk('IHDR', [0, 0, 0, 2, 0, 0, 0, 3, 8, 2, 0, 0, 0]),
    ...chunk('tEXt', [...'Author\0me'].map((c) => c.charCodeAt(0))),
    ...chunk('IDAT', [1, 2, 3]),
    ...chunk('IEND', []),
  ]);
}

/** JPEG حداقلی ۴×۵ با EXIF (Orientation=6) و COM. */
function jpeg(): Uint8Array {
  const exifTiff = [0x4d, 0x4d, 0, 0x2a, 0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, 6, 0, 0, 0, 0, 0, 0];
  const app1 = [0x45, 0x78, 0x69, 0x66, 0, 0, ...exifTiff, ...[...'GPSDATA'].map((c) => c.charCodeAt(0))];
  const seg = (m: number, data: number[]) => [0xff, m, (data.length + 2) >> 8, (data.length + 2) & 255, ...data];
  return new Uint8Array([
    0xff, 0xd8,
    ...seg(0xe0, [0x4a, 0x46, 0x49, 0x46, 0]),
    ...seg(0xe1, app1),
    ...seg(0xfe, [...'secret'].map((c) => c.charCodeAt(0))),
    ...seg(0xc0, [8, 0, 5, 0, 4, 1, 1, 0x11, 0]),
    ...seg(0xda, [1, 1, 0, 0, 0x3f, 0]),
    0x12, 0x34, 0xff, 0xd9,
  ]);
}

const text = (b: Uint8Array) => Buffer.from(b).toString('latin1');

describe('image processing', () => {
  it('reads png dimensions and strips text chunks', () => {
    const r = processImage(png());
    expect(r).toMatchObject({ type: 'png', width: 2, height: 3 });
    expect(text(r.body)).not.toContain('Author');
    expect(text(r.body)).toContain('IDAT');
  });

  it('strips jpeg exif/comments but keeps orientation', () => {
    const r = processImage(jpeg());
    expect(r).toMatchObject({ type: 'jpg', width: 4, height: 5 });
    const s = text(r.body);
    expect(s).not.toContain('GPSDATA');
    expect(s).not.toContain('secret');
    expect(s).toContain('Exif');
    expect(s).toContain('JFIF');
  });

  it('reads gif dimensions; rejects svg and garbage', () => {
    expect(processImage(new Uint8Array([...'GIF89a'].map((c) => c.charCodeAt(0)).concat([7, 0, 9, 0, 0, 0])))).toMatchObject({
      type: 'gif',
      width: 7,
      height: 9,
    });
    expect(sniffImage(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
    expect(() => processImage(new TextEncoder().encode('<svg></svg>'))).toThrow(InvalidImageError);
    expect(() => processImage(new Uint8Array(1024))).toThrow(InvalidImageError);
  });
});
