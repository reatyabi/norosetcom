import { describe, expect, it } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { db, eq, fixedPlan, platformUsers, tenantMemberships, withUser } from '@noroset/core';
import { TenantsService } from '../src/tenants/tenants.service';

const trials: { tenantId: string; userId: string }[] = [];
const service = new TenantsService({
  ...fixedPlan(),
  startTrial: async (tenantId, userId) => {
    trials.push({ tenantId, userId });
    return true;
  },
});

describe('tenants', () => {
  it('creates tenant and makes user owner', async () => {
    const [user] = await db
      .insert(platformUsers)
      .values({ mobile: `+98939${Math.floor(Math.random() * 1e9).toString().padStart(9, '0')}` })
      .returning();
    const slug = `own-${Date.now()}`;

    const tenant = await service.create(user!.id, 'My Tenant', slug);
    expect(tenant.slug).toBe(slug);

    const memberships = await withUser(user!.id, (tx) =>
      tx.select().from(tenantMemberships).where(eq(tenantMemberships.tenantId, tenant.id)).limit(1),
    );
    expect(memberships).toHaveLength(1);
    expect(memberships[0]?.role).toBe('owner');
    expect(trials).toContainEqual({ tenantId: tenant.id, userId: user!.id });
  });

  it('creates one default tenant, once, even for concurrent requests', async () => {
    const [user] = await db
      .insert(platformUsers)
      .values({ mobile: `+98942${Math.floor(Math.random() * 1e9).toString().padStart(9, '0')}`, fullName: 'علی' })
      .returning();
    const [a, b] = await Promise.all([service.ensureDefault(user!.id), service.ensureDefault(user!.id)]);
    expect(a!.id).toBe(b!.id);
    expect((await service.ensureDefault(user!.id)).id).toBe(a!.id);

    const memberships = await withUser(user!.id, (tx) => tx.select().from(tenantMemberships).where(eq(tenantMemberships.userId, user!.id)));
    expect(memberships).toHaveLength(1);
    expect(memberships[0]?.role).toBe('owner');
    expect(trials.filter((t) => t.userId === user!.id)).toEqual([{ tenantId: a!.id, userId: user!.id }]);
  });

  it('rejects reserved slug', async () => {
    const [user] = await db
      .insert(platformUsers)
      .values({ mobile: `+98940${Math.floor(Math.random() * 1e9).toString().padStart(9, '0')}` })
      .returning();
    await expect(service.create(user!.id, 'X', 'form')).rejects.toThrow(ConflictException);
  });

  it('rejects duplicate slug', async () => {
    const [user] = await db
      .insert(platformUsers)
      .values({ mobile: `+98941${Math.floor(Math.random() * 1e9).toString().padStart(9, '0')}` })
      .returning();
    const slug = `dup-${Date.now()}`;
    await service.create(user!.id, 'A', slug);
    await expect(service.create(user!.id, 'B', slug)).rejects.toThrow(ConflictException);
  });
});
