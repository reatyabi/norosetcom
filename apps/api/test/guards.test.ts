import { describe, expect, it } from 'vitest';
import { BadRequestException, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { db, PLATFORM_ROLES_KEY, platformUsers, TENANT_SCOPED_KEY, tenantMemberships, tenants, withTenant } from '@noroset/core';
import { AuthGuard } from '../src/auth/guards/auth.guard';
import { SupportSessionService } from '../src/auth/support-session.service';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { TenantGuard } from '../src/auth/guards/tenant.guard';

class MockCls {
  private store = new Map<string, unknown>();
  get<T>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }
  set(key: string, value: unknown): void {
    this.store.set(key, value);
  }
}

function makeAuthGuard(jwt: JwtService, cls: never, reflector: Reflector): AuthGuard {
  return new AuthGuard(jwt, cls, reflector, new SupportSessionService(jwt));
}

function makeCtx(req: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => (() => undefined),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

async function seedUser(): Promise<string> {
  const inserted = await db
    .insert(platformUsers)
    .values({ mobile: `+98937${Math.floor(Math.random() * 1e9).toString().padStart(9, '0')}` })
    .returning();
  return inserted[0]!.id;
}

describe('AuthGuard', () => {
  it('rejects when no access token', async () => {
    const jwt = new JwtService({ secret: 'x' });
    const guard = makeAuthGuard(jwt, new MockCls() as never, new Reflector());
    await expect(guard.canActivate(makeCtx({ cookies: {} }))).rejects.toThrow(UnauthorizedException);
  });

  it('rejects disabled user', async () => {
    const jwt = new JwtService({ secret: 'x' });
    const inserted = await db
      .insert(platformUsers)
      .values({ mobile: `+98938${Math.floor(Math.random() * 1e9).toString().padStart(9, '0')}`, status: 'disabled' })
      .returning();
    const token = jwt.sign({ sub: inserted[0]!.id });
    const guard = makeAuthGuard(jwt, new MockCls() as never, new Reflector());
    await expect(guard.canActivate(makeCtx({ cookies: { access_token: token } }))).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

/** route علامت‌خورده با @TenantScoped(). */
const scopedReflector = {
  getAllAndOverride: (key: string) => (key === TENANT_SCOPED_KEY ? true : undefined),
} as unknown as Reflector;

describe('TenantGuard', () => {
  it('passes routes that are not tenant-scoped without a header', async () => {
    const guard = new TenantGuard(new MockCls() as never, new Reflector());
    await expect(guard.canActivate(makeCtx({ headers: {} }))).resolves.toBe(true);
  });

  it('requires X-Tenant-Id on tenant-scoped routes', async () => {
    const cls = new MockCls();
    cls.set('userId', await seedUser());
    const guard = new TenantGuard(cls as never, scopedReflector);
    await expect(guard.canActivate(makeCtx({ headers: {} }))).rejects.toThrow(BadRequestException);
  });

  it('rejects user who is not a member of the tenant (403)', async () => {
    const userId = await seedUser();
    const [tenant] = await db.insert(tenants).values({ name: 't', slug: `t-${Date.now()}` }).returning();

    const cls = new MockCls();
    cls.set('userId', userId);
    const guard = new TenantGuard(cls as never, scopedReflector);

    await expect(
      guard.canActivate(makeCtx({ headers: { 'x-tenant-id': tenant!.id } })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects suspended membership (403)', async () => {
    const userId = await seedUser();
    const [tenant] = await db.insert(tenants).values({ name: 't', slug: `s-${Date.now()}` }).returning();
    await withTenant(tenant!.id, (tx) =>
      tx.insert(tenantMemberships).values({ tenantId: tenant!.id, userId, role: 'member', status: 'suspended' }),
    );

    const cls = new MockCls();
    cls.set('userId', userId);
    const guard = new TenantGuard(cls as never, scopedReflector);

    await expect(
      guard.canActivate(makeCtx({ headers: { 'x-tenant-id': tenant!.id } })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows active owner membership', async () => {
    const userId = await seedUser();
    const [tenant] = await db.insert(tenants).values({ name: 't', slug: `a-${Date.now()}` }).returning();
    await withTenant(tenant!.id, (tx) =>
      tx.insert(tenantMemberships).values({ tenantId: tenant!.id, userId, role: 'owner' }),
    );

    const cls = new MockCls();
    cls.set('userId', userId);
    const guard = new TenantGuard(cls as never, scopedReflector);

    await expect(guard.canActivate(makeCtx({ headers: { 'x-tenant-id': tenant!.id } }))).resolves.toBe(true);
  });
});

describe('RolesGuard', () => {
  it('rejects insufficient role (403)', () => {
    const cls = new MockCls();
    cls.set('role', 'member');
    const reflector = { getAllAndOverride: () => ['owner'] } as never;
    const guard = new RolesGuard(cls as never, reflector as Reflector);
    expect(() => guard.canActivate(makeCtx({}))).toThrow(ForbiddenException);
  });

  it('allows sufficient role', () => {
    const cls = new MockCls();
    cls.set('role', 'admin');
    const reflector = { getAllAndOverride: () => ['owner', 'admin'] } as never;
    const guard = new RolesGuard(cls as never, reflector as Reflector);
    expect(guard.canActivate(makeCtx({}))).toBe(true);
  });
});

describe('AuthGuard (platform roles)', () => {
  const adminOnly = {
    getAllAndOverride: (key: string) => (key === PLATFORM_ROLES_KEY ? ['superadmin'] : undefined),
  } as unknown as Reflector;
  const jwt = new JwtService({ secret: 'x' });

  async function tokenFor(values: { status?: 'active' | 'disabled' | 'blocked'; platformRole?: 'user' | 'superadmin' }) {
    const [u] = await db
      .insert(platformUsers)
      .values({ mobile: `+98939${Math.floor(Math.random() * 1e9).toString().padStart(9, '0')}`, ...values })
      .returning();
    return { id: u!.id, token: jwt.sign({ sub: u!.id }) };
  }

  it('rejects a blocked user on every route', async () => {
    const { token } = await tokenFor({ status: 'blocked' });
    const guard = makeAuthGuard(jwt, new MockCls() as never, new Reflector());
    await expect(guard.canActivate(makeCtx({ cookies: { access_token: token } }))).rejects.toThrow(UnauthorizedException);
  });

  it('platform-role routes reject a normal user with 403 and admit a superadmin', async () => {
    const user = await tokenFor({});
    await expect(
      makeAuthGuard(jwt, new MockCls() as never, adminOnly).canActivate(makeCtx({ cookies: { access_token: user.token } })),
    ).rejects.toThrow(ForbiddenException);

    const admin = await tokenFor({ platformRole: 'superadmin' });
    const cls = new MockCls();
    await expect(
      makeAuthGuard(jwt, cls as never, adminOnly).canActivate(makeCtx({ cookies: { access_token: admin.token }, ip: '1.2.3.4' })),
    ).resolves.toBe(true);
    expect(cls.get('platformRole')).toBe('superadmin');
    expect(cls.get('ip')).toBe('1.2.3.4');
  });
});
