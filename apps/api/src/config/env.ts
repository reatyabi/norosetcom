import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { assertSecureSecrets } from './secrets';

function loadEnv(): void {
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const candidate = resolve(dir, '.env');
    if (existsSync(candidate)) {
      config({ path: candidate });
      return;
    }
    dir = resolve(dir, '..');
  }
}

// side effect: بارگذاری .env ریشه قبل از هر import دیگری که به env نیاز دارد.
loadEnv();
// در production با secret ناامن، بوت همین‌جا (پیش از ساخت AppModule) متوقف می‌شود.
assertSecureSecrets();
