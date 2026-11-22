import { shotList } from '@/lib/marketing-shots';

// فقط توسعه: فهرست تصاویری که scripts/shots.mjs می‌سازد.
export function GET() {
  if (process.env.NODE_ENV === 'production') return new Response(null, { status: 404 });
  return Response.json(shotList());
}
