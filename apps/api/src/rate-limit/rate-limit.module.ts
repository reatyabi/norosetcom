import { Global, Module } from '@nestjs/common';
import { RATE_LIMITER } from '@noroset/core';
import { RateLimitService } from './rate-limit.service';

@Global()
@Module({
  providers: [RateLimitService, { provide: RATE_LIMITER, useExisting: RateLimitService }],
  exports: [RateLimitService, RATE_LIMITER],
})
export class RateLimitModule {}
