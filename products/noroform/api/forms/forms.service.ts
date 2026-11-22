import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomInt } from 'node:crypto';
import {
  and,
  count,
  desc,
  eq,
  noroformFormVersions,
  noroformForms,
  platformUsers,
  reservedSlugs,
  revokeResponseLinksForForm,
  sql,
  PLAN_RESOLVER,
  productPlan,
  TENANT_CONTEXT,
  type PlanResolver,
  type Db,
  type TenantContext,
} from '@noroset/core';
import { formPreview, generateId, LIMITS, validateDefinition, type DefinitionIssue, type FormPreview } from '@noroset/field-engine';
import type { CreateFormDto, UpdateFormDto } from './dto';

export type FormStatus = 'draft' | 'published' | 'closed';
export type FormChannel = 'internal' | 'external';
export type ResponseAccess = 'internal' | 'external';
export type ResponseAuth = 'link' | 'key' | 'otp';

export interface FormSummary {
  id: string;
  title: string;
  slug: string;
  status: FormStatus;
  /** محل اجرای فرم: internal (پنل) یا external (n8f). */
  channel: FormChannel;
  /** دسترسی پیش‌فرض پاسخ‌ها؛ external یعنی لینک مشاهده‌ی پاسخ مجاز است. */
  responseAccess: ResponseAccess;
  /** روش احراز لینک پاسخ؛ تا انتخاب مالک null است. */
  responseAuth: ResponseAuth | null;
  responseAccessTtlDays: number;
  currentVersionNumber: number | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  /** سازنده (فیلتر «مالک»)؛ فرم‌های قدیمی‌تر ← null. */
  createdBy: string | null;
  createdByName: string | null;
}

/** ردیف فهرست: خلاصه + داده‌ی تصویر بندانگشتی از پیش‌نویس. */
export interface FormListItem extends FormSummary {
  preview: FormPreview;
}

export interface FormDetail extends FormSummary {
  draftDefinition: unknown;
  /** مشکلات پیش‌نویس (خالی = قابل انتشار). */
  issues: DefinitionIssue[];
}

const SLUG_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const RANDOM_SLUG_LENGTH = 10;
const SLUG_ATTEMPTS = 5;

/** یک فرم خالی معتبر از نظر ساختار: یک صفحه‌ی main بدون آیتم. */
export function emptyDefinition(random: (max: number) => number = randomInt): Record<string, unknown> {
  return {
    version_schema: 1,
    pages: [{ page_id: generateId('page', random), kind: 'main', title: '', body: { items: [] } }],
  };
}

function randomSlug(): string {
  let s = '';
  for (let i = 0; i < RANDOM_SLUG_LENGTH; i++) s += SLUG_ALPHABET[randomInt(SLUG_ALPHABET.length)];
  return s;
}

function pgCode(err: unknown): string | undefined {
  const e = err as { code?: string; cause?: { code?: string } };
  return e.code ?? e.cause?.code;
}

function jsonBytes(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value) ?? '', 'utf8');
}

const summaryColumns = {
  id: noroformForms.id,
  title: noroformForms.title,
  slug: noroformForms.slug,
  status: noroformForms.status,
  channel: noroformForms.channel,
  responseAccess: noroformForms.responseAccess,
  responseAuth: noroformForms.responseAuth,
  responseAccessTtlDays: noroformForms.responseAccessTtlDays,
  currentVersionNumber: noroformFormVersions.versionNumber,
  publishedAt: noroformForms.publishedAt,
  createdAt: noroformForms.createdAt,
  updatedAt: noroformForms.updatedAt,
  createdBy: noroformForms.createdBy,
  createdByName: platformUsers.fullName,
};

@Injectable()
export class FormsService {
  constructor(
    @Inject(TENANT_CONTEXT) private readonly ctx: TenantContext,
    @Inject(PLAN_RESOLVER) private readonly plans: PlanResolver,
  ) {}

  async list(): Promise<FormListItem[]> {
    const rows = await this.ctx.run((tx) =>
      tx
        .select({ ...summaryColumns, draftDefinition: noroformForms.draftDefinition })
        .from(noroformForms)
        .leftJoin(noroformFormVersions, eq(noroformFormVersions.id, noroformForms.currentVersionId))
        .leftJoin(platformUsers, eq(platformUsers.id, noroformForms.createdBy))
        .orderBy(desc(noroformForms.createdAt)),
    );
    return rows.map(({ draftDefinition, ...row }) => ({ ...row, createdByName: row.createdByName || null, preview: formPreview(draftDefinition) }));
  }

  get(id: string): Promise<FormDetail> {
    return this.ctx.run((tx) => this.detail(tx, id));
  }

  async create(dto: CreateFormDto): Promise<FormDetail> {
    // پیش‌نویس آغازین (قالب) مثل PATCH فقط از نظر اندازه بررسی می‌شود؛ اعتبارسنجی کامل هنگام انتشار.
    if (dto.draftDefinition !== undefined && jsonBytes(dto.draftDefinition) > LIMITS.maxDefinitionBytes) {
      throw new BadRequestException('definition_too_large');
    }
    if (dto.slug) await this.assertNotReserved(dto.slug);
    const tenantId = this.ctx.tenantId();
    // سقف فرم از پلن دامنه‌ی نوروفرم (§9.11)؛ پلن محصول دیگر فرم‌ها را فعال نمی‌کند.
    const maxForms = productPlan(await this.plans.resolve(tenantId), 'noroform').entitlements['noroform.forms'];
    const attempts = dto.slug ? 1 : SLUG_ATTEMPTS;
    for (let i = 0; i < attempts; i++) {
      const slug = dto.slug ?? randomSlug();
      try {
        return await this.ctx.run(async (tx) => {
          // سقف پلن (docs/architecture.md §9.11)؛ قفل tenant تا دو ساخت هم‌زمان از سقف رد نشوند.
          await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${'noroform_forms:' + tenantId}))`);
          const [existing] = await tx.select({ n: count() }).from(noroformForms);
          if (Number(existing?.n ?? 0) >= maxForms) throw new ForbiddenException({ message: 'plan_limit', limit: 'noroform.forms' });
          const [form] = await tx
            .insert(noroformForms)
            .values({
              tenantId,
              title: dto.title,
              slug,
              channel: dto.channel ?? 'external',
              responseAccess: dto.responseAccess ?? 'external',
              responseAuth: dto.responseAuth ?? null,
              responseAccessTtlDays: dto.responseAccessTtlDays ?? 90,
              draftDefinition: dto.draftDefinition ?? emptyDefinition(),
              createdBy: this.ctx.userId(),
            })
            .returning({ id: noroformForms.id });
          return this.detail(tx, form!.id);
        });
      } catch (err) {
        if (pgCode(err) !== '23505') throw err;
        if (dto.slug) throw new ConflictException('slug_taken');
      }
    }
    throw new ConflictException('slug_generation_failed');
  }

  async update(id: string, dto: UpdateFormDto): Promise<FormDetail> {
    if (dto.draftDefinition !== undefined && jsonBytes(dto.draftDefinition) > LIMITS.maxDefinitionBytes) {
      throw new BadRequestException('definition_too_large');
    }
    if (dto.slug) await this.assertNotReserved(dto.slug);
    try {
      let revokeLinks = false;
      const result = await this.ctx.run(async (tx) => {
        const [current] = await tx
          .select({
            channel: noroformForms.channel,
            responseAccess: noroformForms.responseAccess,
            currentVersionId: noroformForms.currentVersionId,
          })
          .from(noroformForms)
          .where(eq(noroformForms.id, id))
          .limit(1);
        if (!current) throw new NotFoundException();
        if (dto.channel && dto.channel !== current.channel && current.currentVersionId) {
          throw new ConflictException('channel_locked');
        }

        const patch: Partial<typeof noroformForms.$inferInsert> = { updatedAt: new Date() };
        if (dto.title !== undefined) patch.title = dto.title;
        if (dto.slug !== undefined) patch.slug = dto.slug;
        if (dto.channel !== undefined) patch.channel = dto.channel;
        if (dto.responseAccess !== undefined) {
          patch.responseAccess = dto.responseAccess;
          if (dto.responseAccess === 'internal') {
            patch.responseAuth = null;
            revokeLinks = current.responseAccess !== 'internal';
          }
        }
        if (dto.responseAuth !== undefined && dto.responseAccess !== 'internal') patch.responseAuth = dto.responseAuth;
        if (dto.responseAccessTtlDays !== undefined) patch.responseAccessTtlDays = dto.responseAccessTtlDays;
        if (dto.draftDefinition !== undefined) patch.draftDefinition = dto.draftDefinition;
        const updated = await tx
          .update(noroformForms)
          .set(patch)
          .where(eq(noroformForms.id, id))
          .returning({ id: noroformForms.id });
        if (!updated[0]) throw new NotFoundException();
        return this.detail(tx, id);
      });
      if (revokeLinks) await revokeResponseLinksForForm(this.ctx.tenantId(), id);
      return result;
    } catch (err) {
      if (pgCode(err) === '23505') throw new ConflictException('slug_taken');
      throw err;
    }
  }

  /** پیش‌نویس را کامل validate و یک نسخه‌ی immutable جدید منتشر می‌کند. */
  publish(id: string): Promise<FormDetail> {
    return this.ctx.run(async (tx) => {
      // قفل ردیف فرم تا شماره‌ی نسخه در انتشار هم‌زمان تکراری نشود.
      const [form] = await tx
        .select({ id: noroformForms.id, tenantId: noroformForms.tenantId, draft: noroformForms.draftDefinition })
        .from(noroformForms)
        .where(eq(noroformForms.id, id))
        .for('update');
      if (!form) throw new NotFoundException();

      const result = validateDefinition(form.draft);
      if (!result.ok) {
        throw new UnprocessableEntityException({ message: 'invalid_definition', issues: result.issues });
      }

      const [{ next } = { next: 1 }] = await tx
        .select({ next: sql<number>`coalesce(max(${noroformFormVersions.versionNumber}), 0)::int + 1` })
        .from(noroformFormVersions)
        .where(eq(noroformFormVersions.formId, id));
      const [version] = await tx
        .insert(noroformFormVersions)
        .values({ tenantId: form.tenantId, formId: id, versionNumber: next, definition: result.definition })
        .returning({ id: noroformFormVersions.id });
      const now = new Date();
      await tx
        .update(noroformForms)
        .set({ status: 'published', currentVersionId: version!.id, publishedAt: now, updatedAt: now })
        .where(eq(noroformForms.id, id));
      return this.detail(tx, id);
    });
  }

  close(id: string): Promise<FormDetail> {
    return this.transition(id, 'published', 'closed');
  }

  /** بازکردن فرم بسته با همان نسخه‌ی جاری (بدون انتشار دوباره). */
  reopen(id: string): Promise<FormDetail> {
    return this.transition(id, 'closed', 'published');
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.ctx.run((tx) =>
      tx.delete(noroformForms).where(eq(noroformForms.id, id)).returning({ id: noroformForms.id }),
    );
    if (!deleted[0]) throw new NotFoundException();
  }

  private transition(id: string, from: FormStatus, to: FormStatus): Promise<FormDetail> {
    return this.ctx.run(async (tx) => {
      const updated = await tx
        .update(noroformForms)
        .set({ status: to, updatedAt: new Date() })
        .where(and(eq(noroformForms.id, id), eq(noroformForms.status, from)))
        .returning({ id: noroformForms.id });
      if (!updated[0]) {
        await this.detail(tx, id); // 404 اگر نیست
        throw new ConflictException(`form_not_${from}`);
      }
      return this.detail(tx, id);
    });
  }

  private async detail(tx: Db, id: string): Promise<FormDetail> {
    const [row] = await tx
      .select({ ...summaryColumns, draftDefinition: noroformForms.draftDefinition })
      .from(noroformForms)
      .leftJoin(noroformFormVersions, eq(noroformFormVersions.id, noroformForms.currentVersionId))
      .leftJoin(platformUsers, eq(platformUsers.id, noroformForms.createdBy))
      .where(eq(noroformForms.id, id))
      .limit(1);
    if (!row) throw new NotFoundException();
    const result = validateDefinition(row.draftDefinition);
    return { ...row, createdByName: row.createdByName || null, issues: result.ok ? [] : result.issues };
  }

  /** slug رزرو را قبل از insert با خطای خوانا رد می‌کند (trigger دیتابیس لایه‌ی دوم است). */
  private async assertNotReserved(slug: string): Promise<void> {
    const reserved = await this.ctx.run((tx) =>
      tx.select().from(reservedSlugs).where(eq(reservedSlugs.slug, slug)).limit(1),
    );
    if (reserved[0]) throw new ConflictException('slug_reserved');
  }
}
