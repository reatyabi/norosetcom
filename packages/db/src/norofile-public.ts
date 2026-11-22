import { and, eq, sql } from 'drizzle-orm';
import { db, withSetting } from './connection';
import { norofileFiles, norofilePlatformFiles, norofileUserFiles } from './norofile.schema';
import { platformUsers, tenants } from './schema';

// مسیر ویژه‌ی فایل عمومی norofile (docs/architecture.md §9.9). مخاطب ناشناس است:
// تراکنش فقط app.public_file_id را ست می‌کند و policyهای «norofile_files_public_select» و
// «norofile_user_files_public_select» فقط همان یک فایل public را نشان می‌دهند؛ فایل private،
// tenant معلق یا کاربر غیرفعال پیدا نمی‌شود. فقط خواندن متادیتا.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PublicFile {
  id: string;
  /** null برای فایل فضای شخصی کاربر. */
  tenantId: string | null;
  name: string;
  kind: 'image' | 'document' | 'archive';
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
}

/** فایل public با این شناسه (tenant یا فضای شخصی)؛ private/ناموجود/tenant معلق/کاربر غیرفعال ← null. */
export async function findPublicFile(id: string): Promise<PublicFile | null> {
  if (!UUID.test(id)) return null;
  const fileId = id.toLowerCase();
  return withSetting('app.public_file_id', fileId, async (tx) => {
    const [row] = await tx
      .select({
        id: norofileFiles.id,
        tenantId: norofileFiles.tenantId,
        name: norofileFiles.name,
        kind: norofileFiles.kind,
        mimeType: norofileFiles.mimeType,
        sizeBytes: norofileFiles.sizeBytes,
        storageKey: norofileFiles.storageKey,
      })
      .from(norofileFiles)
      .innerJoin(tenants, eq(tenants.id, norofileFiles.tenantId))
      .where(and(eq(norofileFiles.id, fileId), eq(norofileFiles.visibility, 'public'), eq(tenants.status, 'active')))
      .limit(1);
    if (row) {
      await tx.execute(sql`SELECT set_config('app.current_tenant', ${row.tenantId}, true)`);
      return row;
    }
    const [personal] = await tx
      .select({
        id: norofileUserFiles.id,
        name: norofileUserFiles.name,
        kind: norofileUserFiles.kind,
        mimeType: norofileUserFiles.mimeType,
        sizeBytes: norofileUserFiles.sizeBytes,
        storageKey: norofileUserFiles.storageKey,
      })
      .from(norofileUserFiles)
      .innerJoin(platformUsers, eq(platformUsers.id, norofileUserFiles.userId))
      .where(and(eq(norofileUserFiles.id, fileId), eq(norofileUserFiles.visibility, 'public'), eq(platformUsers.status, 'active')))
      .limit(1);
    return personal ? { ...personal, tenantId: null } : null;
  });
}

/** فایل پلتفرم با این شناسه (policy خواندن باز است؛ همه‌ی این فایل‌ها تصویر public‌اند). ناموجود ← null. */
export async function findPlatformFile(id: string): Promise<PublicFile | null> {
  if (!UUID.test(id)) return null;
  const [row] = await db
    .select({
      id: norofilePlatformFiles.id,
      name: norofilePlatformFiles.name,
      mimeType: norofilePlatformFiles.mimeType,
      sizeBytes: norofilePlatformFiles.sizeBytes,
      storageKey: norofilePlatformFiles.storageKey,
    })
    .from(norofilePlatformFiles)
    .where(eq(norofilePlatformFiles.id, id.toLowerCase()))
    .limit(1);
  return row ? { ...row, tenantId: null, kind: 'image' } : null;
}
