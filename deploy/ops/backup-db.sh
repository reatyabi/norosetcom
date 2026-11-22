#!/bin/bash
# بک‌آپ منطقی دیتابیس؛ cron روزانه و پیش از هر migration. هفت نسخه‌ی آخر روی سرور می‌ماند و
# pull-backup.ps1 آخرین نسخه را به ماشین مالک می‌برد.
. "$(dirname "$(readlink -f "$0")")/common.sh"

DIR="$NOROSET_HOME/backups/db"
mkdir -p "$DIR"
umask 077
NAME="noroset-$(date +%Y%m%d-%H%M%S).dump"

docker exec noroset-postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$DIR/$NAME.tmp"
mv "$DIR/$NAME.tmp" "$DIR/$NAME"
ln -sfn "$NAME" "$DIR/latest.dump"
ls -1t "$DIR"/noroset-*.dump | tail -n +8 | xargs -r rm -f
echo "backup: $DIR/$NAME"
