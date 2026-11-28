/**
 * @type {import('next').NextConfig}
 *
 * پکیج‌های workspace که سورس TS/TSX صادر می‌کنند در `transpilePackages` می‌آیند.
 */
const API_ORIGIN = process.env.API_ORIGIN ?? 'http://127.0.0.1:3001';
const PUBLIC_HOST = process.env.PUBLIC_HOST ?? 'n8l.localhost';
const NOROFORM_PUBLIC_HOST = process.env.NOROFORM_PUBLIC_HOST ?? 'n8f.localhost';

const nextConfig = {
  experimental: {
    agentUpgrade: false,
  },
  transpilePackages: ['@noroset/ui', '@noroset/noroform', '@noroset/norolink', '@noroset/norofile', '@noroset/admin', '@noroset/blog'],
  // دامنه‌های عمومی برای ساخت آدرس در پنل (مرورگر env سرور را نمی‌بیند).
  env: { NOROSET_PUBLIC_HOST: PUBLIC_HOST, NOROSET_NOROFORM_HOST: NOROFORM_PUBLIC_HOST },
  // development: صفحه‌های عمومی روی n8l.localhost و زیردامنه‌هایش و خروجی نوروفرم روی n8f.localhost.
  allowedDevOrigins: [PUBLIC_HOST, `*.${PUBLIC_HOST}`, NOROFORM_PUBLIC_HOST],
  // صفحه‌ی فضای کاری فعلاً در مسیر کاربر نیست؛ کد آن می‌ماند (docs/routes.md).
  async redirects() {
    return [
      { source: '/ws', destination: '/link', permanent: false },
      { source: '/landing/privacy', destination: '/privacy', permanent: true },
      { source: '/landing/terms', destination: '/terms', permanent: true },
    ];
  },
  // مرورگر API را از همین origin می‌بیند (cookie first-party، بدون CORS). API باید
  // API_BASE_PATH=/api و TRUST_PROXY مناسب داشته باشد (.env.example).
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_ORIGIN}/:path*` }];
  },
};

export default nextConfig;
