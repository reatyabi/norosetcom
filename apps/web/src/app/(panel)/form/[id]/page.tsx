import { redirect } from 'next/navigation';
import { routes } from '@/lib/routes';

/** /form/{id} صفحه‌ی مستقل ندارد؛ نمای پیش‌فرض فرم ادیتور است. */
export default async function FormRoot({ params }: { params: Promise<{ id: string }> }) {
  redirect(routes.form.editor((await params).id));
}
