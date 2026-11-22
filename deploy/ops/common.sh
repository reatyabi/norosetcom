#!/bin/bash
# مشترک اسکریپت‌های سرور: مسیرها و env.
set -euo pipefail

export NOROSET_HOME=/srv/noroset
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"

set -a
# shellcheck disable=SC1091
. "$NOROSET_HOME/shared/.env"
set +a
