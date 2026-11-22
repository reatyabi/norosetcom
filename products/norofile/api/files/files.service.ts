import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  and,
  asc,
  count,
  desc,
  eq,
  findPlatformFile,
  findPublicFile,
  inArray,
  norofileFileUsages,
  norofileFiles,
  norofilePlatformFiles,
  norofileUserFiles,
  platformUsers,
  PLAN_RESOLVER,
  productPlan,
  RATE_LIMITER,
  sql,
  TENANT_CONTEXT,
  type Db,
  type FileKind,
  type FileOwner,
  type FileRequirement,
  type FileService,
  type FileVisibility,
  type PersonalUploadInput,
  type PlanResolver,
  type RateLimiter,
  type StoredFile,
  type TenantContext,
  type UploadFileInput,
  withPlatformAdmin,
  withUser,
} from '@noroset/core';
import { consumeOrThrow, pgCode } from '../access';
import { canBePublic, LIST_LIMIT, MAX_UPLOAD_BYTES, MIB, PERSONAL_MAX_BYTES, RATE_LIMITS } from '../limits';
import { OBJECT_STORAGE, type ObjectStorage, type StoredObject } from '../storage/object-storage';
import { detectFile, InvalidFileError, sanitizeName } from './file-types';

export interface FileItem extends StoredFile {
  source: string;
  /** تعداد محصولاتی/رکوردهایی که از فایل استفاده می‌کنند؛ > ۰ یعنی قابل حذف نیست. */
  usageCount: number;
  updatedAt: Date;
  /** آپلودکننده (فیلتر «مالک»)؛ کاربر حذف‌شده ← null. */
  uploadedBy: string | null;
  uploadedByName: string | null;
}

export interface FileUsage {
  ownerType: string;
  ownerId: string;
  createdAt: Date;
}

export interface FileDetail extends FileItem {
  usages: FileUsage[];
}

export interface FileList {
  items: FileItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface StorageUsage {
  usedBytes: number;
  quotaBytes: number;
  fileCount: number;
  maxUploadBytes: number;
}

export type FileOwnerFilter = 'me' | 'others';
export type FileSort = 'created' | 'updated' | 'name';

export interface ListQuery {
  kind?: FileKind;
  q?: string;
  /** me: آپلود خود کاربر؛ others: بقیه‌ی اعضا. */
  owner?: FileOwnerFilter;
  /** پیش‌فرض created (جدیدترین بارگذاری). */
  sort?: FileSort;
  limit?: number;
  offset?: number;
}

export interface FileContent {
  name: string;
  kind: FileKind;
  mimeType: string;
  sizeBytes: number;
  object: StoredObject;
}

const NAME_PATTERN = /^[a-z][a-z0-9_]*$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const usageCount = sql<number>`(SELECT count(*)::int FROM ${norofileFileUsages} WHERE ${norofileFileUsages.fileId} = ${norofileFiles.id})`;

const uploadedByName = sql<string | null>`(SELECT NULLIF(${platformUsers.fullName}, '') FROM ${platformUsers} WHERE ${platformUsers.id} = ${norofileFiles.uploadedBy})`;

const itemColumns = {
  id: norofileFiles.id,
  name: norofileFiles.name,
  kind: norofileFiles.kind,
  mimeType: norofileFiles.mimeType,
  sizeBytes: norofileFiles.sizeBytes,
  width: norofileFiles.width,
  height: norofileFiles.height,
  visibility: norofileFiles.visibility,
  source: norofileFiles.source,
  createdAt: norofileFiles.createdAt,
  updatedAt: norofileFiles.updatedAt,
  usageCount,
  uploadedBy: norofileFiles.uploadedBy,
  uploadedByName,
};

type ItemRow = Omit<FileItem, 'url'>;

/** آدرس عمومی فایل‌ها از مسیر API (Next rewrite `/api`)؛ production: دامنه‌ی اصلی یا CDN جلوی همین مسیر. */
export function publicFilesBaseUrl(env: Record<string, string | undefined> = process.env): string {
  const explicit = env.NOROFILE_PUBLIC_URL;
  if (explicit) return explicit.replace(/\/+$/, '');
  const origin = (env.WEB_ORIGIN ?? 'http://localhost:3000').replace(/\/+$/, '');
  return `${origin}${env.API_BASE_PATH ?? '/api'}/norofile/public/files`;
}

function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

@Injectable()
export class FilesService implements FileService {
  private readonly logger = new Logger(FilesService.name);
  private readonly baseUrl = publicFilesBaseUrl();

  constructor(
    @Inject(TENANT_CONTEXT) private readonly ctx: TenantContext,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    @Inject(RATE_LIMITER) private readonly rateLimiter: RateLimiter,
    @Inject(PLAN_RESOLVER) private readonly plans: PlanResolver,
  ) {}

  publicBaseUrl(): string {
    return this.baseUrl;
  }

  // ---------- Port: FileService ----------

  async upload(input: UploadFileInput): Promise<StoredFile> {
    if (!NAME_PATTERN.test(input.source)) throw new Error(`invalid file source: ${input.source}`);
    consumeOrThrow(this.rateLimiter, `norofile_upload:user:${this.ctx.userId()}`, RATE_LIMITS.upload);
    const maxBytes = Math.min(input.maxBytes ?? MAX_UPLOAD_BYTES, MAX_UPLOAD_BYTES);
    if (!(input.body instanceof Uint8Array) || input.body.length === 0) throw new UnprocessableEntityException('invalid_file');
    if (input.body.length > maxBytes) throw new PayloadTooLargeException({ message: 'file_too_large', maxBytes });

    let file;
    try {
      file = detectFile(input.body, input.name ?? '', input.accept ?? 'any');
    } catch (err) {
      if (err instanceof InvalidFileError) throw new UnprocessableEntityException('invalid_file');
      throw err;
    }
    if (input.visibility === 'public' && !canBePublic(file.mimeType)) throw new UnprocessableEntityException('public_not_allowed');

    const tenantId = this.ctx.tenantId();
    const quota = await this.quotaBytes(tenantId);
    const used = await this.ctx.run((tx) => this.usedBytes(tx));
    if (used + file.body.length > quota) throw this.quotaError(quota);

    const id = randomUUID();
    const storageKey = `${tenantId}/${id}`;
    await this.storage.put(storageKey, file.body, file.mimeType);
    try {
      const row = await this.ctx.run(async (tx) => {
        // آپلودهای هم‌زمان یک tenant پشت هم بررسی سهمیه می‌شوند.
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`norofile_quota:${tenantId}`}, 0))`);
        if ((await this.usedBytes(tx)) + file.body.length > quota) throw this.quotaError(quota);
        const [inserted] = await tx
          .insert(norofileFiles)
          .values({
            id,
            tenantId,
            name: sanitizeName(input.name, file.extension),
            kind: file.kind,
            mimeType: file.mimeType,
            extension: file.extension,
            sizeBytes: file.body.length,
            width: file.width,
            height: file.height,
            storageKey,
            visibility: input.visibility ?? 'private',
            source: input.source,
            uploadedBy: this.ctx.userId(),
          })
          .returning({ id: norofileFiles.id });
        return this.findItem(tx, inserted!.id);
      });
      return this.toStored(row!);
    } catch (err) {
      await this.storage.delete(storageKey).catch(() => undefined);
      throw err;
    }
  }

  async uploadPersonal(userId: string, input: PersonalUploadInput): Promise<StoredFile> {
    if (!NAME_PATTERN.test(input.source)) throw new Error(`invalid file source: ${input.source}`);
    consumeOrThrow(this.rateLimiter, `norofile_upload:user:${userId}`, RATE_LIMITS.upload);
    const maxBytes = Math.min(input.maxBytes ?? PERSONAL_MAX_BYTES, PERSONAL_MAX_BYTES);
    if (!(input.body instanceof Uint8Array) || input.body.length === 0) throw new UnprocessableEntityException('invalid_file');
    if (input.body.length > maxBytes) throw new PayloadTooLargeException({ message: 'file_too_large', maxBytes });

    let file;
    try {
      file = detectFile(input.body, input.name ?? '', 'image');
    } catch (err) {
      if (err instanceof InvalidFileError) throw new UnprocessableEntityException('invalid_file');
      throw err;
    }

    const id = randomUUID();
    const storageKey = `users/${userId}/${id}`;
    await this.storage.put(storageKey, file.body, file.mimeType);
    try {
      const [row] = await withUser(userId, (tx) =>
        tx
          .insert(norofileUserFiles)
          .values({
            id,
            userId,
            name: sanitizeName(input.name, file.extension),
            kind: file.kind,
            mimeType: file.mimeType,
            extension: file.extension,
            sizeBytes: file.body.length,
            width: file.width,
            height: file.height,
            storageKey,
            visibility: 'public',
            source: input.source,
          })
          .returning(),
      );
      return {
        id: row!.id,
        name: row!.name,
        kind: row!.kind,
        mimeType: row!.mimeType,
        sizeBytes: row!.sizeBytes,
        width: row!.width,
        height: row!.height,
        visibility: row!.visibility,
        url: `${this.baseUrl}/${row!.id}`,
        createdAt: row!.createdAt,
      };
    } catch (err) {
      await this.storage.delete(storageKey).catch(() => undefined);
      throw err;
    }
  }

  async removePersonal(userId: string, fileId: string): Promise<void> {
    if (!UUID.test(fileId)) return;
    const [row] = await withUser(userId, (tx) =>
      tx
        .delete(norofileUserFiles)
        .where(eq(norofileUserFiles.id, fileId.toLowerCase()))
        .returning({ storageKey: norofileUserFiles.storageKey }),
    );
    if (!row) return;
    await this.storage.delete(row.storageKey).catch((err: Error) => this.logger.warn(`orphan object ${row.storageKey}: ${err.message}`));
  }

  async uploadPlatform(adminUserId: string, input: PersonalUploadInput): Promise<StoredFile> {
    if (!NAME_PATTERN.test(input.source)) throw new Error(`invalid file source: ${input.source}`);
    consumeOrThrow(this.rateLimiter, `norofile_upload:user:${adminUserId}`, RATE_LIMITS.upload);
    const maxBytes = Math.min(input.maxBytes ?? MAX_UPLOAD_BYTES, MAX_UPLOAD_BYTES);
    if (!(input.body instanceof Uint8Array) || input.body.length === 0) throw new UnprocessableEntityException('invalid_file');
    if (input.body.length > maxBytes) throw new PayloadTooLargeException({ message: 'file_too_large', maxBytes });

    let file;
    try {
      file = detectFile(input.body, input.name ?? '', 'image');
    } catch (err) {
      if (err instanceof InvalidFileError) throw new UnprocessableEntityException('invalid_file');
      throw err;
    }

    const id = randomUUID();
    const storageKey = `platform/${id}`;
    await this.storage.put(storageKey, file.body, file.mimeType);
    try {
      const [row] = await withPlatformAdmin(adminUserId, (tx) =>
        tx
          .insert(norofilePlatformFiles)
          .values({
            id,
            name: sanitizeName(input.name, file.extension),
            mimeType: file.mimeType,
            extension: file.extension,
            sizeBytes: file.body.length,
            width: file.width!,
            height: file.height!,
            storageKey,
            source: input.source,
            uploadedBy: adminUserId,
          })
          .returning(),
      );
      return {
        id: row!.id,
        name: row!.name,
        kind: 'image',
        mimeType: row!.mimeType,
        sizeBytes: row!.sizeBytes,
        width: row!.width,
        height: row!.height,
        visibility: 'public',
        url: `${this.baseUrl}/platform/${row!.id}`,
        createdAt: row!.createdAt,
      };
    } catch (err) {
      await this.storage.delete(storageKey).catch(() => undefined);
      throw err;
    }
  }


  async syncUsage(tx: Db, owner: FileOwner, fileIds: string[], require: FileRequirement = {}): Promise<void> {
    if (!NAME_PATTERN.test(owner.type)) throw new Error(`invalid usage owner type: ${owner.type}`);
    const ids = [...new Set(fileIds)];
    if (ids.some((id) => !UUID.test(id))) throw new UnprocessableEntityException('invalid_asset');
    const normalized = ids.map((id) => id.toLowerCase());

    if (normalized.length) {
      const found = await tx
        .select({ id: norofileFiles.id, kind: norofileFiles.kind, visibility: norofileFiles.visibility })
        .from(norofileFiles)
        .where(inArray(norofileFiles.id, normalized));
      const ok = found.filter(
        (f) => (!require.kind || f.kind === require.kind) && (!require.visibility || f.visibility === require.visibility),
      );
      if (ok.length !== normalized.length) throw new UnprocessableEntityException('invalid_asset');
    }

    const ownerMatch = and(eq(norofileFileUsages.ownerType, owner.type), eq(norofileFileUsages.ownerId, owner.id));
    await tx
      .delete(norofileFileUsages)
      .where(normalized.length ? and(ownerMatch, sql`NOT ${inArray(norofileFileUsages.fileId, normalized)}`) : ownerMatch);
    if (normalized.length) {
      const tenantId = this.ctx.tenantId();
      await tx
        .insert(norofileFileUsages)
        .values(normalized.map((fileId) => ({ tenantId, fileId, ownerType: owner.type, ownerId: owner.id })))
        .onConflictDoNothing();
    }
  }

  // ---------- پنل ----------

  async list(query: ListQuery): Promise<FileList> {
    const limit = Math.min(Math.max(query.limit ?? LIST_LIMIT.default, 1), LIST_LIMIT.max);
    const offset = Math.max(query.offset ?? 0, 0);
    const filters = [];
    if (query.kind) filters.push(eq(norofileFiles.kind, query.kind));
    const q = query.q?.trim();
    if (q) filters.push(sql`${norofileFiles.name} ILIKE ${`%${escapeLike(q)}%`}`);
    if (query.owner === 'me') filters.push(eq(norofileFiles.uploadedBy, this.ctx.userId()));
    if (query.owner === 'others') filters.push(sql`${norofileFiles.uploadedBy} IS DISTINCT FROM ${this.ctx.userId()}`);
    const where = filters.length ? and(...filters) : undefined;
    const order =
      query.sort === 'name'
        ? [asc(norofileFiles.name), desc(norofileFiles.id)]
        : query.sort === 'updated'
          ? [desc(norofileFiles.updatedAt), desc(norofileFiles.id)]
          : [desc(norofileFiles.createdAt), desc(norofileFiles.id)];

    return this.ctx.run(async (tx) => {
      const rows = await tx
        .select(itemColumns)
        .from(norofileFiles)
        .where(where)
        .orderBy(...order)
        .limit(limit)
        .offset(offset);
      const [{ n } = { n: 0 }] = await tx.select({ n: count() }).from(norofileFiles).where(where);
      return { items: rows.map((r) => this.toStored(r)), total: n, limit, offset };
    });
  }

  async usage(): Promise<StorageUsage> {
    const quota = await this.quotaBytes(this.ctx.tenantId());
    return this.ctx.run(async (tx) => {
      const [row] = await tx
        .select({ used: sql<number>`coalesce(sum(${norofileFiles.sizeBytes}), 0)::bigint`, n: count() })
        .from(norofileFiles);
      return {
        usedBytes: Number(row?.used ?? 0),
        quotaBytes: quota,
        fileCount: row?.n ?? 0,
        maxUploadBytes: MAX_UPLOAD_BYTES,
      };
    });
  }

  async get(id: string): Promise<FileDetail> {
    return this.ctx.run(async (tx) => {
      const item = await this.findItem(tx, id);
      if (!item) throw new NotFoundException();
      const usages = await tx
        .select({ ownerType: norofileFileUsages.ownerType, ownerId: norofileFileUsages.ownerId, createdAt: norofileFileUsages.createdAt })
        .from(norofileFileUsages)
        .where(eq(norofileFileUsages.fileId, id))
        .orderBy(norofileFileUsages.createdAt);
      return { ...this.toStored(item), usages };
    });
  }

  async update(id: string, patch: { name?: string; visibility?: FileVisibility }): Promise<FileDetail> {
    await this.ctx.run(async (tx) => {
      const [file] = await tx
        .select({ extension: norofileFiles.extension, mimeType: norofileFiles.mimeType, visibility: norofileFiles.visibility, usageCount })
        .from(norofileFiles)
        .where(eq(norofileFiles.id, id))
        .for('update');
      if (!file) throw new NotFoundException();
      const set: Partial<typeof norofileFiles.$inferInsert> = { updatedAt: new Date() };
      if (patch.name !== undefined) set.name = sanitizeName(patch.name, file.extension);
      if (patch.visibility !== undefined && patch.visibility !== file.visibility) {
        if (patch.visibility === 'public' && !canBePublic(file.mimeType)) throw new UnprocessableEntityException('public_not_allowed');
        // محصول مصرف‌کننده روی دسترسی فعلی حساب کرده (مثلاً تصویر عمومی صفحه‌ی لینک).
        if (file.usageCount > 0) throw new ConflictException('file_in_use');
        set.visibility = patch.visibility;
      }
      await tx.update(norofileFiles).set(set).where(eq(norofileFiles.id, id));
    });
    return this.get(id);
  }

  /** فایل در حال استفاده ← ۴۰۹؛ وگرنه ردیف و سپس شیء S3 (best-effort) حذف می‌شود. */
  async remove(id: string): Promise<void> {
    let storageKey: string;
    try {
      storageKey = await this.ctx.run(async (tx) => {
        const [file] = await tx
          .select({ storageKey: norofileFiles.storageKey, usageCount })
          .from(norofileFiles)
          .where(eq(norofileFiles.id, id))
          .for('update');
        if (!file) throw new NotFoundException();
        if (file.usageCount > 0) throw new ConflictException({ message: 'file_in_use', usageCount: file.usageCount });
        await tx.delete(norofileFiles).where(eq(norofileFiles.id, id));
        return file.storageKey;
      });
    } catch (err) {
      if (pgCode(err) === '23503') throw new ConflictException('file_in_use');
      throw err;
    }
    await this.storage.delete(storageKey).catch((err: Error) => this.logger.warn(`orphan object ${storageKey}: ${err.message}`));
  }

  /** محتوای فایل برای اعضای همین tenant (پیش‌نمایش/دانلود در پنل). */
  async content(id: string): Promise<FileContent> {
    const file = await this.ctx.run(async (tx) => {
      const [row] = await tx
        .select({
          name: norofileFiles.name,
          kind: norofileFiles.kind,
          mimeType: norofileFiles.mimeType,
          sizeBytes: norofileFiles.sizeBytes,
          storageKey: norofileFiles.storageKey,
        })
        .from(norofileFiles)
        .where(eq(norofileFiles.id, id))
        .limit(1);
      return row;
    });
    if (!file) throw new NotFoundException();
    return this.withObject(file);
  }

  /** فایل public برای مخاطب ناشناس (مسیر ویژه‌ی @noroset/db). */
  async publicContent(id: string, ip: string | undefined): Promise<FileContent> {
    consumeOrThrow(this.rateLimiter, `norofile_public:ip:${ip ?? 'unknown'}`, RATE_LIMITS.publicRead);
    const file = await findPublicFile(id);
    if (!file) throw new NotFoundException();
    return this.withObject(file);
  }

  /** فایل پلتفرم برای مخاطب ناشناس؛ مسیر جدا تا این آدرس فقط به فایل پلتفرم برسد، نه فایل فضای کاری دیگر. */
  async platformContent(id: string, ip: string | undefined): Promise<FileContent> {
    consumeOrThrow(this.rateLimiter, `norofile_public:ip:${ip ?? 'unknown'}`, RATE_LIMITS.publicRead);
    const file = await findPlatformFile(id);
    if (!file) throw new NotFoundException();
    return this.withObject(file);
  }

  private async withObject(file: Omit<FileContent, 'object'> & { storageKey: string }): Promise<FileContent> {
    const object = await this.storage.get(file.storageKey);
    if (!object) throw new NotFoundException();
    return { name: file.name, kind: file.kind, mimeType: file.mimeType, sizeBytes: file.sizeBytes, object };
  }

  private async findItem(tx: Db, id: string): Promise<ItemRow | undefined> {
    const [row] = await tx.select(itemColumns).from(norofileFiles).where(eq(norofileFiles.id, id)).limit(1);
    return row;
  }

  private async usedBytes(tx: Db): Promise<number> {
    const [row] = await tx.select({ used: sql<number>`coalesce(sum(${norofileFiles.sizeBytes}), 0)::bigint` }).from(norofileFiles);
    return Number(row?.used ?? 0);
  }

  /** سهمیه‌ی فضای tenant از پلن دامنه‌ی نوروفایل (docs/architecture.md §9.11)؛ پلن محصول دیگر فضا نمی‌دهد. */
  private async quotaBytes(tenantId: string): Promise<number> {
    return productPlan(await this.plans.resolve(tenantId), 'norofile').entitlements['norofile.storage_mb'] * MIB;
  }

  private quotaError(quotaBytes: number): ForbiddenException {
    return new ForbiddenException({ message: 'storage_quota', quotaBytes });
  }

  private toStored<T extends ItemRow>(row: T): T & { url: string | null } {
    return { ...row, url: row.visibility === 'public' ? `${this.baseUrl}/${row.id}` : null };
  }
}
