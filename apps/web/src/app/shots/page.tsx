import { notFound } from 'next/navigation';
import { FLUID_MIN_WIDTH, LinkPage, linkTemplate, templateElements } from '@noroset/norolink/ui';
import { lucideServerIcon } from '@/lib/lucide-icons.server';
import { DESKTOP_SCREEN, desktopVariant, MOBILE_SCREEN, MOCKUP_PRODUCTS, TEMPLATE_THUMB, type MockupProduct } from '@/lib/marketing-shots';
import { MobileMockupScreen } from '../(marketing)/_components/mobile-mockup-screen';
import { DesktopMockupScreen } from '../(marketing)/_components/desktop-mockup-screen';
import '../(marketing)/marketing.css';

// فقط توسعه: منبع تصاویر ثابت (scripts/shots.mjs). هر نما در گوشه‌ی بالای صفحه با ابعاد دقیق خودش.
export default async function ShotPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { kind, id = '', mode = 'default', dark } = await searchParams;

  if (kind === 'template') {
    const template = linkTemplate(id);
    if (!template) notFound();
    const elements = templateElements(template);
    const size = TEMPLATE_THUMB;
    return (
      <Shot width={size.width} height={size.height}>
        <div className="flex flex-col" style={{ width: FLUID_MIN_WIDTH, minHeight: size.height }}>
          <LinkPage content={template.content} elements={elements} assetBaseUrl="" forceLicense={false} lucideIcon={lucideServerIcon} preview />
        </div>
      </Shot>
    );
  }

  const product = MOCKUP_PRODUCTS.find((p) => p === id) as MockupProduct | undefined;
  if (!product || (kind !== 'mobile' && kind !== 'desktop')) notFound();
  const size = kind === 'mobile' ? MOBILE_SCREEN : DESKTOP_SCREEN;
  return (
    <Shot width={size.width} height={size.height} className={`marketing-root ${dark ? 'dark' : ''}`}>
      {kind === 'mobile' ? <MobileMockupScreen productId={product} /> : <DesktopMockupScreen productId={product} detailMode={desktopVariant(product, mode)} />}
    </Shot>
  );
}

function Shot({ width, height, className = '', children }: { width: number; height: number; className?: string; children: React.ReactNode }) {
  return (
    <div dir="rtl" className={`overflow-hidden ${className}`} style={{ position: 'fixed', top: 0, left: 0, zIndex: 2147483647, width, height, minHeight: height }}>
      {/* نشان ابزار توسعه‌ی Next در تصویر نیاید */}
      <style>{'nextjs-portal{display:none!important}'}</style>
      {children}
    </div>
  );
}
