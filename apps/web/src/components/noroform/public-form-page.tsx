import { notFound } from 'next/navigation';
import { PublicFormRuntime } from './public-form-runtime';
import type { PublicFormView } from '@noroset/noroform/ui';

const API_ORIGIN = process.env.API_ORIGIN ?? 'http://127.0.0.1:3001';

export async function PublicFormPage({ slug }: { slug: string }) {
  let response: Response;
  try {
    response = await fetch(`${API_ORIGIN}/noroform/public/forms/${encodeURIComponent(slug)}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return <PublicFormError message="ارتباط با سرویس فرم برقرار نشد. کمی بعد دوباره تلاش کنید." />;
  }

  if (response.status === 404) notFound();
  if (response.status === 503) {
    const body = await response.json().catch(() => null) as { notice?: unknown } | null;
    return <PublicFormError message={typeof body?.notice === 'string' && body.notice ? body.notice : 'سرویس فرم موقتاً در دسترس نیست.'} />;
  }
  if (!response.ok) {
    return <PublicFormError message="بارگذاری فرم ناموفق بود. کمی بعد دوباره تلاش کنید." />;
  }

  const form = await response.json() as PublicFormView;
  if ((form.status !== 'published' && form.status !== 'closed') || form.slug !== slug) {
    throw new Error('Public form API returned an invalid response.');
  }
  return <PublicFormRuntime form={form} />;
}

function PublicFormError({ message }: { message: string }) {
  return (
    <main dir="rtl" className="grid min-h-dvh place-items-center bg-muted p-4">
      <section role="alert" className="w-full max-w-xl rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-black/10">
        <h1 className="text-xl font-bold">فرم در دسترس نیست</h1>
        <p className="mt-3 text-muted-foreground">{message}</p>
      </section>
    </main>
  );
}
