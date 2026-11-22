#!/bin/bash
# آماده‌سازی یک‌باره‌ی سرور Ubuntu با root: setup-server.sh (از پوشه‌ی release یا کپی deploy/).
# پیش‌نیاز: shared/.env پر شده باشد. nginx، docker و Node 22 و pm2 طبق runbook نصب شده باشند.
set -euo pipefail

ROOT=/srv/noroset
HERE="$(dirname "$(readlink -f "$0")")"

id deploy >/dev/null 2>&1 || useradd -m -s /bin/bash deploy
usermod -aG docker deploy
mkdir -p "$ROOT"/{releases,incoming,shared,logs,backups/db} /var/www/acme /etc/nginx/ssl/noroset.com /etc/nginx/ssl/n8l.ir
mkdir -p /var/cache/nginx/noroset_static /var/cache/nginx/noroset_pages
chown -R deploy:deploy "$ROOT" /var/www/acme

[ -f "$ROOT/shared/.env" ] || { echo "first create $ROOT/shared/.env from deploy/production.env.example" >&2; exit 1; }
chmod 600 "$ROOT/shared/.env"
if grep -Eq '=CHANGE' "$ROOT/shared/.env"; then
  echo "$ROOT/shared/.env still has CHANGE placeholders" >&2
  exit 1
fi

# دسترسی S3؛ بدون این فایل SeaweedFS درخواست ناشناس را می‌پذیرد.
set -a
# shellcheck disable=SC1091
. "$ROOT/shared/.env"
set +a
umask 077
cat > "$ROOT/shared/s3.json" <<JSON
{"identities":[{"name":"noroset","credentials":[{"accessKey":"$S3_ACCESS_KEY_ID","secretKey":"$S3_SECRET_ACCESS_KEY"}],"actions":["Admin","Read","List","Tagging","Write"]}]}
JSON
chmod 644 "$ROOT/shared/s3.json"
umask 022
chown deploy:deploy "$ROOT/shared/s3.json"
chmod 750 "$ROOT/shared"

# مسیر ثابت: کانتینر نباید به پوشه‌ی release قابل‌حذف وصل بماند.
mkdir -p "$ROOT/shared/initdb"
install -m 755 "$HERE/../../docker/initdb/00-roles.sh" "$ROOT/shared/initdb/00-roles.sh"
install -m 644 "$HERE/../../packages/db/sql/roles.sql" "$ROOT/shared/initdb/roles.sql"

# swap دو گیگابایتی برای جلوگیری از OOM در موج بازدید
if ! swapon --show | grep -q '^/swapfile'; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -w vm.swappiness=10
fi

ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

install -m 644 "$HERE/noroset.logrotate" /etc/logrotate.d/noroset
install -m 644 "$HERE/noroset.cron" /etc/cron.d/noroset
install -m 644 "$HERE/../nginx/noroset.conf" /etc/nginx/conf.d/noroset.conf
rm -f /etc/nginx/sites-enabled/default
echo 'setup done: start compose, issue certificates, then nginx -t and reload (runbook)'
