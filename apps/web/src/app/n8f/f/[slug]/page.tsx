import type { Metadata } from 'next';
import { PublicFormPage } from '@/components/noroform/public-form-page';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/** فرم عمومی روی دامنه‌ی نوروفرم (n8f.ir/{slug}). */
export default async function N8fPublicFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PublicFormPage slug={slug} />;
}
