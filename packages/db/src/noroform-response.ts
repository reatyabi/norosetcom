import { and, eq, inArray, isNull } from 'drizzle-orm';
import { withSetting, withTenant } from './connection';
import { noroformFormVersions, noroformForms, noroformResponseLinks, noroformSubmissions } from './noroform.schema';
import { tenants } from './schema';

// مسیر بیرونی پاسخ (docs/routes.md): پاسخ‌ها همیشه در پنل دیده می‌شوند؛ این مسیر فقط یک
// «دریچه‌ی مشاهده‌ی همان یک پاسخ» با توکن تصادفی است. توکن خام هرگز ذخیره نمی‌شود.

const TOKEN_HASH = /^[a-f0-9]{64}$/;

export interface ResponseLink {
  id: string;
  tenantId: string;
  submissionId: string;
  authMode: 'link' | 'key' | 'otp';
  keyHash: string | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface CreateResponseLinkInput {
  tenantId: string;
  formId: string;
  submissionId: string;
  tokenHash: string;
  authMode: 'link' | 'key' | 'otp';
  keyHash: string | null;
  expiresAt: Date | null;
  createdBy: string | null;
}

/** لینک تازه می‌سازد و لینک‌های فعال قبلی همان پاسخ را باطل می‌کند؛ پاسخ ناموجود ← null. */
export async function createResponseLink(input: CreateResponseLinkInput): Promise<ResponseLink | null> {
  if (!TOKEN_HASH.test(input.tokenHash)) return null;
  return withTenant(input.tenantId, async (tx) => {
    const [submission] = await tx
      .select({ id: noroformSubmissions.id })
      .from(noroformSubmissions)
      .where(
        and(
          eq(noroformSubmissions.id, input.submissionId),
          eq(noroformSubmissions.formId, input.formId),
          eq(noroformSubmissions.tenantId, input.tenantId),
        ),
      )
      .limit(1);
    if (!submission) return null;

    const now = new Date();
    await tx
      .update(noroformResponseLinks)
      .set({ revokedAt: now })
      .where(
        and(
          eq(noroformResponseLinks.submissionId, input.submissionId),
          eq(noroformResponseLinks.tenantId, input.tenantId),
          isNull(noroformResponseLinks.revokedAt),
        ),
      );

    const [row] = await tx
      .insert(noroformResponseLinks)
      .values({
        tenantId: input.tenantId,
        submissionId: input.submissionId,
        tokenHash: input.tokenHash,
        authMode: input.authMode,
        keyHash: input.keyHash,
        expiresAt: input.expiresAt,
        createdBy: input.createdBy,
      })
      .returning({
        id: noroformResponseLinks.id,
        tenantId: noroformResponseLinks.tenantId,
        submissionId: noroformResponseLinks.submissionId,
        authMode: noroformResponseLinks.authMode,
        keyHash: noroformResponseLinks.keyHash,
        expiresAt: noroformResponseLinks.expiresAt,
        revokedAt: noroformResponseLinks.revokedAt,
        createdAt: noroformResponseLinks.createdAt,
      });
    return row ?? null;
  });
}

/** همه‌ی لینک‌های فعال پاسخ را باطل می‌کند (پاسخ ناموجود هم بی‌اثر است). */
export async function revokeResponseLinks(tenantId: string, formId: string, submissionId: string): Promise<void> {
  await withTenant(tenantId, async (tx) => {
    const [submission] = await tx
      .select({ id: noroformSubmissions.id })
      .from(noroformSubmissions)
      .where(
        and(
          eq(noroformSubmissions.id, submissionId),
          eq(noroformSubmissions.formId, formId),
          eq(noroformSubmissions.tenantId, tenantId),
        ),
      )
      .limit(1);
    if (!submission) return;
    await tx
      .update(noroformResponseLinks)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(noroformResponseLinks.submissionId, submissionId),
          eq(noroformResponseLinks.tenantId, tenantId),
          isNull(noroformResponseLinks.revokedAt),
        ),
      );
  });
}

/** لینک فعال با همین hash توکن؛ فقط در تراکنشی که `app.response_link_token` ست شده دیده می‌شود. */
export async function findResponseLink(tokenHash: string): Promise<ResponseLink | null> {
  if (!TOKEN_HASH.test(tokenHash)) return null;
  return withSetting('app.response_link_token', tokenHash, async (tx) => {
    const [row] = await tx
      .select({
        id: noroformResponseLinks.id,
        tenantId: noroformResponseLinks.tenantId,
        submissionId: noroformResponseLinks.submissionId,
        authMode: noroformResponseLinks.authMode,
        keyHash: noroformResponseLinks.keyHash,
        expiresAt: noroformResponseLinks.expiresAt,
        revokedAt: noroformResponseLinks.revokedAt,
        createdAt: noroformResponseLinks.createdAt,
      })
      .from(noroformResponseLinks)
      .where(and(eq(noroformResponseLinks.tokenHash, tokenHash), isNull(noroformResponseLinks.revokedAt)))
      .limit(1);
    return row ?? null;
  });
}

/** ابطال همه‌ی لینک‌های فعال همه‌ی پاسخ‌های یک فرم (مثلاً تغییر response_access به internal). */
export async function revokeResponseLinksForForm(tenantId: string, formId: string): Promise<void> {
  await withTenant(tenantId, async (tx) => {
    const submissionIds = tx
      .select({ id: noroformSubmissions.id })
      .from(noroformSubmissions)
      .where(and(eq(noroformSubmissions.tenantId, tenantId), eq(noroformSubmissions.formId, formId)));
    await tx
      .update(noroformResponseLinks)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(noroformResponseLinks.tenantId, tenantId),
          isNull(noroformResponseLinks.revokedAt),
          inArray(noroformResponseLinks.submissionId, submissionIds),
        ),
      );
  });
}

export interface LinkedResponse {
  formId: string;
  title: string;
  submittedAt: Date;
  versionId: string;
  versionNumber: number;
  /** تعریف نسخه‌ی همان پاسخ؛ نسخه‌ها immutable هستند. */
  definition: unknown;
  answers: Record<string, unknown>;
}

/** پاسخ متعلق به همین tenant و همین لینک؛ همیشه در withTenant اجرا می‌شود. */
export async function findResponseForLink(link: ResponseLink): Promise<LinkedResponse | null> {
  return withTenant(link.tenantId, async (tx) => {
    const [row] = await tx
      .select({
        formId: noroformSubmissions.formId,
        title: noroformForms.title,
        submittedAt: noroformSubmissions.createdAt,
        versionId: noroformSubmissions.versionId,
        versionNumber: noroformFormVersions.versionNumber,
        definition: noroformFormVersions.definition,
        answers: noroformSubmissions.answers,
      })
      .from(noroformSubmissions)
      .innerJoin(noroformForms, eq(noroformForms.id, noroformSubmissions.formId))
      .innerJoin(noroformFormVersions, eq(noroformFormVersions.id, noroformSubmissions.versionId))
      .innerJoin(tenants, eq(tenants.id, noroformSubmissions.tenantId))
      .where(
        and(
          eq(noroformSubmissions.id, link.submissionId),
          eq(noroformSubmissions.tenantId, link.tenantId),
          eq(tenants.status, 'active'),
        ),
      )
      .limit(1);
    return row
      ? { ...row, answers: (row.answers ?? {}) as Record<string, unknown> }
      : null;
  });
}
