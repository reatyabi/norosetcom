import { Injectable } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import type { IpHasher } from '@noroset/core';
import { getIpHashSecret } from '../config/secrets';

/** پیاده‌سازی IpHasher (توکن IP_HASHER): HMAC-SHA256 با IP_HASH_SECRET؛ خود IP ذخیره نمی‌شود. */
@Injectable()
export class IpHashService implements IpHasher {
  private readonly secret = getIpHashSecret();

  hash(ip: string): string {
    return createHmac('sha256', this.secret).update(ip).digest('hex');
  }
}
