import { BadRequestException, GoneException, HttpException, HttpStatus, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { createHash, createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import {
  and,
  desc,
  eq,
  findResponseForLink,
  findResponseLink,
  isNull,
  normalizeIranianMobile,
  noroformResponseOtpCodes,
  RATE_LIMITER,
  SMS_PROVIDER,
  verifyPassword,
  withTenant,
  type RateLimiter,
  type SmsProvider,
} from '@noroset/core';
import type { FormDefinition, JsonValue } from '@noroset/field-engine';
import { fieldsOf, formatValue } from '../submissions/columns';
import { signResponseSession, verifyResponseSession } from './response-session';

export const PUBLIC_RESPONSE_RATE_LIMIT = { limit: 60, windowMs: 60 * 1000 } as const;

/** توکن ۳۲ بایتی base64url؛ الگوی دقیق تا ورودی نامعتبر به DB نرسد. */
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
const OTP_TTL_MS = 2 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

function hashOtp(code: string, mobile: string): string {
  const pepper = process.env.OTP_PEPPER ?? 'dev-otp-pepper';
  return createHmac('sha256', pepper).update(`${code}:${mobile}`).digest('hex');
}

export interface PublicResponseView {
  formTitle: string;
  submittedAt: string;
  versionNumber: number;
  fields: Array<{ fieldId: string; label: string; type: string; value: string }>;
}

@Injectable()
export class PublicResponsesService {
  constructor(
    @Inject(RATE_LIMITER) private readonly rateLimiter: RateLimiter,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
  ) {}

  async read(token: string, ip: string | undefined, session?: string): Promise<PublicResponseView> {
    if (!this.rateLimiter.consume(`noroform_public_response:ip:${ip ?? 'unknown'}`, PUBLIC_RESPONSE_RATE_LIMIT.limit, PUBLIC_RESPONSE_RATE_LIMIT.windowMs)) {
      throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (!TOKEN.test(token)) throw new NotFoundException();

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const link = await findResponseLink(tokenHash);
    if (!link) throw new NotFoundException();
    if (link.expiresAt && link.expiresAt <= new Date()) throw new GoneException('response_link_expired');
    if (link.authMode !== 'link' && !verifyResponseSession(session, link.id, tokenHash)) {
      throw new UnauthorizedException({ message: 'response_auth_required', authMode: link.authMode });
    }

    const response = await findResponseForLink(link);
    if (!response) throw new NotFoundException();

    const definition = response.definition as FormDefinition;
    const answers = response.answers;
    return {
      formTitle: response.title,
      submittedAt: response.submittedAt.toISOString(),
      versionNumber: response.versionNumber,
      fields: fieldsOf(definition).map((field) => ({
        fieldId: field.fieldId,
        label: field.label,
        type: field.type,
        value: formatValue(field, answers[field.fieldId] as JsonValue | undefined),
      })),
    };
  }

  /** بازکردن لینک کلیددار؛ توکن نشست ۳۰ دقیقه‌ای برمی‌گرداند. */
  async unlockKey(token: string, key: string, ip: string | undefined): Promise<string> {
    if (!this.rateLimiter.consume(`noroform_response_unlock:ip:${ip ?? 'unknown'}`, 10, 10 * 60 * 1000)) {
      throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (!TOKEN.test(token)) throw new NotFoundException();
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const link = await findResponseLink(tokenHash);
    if (!link || link.authMode !== 'key' || !link.keyHash) throw new NotFoundException();
    if (link.expiresAt && link.expiresAt <= new Date()) throw new GoneException('response_link_expired');
    if (!(await verifyPassword(key, link.keyHash))) throw new UnauthorizedException('invalid_access_key');
    return signResponseSession(link.id, tokenHash);
  }

  /** ارسال OTP به موبایل واردشده؛ کد فقط hash می‌شود. */
  async requestOtp(token: string, mobileInput: string, ip: string | undefined): Promise<{ ok: true; expiresInSeconds: number }> {
    if (!this.rateLimiter.consume(`noroform_response_otp:ip:${ip ?? 'unknown'}`, 10, 10 * 60 * 1000)) {
      throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
    }
    const mobile = normalizeIranianMobile(mobileInput);
    if (!mobile) throw new BadRequestException('invalid_mobile');
    if (!TOKEN.test(token)) throw new NotFoundException();
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const link = await findResponseLink(tokenHash);
    if (!link || link.authMode !== 'otp') throw new NotFoundException();
    if (link.expiresAt && link.expiresAt <= new Date()) throw new GoneException('response_link_expired');

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const codeHash = hashOtp(code, mobile);
    await withTenant(link.tenantId, async (tx) => {
      await tx
        .update(noroformResponseOtpCodes)
        .set({ consumedAt: new Date() })
        .where(and(eq(noroformResponseOtpCodes.linkId, link.id), isNull(noroformResponseOtpCodes.consumedAt)));
      await tx.insert(noroformResponseOtpCodes).values({
        tenantId: link.tenantId,
        linkId: link.id,
        mobile,
        codeHash,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      });
    });
    await this.sms.sendOtp(mobile, code);
    return { ok: true, expiresInSeconds: OTP_TTL_MS / 1000 };
  }

  /** تأیید OTP و برگرداندن نشست ۳۰ دقیقه‌ای همان پاسخ. */
  async verifyOtp(token: string, mobileInput: string, code: string, ip: string | undefined): Promise<string> {
    if (!this.rateLimiter.consume(`noroform_response_otp_verify:ip:${ip ?? 'unknown'}`, 10, 10 * 60 * 1000)) {
      throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
    }
    const mobile = normalizeIranianMobile(mobileInput);
    if (!mobile) throw new BadRequestException('invalid_mobile');
    if (!TOKEN.test(token)) throw new NotFoundException();
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const link = await findResponseLink(tokenHash);
    if (!link || link.authMode !== 'otp') throw new NotFoundException();
    if (link.expiresAt && link.expiresAt <= new Date()) throw new GoneException('response_link_expired');

    const row = await withTenant(link.tenantId, async (tx) => {
      const rows = await tx
        .select()
        .from(noroformResponseOtpCodes)
        .where(
          and(
            eq(noroformResponseOtpCodes.linkId, link.id),
            eq(noroformResponseOtpCodes.mobile, mobile),
            isNull(noroformResponseOtpCodes.consumedAt),
          ),
        )
        .orderBy(desc(noroformResponseOtpCodes.createdAt))
        .limit(1);
      return rows[0] ?? null;
    });
    if (!row) throw new UnauthorizedException('invalid_otp');
    if (row.expiresAt <= new Date()) throw new GoneException('otp_expired');
    if (row.attempts >= OTP_MAX_ATTEMPTS) throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);

    const expected = Buffer.from(row.codeHash, 'hex');
    const actual = Buffer.from(hashOtp(code.trim(), mobile), 'hex');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      await withTenant(link.tenantId, (tx) =>
        tx
          .update(noroformResponseOtpCodes)
          .set({ attempts: row.attempts + 1 })
          .where(eq(noroformResponseOtpCodes.id, row.id)),
      );
      throw new UnauthorizedException('invalid_otp');
    }
    await withTenant(link.tenantId, (tx) =>
      tx.update(noroformResponseOtpCodes).set({ consumedAt: new Date() }).where(eq(noroformResponseOtpCodes.id, row.id)),
    );
    return signResponseSession(link.id, tokenHash);
  }
}
