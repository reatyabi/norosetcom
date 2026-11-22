import type { Metadata } from 'next';
import { HeroSlider } from '../_components/hero-slider';
import { QuickNav } from '../_components/quick-nav';
import { SocialProof } from '../_components/social-proof';
import { BentoShowcase } from '../_components/bento-showcase';
import { WorkspaceExperience } from '../_components/workspace-experience';
import { EnterpriseTrust } from '../_components/enterprise-trust';
import { CtaBanner } from '../_components/cta-banner';

export const metadata: Metadata = {
  title: 'نوروست — پلتفرم ابری سازمانی | فرم‌ساز آنلاین، درگاه بیو و میزبانی فایل (آرشیو)',
  description:
    'نسخه آرشیو شده صفحه اصلی پیشین نوروست.',
};

export default function ArchivedHomePage() {
  return (
    <main className="w-full">
      {/* هیرو اسلایدر تعاملی همراه با موکاپ‌های دسکتاپ و موبایل */}
      <HeroSlider />

      {/* نوار دسترسی سریع مایکروسافت */}
      <QuickNav />

      {/* نوار اثبات اجتماعی و تیم‌های استفاده‌کننده */}
      <SocialProof />

      {/* ویترین کارت‌های ۴گانه محصولات (بنتو گرید) */}
      <BentoShowcase />

      {/* تلفیق فضای کار واقعی کسب‌وکارهای ایران با وب‌اپلیکیشن‌های مدرن */}
      <WorkspaceExperience />

      {/* امنیت، معماری سازمانی و زیرساخت بومی */}
      <EnterpriseTrust />

      {/* بنر اقدام نهایی */}
      <CtaBanner />
    </main>
  );
}
