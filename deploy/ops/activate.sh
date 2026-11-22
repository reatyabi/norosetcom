#!/bin/bash
# فعال‌سازی یک release یا برگشت به آن: activate.sh <sha>
# release تازه: استخراج ← بک‌آپ دیتابیس ← migration ← تعویض symlink ← ری‌استارت ← بررسی سلامت.
# release موجود (rollback): بدون migration. دیتابیس برنمی‌گردد، پس migrationها باید با نسخه‌ی قبلی سازگار باشند.
# ری‌استارت PM2 در حالت fork چند ثانیه قطعی دارد.
set -euo pipefail

SHA="$1"
ROOT=/srv/noroset
RELEASE="$ROOT/releases/$SHA"
PREVIOUS="$(readlink "$ROOT/current" 2>/dev/null || true)"

set -a
# shellcheck disable=SC1091
. "$ROOT/shared/.env"
set +a

healthy() {
  for _ in $(seq 1 30); do
    if curl -fsS -m 3 http://127.0.0.1:3001/health >/dev/null \
      && curl -fsS -m 5 -o /dev/null -H 'Host: noroset.com' http://127.0.0.1:3000/; then
      return 0
    fi
    sleep 2
  done
  return 1
}

switch_to() {
  ln -sfn "$1" "$ROOT/current.tmp"
  mv -T "$ROOT/current.tmp" "$ROOT/current"
  pm2 startOrRestart "$ROOT/current/deploy/ecosystem.config.cjs" --update-env
}

if [ ! -d "$RELEASE" ]; then
  mkdir -p "$RELEASE"
  tar -xzf "$ROOT/incoming/noroset-$SHA.tar.gz" -C "$RELEASE"
  ln -sfn "$ROOT/shared/.env" "$RELEASE/.env"
  "$RELEASE/deploy/ops/backup-db.sh"
  node "$RELEASE/packages/db/scripts/migrate.mjs"
fi

switch_to "$RELEASE"

if ! healthy; then
  echo "release $SHA is unhealthy" >&2
  if [ -n "$PREVIOUS" ]; then
    switch_to "$PREVIOUS"
    echo "switched back to $PREVIOUS (database migrations stay applied)" >&2
  fi
  exit 1
fi

pm2 save
# سه release آخر و نسخه‌ی جاری می‌مانند.
ls -1dt "$ROOT"/releases/* | tail -n +4 | { grep -vF "$RELEASE" || true; } | xargs -r rm -rf
find "$ROOT/incoming" -maxdepth 1 -type f -printf '%T@ %p\n' | sort -rn | tail -n +4 | cut -d' ' -f2- | xargs -r rm -f
echo "active release: $SHA"
