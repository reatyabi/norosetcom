/**
 * لینک «پرش به محتوای اصلی» — فقط با کیبورد دیده می‌شود (قاعده‌ی skip-links).
 * مقصد: `#main-content` که روی <main> هر پوسته قرار دارد.
 */
export function SkipLink({ href = '#main-content', children = 'پرش به محتوای اصلی' }: { href?: string; children?: string }) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {children}
    </a>
  );
}
