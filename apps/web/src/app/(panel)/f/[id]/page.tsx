import { InternalFormRuntime } from '@/components/noroform/internal-form-runtime';

/** اجرای فرم داخلی در پوسته‌ی پنل (noroset.com/f/{uuid}). */
export default async function InternalFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InternalFormRuntime id={id} />;
}
