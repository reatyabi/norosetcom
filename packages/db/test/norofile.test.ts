import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import {
  db,
  eq,
  findPublicFile,
  norofileFileUsages,
  norofileFiles,
  norofileUserFiles,
  platformUsers,
  tenants,
  withTenant,
  withUser,
} from '../src/index';

const TABLES = ['norofile_files', 'norofile_file_usages'];

async function one<T>(rows: Promise<T[]>): Promise<T> {
  const [row] = await rows;
  if (!row) throw new Error('expected one row');
  return row;
}

let seq = 0;
const uniq = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${++seq}`;

async function createTenant(status: 'active' | 'suspended' = 'active') {
  return one(db.insert(tenants).values({ name: 'NFILE', slug: uniq('nfile'), status }).returning());
}

async function createFile(tenantId: string, visibility: 'private' | 'public' = 'private') {
  return withTenant(tenantId, (tx) => {
    const id = randomUUID();
    return one(
      tx
        .insert(norofileFiles)
        .values({
          id,
          tenantId,
          name: 'logo.png',
          kind: 'image',
          mimeType: 'image/png',
          extension: 'png',
          sizeBytes: 10,
          width: 1,
          height: 1,
          storageKey: `${tenantId}/${id}`,
          visibility,
        })
        .returning(),
    );
  });
}

let app: Client;

beforeAll(async () => {
  app = new Client({ connectionString: process.env.DATABASE_URL });
  await app.connect();
});

afterAll(async () => {
  await app.end();
});

describe('norofile tables — RLS and tenant isolation', () => {
  it('both tables have RLS + FORCE', async () => {
    const { rows } = await app.query(
      `SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = ANY($1) ORDER BY relname`,
      [TABLES],
    );
    expect(rows).toHaveLength(TABLES.length);
    for (const r of rows) expect([r.relname, r.relrowsecurity, r.relforcerowsecurity]).toEqual([r.relname, true, true]);
  });

  it('tenant A sees only its own files and usages', async () => {
    const a = await createTenant();
    const b = await createTenant();
    const fa = await createFile(a.id);
    const fb = await createFile(b.id);
    await withTenant(a.id, (tx) =>
      tx.insert(norofileFileUsages).values({ tenantId: a.id, fileId: fa.id, ownerType: 'test_owner', ownerId: randomUUID() }),
    );

    const seen = await withTenant(a.id, (tx) => tx.select({ id: norofileFiles.id }).from(norofileFiles));
    expect(seen.map((r) => r.id)).toContain(fa.id);
    expect(seen.map((r) => r.id)).not.toContain(fb.id);
    expect(await withTenant(b.id, (tx) => tx.select().from(norofileFileUsages))).toEqual([]);
    expect(await db.select().from(norofileFiles)).toEqual([]);
  });

  it('cannot insert a file or usage for another tenant', async () => {
    const a = await createTenant();
    const b = await createTenant();
    const fb = await createFile(b.id);
    await expect(
      withTenant(a.id, (tx) =>
        tx.insert(norofileFiles).values({
          tenantId: b.id,
          name: 'x',
          kind: 'document',
          mimeType: 'application/pdf',
          extension: 'pdf',
          sizeBytes: 1,
          storageKey: `${b.id}/${randomUUID()}`,
        }),
      ),
    ).rejects.toThrow();
    await expect(
      withTenant(a.id, (tx) =>
        tx.insert(norofileFileUsages).values({ tenantId: a.id, fileId: fb.id, ownerType: 'test_owner', ownerId: randomUUID() }),
      ),
    ).rejects.toThrow();
  });

  it('a file in use cannot be deleted; after release it can', async () => {
    const t = await createTenant();
    const f = await createFile(t.id);
    const ownerId = randomUUID();
    await withTenant(t.id, (tx) =>
      tx.insert(norofileFileUsages).values({ tenantId: t.id, fileId: f.id, ownerType: 'test_owner', ownerId }),
    );
    await expect(withTenant(t.id, (tx) => tx.delete(norofileFiles).where(eq(norofileFiles.id, f.id)))).rejects.toThrow();
    await withTenant(t.id, async (tx) => {
      await tx.delete(norofileFileUsages).where(eq(norofileFileUsages.fileId, f.id));
      await tx.delete(norofileFiles).where(eq(norofileFiles.id, f.id));
    });
    expect(await withTenant(t.id, (tx) => tx.select().from(norofileFiles).where(eq(norofileFiles.id, f.id)))).toEqual([]);
  });

  it('deleting a tenant cascades files that are in use', async () => {
    const t = await createTenant();
    const f = await createFile(t.id);
    await withTenant(t.id, (tx) =>
      tx.insert(norofileFileUsages).values({ tenantId: t.id, fileId: f.id, ownerType: 'test_owner', ownerId: randomUUID() }),
    );
    const migrator = new Client({ connectionString: process.env.DATABASE_URL_MIGRATOR });
    await migrator.connect();
    try {
      await migrator.query('DELETE FROM tenants WHERE id = $1', [t.id]);
      const { rows } = await migrator.query('SELECT 1 FROM norofile_files WHERE tenant_id = $1', [t.id]);
      expect(rows).toEqual([]);
    } finally {
      await migrator.end();
    }
  });

  it('noroset_app cannot update usages', async () => {
    const { rows } = await app.query(
      `SELECT has_table_privilege('noroset_app', 'norofile_file_usages', 'UPDATE') AS can_update`,
    );
    expect(rows[0].can_update).toBe(false);
  });
});

describe('norofile public path', () => {
  it('finds only public files of active tenants', async () => {
    const t = await createTenant();
    const pub = await createFile(t.id, 'public');
    const priv = await createFile(t.id, 'private');

    expect(await findPublicFile(pub.id)).toMatchObject({ id: pub.id, tenantId: t.id, mimeType: 'image/png', storageKey: pub.storageKey });
    expect(await findPublicFile(pub.id.toUpperCase())).toMatchObject({ id: pub.id });
    expect(await findPublicFile(priv.id)).toBeNull();
    expect(await findPublicFile(randomUUID())).toBeNull();
    expect(await findPublicFile('not-a-uuid')).toBeNull();

    const suspended = await createTenant('suspended');
    const hidden = await createFile(suspended.id, 'public');
    expect(await findPublicFile(hidden.id)).toBeNull();
  });

  it('public setting alone does not expose other files', async () => {
    const t = await createTenant();
    const pub = await createFile(t.id, 'public');
    const other = await createFile(t.id, 'public');
    await app.query('BEGIN');
    try {
      await app.query(`SELECT set_config('app.public_file_id', $1, true)`, [pub.id]);
      const { rows } = await app.query('SELECT id FROM norofile_files');
      expect(rows.map((r) => r.id)).toEqual([pub.id]);
      expect(rows.map((r) => r.id)).not.toContain(other.id);
    } finally {
      await app.query('ROLLBACK');
    }
  });
});

async function createUser(status: 'active' | 'disabled' = 'active') {
  return one(db.insert(platformUsers).values({ email: `${uniq('nfu')}@test.local`, status }).returning());
}

async function createUserFile(userId: string, visibility: 'private' | 'public' = 'public') {
  return withUser(userId, (tx) => {
    const id = randomUUID();
    return one(
      tx
        .insert(norofileUserFiles)
        .values({
          id,
          userId,
          name: 'avatar.webp',
          kind: 'image',
          mimeType: 'image/webp',
          extension: 'webp',
          sizeBytes: 10,
          width: 1,
          height: 1,
          storageKey: `users/${userId}/${id}`,
          visibility,
        })
        .returning(),
    );
  });
}

describe('norofile personal space (norofile_user_files)', () => {
  it('has RLS + FORCE and no UPDATE privilege', async () => {
    const { rows } = await app.query(
      `SELECT relrowsecurity, relforcerowsecurity, has_table_privilege('noroset_app', 'norofile_user_files', 'UPDATE') AS can_update
         FROM pg_class WHERE relname = 'norofile_user_files'`,
    );
    expect(rows[0]).toEqual({ relrowsecurity: true, relforcerowsecurity: true, can_update: false });
  });

  it('a user sees and deletes only their own files; nothing without a user', async () => {
    const a = await createUser();
    const b = await createUser();
    const fa = await createUserFile(a.id);
    const fb = await createUserFile(b.id);

    const seen = await withUser(a.id, (tx) => tx.select({ id: norofileUserFiles.id }).from(norofileUserFiles));
    expect(seen.map((r) => r.id)).toEqual([fa.id]);
    expect(await db.select().from(norofileUserFiles)).toEqual([]);

    const deleted = await withUser(a.id, (tx) => tx.delete(norofileUserFiles).where(eq(norofileUserFiles.id, fb.id)).returning());
    expect(deleted).toEqual([]);
  });

  it('cannot insert a file for another user', async () => {
    const a = await createUser();
    const b = await createUser();
    await expect(
      withUser(a.id, (tx) =>
        tx.insert(norofileUserFiles).values({
          userId: b.id,
          name: 'x.webp',
          kind: 'image',
          mimeType: 'image/webp',
          extension: 'webp',
          sizeBytes: 1,
          storageKey: `users/${b.id}/${randomUUID()}`,
        }),
      ),
    ).rejects.toThrow();
  });

  it('public path finds public files of active users only', async () => {
    const u = await createUser();
    const pub = await createUserFile(u.id, 'public');
    const priv = await createUserFile(u.id, 'private');
    expect(await findPublicFile(pub.id)).toMatchObject({ id: pub.id, tenantId: null, mimeType: 'image/webp', storageKey: pub.storageKey });
    expect(await findPublicFile(priv.id)).toBeNull();

    const disabled = await createUser('disabled');
    const hidden = await createUserFile(disabled.id, 'public');
    expect(await findPublicFile(hidden.id)).toBeNull();
  });
});
