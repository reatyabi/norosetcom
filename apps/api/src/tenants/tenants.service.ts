import { randomBytes } from 'node:crypto';
import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { db, eq, PLAN_RESOLVER, platformUsers, reservedSlugs, sql, tenantMemberships, tenants, type PlanResolver } from '@noroset/core';

@Injectable()
export class TenantsService {
  constructor(@Inject(PLAN_RESOLVER) private readonly plans: PlanResolver) {}

  /**
   * فضای کاری کاربر بدون پرسش از او: اگر عضو جایی هست همان، وگرنه یکی با نشانی تصادفی می‌سازد و ۱۴ روز
   * رایگان را شروع می‌کند. قفل کاربر جلوی دو فضای هم‌زمان را از دو تب می‌گیرد (docs/architecture.md §9.11).
   */
  async ensureDefault(userId: string): Promise<{ id: string }> {
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`default_tenant:${userId}`}, 0))`);
      await tx.execute(sql`SELECT set_config('app.current_user', ${userId}, true)`);
      const [member] = await tx.select({ id: tenantMemberships.tenantId }).from(tenantMemberships).where(eq(tenantMemberships.userId, userId)).limit(1);
      if (member) return { id: member.id, created: false };
      const [user] = await tx.select({ fullName: platformUsers.fullName }).from(platformUsers).where(eq(platformUsers.id, userId)).limit(1);
      const [tenant] = await tx
        .insert(tenants)
        .values({ name: user?.fullName || 'حساب من', slug: `w-${randomBytes(6).toString('hex')}` })
        .returning({ id: tenants.id });
      if (!tenant) throw new Error('tenant creation failed');
      await tx.execute(sql`SELECT set_config('app.current_tenant', ${tenant.id}, true)`);
      await tx.insert(tenantMemberships).values({ tenantId: tenant.id, userId, role: 'owner' });
      return { id: tenant.id, created: true };
    });
    if (result.created) await this.plans.startTrial?.(result.id, userId);
    return { id: result.id };
  }

  async create(userId: string, name: string, slug: string) {
    const reserved = await db
      .select()
      .from(reservedSlugs)
      .where(eq(reservedSlugs.slug, slug))
      .limit(1);
    if (reserved[0]) throw new ConflictException('slug is reserved');

    try {
      const created = await db.transaction(async (tx) => {
        const [tenant] = await tx.insert(tenants).values({ name, slug }).returning();
        if (!tenant) throw new Error('tenant creation failed');
        await tx.execute(sql`SELECT set_config('app.current_tenant', ${tenant.id}, true)`);
        await tx.insert(tenantMemberships).values({ tenantId: tenant.id, userId, role: 'owner' });
        return tenant;
      });
      // اولین فضای کاری کاربر پلن پایه را ۱۴ روز رایگان می‌گیرد؛ بعدی‌ها از مصرف قبلی رد می‌شوند.
      await this.plans.startTrial?.(created.id, userId);
      return created;
    } catch (err) {
      const e = err as { code?: string; cause?: { code?: string } };
      const code = e.code ?? e.cause?.code;
      if (code === '23505') {
        throw new ConflictException('slug already taken');
      }
      throw err;
    }
  }
}
