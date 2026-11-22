import { Inject, Injectable } from '@nestjs/common';
import {
  panelAnnouncementDismissals,
  panelAnnouncements,
  TENANT_CONTEXT,
  withUser,
  type TenantContext,
} from '@noroset/core';
import { pgCode } from '../access';
import { resolvePlan } from '../billing/billing.core';

export interface PanelAnnouncement {
  id: string;
  title: string;
  body: string;
  linkUrl: string | null;
  linkLabel: string | null;
  tone: 'info' | 'warning' | 'success';
}

/**
 * اعلان‌های درون پنل برای کاربر فضای کاری جاری (docs/architecture.md §9.11، ۱۱.۷). RLS فقط اعلان‌های فعالِ در
 * بازه را نشان می‌دهد؛ هدف (همه/پلن/فضای کاری) و مخاطب (همه/مالک و مدیر) اینجا اعمال می‌شود و اهداف هرگز
 * به کاربر برنمی‌گردند. بستن به‌ازای کاربر در DB.
 */
@Injectable()
export class AnnouncementsService {
  constructor(@Inject(TENANT_CONTEXT) private readonly ctx: TenantContext) {}

  async list(): Promise<PanelAnnouncement[]> {
    const tenantId = this.ctx.tenantId();
    const userId = this.ctx.userId();
    const manager = this.ctx.role() === 'owner' || this.ctx.role() === 'admin';
    const { rows, planCodes } = await this.ctx.run(async (tx) => {
      const plan = await resolvePlan(tx, tenantId, new Date());
      return {
        rows: await tx.select().from(panelAnnouncements),
        // چنده‌اشتراکی (§9.11): «هدف: پلن» با داشتن هر یک از پلن‌های فعال tenant (هر محصول) دیده می‌شود؛ پلن
        // نماینده (پلن محدود/رایگانِ فعلی) هم حساب می‌شود تا اعلان‌های پلن پایه از دست نروند.
        planCodes: new Set([plan.code, ...(plan.activePlans ?? []).map((p) => p.code)]),
      };
    });
    const dismissed = new Set(
      (await withUser(userId, (tx) => tx.select({ id: panelAnnouncementDismissals.announcementId }).from(panelAnnouncementDismissals))).map((d) => d.id),
    );
    return rows
      .filter((a) => !dismissed.has(a.id))
      .filter((a) => a.audience === 'all_members' || manager)
      .filter((a) => a.targetType === 'all' || (a.targetType === 'plans' ? a.targetIds.some((code) => planCodes.has(code)) : a.targetIds.includes(tenantId)))
      .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())
      .slice(0, 3)
      .map(({ id, title, body, linkUrl, linkLabel, tone }) => ({ id, title, body, linkUrl, linkLabel, tone }));
  }

  async dismiss(id: string): Promise<void> {
    const userId = this.ctx.userId();
    try {
      await withUser(userId, (tx) => tx.insert(panelAnnouncementDismissals).values({ userId, announcementId: id }).onConflictDoNothing());
    } catch (err) {
      // اعلان ناموجود: بستنش بی‌معناست و بی‌اثر می‌ماند.
      if (pgCode(err) !== '23503') throw err;
    }
  }
}
