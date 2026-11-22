// PM2 در production (docs/launch-blueprint.md). نسخه‌ی جاری از symlink خوانده و env هر دو برنامه از
// shared/.env داده می‌شود؛ Next خودش .env ریشه را نمی‌خواند.
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { parseEnv } = require('node:util');

const ROOT = '/srv/noroset';
const env = { ...parseEnv(readFileSync(join(ROOT, 'shared/.env'), 'utf8')), NODE_ENV: 'production' };

module.exports = {
  apps: [
    {
      name: 'noroset-api',
      cwd: join(ROOT, 'current/apps/api'),
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '500M',
      kill_timeout: 5000,
      merge_logs: true,
      env: { ...env, HOST: '127.0.0.1', PORT: '3001' },
      error_file: join(ROOT, 'logs/api-error.log'),
      out_file: join(ROOT, 'logs/api-out.log'),
      time: true,
    },
    {
      name: 'noroset-web',
      cwd: join(ROOT, 'current/apps/web'),
      script: 'node_modules/next/dist/bin/next',
      // با `-H 127.0.0.1` پشت nginx، Next مسیرهای rewrite را به https://localhost:3000 می‌فرستد و خطای ۵۰۰ می‌دهد.
      // localhost هم loopback است و ipv4first آن را روی 127.0.0.1 نگه می‌دارد، نه ::1.
      node_args: '--dns-result-order=ipv4first',
      args: 'start -H localhost -p 3000',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '700M',
      kill_timeout: 5000,
      merge_logs: true,
      env: { ...env, PORT: '3000' },
      error_file: join(ROOT, 'logs/web-error.log'),
      out_file: join(ROOT, 'logs/web-out.log'),
      time: true,
    },
  ],
};
