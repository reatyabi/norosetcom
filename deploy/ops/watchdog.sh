#!/bin/bash
# بررسی پنج‌دقیقه‌ای سرور و هشدار پیامکی. هر مشکل حداکثر هر ۶ ساعت یک پیامک می‌فرستد تا هزینه کنترل شود.
# خاموشی کامل سرور را این اسکریپت نمی‌بیند؛ آن را هشدار پارس‌پک یا پایش بیرونی باید پوشش دهد.
. "$(dirname "$(readlink -f "$0")")/common.sh"

STATE="$NOROSET_HOME/shared/watchdog"
mkdir -p "$STATE"
REPEAT_SECONDS=$((6 * 3600))

# متن متغیر پترن: بدون لینک و بدون ; (خط اشتراکی ملی‌پیامک رد می‌کند).
alert() {
  local key="$1" message="$2" marker="$STATE/$1" now last
  now="$(date +%s)"
  last="$(cat "$marker" 2>/dev/null || echo 0)"
  if [ $((now - last)) -lt "$REPEAT_SECONDS" ]; then return 0; fi
  if curl -fsS -m 15 "https://console.melipayamak.com/api/send/shared/$MELIPAYAMAK_TOKEN" \
    -H 'content-type: application/json' \
    -d "{\"bodyId\":$MELIPAYAMAK_ALERT_BODY_ID,\"to\":\"$ALERT_MOBILE\",\"args\":[\"$message\"]}" | grep -Eq '"recId":[[:space:]]*"?[0-9]{4,}'; then
    echo "$now" > "$marker"
  else
    echo "alert not sent: $key" >&2
  fi
}

ok() { rm -f "$STATE/$1"; }

check() {
  local key="$1" message="$2"
  shift 2
  if "$@" >/dev/null 2>&1; then ok "$key"; else alert "$key" "$message"; fi
}

cert_valid() { openssl x509 -checkend $((14 * 86400)) -noout -in "$1"; }
disk_ok() { [ "$(df --output=pcent "$NOROSET_HOME" | tail -1 | tr -dc 0-9)" -lt 80 ]; }
backup_fresh() { [ -n "$(find -L "$NOROSET_HOME/backups/db/latest.dump" -mmin -1560 2>/dev/null)" ]; }

check api 'API از کار افتاده است' curl -fsS -m 5 http://127.0.0.1:3001/health
check web 'وب از کار افتاده است' curl -fsS -m 10 -o /dev/null -H 'Host: noroset.com' http://127.0.0.1:3000/
check database 'دیتابیس پاسخ نمی‌دهد' docker exec noroset-postgres pg_isready -q
check storage 'ذخیره‌ساز فایل از کار افتاده است' sh -c 'curl -s -m 5 -o /dev/null http://127.0.0.1:8333/'
check disk 'مصرف دیسک از ۸۰ درصد گذشته است' disk_ok
check backup 'بک‌آپ دیتابیس بیش از یک روز قدیمی است' backup_fresh
check cert_main 'گواهی دامنه اصلی تا ۱۴ روز دیگر منقضی می‌شود' cert_valid /etc/nginx/ssl/noroset.com/fullchain.pem
check cert_short 'گواهی دامنه کوتاه تا ۱۴ روز دیگر منقضی می‌شود' cert_valid /etc/nginx/ssl/n8l.ir/fullchain.pem
