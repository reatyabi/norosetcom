import { PublicResponseRuntime } from './response-runtime';

/** مشاهده‌ی بیرونی یک پاسخ با لینک توکن‌دار (n8f.ir/r/{token}). */
export default async function PublicResponsePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicResponseRuntime token={token} />;
}
