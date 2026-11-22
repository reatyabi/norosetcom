import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/migrations/**',
      '*.{js,mjs,cjs}',
      '**/*.config.{js,mjs,cjs}',
      'scripts/**/*.{js,mjs,cjs}',
      'next-env.d.ts',
      '.claude/**',
      'apps/web/scripts/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // قوانین React/hooks برای کامپوننت‌های مشترک @noroset/ui هم (همان‌ها که در وب رندر می‌شوند).
    files: ['apps/web/**/*.{ts,tsx}', 'packages/ui/**/*.{ts,tsx}', 'products/norolink/ui/**/*.{ts,tsx}', 'products/blog/ui/**/*.{ts,tsx}', 'products/noroform/ui/**/*.{ts,tsx}'],
    extends: [...nextCoreWebVitals, ...nextTypescript],
    rules: {
      // App Router (نه Pages Router): این قانون فقط برای دایرکتوری pages/ است.
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
  {
    // دیزاین سیستم صفحه‌ی لینک و فرم به Next وابسته نیست (تصاویر روی ذخیره‌ساز بیرونی/سرویس فایل‌اند).
    files: ['products/norolink/ui/**/*.{ts,tsx}', 'products/blog/ui/**/*.{ts,tsx}', 'products/noroform/ui/**/*.{ts,tsx}'],
    rules: { '@next/next/no-img-element': 'off' },
  },
  prettier,
  {
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
);
