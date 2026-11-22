import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from 'pg';
import { db, withTenant, platformUsers, tenants, tenantMemberships } from '../src/index';

async function one<T>(rows: Promise<T[]>): Promise<T> {
  const [row] = await rows;
  if (!row) throw new Error('expected one row');
  return row;
}

let client: Client;

beforeAll(async () => {
  client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
});

afterAll(async () => {
  await client.end();
});

describe('tenant isolation (RLS)', () => {
  it('app connection runs as noroset_app without BYPASSRLS', async () => {
    const cur = await client.query('SELECT current_user AS u');
    expect(cur.rows[0].u).toBe('noroset_app');

    const byp = await client.query("SELECT rolbypassrls FROM pg_roles WHERE rolname = 'noroset_app'");
    expect(byp.rows[0].rolbypassrls).toBe(false);
  });

  it('tenant A does not see tenant B data', async () => {
    const a = await one(db.insert(tenants).values({ name: 'Tenant A', slug: 'tenant-a' }).returning());
    const b = await one(db.insert(tenants).values({ name: 'Tenant B', slug: 'tenant-b' }).returning());
    const u = await one(db.insert(platformUsers).values({ mobile: '09120000001' }).returning());

    await withTenant(a.id, (tx) =>
      tx.insert(tenantMemberships).values({ tenantId: a.id, userId: u.id, role: 'owner' }),
    );
    await withTenant(b.id, (tx) =>
      tx.insert(tenantMemberships).values({ tenantId: b.id, userId: u.id, role: 'member' }),
    );

    const inA = await withTenant(a.id, (tx) => tx.select().from(tenantMemberships));
    expect(inA).toHaveLength(1);
    expect(inA[0]?.tenantId).toBe(a.id);
  });

  it('no rows are visible without setting the tenant', async () => {
    const { rows } = await client.query('SELECT * FROM tenant_memberships');
    expect(rows).toHaveLength(0);
  });

  it('rejects INSERT with mismatched tenant_id', async () => {
    const a = await one(db.insert(tenants).values({ name: 'Tenant A2', slug: 'tenant-a2' }).returning());
    const b = await one(db.insert(tenants).values({ name: 'Tenant B2', slug: 'tenant-b2' }).returning());
    const u = await one(db.insert(platformUsers).values({ email: 'u2@example.com' }).returning());

    await client.query('BEGIN');
    try {
      await client.query("SELECT set_config('app.current_tenant', $1, true)", [a.id]);
      await expect(
        client.query('INSERT INTO tenant_memberships (tenant_id, user_id) VALUES ($1, $2)', [
          b.id,
          u.id,
        ]),
      ).rejects.toThrow();
    } finally {
      await client.query('ROLLBACK');
    }
  });

  it('noroset_app cannot bypass RLS (cannot SET ROLE to migrator)', async () => {
    await expect(client.query('SET ROLE noroset_migrator')).rejects.toThrow();
  });

  it('tenant setting does not leak between transactions on one connection', async () => {
    const a = await one(db.insert(tenants).values({ name: 'Tenant A3', slug: 'tenant-a3' }).returning());

    await client.query('BEGIN');
    await client.query("SELECT set_config('app.current_tenant', $1, true)", [a.id]);
    await client.query('COMMIT');

    const after = await client.query("SELECT current_setting('app.current_tenant', true) AS ct");
    const ct = after.rows[0].ct as string | null;
    expect(ct === null || ct === '').toBe(true);

    const { rows } = await client.query('SELECT * FROM tenant_memberships');
    expect(rows).toHaveLength(0);
  });

  it('rejects reserved and duplicate slugs', async () => {
    await expect(db.insert(tenants).values({ name: 'x', slug: 'form' })).rejects.toThrow();
    await expect(db.insert(tenants).values({ name: 'x', slug: 'f' })).rejects.toThrow();

    await db.insert(tenants).values({ name: 'dup', slug: 'dup-slug' });
    await expect(db.insert(tenants).values({ name: 'dup2', slug: 'dup-slug' })).rejects.toThrow();
  });

  it('noroset_app has no CREATE on schema', async () => {
    await expect(client.query('CREATE TABLE should_not_exist (id int)')).rejects.toThrow();
  });

  it('rejects platform_users with both mobile and email null', async () => {
    await expect(db.insert(platformUsers).values({ mobile: null, email: null })).rejects.toThrow();
  });

  it('noroset_app has only SELECT on reserved_slugs', async () => {
    const { rows } = await client.query('SELECT count(*)::int AS n FROM reserved_slugs');
    expect(rows[0].n).toBeGreaterThan(0);

    await expect(client.query("INSERT INTO reserved_slugs (slug) VALUES ('zzz')")).rejects.toThrow();
  });
});
