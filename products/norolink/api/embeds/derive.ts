import { parseVideoUrl, type AnyElement, type ElementKind, type ElementSettings } from '../../shared';
import { resolveMapUrl, type Fetcher } from './map-resolver';

/**
 * داده‌ی مشتق‌شده (ویدیو، مختصات نقشه) فقط از source_url و در سرور ساخته می‌شود. لینک ناشناخته ذخیره
 * می‌شود (بدون داده‌ی مشتق) تا بقیه‌ی تغییرات المان از دست نرود؛ missing_video/missing_location مانع انتشار است.
 */
export async function deriveEmbedData(el: AnyElement, fetcher: Fetcher): Promise<ElementSettings[ElementKind]> {
  if (el.kind === 'video_embed') {
    const src = el.settings.source_url;
    const video = src ? parseVideoUrl(src) : null;
    return { ...el.settings, video };
  }
  if (el.kind === 'map_embed') {
    const src = el.settings.source_url;
    const location = src ? await resolveMapUrl(src, fetcher) : null;
    return { ...el.settings, location };
  }
  return el.settings;
}
