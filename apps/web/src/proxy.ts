import { NextResponse, type NextRequest } from 'next/server';
import { FRAME_SOURCES } from '@noroset/norolink/embeds';
import { VIDEO_FRAME_ORIGINS } from '@noroset/field-engine';
import { DEFAULT_NOROFORM_HOST, DEFAULT_PUBLIC_HOST, hostName, linkPageCsp, noroformEnabled, resolveHostRoute } from '@/lib/host-routing';
import { blogApiPath, blogGate, blogTarget, NOT_FOUND_REWRITE } from '@/lib/blog-gate';
import { gateHtml, linkGate, NOT_FOUND_MESSAGE, SUSPENDED_MESSAGE, UNAVAILABLE_MESSAGE } from '@/lib/link-gate';
import { publicLinkUrl, routes } from '@/lib/routes';
import { UTM_COOKIE, UTM_MAX_AGE, utmCookieValue } from '@/lib/utm';

const PUBLIC_HOST = process.env.PUBLIC_HOST ?? DEFAULT_PUBLIC_HOST;
const NOROFORM_PUBLIC_HOST = process.env.NOROFORM_PUBLIC_HOST ?? DEFAULT_NOROFORM_HOST;
const NOROFORM = noroformEnabled(process.env.NOROFORM_ENABLED, process.env.NODE_ENV);
const LINK_CSP = linkPageCsp(FRAME_SOURCES);
const FORM_CSP = [`frame-src ${VIDEO_FRAME_ORIGINS.join(' ')}`, "object-src 'none'", "base-uri 'none'", "frame-ancestors 'none'"].join('; ');
const API_ORIGIN = process.env.API_ORIGIN ?? 'http://127.0.0.1:3001';
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? 'https://noroset.com';

/** first-touch: فقط اولین utm مرورگر نگه داشته می‌شود (§9.11، ۱۱.۷). */
function keepUtm(request: NextRequest, res: NextResponse): NextResponse {
  const utm = request.cookies.has(UTM_COOKIE) ? null : utmCookieValue(request.nextUrl.searchParams);
  if (utm) {
    res.cookies.set(UTM_COOKIE, utm, { httpOnly: true, sameSite: 'lax', secure: request.nextUrl.protocol === 'https:', path: '/', maxAge: UTM_MAX_AGE });
  }
  return res;
}

const html = (body: string, status: number, headers: Record<string, string> = {}) =>
  new NextResponse(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });

/**
 * وضعیت HTTP صفحه‌ی لینک پیش از stream (src/lib/link-gate.ts): ناموجود ← ۴۰۴، نشانی قبلی ← ۳۰۸، خاموشی/سقف درخواست
 * ← ۵۰۳ با Retry-After، تعلیق مدیریت پلتفرم ← ۴۵۱/۴۰۳. خطای شبکه ← رندر عادی (صفحه خودش خطا را نشان می‌دهد).
 */
async function gateLinkPage(request: NextRequest, slug: string): Promise<NextResponse | null> {
  let gate;
  try {
    const forwarded = request.headers.get('x-forwarded-for');
    const res = await fetch(`${API_ORIGIN}/norolink/public/pages/${encodeURIComponent(slug)}`, {
      headers: forwarded ? { 'x-forwarded-for': forwarded } : {},
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    gate = linkGate(res.status, await res.json().catch(() => null));
  } catch {
    return null;
  }
  if (gate.kind === 'not-found') return html(gateHtml(NOT_FOUND_MESSAGE), 404);
  if (gate.kind === 'redirect') {
    const port = request.headers.get('host')?.split(':')[1];
    return NextResponse.redirect(publicLinkUrl(PUBLIC_HOST, gate.slug, port), 308);
  }
  if (gate.kind === 'unavailable') return html(gateHtml(gate.notice || UNAVAILABLE_MESSAGE), 503, { 'Retry-After': String(gate.retryAfter) });
  // تعلیق مدیریت پلتفرم (§9.13): بدون رندر صفحه؛ ۴۵۱ (RFC 7725) سرور مسدودکننده را در هدر Link معرفی می‌کند.
  if (gate.kind === 'blocked') {
    return html(gateHtml(gate.notice || SUSPENDED_MESSAGE), gate.status, gate.status === 451 ? { Link: `<${WEB_ORIGIN}>; rel="blocked-by"` } : {});
  }
  return null;
}

/** مقاله، دسته یا برچسب بلاگ (src/lib/blog-gate.ts): ناموجود ← ۴۰۴ با صفحه‌ی not-found خود Next، نشانی قبلی مقاله ← ۳۰۸. */
async function gateBlog(request: NextRequest): Promise<NextResponse | null> {
  const target = blogTarget(request.nextUrl.pathname);
  if (!target) return null;
  let gate;
  try {
    const res = await fetch(`${API_ORIGIN}${blogApiPath(target)}`, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    gate = blogGate(target, res.status, await res.json().catch(() => null));
  } catch {
    return null;
  }
  if (gate.kind === 'not-found') {
    const url = request.nextUrl.clone();
    url.pathname = NOT_FOUND_REWRITE;
    url.search = '';
    return NextResponse.rewrite(url);
  }
  if (gate.kind === 'redirect') {
    const url = request.nextUrl.clone();
    url.pathname = routes.blog.post(gate.slug);
    return NextResponse.redirect(url, 308);
  }
  return null;
}

export async function proxy(request: NextRequest) {
  const route = resolveHostRoute(hostName(request.headers.get('host')), request.nextUrl.pathname, PUBLIC_HOST, NOROFORM, NOROFORM_PUBLIC_HOST);
  if (route.kind === 'not-found') return new NextResponse(null, { status: 404 });
  if (route.kind === 'rewrite') {
    if (route.linkPage) {
      const gated = await gateLinkPage(request, route.pathname.split('/').pop()!);
      if (gated) return gated;
    }
    const url = request.nextUrl.clone();
    url.pathname = route.pathname;
    const res = NextResponse.rewrite(url);
    if (route.linkPage) res.headers.set('Content-Security-Policy', LINK_CSP);
    if (/^\/f\/[^/]+$/.test(request.nextUrl.pathname)) res.headers.set('Content-Security-Policy', FORM_CSP);
    return route.mainHost ? keepUtm(request, res) : res;
  }
  if (/^\/f\/[^/]+$/.test(request.nextUrl.pathname)) {
    const res = NextResponse.next();
    res.headers.set('Content-Security-Policy', FORM_CSP);
    return keepUtm(request, res);
  }
  if (request.method === 'GET' || request.method === 'HEAD') {
    const gated = await gateBlog(request);
    if (gated) return keepUtm(request, gated);
  }
  return keepUtm(request, NextResponse.next());
}

export const config = {
  // API (rewrite در next.config)، فایل‌های Next و فایل‌های دارای پسوند از proxy رد نمی‌شوند.
  matcher: ['/((?!api/|_next/|.*\\.[^/]+$).*)'],
};
