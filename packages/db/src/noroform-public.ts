import { and, eq, inArray, sql } from 'drizzle-orm';
import { withSetting, type Db } from './connection';
import { noroformFormVersions, noroformForms, noroformSubmissions } from './noroform.schema';
import { tenants } from './schema';

// مسیر ویژه، کوچک و جدای فرم عمومی (docs/architecture.md §8.2). مخاطب ناشناس است:
// 1) تراکنش فقط app.public_form_slug را ست می‌کند؛ policy «noroform_forms_public_select» فقط همان یک
//    فرم published/closed را نشان می‌دهد (draft هرگز). ستون draft_definition هرگز خوانده نمی‌شود.
// 2) tenant از همان ردیف پیدا و app.current_tenant در همان تراکنش ست می‌شود.
// 3) فقط نسخه‌ی منتشرشده‌ی جاری خوانده و فقط پاسخ INSERT می‌شود.

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PublicForm {
  formId: string;
  tenantId: string;
  title: string;
  status: 'published' | 'closed';
  versionId: string;
  versionNumber: number;
  /** definition نسخه‌ی منتشرشده (نه پیش‌نویس). */
  definition: unknown;
}

type ResolvedForm = Pick<PublicForm, 'formId' | 'tenantId' | 'title' | 'status'> & { currentVersionId: string };

function isValidSlug(slug: string): boolean {
  return slug.length >= 2 && slug.length <= 64 && SLUG.test(slug);
}

/** فرم published/closed با این slug (tenant فعال) را پیدا و tenant را برای ادامه‌ی تراکنش ست می‌کند. */
async function resolveForm(tx: Db, slug: string): Promise<ResolvedForm | null> {
  const [form] = await tx
    .select({
      formId: noroformForms.id,
      tenantId: noroformForms.tenantId,
      title: noroformForms.title,
      status: noroformForms.status,
      currentVersionId: noroformForms.currentVersionId,
    })
    .from(noroformForms)
    .innerJoin(tenants, eq(tenants.id, noroformForms.tenantId))
    .where(
      and(
        eq(noroformForms.slug, slug),
        eq(noroformForms.channel, 'external'),
        inArray(noroformForms.status, ['published', 'closed']),
        eq(tenants.status, 'active'),
      ),
    )
    .limit(1);
  if (!form || !form.currentVersionId || form.status === 'draft') return null;

  await tx.execute(sql`SELECT set_config('app.current_tenant', ${form.tenantId}, true)`);
  return { ...form, status: form.status, currentVersionId: form.currentVersionId };
}

/**
 * فرم عمومی با نسخه‌ی منتشرشده‌ی جاری؛ برای draft/ناموجود/tenant معلق ← null.
 * با `versionId` همان نسخه (فقط اگر متعلق به همین فرم باشد) برمی‌گردد — برای validate پاسخی که
 * با نسخه‌ی قبلی پر شده و فرم در این فاصله دوباره منتشر شده است.
 */
export async function findPublicForm(slug: string, options: { versionId?: string } = {}): Promise<PublicForm | null> {
  if (!isValidSlug(slug)) return null;
  if (options.versionId !== undefined && !UUID.test(options.versionId)) return null;
  return withSetting('app.public_form_slug', slug, async (tx) => {
    const form = await resolveForm(tx, slug);
    if (!form) return null;
    const versionId = options.versionId ?? form.currentVersionId;
    const [version] = await tx
      .select({
        id: noroformFormVersions.id,
        versionNumber: noroformFormVersions.versionNumber,
        definition: noroformFormVersions.definition,
      })
      .from(noroformFormVersions)
      .where(and(eq(noroformFormVersions.id, versionId), eq(noroformFormVersions.formId, form.formId)))
      .limit(1);
    if (!version) return null;
    return {
      formId: form.formId,
      tenantId: form.tenantId,
      title: form.title,
      status: form.status,
      versionId: version.id,
      versionNumber: version.versionNumber,
      definition: version.definition,
    };
  });
}

export interface PublicSubmissionInput {
  slug: string;
  /** نسخه‌ای که answers با آن validate شده (باید متعلق به همین فرم باشد). */
  versionId: string;
  /** خروجی validateSubmission از field-engine. */
  answers: Record<string, unknown>;
  idempotencyKey: string;
  ipHash?: string | null;
}

export type PublicSubmissionResult =
  | { status: 'created'; submissionId: string }
  | { status: 'duplicate'; submissionId: string }
  | { status: 'not_found' }
  | { status: 'closed' }
  | { status: 'invalid_version' };

/**
 * ثبت پاسخ عمومی؛ فقط برای فرم published. idempotency_key تکراری همان پاسخ قبلی را برمی‌گرداند.
 * اعتبارسنجی answers (field-engine) پیش از این تابع در API انجام می‌شود.
 */
export async function insertPublicSubmission(input: PublicSubmissionInput): Promise<PublicSubmissionResult> {
  if (!isValidSlug(input.slug)) return { status: 'not_found' };
  if (!UUID.test(input.versionId)) return { status: 'invalid_version' };
  return withSetting('app.public_form_slug', input.slug, async (tx) => {
    const form = await resolveForm(tx, input.slug);
    if (!form) return { status: 'not_found' };
    if (form.status !== 'published') return { status: 'closed' };

    const [version] = await tx
      .select({ id: noroformFormVersions.id })
      .from(noroformFormVersions)
      .where(and(eq(noroformFormVersions.id, input.versionId), eq(noroformFormVersions.formId, form.formId)))
      .limit(1);
    if (!version) return { status: 'invalid_version' };

    const [created] = await tx
      .insert(noroformSubmissions)
      .values({
        tenantId: form.tenantId,
        formId: form.formId,
        versionId: version.id,
        answers: input.answers,
        idempotencyKey: input.idempotencyKey,
        ipHash: input.ipHash ?? null,
      })
      .onConflictDoNothing({ target: [noroformSubmissions.formId, noroformSubmissions.idempotencyKey] })
      .returning({ id: noroformSubmissions.id });
    if (created) return { status: 'created', submissionId: created.id };

    const [existing] = await tx
      .select({ id: noroformSubmissions.id })
      .from(noroformSubmissions)
      .where(
        and(eq(noroformSubmissions.formId, form.formId), eq(noroformSubmissions.idempotencyKey, input.idempotencyKey)),
      )
      .limit(1);
    if (!existing) throw new Error('idempotency conflict without existing submission');
    return { status: 'duplicate', submissionId: existing.id };
  });
}
