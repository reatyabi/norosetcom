import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { RateLimiter } from '@noroset/core';

/** درون‌حافظه (بدهی فنی: قبل از لانچ به ذخیره‌سازی مشترک؛ docs/tech-debt.md). */
@Injectable()
export class RateLimitService implements RateLimiter {
  private readonly buckets = new Map<string, number[]>();

  consume(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const arr = (this.buckets.get(key) ?? []).filter((t) => now - t < windowMs);
    if (arr.length >= limit) {
      this.buckets.set(key, arr);
      return false;
    }
    arr.push(now);
    this.buckets.set(key, arr);
    return true;
  }

  check(key: string, limit: number, windowMs: number): void {
    if (!this.consume(key, limit, windowMs)) {
      throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}
