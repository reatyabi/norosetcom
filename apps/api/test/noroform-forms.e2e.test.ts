import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import cookie from '@fastify/cookie';
import {
  billingPlans,
  billingSubscriptions,
  db,
  eq,
  findPublicForm,
  noroformSubmissions,
  platformUsers,
  tenantMemberships,
  tenants,
  withPlatformAdmin,
  withTenant,
  type MembershipRole,
} from '@noroset/core';
import { AppModule } from '../src/app.module';
import { getJwtSecret } from '../src/config/secrets';

// سیم‌کشی واقعی: گاردهای سراسری (auth ← tenant ← role)، توکن TENANT_CONTEXT، ValidationPipe و NoroformModule.

let app: NestFastifyApplication;
const jwt = new JwtService({ secret: getJwtSecret(), signOptions: { expiresIn: '15m' } });

let seq = 0;
const uniq = (p: string) => `${p}-${Date.now().toString(36)}-${++seq}`;

async function newUser(): Promise<string> {
  const [u] = await db
    .insert(platformUsers)
    .values({ mobile: `+98936${Math.floor(Math.random() * 1e9).toString().padStart(9, '0')}` })
    .returning();
  return u!.id;
}

/**
 * پلن seed («پایه نورولینک») دامنه‌ی نورولینک دارد و سقف‌های فرم را نمی‌دهد (§9.11)، پس سناریوها روی یک پلن
 * نوروفورم با اشتراک دستی اجرا می‌شوند؛ PLAN_RESOLVER واقعی می‌ماند و سقف ۵۰ فرم از همان پلن می‌آید.
 */
const NOROFORM_PLAN = {
  code: 'e2e_noroform',
  name: 'نوروفورم (تست)',
  rank: 30,
  entitlements: { 'noroform.forms': 50, 'noroform.submissions_monthly': 10_000, 'branding.remove': true },
} as const;

const E2E_ADMIN_EMAIL = 'e2e-noroform-admin@noroset.test';

/** ادمین پلتفرم ثابت برای نوشتن پلن (RLS `is_platform_admin()` فقط superadmin فعال را می‌پذیرد). */
async function platformAdminId(): Promise<string> {
  const [existing] = await db
    .select({ id: platformUsers.id })
    .from(platformUsers)
    .where(eq(platformUsers.email, E2E_ADMIN_EMAIL))
    .limit(1);
  if (existing) return existing.id;
  const [created] = await db.insert(platformUsers).values({ email: E2E_ADMIN_EMAIL, platformRole: 'superadmin' }).returning();
  return created!.id;
}

async function ensureNoroformPlan(): Promise<string> {
  const admin = await platformAdminId();
  const values = { name: NOROFORM_PLAN.name, rank: NOROFORM_PLAN.rank, active: true, scope: 'noroform' as const, entitlements: NOROFORM_PLAN.entitlements };
  const [existing] = await db
    .select({ id: billingPlans.id })
    .from(billingPlans)
    .where(eq(billingPlans.code, NOROFORM_PLAN.code))
    .limit(1);
  if (existing) {
    // اجراهای قبلی/تغییر سقف‌ها: پلن هر بار هم‌گام می‌شود تا fixture کهنه نماند.
    await withPlatformAdmin(admin, (tx) => tx.update(billingPlans).set(values).where(eq(billingPlans.id, existing.id)));
    return existing.id;
  }
  const [created] = await withPlatformAdmin(admin, (tx) =>
    tx.insert(billingPlans).values({ code: NOROFORM_PLAN.code, ...values }).returning({ id: billingPlans.id }),
  );
  return created!.id;
}

async function grantNoroformPlan(tenantId: string) {
  const planId = await ensureNoroformPlan();
  const now = Date.now();
  await withTenant(tenantId, (tx) =>
    tx.insert(billingSubscriptions).values({ tenantId, planId, source: 'manual', startsAt: new Date(now - 1000), endsAt: new Date(now + 86_400_000) }),
  );
}

async function addMember(tenantId: string, userId: string, role: MembershipRole) {
  await withTenant(tenantId, (tx) => tx.insert(tenantMemberships).values({ tenantId, userId, role }));
}

let tenantA: string;
let tenantB: string;
let owner: string;
let member: string;
let outsider: string;
let ownerB: string;

function call(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  url: string,
  opts: { user?: string; tenant?: string; body?: unknown; ip?: string } = {},
) {
  const headers: Record<string, string> = {};
  if (opts.user) headers.cookie = `access_token=${jwt.sign({ sub: opts.user })}`;
  if (opts.tenant) headers['x-tenant-id'] = opts.tenant;
  return app.inject({ method, url, headers, payload: opts.body as never, remoteAddress: opts.ip ?? '127.0.0.1' });
}

const validDraft = {
  version_schema: 1,
  pages: [
    {
      page_id: 'p_aaaaaaaa',
      kind: 'main',
      body: { items: [{ kind: 'field', item_id: 'i_aaaaaaaa', field_id: 'f_aaaaaaaa', type: 'email', label: 'ایمیل' }] },
    },
  ],
};

beforeAll(async () => {
  app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), { logger: false });
  await app.register(cookie);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  [tenantA, tenantB] = await Promise.all(
    ['e2e-a', 'e2e-b'].map(async (p) => (await db.insert(tenants).values({ name: p, slug: uniq(p) }).returning())[0]!.id),
  ) as [string, string];
  owner = await newUser();
  member = await newUser();
  outsider = await newUser();
  ownerB = await newUser();
  await addMember(tenantA, owner, 'owner');
  await addMember(tenantA, member, 'member');
  await addMember(tenantB, ownerB, 'owner');
  await grantNoroformPlan(tenantA);
});

afterAll(async () => {
  await app?.close();
});

describe('noroform forms API — plan limit', () => {
  it('the free plan stops at 3 forms with 403 plan_limit (tenant B has no subscription)', async () => {
    const statuses = [];
    for (let i = 0; i < 4; i++) statuses.push((await call('POST', '/noroform/forms', { user: ownerB, tenant: tenantB, body: { title: `p${i}` } })).statusCode);
    expect(statuses).toEqual([201, 201, 201, 403]);
  });
});

describe('noroform forms API — access', () => {
  it('401 without a session', async () => {
    expect((await call('GET', '/noroform/forms', { tenant: tenantA })).statusCode).toBe(401);
  });

  it('400 without X-Tenant-Id', async () => {
    expect((await call('GET', '/noroform/forms', { user: owner })).statusCode).toBe(400);
  });

  it('403 for a non-member', async () => {
    expect((await call('GET', '/noroform/forms', { user: outsider, tenant: tenantA })).statusCode).toBe(403);
  });

  it('non-tenant routes are unaffected by the global tenant guard', async () => {
    expect((await call('GET', '/me', { user: owner })).statusCode).toBe(200);
  });
});

describe('noroform forms API — lifecycle', () => {
  it('member builds a draft; only owner/admin can publish; result is public', async () => {
    const created = await call('POST', '/noroform/forms', { user: member, tenant: tenantA, body: { title: '  ثبت‌نام  ' } });
    expect(created.statusCode).toBe(201);
    const form = created.json();
    expect(form).toMatchObject({ title: 'ثبت‌نام', status: 'draft', issues: [] });

    const patched = await call('PATCH', `/noroform/forms/${form.id}`, {
      user: member,
      tenant: tenantA,
      body: { draftDefinition: validDraft, unknownProp: 'stripped' },
    });
    expect(patched.statusCode).toBe(200);

    expect((await call('POST', `/noroform/forms/${form.id}/publish`, { user: member, tenant: tenantA })).statusCode).toBe(403);

    const published = await call('POST', `/noroform/forms/${form.id}/publish`, { user: owner, tenant: tenantA });
    expect(published.statusCode).toBe(200);
    expect(published.json()).toMatchObject({ status: 'published', currentVersionNumber: 1 });
    expect((await findPublicForm(form.slug))?.status).toBe('published');

    const list = await call('GET', '/noroform/forms', { user: member, tenant: tenantA });
    expect(list.json().map((f: { id: string }) => f.id)).toContain(form.id);
  });

  it('422 with issues when publishing an invalid draft', async () => {
    const form = (await call('POST', '/noroform/forms', { user: owner, tenant: tenantA, body: { title: 'x' } })).json();
    await call('PATCH', `/noroform/forms/${form.id}`, {
      user: owner,
      tenant: tenantA,
      body: { draftDefinition: { version_schema: 1, pages: [] } },
    });
    const res = await call('POST', `/noroform/forms/${form.id}/publish`, { user: owner, tenant: tenantA });
    expect(res.statusCode).toBe(422);
    expect(res.json().issues.length).toBeGreaterThan(0);
  });

  it('validates input: bad slug, non-object draft, non-uuid id', async () => {
    const bad = await call('POST', '/noroform/forms', { user: owner, tenant: tenantA, body: { title: 'x', slug: 'Bad Slug' } });
    expect(bad.statusCode).toBe(400);
    const form = (await call('POST', '/noroform/forms', { user: owner, tenant: tenantA, body: { title: 'x' } })).json();
    const notObject = await call('PATCH', `/noroform/forms/${form.id}`, {
      user: owner,
      tenant: tenantA,
      body: { draftDefinition: 'nope' },
    });
    expect(notObject.statusCode).toBe(400);
    expect((await call('GET', '/noroform/forms/not-a-uuid', { user: owner, tenant: tenantA })).statusCode).toBe(400);
  });

  it('another tenant cannot see or modify the form (404)', async () => {
    const form = (await call('POST', '/noroform/forms', { user: owner, tenant: tenantA, body: { title: 'x' } })).json();
    expect((await call('GET', `/noroform/forms/${form.id}`, { user: ownerB, tenant: tenantB })).statusCode).toBe(404);
    expect((await call('DELETE', `/noroform/forms/${form.id}`, { user: ownerB, tenant: tenantB })).statusCode).toBe(404);
    // و با هدر tenant A هم دسترسی ندارد چون عضو A نیست.
    expect((await call('GET', `/noroform/forms/${form.id}`, { user: ownerB, tenant: tenantA })).statusCode).toBe(403);
  });

  it('delete requires owner/admin and returns 204', async () => {
    const form = (await call('POST', '/noroform/forms', { user: member, tenant: tenantA, body: { title: 'x' } })).json();
    expect((await call('DELETE', `/noroform/forms/${form.id}`, { user: member, tenant: tenantA })).statusCode).toBe(403);
    expect((await call('DELETE', `/noroform/forms/${form.id}`, { user: owner, tenant: tenantA })).statusCode).toBe(204);
    expect((await call('GET', `/noroform/forms/${form.id}`, { user: owner, tenant: tenantA })).statusCode).toBe(404);
  });
});

describe('noroform public API', () => {
  let ipSeq = 0;
  const nextIp = () => `10.20.${Math.floor(++ipSeq / 250)}.${ipSeq % 250}`;
  const idem = () => uniq('idem').replace(/-/g, '_');

  /** فرم منتشرشده از مسیر واقعی API (owner). */
  async function published() {
    const form = (await call('POST', '/noroform/forms', { user: owner, tenant: tenantA, body: { title: 'عمومی', responseAuth: 'link' } })).json();
    await call('PATCH', `/noroform/forms/${form.id}`, { user: owner, tenant: tenantA, body: { draftDefinition: validDraft } });
    await call('POST', `/noroform/forms/${form.id}/publish`, { user: owner, tenant: tenantA });
    return form as { id: string; slug: string };
  }

  it('anonymous read and submit (no session, no tenant header)', async () => {
    const form = await published();
    const ip = nextIp();
    const read = await call('GET', `/noroform/public/forms/${form.slug}`, { ip });
    expect(read.statusCode).toBe(200);
    const view = read.json();
    expect(view).toMatchObject({ status: 'published', title: 'عمومی', // اشتراک «حرفه‌ای» tenant A برندینگ را حذف می‌کند (docs/architecture.md §9.11).
      branding: { forceLicense: false } });
    expect(view).not.toHaveProperty('draftDefinition');

    const body = { versionId: view.versionId, idempotencyKey: idem(), answers: { f_aaaaaaaa: 'A@B.COM' } };
    const sent = await call('POST', `/noroform/public/forms/${form.slug}/submissions`, { ip, body });
    expect(sent.statusCode).toBe(201);
    expect(sent.json()).toEqual({ ok: true });
    // تکرار با همان کلید: همان پاسخ، بدون ردیف جدید.
    expect((await call('POST', `/noroform/public/forms/${form.slug}/submissions`, { ip, body })).statusCode).toBe(201);
  });

  it('400 for malformed payloads, 422 for invalid answers, 404 for drafts', async () => {
    const form = await published();
    const ip = nextIp();
    const view = (await call('GET', `/noroform/public/forms/${form.slug}`, { ip })).json();
    const url = `/noroform/public/forms/${form.slug}/submissions`;
    expect((await call('POST', url, { ip, body: { versionId: view.versionId, answers: {} } })).statusCode).toBe(400);
    expect(
      (await call('POST', url, { ip, body: { versionId: 'nope', idempotencyKey: idem(), answers: {} } })).statusCode,
    ).toBe(400);
    const invalid = await call('POST', url, {
      ip,
      body: { versionId: view.versionId, idempotencyKey: idem(), answers: { f_aaaaaaaa: 'not-an-email' } },
    });
    expect(invalid.statusCode).toBe(422);
    expect(invalid.json().errors).toEqual([{ field_id: 'f_aaaaaaaa', code: 'invalid_email' }]);

    const draft = (await call('POST', '/noroform/forms', { user: owner, tenant: tenantA, body: { title: 'd' } })).json();
    expect((await call('GET', `/noroform/public/forms/${draft.slug}`, { ip })).statusCode).toBe(404);
  });

  it('rate limits submissions per IP (429), independently per IP', async () => {
    const form = await published();
    const ip = nextIp();
    const url = `/noroform/public/forms/${form.slug}/submissions`;
    // honeypot پر است تا چیزی ذخیره نشود؛ محدودیت قبل از honeypot اعمال می‌شود.
    const body = () => ({ versionId: '00000000-0000-4000-8000-000000000000', idempotencyKey: idem(), answers: {}, website: 'x' });
    for (let i = 0; i < 10; i++) expect((await call('POST', url, { ip, body: body() })).statusCode).toBe(201);
    expect((await call('POST', url, { ip, body: body() })).statusCode).toBe(429);
    expect((await call('POST', url, { ip: nextIp(), body: body() })).statusCode).toBe(201);
  });
});

describe('noroform submissions API', () => {
  async function formWithSubmission() {
    const form = (await call('POST', '/noroform/forms', { user: owner, tenant: tenantA, body: { title: 'گزارش', responseAuth: 'link' } })).json();
    await call('PATCH', `/noroform/forms/${form.id}`, { user: owner, tenant: tenantA, body: { draftDefinition: validDraft } });
    await call('POST', `/noroform/forms/${form.id}/publish`, { user: owner, tenant: tenantA });
    const view = (await call('GET', `/noroform/public/forms/${form.slug}`, { ip: '10.99.0.1' })).json();
    await call('POST', `/noroform/public/forms/${form.slug}/submissions`, {
      ip: '10.99.0.1',
      body: { versionId: view.versionId, idempotencyKey: uniq('k').replace(/-/g, '_'), answers: { f_aaaaaaaa: 'x@y.com' } },
    });
    return form as { id: string; slug: string };
  }

  it('members list (query parsed to numbers) and read a single submission', async () => {
    const form = await formWithSubmission();
    const list = await call('GET', `/noroform/forms/${form.id}/submissions?limit=10&offset=0`, { user: member, tenant: tenantA });
    expect(list.statusCode).toBe(200);
    const page = list.json();
    expect(page).toMatchObject({ total: 1, limit: 10, offset: 0, columns: [{ fieldId: 'f_aaaaaaaa', label: 'ایمیل' }] });
    const one = await call('GET', `/noroform/forms/${form.id}/submissions/${page.items[0].id}`, { user: member, tenant: tenantA });
    expect(one.json().fields).toEqual([
      { fieldId: 'f_aaaaaaaa', label: 'ایمیل', type: 'email', value: 'x@y.com', display: 'x@y.com' },
    ]);
  });

  it('400 for bad query params; 403 for non-members', async () => {
    const form = await formWithSubmission();
    const base = `/noroform/forms/${form.id}/submissions`;
    expect((await call('GET', `${base}?limit=500`, { user: owner, tenant: tenantA })).statusCode).toBe(400);
    expect((await call('GET', `${base}?from=1405-01-01x`, { user: owner, tenant: tenantA })).statusCode).toBe(400);
    expect((await call('GET', `${base}?from=2026-02-30`, { user: owner, tenant: tenantA })).statusCode).toBe(400);
    expect((await call('GET', base, { user: outsider, tenant: tenantA })).statusCode).toBe(403);
  });

  it('CSV export: content type, attachment filename, BOM', async () => {
    const form = await formWithSubmission();
    const res = await call('GET', `/noroform/forms/${form.id}/submissions/export.csv?from=2000-01-01`, {
      user: member,
      tenant: tenantA,
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('text/csv; charset=utf-8');
    expect(res.headers['content-disposition']).toBe(`attachment; filename="noroform-${form.slug}-responses.csv"`);
    expect(res.rawPayload.subarray(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf]));
    expect(res.body).toContain('x@y.com');
  });

  it('XLSX export: spreadsheet content type, attachment filename, zip payload', async () => {
    const form = await formWithSubmission();
    const res = await call('GET', `/noroform/forms/${form.id}/submissions/export.xlsx?from=2000-01-01`, {
      user: member,
      tenant: tenantA,
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(res.headers['content-disposition']).toBe(
      `attachment; filename="noroform-${form.slug}-responses.xlsx"`,
    );
    // بدنه باید بایت‌های ZIP (PK\x03\x04) باشد، نه JSON سریالایز‌شدهٔ Buffer.
    expect([...res.rawPayload.subarray(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect(res.rawPayload.length).toBeGreaterThan(1000);
  });

  it('shares one response through a token link and revokes it', async () => {
    const form = await formWithSubmission();
    const list = await call('GET', `/noroform/forms/${form.id}/submissions`, { user: member, tenant: tenantA });
    const submissionId = list.json().items[0].id as string;

    expect(
      (await call('POST', `/noroform/forms/${form.id}/submissions/${submissionId}/response-link`, { user: outsider, tenant: tenantA }))
        .statusCode,
    ).toBe(403);

    const created = await call('POST', `/noroform/forms/${form.id}/submissions/${submissionId}/response-link`, {
      user: member,
      tenant: tenantA,
      body: { expiresInDays: 1 },
    });
    expect(created.statusCode).toBe(200);
    const { token } = created.json() as { token: string; expiresAt: string };
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const publicRead = await call('GET', `/noroform/public/responses/${token}`, { ip: '10.30.0.1' });
    expect(publicRead.statusCode).toBe(200);
    expect(publicRead.json()).toMatchObject({
      formTitle: 'گزارش',
      versionNumber: 1,
      fields: [{ fieldId: 'f_aaaaaaaa', label: 'ایمیل', value: 'x@y.com' }],
    });

    expect(
      (await call('DELETE', `/noroform/forms/${form.id}/submissions/${submissionId}/response-link`, {
        user: member,
        tenant: tenantA,
      })).statusCode,
    ).toBe(403);

    const revoked = await call('DELETE', `/noroform/forms/${form.id}/submissions/${submissionId}/response-link`, {
      user: owner,
      tenant: tenantA,
    });
    expect(revoked.statusCode).toBe(204);
    expect((await call('GET', `/noroform/public/responses/${token}`, { ip: '10.30.0.1' })).statusCode).toBe(404);
  });

  it('requests and verifies an OTP for a response link', async () => {
    const form = (
      await call('POST', '/noroform/forms', {
        user: owner,
        tenant: tenantA,
        body: { title: 'OTPدار', responseAuth: 'otp' },
      })
    ).json();
    await call('PATCH', `/noroform/forms/${form.id}`, { user: owner, tenant: tenantA, body: { draftDefinition: validDraft } });
    await call('POST', `/noroform/forms/${form.id}/publish`, { user: owner, tenant: tenantA });
    const view = (await call('GET', `/noroform/public/forms/${form.slug}`, { ip: '10.41.0.1' })).json();
    await call('POST', `/noroform/public/forms/${form.slug}/submissions`, {
      ip: '10.41.0.1',
      body: { versionId: view.versionId, idempotencyKey: uniq('otp').replace(/-/g, '_'), answers: { f_aaaaaaaa: 'otp@y.com' } },
    });
    const list = await call('GET', `/noroform/forms/${form.id}/submissions`, { user: member, tenant: tenantA });
    const submissionId = list.json().items[0].id as string;
    const created = await call('POST', `/noroform/forms/${form.id}/submissions/${submissionId}/response-link`, {
      user: member,
      tenant: tenantA,
    });
    expect(created.statusCode).toBe(200);
    const link = created.json() as { token: string; authMode: string };
    expect(link.authMode).toBe('otp');

    const logs: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(' '));
    });
    const requested = await app.inject({
      method: 'POST',
      url: `/noroform/public/responses/${link.token}/otp/request`,
      payload: { mobile: '09123456789' },
      remoteAddress: '10.41.0.1',
    });
    spy.mockRestore();
    expect(requested.statusCode).toBe(200);
    const code = /code=(\d{6})/.exec(logs.join('\n'))?.[1];
    expect(code).toBeTruthy();

    const verified = await app.inject({
      method: 'POST',
      url: `/noroform/public/responses/${link.token}/otp/verify`,
      payload: { mobile: '09123456789', code },
      remoteAddress: '10.41.0.1',
    });
    expect(verified.statusCode).toBe(200);
    const cookie = String(verified.headers['set-cookie']).split(';')[0]!;
    const read = await app.inject({
      method: 'GET',
      url: `/noroform/public/responses/${link.token}`,
      headers: { cookie },
      remoteAddress: '10.41.0.1',
    });
    expect(read.statusCode).toBe(200);
    expect(read.json()).toMatchObject({ formTitle: 'OTPدار' });
  });

  it('unlocks a key-protected response into a scoped session cookie', async () => {
    const form = (
      await call('POST', '/noroform/forms', {
        user: owner,
        tenant: tenantA,
        body: { title: 'کلیددار', responseAuth: 'key' },
      })
    ).json();
    await call('PATCH', `/noroform/forms/${form.id}`, { user: owner, tenant: tenantA, body: { draftDefinition: validDraft } });
    await call('POST', `/noroform/forms/${form.id}/publish`, { user: owner, tenant: tenantA });
    const view = (await call('GET', `/noroform/public/forms/${form.slug}`, { ip: '10.40.0.1' })).json();
    await call('POST', `/noroform/public/forms/${form.slug}/submissions`, {
      ip: '10.40.0.1',
      body: { versionId: view.versionId, idempotencyKey: uniq('key').replace(/-/g, '_'), answers: { f_aaaaaaaa: 'key@y.com' } },
    });
    const list = await call('GET', `/noroform/forms/${form.id}/submissions`, { user: member, tenant: tenantA });
    const submissionId = list.json().items[0].id as string;
    const created = await call('POST', `/noroform/forms/${form.id}/submissions/${submissionId}/response-link`, {
      user: member,
      tenant: tenantA,
      body: { key: 'secret123' },
    });
    expect(created.statusCode).toBe(200);
    const link = created.json() as { token: string; authMode: string; key: string };
    expect(link).toMatchObject({ authMode: 'key', key: 'secret123' });

    const locked = await app.inject({ method: 'GET', url: `/noroform/public/responses/${link.token}`, remoteAddress: '10.40.0.1' });
    expect(locked.statusCode).toBe(401);
    expect(locked.json()).toMatchObject({ message: 'response_auth_required', authMode: 'key' });

    const unlock = await app.inject({
      method: 'POST',
      url: `/noroform/public/responses/${link.token}/unlock`,
      payload: { key: 'secret123' },
      remoteAddress: '10.40.0.1',
    });
    expect(unlock.statusCode).toBe(200);
    const cookie = String(unlock.headers['set-cookie']).split(';')[0]!;
    const read = await app.inject({
      method: 'GET',
      url: `/noroform/public/responses/${link.token}`,
      headers: { cookie },
      remoteAddress: '10.40.0.1',
    });
    expect(read.statusCode).toBe(200);
    expect(read.json()).toMatchObject({ formTitle: 'کلیددار' });
  });
});

describe('noroform internal API', () => {
  async function publishedInternal() {
    const form = (
      await call('POST', '/noroform/forms', {
        user: owner,
        tenant: tenantA,
        body: { title: 'داخلی', channel: 'internal' },
      })
    ).json();
    expect(form).toMatchObject({ channel: 'internal', status: 'draft' });
    await call('PATCH', `/noroform/forms/${form.id}`, { user: owner, tenant: tenantA, body: { draftDefinition: validDraft } });
    const published = await call('POST', `/noroform/forms/${form.id}/publish`, { user: owner, tenant: tenantA });
    expect(published.statusCode).toBe(200);
    return form as { id: string; slug: string };
  }

  it('is invisible on the public path and requires a session', async () => {
    const form = await publishedInternal();
    expect(await findPublicForm(form.slug)).toBeNull();
    expect((await call('GET', `/noroform/internal/forms/${form.id}`)).statusCode).toBe(401);
  });

  it('members can read and submit; non-members get 404', async () => {
    const form = await publishedInternal();
    const read = await call('GET', `/noroform/internal/forms/${form.id}`, { user: member });
    expect(read.statusCode).toBe(200);
    const view = read.json();
    expect(view).toMatchObject({ channel: 'internal', status: 'published', versionNumber: 1 });
    expect((await call('GET', `/noroform/internal/forms/${form.id}`, { user: outsider })).statusCode).toBe(404);

    const key = uniq('internal').replace(/-/g, '_');
    const sent = await call('POST', `/noroform/internal/forms/${form.id}/submissions`, {
      user: member,
      body: { versionId: view.versionId, idempotencyKey: key, answers: { f_aaaaaaaa: 'internal@example.com' } },
    });
    expect(sent.statusCode).toBe(201);
    const rows = await withTenant(tenantA, (tx) =>
      tx.select().from(noroformSubmissions).where(eq(noroformSubmissions.formId, form.id)),
    );
    expect(rows[0]).toMatchObject({ submittedBy: member, answers: { f_aaaaaaaa: 'internal@example.com' } });
  });

  it('cannot change channel after publishing', async () => {
    const form = await publishedInternal();
    const res = await call('PATCH', `/noroform/forms/${form.id}`, {
      user: owner,
      tenant: tenantA,
      body: { channel: 'external' },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().message).toBe('channel_locked');
  });
});
