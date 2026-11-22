import { lumaStats, type LumaStats } from '@noroset/norolink/ui';

const SAMPLE = 64;

/**
 * آمار روشنایی عکس پس‌زمینه‌ی صفحه‌ی لینک (برای حداقل شدت لایه؛ docs/architecture.md §9.3). عکس‌ها از همان
 * origin وب سرو می‌شوند، پس canvas آلوده نمی‌شود. شکست ← null (رندر همان شدت انتخابی کاربر را می‌گیرد).
 */
export async function measureImageLuma(url: string): Promise<LumaStats | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const bitmap = await createImageBitmap(await res.blob());
    const canvas = document.createElement('canvas');
    canvas.width = SAMPLE;
    canvas.height = SAMPLE;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, SAMPLE, SAMPLE);
    bitmap.close();
    return lumaStats(ctx.getImageData(0, 0, SAMPLE, SAMPLE).data);
  } catch {
    return null;
  }
}
