#!/bin/bash
# بیلد لینوکسی یک release داخل کانتینر node:22 (deploy.ps1 آن را اجرا می‌کند). PUBLIC_HOST و API_ORIGIN
# داخل بیلد Next قرار می‌گیرند و وابستگی‌های dev پس از بیلد حذف می‌شوند.
set -euo pipefail

SHA="$1"
export PUBLIC_HOST=n8l.ir
export API_ORIGIN=http://127.0.0.1:3001
export CI=true

corepack enable
corepack prepare pnpm@9.15.9 --activate
pnpm config set store-dir /pnpm/store

pnpm install --frozen-lockfile
pnpm build:packages
pnpm --filter @noroset/api build
pnpm --filter @noroset/web build
rm -rf apps/web/.next/cache

pnpm install --frozen-lockfile --prod --ignore-scripts

# git archive روی ویندوز بیت اجرا ندارد.
chmod +x deploy/ops/*.sh
tar -czf "/out/noroset-${SHA}.tar.gz" .
echo "built noroset-${SHA}.tar.gz"
