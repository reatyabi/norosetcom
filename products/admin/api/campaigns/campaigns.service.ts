import { ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import {
  billingCoupons,
  desc,
  eq,
  PLATFORM_ADMIN_CONTEXT,
  panelAnnouncements,
  sql,
  type PlatformAdminContext,
} from '@noroset/core';
import { pgCode } from '../access';
import { recordAudit } from '../audit/audit';
import { normalizeCouponCode } from '../billing/billing.core';
import { normalizeName } from '../users/users.service';

const MAX_RIAL = 1_000_000_000_000;

export class CouponDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  description?: string;

  @IsOptional()
  @IsIn(['percent', 'fixed'])
  kind?: 'percent' | 'fixed';

  /** percent: ۱ تا ۱۰۰؛ fixed: ریال. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_RIAL)
  amount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsesPerTenant?: number | null;

  @IsOptional()
  @IsArray()
  planIds?: string[];

  @IsOptional()
  @IsString()
  startsAt?: string | null;

  @IsOptional()
  @IsString()
  endsAt?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class AnnouncementDto {
  @IsOptional()
  @IsString()
  @MaxLength(240)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  body?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  linkUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  linkLabel?: string | null;

  @IsOptional()
  @IsIn(['info', 'warning', 'success'])
  tone?: 'info' | 'warning' | 'success';

  @IsOptional()
  @IsIn(['all_members', 'managers'])
  audience?: 'all_members' | 'managers';

  @IsOptional()
  @IsIn(['all', 'plans', 'tenants'])
  targetType?: 'all' | 'plans' | 'tenants';

  @IsOptional()
  @IsArray()
  targetIds?: string[];

  @IsOptional()
  @IsString()
  startsAt?: string;

  @IsOptional()
  @IsString()
  endsAt?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UtmQuery {
  /** بازه‌ی ثبت‌نام: n روز اخیر؛ بدون آن همه‌ی زمان‌ها. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  days?: number;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function optionalDate(raw: string | null | undefined, field: string): Date | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null || raw === '') return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) throw new UnprocessableEntityException(`invalid_${field}`);
  return d;
}

/** لینک اعلان: https یا مسیر داخلی پنل (نه `//` یا `javascript:`). */
function safeLink(raw: string | null | undefined): string | null | undefined {
  if (raw === undefined) return undefined;
  const v = raw?.trim() ?? '';
  if (!v) return null;
  if (/^https:\/\/[^\s]+$/.test(v) || /^\/[^/\s][^\s]*$/.test(v) || v === '/') return v;
  throw new UnprocessableEntityException('invalid_link');
}

function uuids(ids: string[] | undefined): string[] | undefined {
  if (ids === undefined) return undefined;
  if (ids.length > 200 || !ids.every((id) => typeof id === 'string' && UUID.test(id))) throw new UnprocessableEntityException('invalid_targets');
  return [...new Set(ids.map((id) => id.toLowerCase()))];
}

/**
 * کمپین‌ها از سمت ادمین (docs/architecture.md §9.11، ۱۱.۷): کد تخفیف، اعلان درون پنل و گزارش UTM ثبت‌نام.
 * حذف نداریم (غیرفعال‌سازی)؛ همه‌ی تغییرها با لاگ ممیزی.
 */
@Injectable()
export class AdminCampaignsService {
  constructor(@Inject(PLATFORM_ADMIN_CONTEXT) private readonly ctx: PlatformAdminContext) {}

  coupons() {
    return this.ctx.run((tx) => tx.select().from(billingCoupons).orderBy(desc(billingCoupons.createdAt)).limit(200));
  }

  async createCoupon(dto: CouponDto) {
    if (!dto.code || !dto.kind || dto.amount === undefined) throw new UnprocessableEntityException('invalid_coupon');
    const values = this.couponValues(dto, dto.kind);
    const adminId = this.ctx.adminId();
    try {
      return await this.ctx.run(async (tx) => {
        const [coupon] = await tx
          .insert(billingCoupons)
          .values({ code: normalizeCouponCode(dto.code!), kind: dto.kind!, amount: dto.amount!, ...values, createdBy: adminId })
          .returning();
        await recordAudit(tx, this.ctx, { action: 'campaign.coupon_create', targetType: 'billing', targetId: coupon!.id, details: { code: coupon!.code } });
        return coupon!;
      });
    } catch (err) {
      const code = pgCode(err);
      if (code === '23505') throw new ConflictException('coupon_code_taken');
      if (code === '23514') throw new UnprocessableEntityException('invalid_coupon');
      throw err;
    }
  }

  /** کد و نوع ثابت‌اند (مصرف‌های قبلی با همان معنا حساب شده‌اند)؛ بقیه قابل ویرایش. */
  async updateCoupon(id: string, dto: CouponDto) {
    return this.ctx.run(async (tx) => {
      const [before] = await tx.select().from(billingCoupons).where(eq(billingCoupons.id, id)).limit(1).for('update');
      if (!before) throw new NotFoundException('not_found');
      if ((dto.code && normalizeCouponCode(dto.code) !== before.code) || (dto.kind && dto.kind !== before.kind)) {
        throw new ConflictException('coupon_immutable');
      }
      const values = this.couponValues(dto, before.kind);
      try {
        const [coupon] = await tx
          .update(billingCoupons)
          .set({ ...values, ...(dto.amount !== undefined ? { amount: dto.amount } : {}), updatedAt: new Date() })
          .where(eq(billingCoupons.id, id))
          .returning();
        await recordAudit(tx, this.ctx, { action: 'campaign.coupon_update', targetType: 'billing', targetId: id, details: { code: before.code, fields: Object.keys(dto) } });
        return coupon!;
      } catch (err) {
        if (pgCode(err) === '23514') throw new UnprocessableEntityException('invalid_coupon');
        throw err;
      }
    });
  }

  /** همه‌ی اعلان‌ها با `live` (فعال و در بازه، با ساعت سرور). */
  async announcements() {
    const rows = await this.ctx.run((tx) => tx.select().from(panelAnnouncements).orderBy(desc(panelAnnouncements.createdAt)).limit(200));
    const now = new Date();
    return rows.map((a) => ({ ...a, live: a.active && a.startsAt <= now && (!a.endsAt || a.endsAt > now) }));
  }

  async createAnnouncement(dto: AnnouncementDto) {
    const values = this.announcementValues(dto);
    if (!values.title) throw new UnprocessableEntityException('invalid_announcement');
    const adminId = this.ctx.adminId();
    return this.ctx.run(async (tx) => {
      try {
        const [row] = await tx
          .insert(panelAnnouncements)
          .values({ ...values, title: values.title!, createdBy: adminId })
          .returning();
        await recordAudit(tx, this.ctx, { action: 'campaign.announcement_create', targetType: 'billing', targetId: row!.id, details: { title: row!.title } });
        return row!;
      } catch (err) {
        if (pgCode(err) === '23514') throw new UnprocessableEntityException('invalid_announcement');
        throw err;
      }
    });
  }

  async updateAnnouncement(id: string, dto: AnnouncementDto) {
    const values = this.announcementValues(dto);
    return this.ctx.run(async (tx) => {
      try {
        const [row] = await tx
          .update(panelAnnouncements)
          .set({ ...values, updatedAt: new Date() })
          .where(eq(panelAnnouncements.id, id))
          .returning();
        if (!row) throw new NotFoundException('not_found');
        await recordAudit(tx, this.ctx, { action: 'campaign.announcement_update', targetType: 'billing', targetId: id, details: { fields: Object.keys(dto) } });
        return row;
      } catch (err) {
        if (pgCode(err) === '23514') throw new UnprocessableEntityException('invalid_announcement');
        throw err;
      }
    });
  }

  /**
   * گزارش UTM ثبت‌نام (first-touch) به‌ازای منبع/رسانه/کمپین: ثبت‌نام، کاربرانی که فضای کاری‌ای که مالکش
   * هستند پرداخت موفق داشته، و جمع آن پرداخت‌ها. بدون UTM = «مستقیم» (منبع خالی).
   */
  async utmReport(query: UtmQuery) {
    const since = query.days ? new Date(Date.now() - query.days * 24 * 60 * 60 * 1000) : null;
    return this.ctx.run(async (tx) => {
      const result = await tx.execute<{ source: string; medium: string; campaign: string; signups: string; paying: string; revenue_rial: string }>(sql`
        SELECT
          coalesce(u.signup_utm->>'source', '') AS source,
          coalesce(u.signup_utm->>'medium', '') AS medium,
          coalesce(u.signup_utm->>'campaign', '') AS campaign,
          count(*) AS signups,
          count(*) FILTER (WHERE paid.total > 0) AS paying,
          coalesce(sum(paid.total), 0) AS revenue_rial
        FROM platform_users u
        LEFT JOIN LATERAL (
          SELECT sum(p.total_rial) AS total
          FROM tenant_memberships m
          JOIN billing_payments p ON p.tenant_id = m.tenant_id AND p.status = 'paid'
          WHERE m.user_id = u.id AND m.role = 'owner'
        ) paid ON true
        WHERE ${since ? sql`u.created_at >= ${since}` : sql`true`}
        GROUP BY 1, 2, 3
        ORDER BY count(*) DESC, 1, 2, 3
        LIMIT 500`);
      return result.rows.map((r) => ({
        source: r.source,
        medium: r.medium,
        campaign: r.campaign,
        signups: Number(r.signups),
        paying: Number(r.paying),
        revenueRial: Number(r.revenue_rial),
      }));
    });
  }

  private couponValues(dto: CouponDto, kind: 'percent' | 'fixed') {
    if (dto.amount !== undefined && kind === 'percent' && dto.amount > 100) throw new UnprocessableEntityException('invalid_coupon');
    const description = dto.description !== undefined ? normalizeName(dto.description) : undefined;
    if (description !== undefined && description.length > 300) throw new UnprocessableEntityException('invalid_coupon');
    return {
      ...(description !== undefined ? { description } : {}),
      ...(dto.maxUses !== undefined ? { maxUses: dto.maxUses } : {}),
      ...(dto.maxUsesPerTenant !== undefined ? { maxUsesPerTenant: dto.maxUsesPerTenant } : {}),
      ...(dto.planIds !== undefined ? { planIds: uuids(dto.planIds)! } : {}),
      ...(dto.startsAt !== undefined ? { startsAt: optionalDate(dto.startsAt, 'starts_at') ?? null } : {}),
      ...(dto.endsAt !== undefined ? { endsAt: optionalDate(dto.endsAt, 'ends_at') ?? null } : {}),
      ...(dto.active !== undefined ? { active: dto.active } : {}),
    };
  }

  private announcementValues(dto: AnnouncementDto) {
    const title = dto.title !== undefined ? normalizeName(dto.title) : undefined;
    if (title !== undefined && (title.length < 1 || title.length > 120)) throw new UnprocessableEntityException('invalid_announcement');
    const body = dto.body !== undefined ? dto.body.trim() : undefined;
    if (body !== undefined && body.length > 1000) throw new UnprocessableEntityException('invalid_announcement');
    const targetType = dto.targetType;
    let targetIds = dto.targetIds;
    if (targetIds !== undefined) {
      if (targetIds.length > 200 || !targetIds.every((v) => typeof v === 'string' && v.length <= 64)) throw new UnprocessableEntityException('invalid_targets');
      // tenants: شناسه‌ی uuid؛ plans: کد پلن.
      targetIds = targetType === 'tenants' ? uuids(targetIds) : [...new Set(targetIds.map((v) => v.trim()).filter(Boolean))];
    }
    const startsAt = optionalDate(dto.startsAt, 'starts_at');
    const linkLabel = dto.linkLabel !== undefined ? normalizeName(dto.linkLabel ?? '') || null : undefined;
    return {
      ...(title !== undefined ? { title } : {}),
      ...(body !== undefined ? { body } : {}),
      ...(dto.linkUrl !== undefined ? { linkUrl: safeLink(dto.linkUrl) ?? null } : {}),
      ...(linkLabel !== undefined ? { linkLabel } : {}),
      ...(dto.tone !== undefined ? { tone: dto.tone } : {}),
      ...(dto.audience !== undefined ? { audience: dto.audience } : {}),
      ...(targetType !== undefined ? { targetType } : {}),
      ...(targetIds !== undefined ? { targetIds } : {}),
      ...(startsAt ? { startsAt } : {}),
      ...(dto.endsAt !== undefined ? { endsAt: optionalDate(dto.endsAt, 'ends_at') ?? null } : {}),
      ...(dto.active !== undefined ? { active: dto.active } : {}),
    };
  }
}
