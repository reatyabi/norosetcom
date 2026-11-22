#!/bin/sh
# Injects passwords from env into roles.sql and runs it (docker-entrypoint-initdb.d).
set -e
# رمز خالی = توقف؛ پیش‌فرض development فقط در docker-compose.yml است. رمزها hex باشند تا sed را نشکنند.
MIGRATOR_PW="${NOROSET_MIGRATOR_PASSWORD:?NOROSET_MIGRATOR_PASSWORD is required}"
APP_PW="${NOROSET_APP_PASSWORD:?NOROSET_APP_PASSWORD is required}"
sed \
  -e "s|__MIGRATOR_PASSWORD__|${MIGRATOR_PW}|g" \
  -e "s|__APP_PASSWORD__|${APP_PW}|g" \
  /sql/roles.sql \
  | psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB"
