import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  and,
  count,
  desc,
  eq,
  ilike,
  or,
  PLATFORM_ADMIN_CONTEXT,
  platformUsers,
  sql,
  tenantMemberships,
  tenants,
  type Db,
  type PlatformAdminContext,
} from '@noroset/core';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { LIST_LIMIT } from '../access';
import { recordAudit } from '../audit/audit';
import { PageQuery, type UserStatus } from '../users/dto';
import { requireReason } from '../users/users.service';

export type TenantStatus = 'active' | 'suspended';
const TENANT_STATUSES: TenantStatus[] = ['active', 'suspended'];

export class ListTenantsQuery extends PageQuery {
  /** نام یا slug. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsIn(TENANT_STATUSES)
  status?: TenantStatus;
}

export class SetTenantStatusDto {
  @IsIn(TENANT_STATUSES)
  status!: TenantStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}

export interface AdminTenantItem {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  memberCount: number;
  createdAt: Date;
}

export interface AdminTenantMember {
  userId: string;
  fullName: string;
  mobile: string | null;
  email: string | null;
  userStatus: UserStatus;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'invited' | 'suspended';
  joinedAt: Date;
}

export interface AdminTenantDetail extends AdminTenantItem {
  updatedAt: Date;
  members: AdminTenantMember[];
}

// نام‌های صریح: drizzle ستون‌ها را داخل sql بدون جدول رندر می‌کند و در زیرپرس‌وجو به جدول داخلی می‌خورند.
const memberCountSql = sql<number>`(SELECT count(*) FROM "tenant_memberships" m WHERE m."tenant_id" = "tenants"."id")`;

const tenantColumns = {
  id: tenants.id,
  name: tenants.name,
  slug: tenants.slug,
  status: tenants.status,
  memberCount: memberCountSql,
  createdAt: tenants.createdAt,
};

/** مدیریت tenantها (docs/architecture.md §9.11): فهرست، جزئیات با اعضا، تعلیق/فعال‌سازی با دلیل. */
@Injectable()
export class AdminTenantsService {
  constructor(@Inject(PLATFORM_ADMIN_CONTEXT) private readonly ctx: PlatformAdminContext) {}

  async list(query: ListTenantsQuery): Promise<{ items: AdminTenantItem[]; total: number; limit: number; offset: number }> {
    const limit = query.limit ?? LIST_LIMIT.default;
    const offset = query.offset ?? 0;
    const conditions = [];
    if (query.status) conditions.push(eq(tenants.status, query.status));
    const q = query.q?.trim();
    if (q) {
      const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
      conditions.push(or(ilike(tenants.name, pattern), ilike(tenants.slug, pattern))!);
    }
    const where = conditions.length ? and(...conditions) : undefined;
    return this.ctx.run(async (tx) => {
      const rows = await tx
        .select(tenantColumns)
        .from(tenants)
        .where(where)
        .orderBy(desc(tenants.createdAt), desc(tenants.id))
        .limit(limit)
        .offset(offset);
      const [total] = await tx.select({ n: count() }).from(tenants).where(where);
      return { items: rows.map(toItem), total: Number(total?.n ?? 0), limit, offset };
    });
  }

  get(id: string): Promise<AdminTenantDetail> {
    return this.ctx.run((tx) => this.detail(tx, id));
  }

  /** تعلیق با دلیل اجباری: پنل tenant ۴۰۳ و صفحه/فرم/فایل عمومی‌اش پیدا نمی‌شود. */
  async setStatus(id: string, status: TenantStatus, rawReason: string | undefined): Promise<AdminTenantDetail> {
    const reason = status === 'suspended' ? requireReason(rawReason) : rawReason?.trim() ? requireReason(rawReason) : null;
    return this.ctx.run(async (tx) => {
      const [before] = await tx.select().from(tenants).where(eq(tenants.id, id)).limit(1).for('update');
      if (!before) throw new NotFoundException('not_found');
      await tx.update(tenants).set({ status, updatedAt: new Date() }).where(eq(tenants.id, id));
      await recordAudit(tx, this.ctx, {
        action: 'tenant.status',
        targetType: 'tenant',
        targetId: id,
        reason,
        details: { from: before.status, to: status },
      });
      return this.detail(tx, id);
    });
  }

  private async detail(tx: Db, id: string): Promise<AdminTenantDetail> {
    const [row] = await tx
      .select({ ...tenantColumns, updatedAt: tenants.updatedAt })
      .from(tenants)
      .where(eq(tenants.id, id))
      .limit(1);
    if (!row) throw new NotFoundException('not_found');
    const members = await tx
      .select({
        userId: tenantMemberships.userId,
        fullName: platformUsers.fullName,
        mobile: platformUsers.mobile,
        email: platformUsers.email,
        userStatus: platformUsers.status,
        role: tenantMemberships.role,
        status: tenantMemberships.status,
        joinedAt: tenantMemberships.createdAt,
      })
      .from(tenantMemberships)
      .innerJoin(platformUsers, eq(platformUsers.id, tenantMemberships.userId))
      .where(eq(tenantMemberships.tenantId, id))
      .orderBy(tenantMemberships.createdAt);
    return { ...toItem(row), updatedAt: row.updatedAt, members };
  }
}

function toItem<T extends { memberCount: number }>(row: T): T {
  return { ...row, memberCount: Number(row.memberCount) };
}
