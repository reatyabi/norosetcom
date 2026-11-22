# Noroset

پلتفرم SaaS فارسی (RTL) — مونوریپوی pnpm.

> این فایل فقط **نقطه‌ی ورود** است. سند مرجع معماری: [`docs/architecture.md`](docs/architecture.md) · فهرست کامل اسناد و قاعده‌ی به‌روزرسانی: [`docs/README.md`](docs/README.md).

## وضعیت لانچ

- **در لانچ:** نورولینک (`noroset.com/link`)، نوروفایل (`/file`)، مدیریت پلتفرم (`/admin`)، بلاگ (`/blog`).
- **کد موجود ولی خارج از لانچ:** نوروفرم — در production خاموش است مگر `NOROFORM_ENABLED=true` (در development به‌طور پیش‌فرض روشن است).
- دامنه‌ی دقیق، «عمداً در لانچ نیست» و تصمیم‌های محصول → [`docs/architecture.md` §۲](docs/architecture.md).

## پیش‌نیازها

- Node.js **20.9+** (CI روی ۲۲)
- pnpm **9+**
- Docker (برای PostgreSQL محلی)
- فقط برای بازتولید تصاویر مارکتینگ: Chrome نصب‌شده (وابستگی `sharp` در `apps/web` هست)

## شروع سریع

```bash
pnpm install
cp .env.example .env

# PostgreSQL محلی (نقش‌های noroset_migrator / noroset_app را می‌سازد)
docker compose up -d

# migration
pnpm --filter @noroset/db db:migrate

# api + web
pnpm dev
```

- API: http://localhost:3001/health · Web: http://localhost:3000
- پورت PostgreSQL روی **۵۴۳۳** است (PostgreSQL بومی ویندوز ۵۴۳۲ را می‌گیرد).
- `pnpm dev` / `build` / `test` / `typecheck` ابتدا `build:packages` را اجرا می‌کنند؛ پکیج‌های داخلی از `dist` مصرف می‌شوند (نه سورس).

## دستورها

| دستور | توضیح |
|---|---|
| `pnpm dev` | اجرای هم‌زمان api و web |
| `pnpm build` | بیلد پکیج‌ها و اپ‌ها |
| `pnpm lint` · `pnpm typecheck` | ESLint · TypeScript (همه‌ی پکیج‌ها) |
| `pnpm test` | تست همه‌ی پکیج‌ها (vitest، علیه PostgreSQL واقعی) |
| `pnpm check:boundaries` | مرزهای معماری (dependency-cruiser) |
| `pnpm check:design` · `pnpm check:contrast` | توکن/پالت/حرکت · کنتراست AA (۵ base × ۴ برند × ۲ تم + tone) |
| `pnpm check:size` | بودجه‌ی اندازه‌ی فایل |
| `pnpm check:all` | چهار گارد بالا با هم |
| `pnpm --filter @noroset/web shots` | بازتولید تصاویر نسخه‌دار مارکتینگ (Chrome لازم است) |

> تست‌های وابسته به دیتابیس در اجرای موازی می‌توانند تداخل کنند؛ برای اجرای قابل‌اعتماد:
> `pnpm -r --workspace-concurrency=1 --if-present run test` (بدهی ثبت‌شده: [`docs/tech-debt.md`](docs/tech-debt.md) مورد ۶).

## ساختار

```
apps/
  api/            NestJS + Fastify
  web/            Next.js (App Router, RTL)
packages/
  core/ db/ field-engine/ ui/
products/
  noroform/ norofile/ admin/        (api/ + ui/)
  norolink/ blog/                   (api/ + shared/ + ui/)
deploy/  docker/  docs/
```

## اسناد (هر موضوع یک سند)

| موضوع | سند |
|---|---|
| فهرست و قاعده‌ی به‌روزرسانی اسناد | [`docs/README.md`](docs/README.md) |
| معماری، بک‌اند، دیتابیس/RLS، مرزها، نقشه‌ی راه | [`docs/architecture.md`](docs/architecture.md) |
| دیزاین‌سیستم (توکن، برند/base color، کامپوننت، الگوها، a11y، RTL) | [`docs/design-system.md`](docs/design-system.md) |
| ساختار و مرزهای فرانت + وضعیت مهاجرت و گیت‌ها | [`docs/frontend-architecture.md`](docs/frontend-architecture.md) |
| آدرس‌های وب | [`docs/routes.md`](docs/routes.md) |
| بدهی فنی | [`docs/tech-debt.md`](docs/tech-debt.md) |
| استقرار production | [`docs/launch-blueprint.md`](docs/launch-blueprint.md) |
| رویه‌ی انتشار | [`docs/release.md`](docs/release.md) |

## نکته‌های تثبیت‌شده

- **دسترسی داده:** هر جدول tenant-scoped با RLS + FORCE؛ فقط از `withTenant()` در `@noroset/db` استفاده کنید؛ `pool` export نمی‌شود.
- **مرزها:** هر پکیج فقط از `index.ts` مصرف می‌شود؛ import عمیق ممنوع (CI: `check:boundaries`).
- **ظاهر:** فقط توکن‌های `@noroset/ui`؛ رنگ/پالت خام در کد UI ممنوع (CI: `check:design`).
- **اسناد:** گزارش‌های موقت (بازنگری، برنامه‌ی مهاجرت) سند دائمی نیستند؛ نتیجه به سند مرجع منتقل و خود گزارش حذف می‌شود.
