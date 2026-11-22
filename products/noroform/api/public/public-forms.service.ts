import {
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  findPublicForm,
  insertPublicSubmission,
  IP_HASHER,
  PLAN_RESOLVER,
  productPlan,
  RATE_LIMITER,
  type IpHasher,
  type PlanResolver,
  type RateLimiter,
} from '@noroset/core';
import { validateSubmission, type FormDefinition, type SubmissionError } from '@noroset/field-engine';
import type { SubmitAnswersDto } from './dto';

// API فرم عمومی (docs/architecture.md §8.2). مخاطب ناشناس است؛ دسترسی به DB فقط از مسیر ویژه‌ی
// @noroset/db (findPublicForm / insertPublicSubmission): فقط نسخه‌ی منتشرشده و فقط INSERT پاسخ.

export const PUBLIC_RATE_LIMITS = {
  read: { limit: 120, windowMs: 60 * 1000 },
  submit: { limit: 10, windowMs: 10 * 60 * 1000 },
} as const;


export type PublicFormView =
  | {
      status: 'published';
      slug: string;
      title: string;
      versionId: string;
      definition: FormDefinition;
      branding: { forceLicense: boolean };
    }
  | { status: 'closed'; slug: string; title: string; closedMessage: string };

/**
 * تعریف نسخه هنگام انتشار با validateDefinition بررسی و نرمال شده و immutable است؛
 * پس اینجا دوباره validate نمی‌شود (تغییر قواعد آینده نباید فرم‌های منتشرشده را بشکند).
 */
function publishedDefinition(definition: unknown): FormDefinition {
  return definition as FormDefinition;
}

@Injectable()
export class PublicFormsService {
  constructor(
    @Inject(RATE_LIMITER) private readonly rateLimiter: RateLimiter,
    @Inject(IP_HASHER) private readonly ipHasher: IpHasher,
    @Inject(PLAN_RESOLVER) private readonly plans: PlanResolver,
  ) {}

  async read(slug: string, ip: string | undefined): Promise<PublicFormView> {
    this.limit(`noroform_public_read:ip:${ip ?? 'unknown'}`, PUBLIC_RATE_LIMITS.read);
    const form = await findPublicForm(slug);
    if (!form) throw new NotFoundException();
    const definition = publishedDefinition(form.definition);
    if (form.status === 'closed') {
      return { status: 'closed', slug, title: form.title, closedMessage: definition.settings?.closed_message ?? '' };
    }
    return {
      status: 'published',
      slug,
      title: form.title,
      versionId: form.versionId,
      definition,
      // نشان نوروفرم مگر پلن دامنه‌ی نوروفرم حذف برندینگ داشته باشد (docs/architecture.md §9.11).
      branding: { forceLicense: !productPlan(await this.plans.resolve(form.tenantId), 'noroform').entitlements['branding.remove'] },
    };
  }

  /** پاسخ موفق، تکراری (همان idempotencyKey) و honeypot همگی `{ ok: true }` می‌گیرند. */
  async submit(slug: string, dto: SubmitAnswersDto, ip: string | undefined): Promise<{ ok: true }> {
    this.limit(`noroform_submit:ip:${ip ?? 'unknown'}`, PUBLIC_RATE_LIMITS.submit);
    if (dto.website && dto.website.trim() !== '') return { ok: true };

    const form = await findPublicForm(slug, { versionId: dto.versionId });
    if (!form) {
      // فرم هست ولی این نسخه مال آن نیست ← 409؛ وگرنه 404.
      if (await findPublicForm(slug)) throw new ConflictException('version_not_found');
      throw new NotFoundException();
    }
    if (form.status !== 'published') throw new ConflictException('form_closed');

    const result = validateSubmission(publishedDefinition(form.definition), dto.answers);
    if (!result.ok) {
      const errors: SubmissionError[] = result.errors;
      throw new UnprocessableEntityException({ message: 'invalid_answers', errors });
    }

    const saved = await insertPublicSubmission({
      slug,
      versionId: form.versionId,
      answers: result.answers,
      idempotencyKey: dto.idempotencyKey,
      ipHash: ip ? this.ipHasher.hash(ip) : null,
    });
    switch (saved.status) {
      case 'created':
      case 'duplicate':
        return { ok: true };
      case 'closed':
        throw new ConflictException('form_closed');
      case 'invalid_version':
        throw new ConflictException('version_not_found');
      case 'not_found':
        throw new NotFoundException();
    }
  }

  private limit(key: string, rule: { limit: number; windowMs: number }): void {
    if (!this.rateLimiter.consume(key, rule.limit, rule.windowMs)) {
      throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}
