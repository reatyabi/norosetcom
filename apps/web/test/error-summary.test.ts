import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ErrorSummary } from '@noroset/ui';

// خلاصهٔ خطای فرم (قاعدهٔ error-summary): بدون خطا چیزی رندر نمی‌شود؛ با خطا،
// نقش alert، فوکوس‌پذیری و لینک هر مورد به فیلد مربوط باید وجود داشته باشد.
// (بدون JSX نوشته می‌شود چون vitest این پروژه پلاگین React ندارد.)
describe('ErrorSummary', () => {
  it('بدون خطا چیزی رندر نمی‌کند', () => {
    expect(renderToStaticMarkup(createElement(ErrorSummary, { items: [] }))).toBe('');
  });

  it('نقش alert، فوکوس‌پذیری و لینک فیلدها را می‌سازد', () => {
    const html = renderToStaticMarkup(
      createElement(ErrorSummary, {
        focusKey: 1,
        items: [
          { id: 'answer-f_1', label: 'نام', message: 'الزامی است' },
          { id: 'answer-f_2', label: 'ایمیل' },
        ],
      }),
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain('href="#answer-f_1"');
    expect(html).toContain('نام — الزامی است');
    expect(html).toContain('href="#answer-f_2"');
    expect(html).toContain('برای ادامه، خطاهای زیر را برطرف کنید');
  });
});
