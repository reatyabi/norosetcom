'use client';

import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { toBlob } from 'html-to-image';
import { LinkPage, type AnyElement, type PageContent } from '@noroset/norolink/ui';
import { loadLucideIcons, renderLucide, usesLucide } from './lucide-icons';
import { SHOT_SCALE } from './marketing-shots';

/**
 * بندانگشتی قالب مدیریت پلتفرم در مرورگر ادمین، یک‌بار هنگام انتشار (docs/architecture.md §9.8): همان LinkPage
 * بیرون از دید رندر و به WebP تبدیل می‌شود تا گالری به‌جای رندر زنده تصویر ببیند. شکست ← null (گالری زنده رندر می‌کند).
 */
export async function captureLinkThumb(
  content: PageContent,
  elements: AnyElement[],
  assetBaseUrl: string,
  size: { width: number; height: number },
): Promise<Blob | null> {
  const icons = usesLucide(elements) ? await loadLucideIcons() : null;
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  Object.assign(host.style, { position: 'fixed', left: '-10000px', top: '0', width: `${size.width}px`, height: `${size.height}px`, overflow: 'hidden', pointerEvents: 'none' });
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    flushSync(() =>
      root.render(
        <div dir="rtl" className="flex flex-col" style={{ width: size.width, minHeight: size.height }}>
          <LinkPage content={content} elements={elements} assetBaseUrl={assetBaseUrl} forceLicense={false} lucideIcon={icons ? (name) => renderLucide(icons, name) : undefined} preview />
        </div>,
      ),
    );
    // تصاویر lazy بیرون از دید بارگذاری نمی‌شوند
    const images = [...host.querySelectorAll('img')];
    images.forEach((img) => (img.loading = 'eager'));
    await Promise.all([document.fonts.ready, ...images.map((img) => img.decode().catch(() => undefined))]);
    return await toBlob(host, { width: size.width, height: size.height, pixelRatio: SHOT_SCALE, type: 'image/webp', quality: 0.8 });
  } catch {
    return null;
  } finally {
    root.unmount();
    host.remove();
  }
}
