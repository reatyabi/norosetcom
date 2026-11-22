import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  and,
  count,
  desc,
  eq,
  FILE_SERVICE,
  gte,
  hashPassword,
  ilike,
  isAcceptablePassword,
  isNull,
  normalizeIranianMobile,
  or,
  PLAN_RESOLVER,
  PLATFORM_ADMIN_CONTEXT,
  platformUsers,
  reservedSlugs,
  sessions,
  sql,
  tenantMemberships,
  tenants,
  type Db,
  type FileService,
  type PlanResolver,
  type PlatformAdminContext,
  type PlatformRole,
} from '@noroset/core';
import { LIST_LIMIT, pgCode, pgConstraint, slugConflict } from '../access';
import { recordAudit } from '../audit/audit';
import type { CreateUserDto, ListUsersQuery, UserStatus } from './dto';

const FULL_NAME_MAX = 200;
const REASON_MAX = 500;
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export interface AdminUserItem {
  id: string;
  mobile: string | null;
  email: string | null;
  fullName: string;
  avatarUrl: string | null;
  status: UserStatus;
  statusReason: string | null;
  platformRole: PlatformRole;
  hasPassword: boolean;
  tenantCount: number;
  createdAt: Date;
}

export interface AdminUserMembership {
  tenantId: string;
  name: string;
  slug: string;
  tenantStatus: 'active' | 'suspended';
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'invited' | 'suspended';
}

export interface AdminUserDetail extends AdminUserItem {
  statusChangedAt: Date | null;
  updatedAt: Date;
  activeSessions: number;
  memberships: AdminUserMembership[];
}

export const normalizeName = (raw: string) => raw.normalize('NFC').replace(/\s+/g, ' ').trim();

/** دلیل اجباری کارهای محدودکننده (۱ تا ۵۰۰ کاراکتر پس از trim). */
export function requireReason(raw: string | undefined): string {
  const reason = normalizeName(raw ?? '');
  if (reason.length < 1 || reason.length > REASON_MAX) throw new UnprocessableEntityException('reason_required');
  return reason;
}

/**
 * مدیریت کاربران پلتفرم (docs/architecture.md §9.11). همه‌ی کارها داخل withPlatformAdmin
 * (ctx.run) و هر تغییر با لاگ ممیزی در همان تراکنش. ادمین وضعیت، نقش و رمز خودش را از اینجا عوض
 * نمی‌کند، پس همیشه دست‌کم یک superadmin فعال می‌ماند.
 */
@Injectable()
export class AdminUsersService {
  constructor(
    @Inject(PLATFORM_ADMIN_CONTEXT) private readonly ctx: PlatformAdminContext,
    @Inject(FILE_SERVICE) private readonly files: FileService,
    @Inject(PLAN_RESOLVER) private readonly plans: PlanResolver,
  ) {}

  async overview() {
    return this.ctx.run(async (tx) => {
      const users = await tx.select({ status: platformUsers.status, n: count() }).from(platformUsers).groupBy(platformUsers.status);
      const roles = await tx
        .select({ n: count() })
        .from(platformUsers)
        .where(eq(platformUsers.platformRole, 'superadmin'));
      const tenantRows = await tx.select({ status: tenants.status, n: count() }).from(tenants).groupBy(tenants.status);
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recent = await tx.select({ n: count() }).from(platformUsers).where(gte(platformUsers.createdAt, since));
      const byStatus = <K extends string>(rows: { status: K; n: number }[], keys: K[]) =>
        Object.fromEntries(keys.map((k) => [k, Number(rows.find((r) => r.status === k)?.n ?? 0)])) as Record<K, number>;
      return {
        users: byStatus(users, ['active', 'disabled', 'blocked']),
        superadmins: Number(roles[0]?.n ?? 0),
        newUsersLast7Days: Number(recent[0]?.n ?? 0),
        tenants: byStatus(tenantRows, ['active', 'suspended']),
      };
    });
  }

  async list(query: ListUsersQuery): Promise<{ items: AdminUserItem[]; total: number; limit: number; offset: number }> {
    const limit = query.limit ?? LIST_LIMIT.default;
    const offset = query.offset ?? 0;
    const conditions = [];
    if (query.status) conditions.push(eq(platformUsers.status, query.status));
    if (query.role) conditions.push(eq(platformUsers.platformRole, query.role));
    const q = query.q?.trim();
    if (q) {
      const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
      const mobile = normalizeIranianMobile(q);
      conditions.push(
        or(
          ilike(platformUsers.fullName, pattern),
          ilike(platformUsers.email, pattern),
          ilike(platformUsers.mobile, pattern),
          ...(mobile ? [eq(platformUsers.mobile, mobile)] : []),
        )!,
      );
    }
    const where = conditions.length ? and(...conditions) : undefined;

    return this.ctx.run(async (tx) => {
      const rows = await tx
        .select({ ...userColumns, tenantCount: tenantCountSql })
        .from(platformUsers)
        .where(where)
        .orderBy(desc(platformUsers.createdAt), desc(platformUsers.id))
        .limit(limit)
        .offset(offset);
      const [total] = await tx.select({ n: count() }).from(platformUsers).where(where);
      return { items: rows.map((r) => this.toItem(r)), total: Number(total?.n ?? 0), limit, offset };
    });
  }

  async get(id: string): Promise<AdminUserDetail> {
    return this.ctx.run((tx) => this.detail(tx, id));
  }

  async create(dto: CreateUserDto): Promise<AdminUserDetail> {
    const mobile = normalizeIranianMobile(dto.mobile);
    if (!mobile) throw new UnprocessableEntityException('invalid_mobile');
    const fullName = normalizeName(dto.fullName ?? '');
    if (fullName.length > FULL_NAME_MAX) throw new UnprocessableEntityException('invalid_full_name');
    if (dto.password !== undefined && !isAcceptablePassword(dto.password)) throw new UnprocessableEntityException('weak_password');
    const tenant = dto.tenant ? { name: normalizeName(dto.tenant.name), slug: dto.tenant.slug.trim().toLowerCase() } : null;
    if (tenant) {
      if (tenant.name.length < 1 || tenant.name.length > 200) throw new UnprocessableEntityException('invalid_tenant_name');
      if (!SLUG_RE.test(tenant.slug) || tenant.slug.length < 2 || tenant.slug.length > 64) {
        throw new UnprocessableEntityException('invalid_slug');
      }
    }
    const passwordHash = dto.password !== undefined ? await hashPassword(dto.password) : null;

    let owner: { tenantId: string; userId: string } | null = null;
    try {
      const detail = await this.ctx.run(async (tx) => {
        const [user] = await tx.insert(platformUsers).values({ mobile, fullName, passwordHash }).returning({ id: platformUsers.id });
        if (!user) throw new Error('user creation failed');

        let tenantId: string | null = null;
        if (tenant) {
          const reserved = await tx.select().from(reservedSlugs).where(eq(reservedSlugs.slug, tenant.slug)).limit(1);
          if (reserved[0]) throw new ConflictException('slug_reserved');
          const [created] = await tx.insert(tenants).values(tenant).returning({ id: tenants.id });
          if (!created) throw new Error('tenant creation failed');
          tenantId = created.id;
          await tx.execute(sql`SELECT set_config('app.current_tenant', ${tenantId}, true)`);
          await tx.insert(tenantMemberships).values({ tenantId, userId: user.id, role: 'owner' });
          owner = { tenantId, userId: user.id };
        }

        await recordAudit(tx, this.ctx, {
          action: 'user.create',
          targetType: 'user',
          targetId: user.id,
          details: { hasPassword: passwordHash !== null, ...(tenantId ? { tenantId } : {}) },
        });
        return this.detail(tx, user.id);
      });
      // کاربر تازه با اولین فضای کاری‌اش ۱۴ روز رایگان پلن پایه را می‌گیرد؛ بیرون از تراکنش ادمین چون با RLS همان tenant ثبت می‌شود.
      const created = owner as { tenantId: string; userId: string } | null;
      if (created) await this.plans.startTrial?.(created.tenantId, created.userId);
      return detail;
    } catch (err) {
      if (pgCode(err) === '23505' && pgConstraint(err) === 'platform_users_mobile_unique') throw new ConflictException('mobile_taken');
      throw slugConflict(err) ?? err;
    }
  }

  async updateName(id: string, raw: string): Promise<AdminUserDetail> {
    const fullName = normalizeName(raw);
    if (fullName.length < 1 || fullName.length > FULL_NAME_MAX) throw new UnprocessableEntityException('invalid_full_name');
    return this.ctx.run(async (tx) => {
      const before = await this.require(tx, id);
      await tx.update(platformUsers).set({ fullName, updatedAt: new Date() }).where(eq(platformUsers.id, id));
      await recordAudit(tx, this.ctx, { action: 'user.update', targetType: 'user', targetId: id, details: { fullName: { from: before.fullName, to: fullName } } });
      return this.detail(tx, id);
    });
  }

  /** disabled/blocked با دلیل اجباری؛ همه‌ی نشست‌ها همان لحظه باطل می‌شوند. */
  async setStatus(id: string, status: UserStatus, rawReason: string | undefined): Promise<AdminUserDetail> {
    this.forbidSelf(id);
    const reason = status === 'active' ? (rawReason?.trim() ? requireReason(rawReason) : null) : requireReason(rawReason);
    return this.ctx.run(async (tx) => {
      const before = await this.require(tx, id);
      const now = new Date();
      await tx
        .update(platformUsers)
        .set({ status, statusReason: status === 'active' ? null : reason, statusChangedAt: now, updatedAt: now })
        .where(eq(platformUsers.id, id));
      const revoked = status === 'active' ? 0 : await revokeSessions(tx, id);
      await recordAudit(tx, this.ctx, {
        action: 'user.status',
        targetType: 'user',
        targetId: id,
        reason,
        details: { from: before.status, to: status, revokedSessions: revoked },
      });
      return this.detail(tx, id);
    });
  }

  async setRole(id: string, platformRole: PlatformRole): Promise<AdminUserDetail> {
    this.forbidSelf(id);
    return this.ctx.run(async (tx) => {
      const before = await this.require(tx, id);
      await tx.update(platformUsers).set({ platformRole, updatedAt: new Date() }).where(eq(platformUsers.id, id));
      await recordAudit(tx, this.ctx, {
        action: 'user.role',
        targetType: 'user',
        targetId: id,
        details: { from: before.platformRole, to: platformRole },
      });
      return this.detail(tx, id);
    });
  }

  /** رمز جدید (فقط هش ذخیره و هرگز لاگ نمی‌شود)؛ همه‌ی نشست‌های کاربر باطل می‌شوند. */
  async setPassword(id: string, newPassword: string): Promise<AdminUserDetail> {
    this.forbidSelf(id);
    if (!isAcceptablePassword(newPassword)) throw new UnprocessableEntityException('weak_password');
    const passwordHash = await hashPassword(newPassword);
    return this.ctx.run(async (tx) => {
      await this.require(tx, id);
      await tx.update(platformUsers).set({ passwordHash, updatedAt: new Date() }).where(eq(platformUsers.id, id));
      const revoked = await revokeSessions(tx, id);
      await recordAudit(tx, this.ctx, { action: 'user.password', targetType: 'user', targetId: id, details: { revokedSessions: revoked } });
      return this.detail(tx, id);
    });
  }

  async revokeAllSessions(id: string): Promise<AdminUserDetail> {
    return this.ctx.run(async (tx) => {
      await this.require(tx, id);
      const revoked = await revokeSessions(tx, id);
      await recordAudit(tx, this.ctx, { action: 'user.sessions_revoke', targetType: 'user', targetId: id, details: { revokedSessions: revoked } });
      return this.detail(tx, id);
    });
  }

  private forbidSelf(id: string): void {
    if (id === this.ctx.adminId()) throw new ConflictException('cannot_modify_self');
  }

  private async require(tx: Db, id: string) {
    const [row] = await tx.select().from(platformUsers).where(eq(platformUsers.id, id)).limit(1).for('update');
    if (!row) throw new NotFoundException('not_found');
    return row;
  }

  private async detail(tx: Db, id: string): Promise<AdminUserDetail> {
    const [row] = await tx
      .select({ ...userColumns, tenantCount: tenantCountSql, statusChangedAt: platformUsers.statusChangedAt, updatedAt: platformUsers.updatedAt })
      .from(platformUsers)
      .where(eq(platformUsers.id, id))
      .limit(1);
    if (!row) throw new NotFoundException('not_found');
    const memberships = await tx
      .select({
        tenantId: tenantMemberships.tenantId,
        name: tenants.name,
        slug: tenants.slug,
        tenantStatus: tenants.status,
        role: tenantMemberships.role,
        status: tenantMemberships.status,
      })
      .from(tenantMemberships)
      .innerJoin(tenants, eq(tenants.id, tenantMemberships.tenantId))
      .where(eq(tenantMemberships.userId, id))
      .orderBy(tenants.name);
    const [active] = await tx
      .select({ n: count() })
      .from(sessions)
      .where(and(eq(sessions.userId, id), isNull(sessions.revokedAt), gte(sessions.expiresAt, new Date())));
    return {
      ...this.toItem(row),
      statusChangedAt: row.statusChangedAt,
      updatedAt: row.updatedAt,
      activeSessions: Number(active?.n ?? 0),
      memberships,
    };
  }

  private toItem(row: UserRow): AdminUserItem {
    const { avatarFileId, hasPassword, tenantCount, ...rest } = row;
    return {
      ...rest,
      hasPassword: Boolean(hasPassword),
      tenantCount: Number(tenantCount),
      avatarUrl: avatarFileId ? `${this.files.publicBaseUrl()}/${avatarFileId}` : null,
    };
  }
}

const userColumns = {
  id: platformUsers.id,
  mobile: platformUsers.mobile,
  email: platformUsers.email,
  fullName: platformUsers.fullName,
  avatarFileId: platformUsers.avatarFileId,
  status: platformUsers.status,
  statusReason: platformUsers.statusReason,
  platformRole: platformUsers.platformRole,
  // خود هش هرگز از admin بیرون نمی‌رود.
  hasPassword: sql<boolean>`${platformUsers.passwordHash} IS NOT NULL`,
  createdAt: platformUsers.createdAt,
};

// policy tenant_memberships_platform_admin_select (فقط داخل withPlatformAdmin) شمارش همه‌ی tenantها را ممکن می‌کند؛
// نام‌های صریح چون drizzle ستون‌ها را داخل sql بدون جدول رندر می‌کند و در زیرپرس‌وجو به جدول داخلی می‌خورند.
const tenantCountSql = sql<number>`(SELECT count(*) FROM "tenant_memberships" m WHERE m."user_id" = "platform_users"."id")`;

type UserRow = {
  id: string;
  mobile: string | null;
  email: string | null;
  fullName: string;
  avatarFileId: string | null;
  status: UserStatus;
  statusReason: string | null;
  platformRole: PlatformRole;
  hasPassword: boolean;
  tenantCount: number;
  createdAt: Date;
};

/** نشست‌های فعال کاربر را باطل می‌کند و تعدادشان را برمی‌گرداند. */
async function revokeSessions(tx: Db, userId: string): Promise<number> {
  const rows = await tx
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)))
    .returning({ id: sessions.id });
  return rows.length;
}
