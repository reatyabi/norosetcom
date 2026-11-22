import { Inject, Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import {
  adminAuditLog,
  and,
  asc,
  desc,
  eq,
  inArray,
  isNull,
  norolinkClaimLinks,
  norolinkTemplates,
  PLAN_RESOLVER,
  PLATFORM_ADMIN_CONTEXT,
  platformUsers,
  type PlanResolver,
  type PlatformAdminContext,
} from '@noroset/core';
import { norolinkPlan } from '../access';

// لینک‌های واگذاری برای مدیریت پلتفرم (docs/architecture.md §9.8): مختص شماره‌ی خاصی نیستند و مدیر آن‌ها را از هر راهی
// برای کسب‌وکارها می‌فرستد. قیف هر لینک: ساخته‌شده ← باز شده ← تحویل‌گرفته ← پرداخت‌کرده.

export const CLAIM_LINKS_FILENAME = 'claim-links.txt';

const TOKEN_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const TOKEN_LENGTH = 12;

/**
 * کد لینک: ۱۲ نویسه‌ی [A-Za-z0-9] (حدود ۷۱ بیت) تا نشانی در پیام کوتاه بماند؛ با سقف خواندن عمومی به‌ازای IP حدس زدنش
 * ممکن نیست. لینک‌های قبلی (۳۲ نویسه‌ی hex) همچنان کار می‌کنند.
 */
export function newClaimToken(): string {
  let token = '';
  for (let i = 0; i < TOKEN_LENGTH; i++) token += TOKEN_ALPHABET[randomInt(TOKEN_ALPHABET.length)];
  return token;
}

/**
 * نشانی کوتاه روی همان origin پنل (`/c/{code}`)؛ وب آن را به صفحه‌ی تحویل با UTM ثابت ریدایرکت می‌کند تا ثبت‌نام‌های این
 * کانال در گزارش کمپین‌ها جدا دیده شوند (first-touch، §9.11). هر لینک جدا در همین قیف پیگیری می‌شود.
 */
export function claimLinkUrl(token: string, env: Record<string, string | undefined> = process.env): string {
  const origin = (env.WEB_ORIGIN ?? 'http://localhost:3000').replace(/\/+$/, '');
  return `${origin}/c/${encodeURIComponent(token)}`;
}

export type ClaimLinkStatus = 'active' | 'claimed' | 'revoked' | 'orphaned';

export interface ClaimFunnelItem {
  id: string;
  templateId: string | null;
  templateTitle: string | null;
  businessName: string;
  note: string;
  slug: string | null;
  status: ClaimLinkStatus;
  /** فقط برای لینک فعال (لینک کلید تحویل است). */
  url: string | null;
  createdAt: Date;
  createdByName: string | null;
  openCount: number;
  firstOpenedAt: Date | null;
  lastOpenedAt: Date | null;
  claimedAt: Date | null;
  claimedBy: { id: string; mobile: string | null; fullName: string } | null;
  claimedTenantId: string | null;
  /** پلن فعلی فضای کاری مشتری و جمع پرداخت‌های موفقش؛ پیش از تحویل null. */
  plan: { name: string; status: string; endsAt: Date | null; expired: boolean; paidRial: number } | null;
}

export interface ClaimFunnel {
  /** لینک‌های فعال (برای دکمه‌ی دانلود). */
  count: number;
  totals: { created: number; opened: number; claimed: number; paid: number };
  items: ClaimFunnelItem[];
}

const ACTIVE = and(isNull(norolinkClaimLinks.claimedAt), isNull(norolinkClaimLinks.revokedAt));
const BOM = String.fromCharCode(0xfeff);
const singleLine = (s: string) => s.replace(/\s+/g, ' ').trim();
const FUNNEL_LIMIT = 200;

@Injectable()
export class ClaimLinksService {
  constructor(
    @Inject(PLATFORM_ADMIN_CONTEXT) private readonly ctx: PlatformAdminContext,
    @Inject(PLAN_RESOLVER) private readonly plans: PlanResolver,
  ) {}

  /** جدیدترین لینک‌ها (حداکثر ۲۰۰) با وضعیت قیف؛ پلن و پرداخت از Port پلن (این محصول جدول‌های billing را نمی‌شناسد). */
  async summary(): Promise<ClaimFunnel> {
    const rows = await this.ctx.run((tx) =>
      tx
        .select({
          link: norolinkClaimLinks,
          templateTitle: norolinkTemplates.title,
          createdByName: platformUsers.fullName,
        })
        .from(norolinkClaimLinks)
        .leftJoin(norolinkTemplates, eq(norolinkTemplates.id, norolinkClaimLinks.templateId))
        .leftJoin(platformUsers, eq(platformUsers.id, norolinkClaimLinks.createdBy))
        .orderBy(desc(norolinkClaimLinks.createdAt))
        .limit(FUNNEL_LIMIT),
    );
    const claimantIds = [...new Set(rows.map((r) => r.link.claimedBy).filter((id): id is string => Boolean(id)))];
    const claimants = claimantIds.length
      ? await this.ctx.run((tx) =>
          tx
            .select({ id: platformUsers.id, mobile: platformUsers.mobile, fullName: platformUsers.fullName })
            .from(platformUsers)
            .where(inArray(platformUsers.id, claimantIds)),
        )
      : [];
    const byId = new Map(claimants.map((u) => [u.id, u]));
    const tenantIds = [...new Set(rows.map((r) => r.link.claimedTenantId).filter((id): id is string => Boolean(id)))];
    const plans = new Map(await Promise.all(tenantIds.map(async (id) => [id, await this.planOf(id)] as const)));

    const items = rows.map(({ link, templateTitle, createdByName }): ClaimFunnelItem => {
      const status: ClaimLinkStatus = link.claimedAt ? 'claimed' : link.revokedAt ? 'revoked' : link.templateId ? 'active' : 'orphaned';
      return {
        id: link.id,
        templateId: link.templateId,
        templateTitle,
        businessName: link.businessName,
        note: link.note,
        slug: link.slug,
        status,
        url: status === 'active' ? claimLinkUrl(link.token) : null,
        createdAt: link.createdAt,
        createdByName: createdByName || null,
        openCount: link.openCount,
        firstOpenedAt: link.firstOpenedAt,
        lastOpenedAt: link.lastOpenedAt,
        claimedAt: link.claimedAt,
        claimedBy: link.claimedBy ? (byId.get(link.claimedBy) ?? null) : null,
        claimedTenantId: link.claimedTenantId,
        plan: link.claimedTenantId ? (plans.get(link.claimedTenantId) ?? null) : null,
      };
    });
    return {
      count: items.filter((i) => i.status === 'active').length,
      totals: {
        created: items.length,
        opened: items.filter((i) => i.openCount > 0 || i.claimedAt).length,
        claimed: items.filter((i) => i.claimedAt).length,
        paid: items.filter((i) => (i.plan?.paidRial ?? 0) > 0).length,
      },
      items,
    };
  }

  /**
   * فایل متنی: برای هر لینک نام کسب‌وکار و زیرش لینک، جدا با یک خط خالی تا کپی هر کدام ساده باشد.
   * BOM برای باز شدن درست فارسی در ویرایشگرهای متن ویندوز. هر لینک برای تحویل صفحه کافی است، پس خروجی لاگ می‌شود.
   */
  exportText(): Promise<string> {
    return this.ctx.run(async (tx) => {
      const rows = await tx
        .select({ businessName: norolinkClaimLinks.businessName, token: norolinkClaimLinks.token })
        .from(norolinkClaimLinks)
        .innerJoin(norolinkTemplates, eq(norolinkTemplates.id, norolinkClaimLinks.templateId))
        .where(ACTIVE)
        .orderBy(asc(norolinkClaimLinks.createdAt));
      await tx.insert(adminAuditLog).values({
        actorUserId: this.ctx.adminId(),
        action: 'link_claim.export',
        targetType: 'link_claim',
        details: { count: rows.length },
        ip: this.ctx.ip(),
      });
      const blocks = rows.map((r) => `${singleLine(r.businessName)}\n${claimLinkUrl(r.token)}\n`);
      return `${BOM}${blocks.join('\n')}`;
    });
  }

  private async planOf(tenantId: string): Promise<ClaimFunnelItem['plan']> {
    try {
      // دامنه‌ی norolink (§9.11): پلن نوروفورم/نوروفایل صفحه‌های لینک را فعال نمی‌کند.
      const plan = norolinkPlan(await this.plans.resolve(tenantId));
      return {
        name: plan.name,
        status: plan.status,
        endsAt: plan.endsAt,
        expired: plan.expired,
        paidRial: (await this.plans.paidRial?.(tenantId)) ?? 0,
      };
    } catch {
      return null;
    }
  }
}
