import { SetMetadata, UnprocessableEntityException } from '@nestjs/common';
import { PLATFORM_ROLES_KEY, PUBLIC_ROUTE_KEY, adminAuditLog, type Db, type PlatformAdminContext, type PlatformRole } from '@noroset/core';
import type { ImageView, StoredImage } from '../shared';

// metadata با کلیدهای قرارداد core؛ گاردهای سراسری apps/api آن‌ها را اعمال می‌کنند (docs/architecture.md §9.12).

export const Public = () => SetMetadata(PUBLIC_ROUTE_KEY, true);
/** نوشتن و مدیریت بلاگ؛ AuthGuard سراسری نقش را از DB بررسی می‌کند. */
export const SuperAdmin = () => SetMetadata(PLATFORM_ROLES_KEY, ['superadmin'] satisfies PlatformRole[]);

/** تصویر شاخص و تصاویر متن (فضای پلتفرم norofile). */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
/** سقف سند سریال‌شده‌ی مقاله. */
export const MAX_CONTENT_BYTES = 800 * 1024;
export const MAX_TAGS = 15;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v);

export function pgCode(err: unknown): string | undefined {
  const e = err as { code?: string; cause?: { code?: string } };
  return e.code ?? e.cause?.code;
}

/** پیشوند آدرس فایل‌های پلتفرم (`${base}/${fileId}`). */
export const platformBase = (publicBaseUrl: string) => `${publicBaseUrl}/platform`;

export function imageView(base: string, img: StoredImage | null | undefined, alt = ''): ImageView | null {
  if (!img || !isUuid(img.file_id)) return null;
  return { url: `${base}/${img.file_id}`, width: img.width ?? null, height: img.height ?? null, alt: img.alt ?? alt };
}

/** تصویر ورودی ادمین: فقط فایل پلتفرم (uuid) با ابعاد اختیاری (هرگز آدرس بیرونی). */
export function parseImage(raw: unknown, withAlt: boolean): StoredImage | null {
  if (raw === null || raw === undefined) return null;
  const o = raw as Record<string, unknown>;
  const id = o.fileId ?? o.file_id;
  if (typeof raw !== 'object' || !isUuid(id)) throw new UnprocessableEntityException('invalid_asset');
  const dim = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v > 0 && v <= 20_000 ? v : null);
  const img: StoredImage = { file_id: id.toLowerCase(), width: dim(o.width), height: dim(o.height) };
  if (withAlt) img.alt = typeof o.alt === 'string' ? o.alt.trim().slice(0, 300) : '';
  return img;
}

export type AuditTarget = 'blog_post' | 'blog_category' | 'blog_tag' | 'blog_comment';

/** لاگ ممیزی در همان تراکنش؛ فقط آنچه به بازدیدکنندگان می‌رسد یا داده را حذف می‌کند. */
export async function audit(
  tx: Db,
  ctx: PlatformAdminContext,
  action: string,
  targetType: AuditTarget,
  targetId: string | null,
  details: Record<string, unknown> = {},
): Promise<void> {
  await tx.insert(adminAuditLog).values({ actorUserId: ctx.adminId(), action, targetType, targetId, details, ip: ctx.ip() });
}

/** ILIKE امن: `%` و `_` و `\` کاربر معنای الگو ندارند. */
export const likeEscape = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);
