import type { NextRequest } from 'next/server';

/**
 * نشانی کوتاه لینک واگذاری (`noroset.com/c/{code}`؛ docs/architecture.md §9.8) تا در پیام کوتاه بماند. به صفحه‌ی تحویل با
 * UTM ثابت ریدایرکت می‌شود؛ proxy همان‌جا UTM را برای first-touch ثبت‌نام نگه می‌دارد. پارامترهای دیگر (مثلاً `preview`) می‌مانند.
 * Location نسبی است، چون پشت nginx نشانی درخواست برای Next همان `localhost:3000` خودش است.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const query = new URLSearchParams(request.nextUrl.searchParams);
  query.set('token', code);
  query.set('utm_source', 'norolink');
  query.set('utm_medium', 'claim-link');
  return new Response(null, { status: 307, headers: { Location: `/claim?${query.toString()}` } });
}
