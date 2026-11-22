#!/bin/bash
# پاک‌سازی OTP و نشست‌های منقضی (docs/tech-debt.md مورد ۴). روزی یک بار تا شمارش سقف OTP (از همین جدول) اثر نبیند.
. "$(dirname "$(readlink -f "$0")")/common.sh"

docker exec noroset-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -qc 'SELECT cleanup_expired_auth()' >/dev/null
