import { and, eq, inArray, sql } from 'drizzle-orm';
import { withSetting, type Db } from './connection';
import { noroformFormVersions, noroformForms, noroformSubmissions } from './noroform.schema';
import { tenants } from './schema';

// مسیر ویژه‌ی اجرای فرم داخلی (docs/architecture.md §۸): مخاطب عضو فعال همان workspace است.
// تراکنش فقط app.internal_form_id را ست می‌کند؛ policy «noroform_forms_internal_select» همان یک فرم
// داخلی را نشان می‌دهد و سپس app.current_tenant از همان ردیف ست می‌شود. draft هرگز خوانده نمی‌شود.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface InternalForm {
  formId: string;
  tenantId: string;
  title: string;
  status: 'published' | 'closed';
  versionId: string;
  versionNumber: number;
  definition: unknown;
}

type ResolvedForm = Pick<InternalForm, 'formId' | 'tenantId' | 'title' | 'status'> & { currentVersionId: string };

async function resolveForm(tx: Db, id: string): Promise<ResolvedForm | null> {
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
        eq(noroformForms.id, id),
        eq(noroformForms.channel, 'internal'),
        inArray(noroformForms.status, ['published', 'closed']),
        eq(tenants.status, 'active'),
      ),
    )
    .limit(1);
  if (!form || !form.currentVersionId || form.status === 'draft') return null;

  await tx.execute(sql`SELECT set_config('app.current_tenant', ${form.tenantId}, true)`);
  return { ...form, status: form.status, currentVersionId: form.currentVersionId };
}

/** فرم داخلی منتشرشده/بسته با این شناسه؛ برای draft/ناموجود/tenant معلق ← null. */
export async function findInternalForm(id: string): Promise<InternalForm | null> {
  if (!UUID.test(id)) return null;
  return withSetting('app.internal_form_id', id, async (tx) => {
    const form = await resolveForm(tx, id);
    if (!form) return null;
    const [version] = await tx
      .select({
        id: noroformFormVersions.id,
        versionNumber: noroformFormVersions.versionNumber,
        definition: noroformFormVersions.definition,
      })
      .from(noroformFormVersions)
      .where(and(eq(noroformFormVersions.id, form.currentVersionId), eq(noroformFormVersions.formId, form.formId)))
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

export interface InternalSubmissionInput {
  formId: string;
  versionId: string;
  answers: Record<string, unknown>;
  idempotencyKey: string;
  submittedBy: string;
  ipHash?: string | null;
}

export type InternalSubmissionResult =
  | { status: 'created'; submissionId: string }
  | { status: 'duplicate'; submissionId: string }
  | { status: 'not_found' }
  | { status: 'closed' }
  | { status: 'invalid_version' };

/**
 * ثبت پاسخ داخلی؛ فقط برای فرم internal و published. idempotency_key تکراری همان پاسخ قبلی را برمی‌گرداند.
 * اعتبارسنجی answers (field-engine) پیش از این تابع در API انجام می‌شود.
 */
export async function insertInternalSubmission(input: InternalSubmissionInput): Promise<InternalSubmissionResult> {
  if (!UUID.test(input.formId) || !UUID.test(input.versionId)) return { status: 'invalid_version' };
  return withSetting('app.internal_form_id', input.formId, async (tx) => {
    const form = await resolveForm(tx, input.formId);
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
        submittedBy: input.submittedBy,
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
