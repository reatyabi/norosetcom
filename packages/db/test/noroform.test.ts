import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { Client } from 'pg';
import {
  createResponseLink,
  db,
  eq,
  findPublicForm,
  findInternalForm,
  findResponseForLink,
  findResponseLink,
  insertInternalSubmission,
  insertPublicSubmission,
  noroformFormVersions,
  noroformForms,
  noroformResponseLinks,
  noroformSubmissions,
  platformUsers,
  revokeResponseLinks,
  tenants,
  withTenant,
} from '../src/index';

const DRAFT_DEF = { version_schema: 1, marker: 'draft-only' };
const PUBLISHED_DEF = { version_schema: 1, marker: 'published-v1' };

async function one<T>(rows: Promise<T[]>): Promise<T> {
  const [row] = await rows;
  if (!row) throw new Error('expected one row');
  return row;
}

let seq = 0;
const uniq = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${++seq}`;

async function createTenant(status: 'active' | 'suspended' = 'active') {
  return one(db.insert(tenants).values({ name: 'NF', slug: uniq('nf'), status }).returning());
}

/** فرم با پیش‌نویس؛ در صورت درخواست نسخه‌ی ۱ منتشر و status ست می‌شود. */
async function createForm(tenantId: string, status: 'draft' | 'published' | 'closed' = 'draft') {
  return withTenant(tenantId, async (tx) => {
    const form = await one(
      tx.insert(noroformForms).values({ tenantId, title: 'فرم تست', slug: uniq('frm'), draftDefinition: DRAFT_DEF }).returning(),
    );
    if (status === 'draft') return { form, version: null };
    const version = await one(
      tx.insert(noroformFormVersions).values({ tenantId, formId: form.id, versionNumber: 1, definition: PUBLISHED_DEF }).returning(),
    );
    await tx
      .update(noroformForms)
      .set({ status, currentVersionId: version.id, publishedAt: new Date() })
      .where(eq(noroformForms.id, form.id));
    return { form: { ...form, status }, version };
  });
}

let app: Client;
let migrator: Client;

beforeAll(async () => {
  app = new Client({ connectionString: process.env.DATABASE_URL });
  migrator = new Client({ connectionString: process.env.DATABASE_URL_MIGRATOR });
  await Promise.all([app.connect(), migrator.connect()]);
});

afterAll(async () => {
  await Promise.all([app.end(), migrator.end()]);
});

/** اجرای fn روی اتصال خام noroset_app در تراکنشی که rollback می‌شود. */
async function inTx<T>(settings: Record<string, string>, fn: () => Promise<T>): Promise<T> {
  await app.query('BEGIN');
  try {
    for (const [k, v] of Object.entries(settings)) await app.query('SELECT set_config($1, $2, true)', [k, v]);
    return await fn();
  } finally {
    await app.query('ROLLBACK');
  }
}

describe('noroform tables — RLS and tenant isolation', () => {
  it('all five tables have RLS + FORCE', async () => {
    const { rows } = await app.query(
      `SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class
       WHERE relname IN ('noroform_forms', 'noroform_form_versions', 'noroform_submissions', 'noroform_response_links', 'noroform_response_otp_codes') ORDER BY relname`,
    );
    expect(rows).toHaveLength(5);
    for (const r of rows) expect([r.relname, r.relrowsecurity, r.relforcerowsecurity]).toEqual([r.relname, true, true]);
  });

  it('tenant A sees only its own forms, versions and submissions', async () => {
    const a = await createTenant();
    const b = await createTenant();
    const fa = await createForm(a.id, 'published');
    await createForm(b.id, 'published');
    const res = await insertPublicSubmission({
      slug: fa.form.slug,
      versionId: fa.version!.id,
      answers: { f_aaaaaaaa: 'x' },
      idempotencyKey: uniq('idem'),
    });
    expect(res.status).toBe('created');

    const seen = await withTenant(a.id, async (tx) => ({
      forms: await tx.select().from(noroformForms),
      versions: await tx.select().from(noroformFormVersions),
      submissions: await tx.select().from(noroformSubmissions),
    }));
    for (const rows of [seen.forms, seen.versions, seen.submissions]) {
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((r) => r.tenantId === a.id)).toBe(true);
    }
  });

  it('nothing is visible without a tenant', async () => {
    const t = await createTenant();
    await createForm(t.id, 'published');
    for (const table of ['noroform_forms', 'noroform_form_versions', 'noroform_submissions', 'noroform_response_links', 'noroform_response_otp_codes']) {
      const { rows } = await app.query(`SELECT * FROM ${table}`);
      expect(rows, table).toHaveLength(0);
    }
  });

  it('rejects writes for another tenant', async () => {
    const a = await createTenant();
    const b = await createTenant();
    await expect(
      withTenant(a.id, (tx) =>
        tx.insert(noroformForms).values({ tenantId: b.id, title: 'x', slug: uniq('frm'), draftDefinition: {} }),
      ),
    ).rejects.toThrow();
  });
});

describe('noroform tables — integrity', () => {
  it('composite FKs: a version cannot point at another tenant’s form', async () => {
    const a = await createTenant();
    const b = await createTenant();
    const { form } = await createForm(a.id);
    await expect(
      withTenant(b.id, (tx) =>
        tx.insert(noroformFormVersions).values({ tenantId: b.id, formId: form.id, versionNumber: 1, definition: {} }),
      ),
    ).rejects.toThrow();
  });

  it('current_version must belong to the same form', async () => {
    const t = await createTenant();
    const x = await createForm(t.id);
    const y = await createForm(t.id, 'published');
    await expect(
      withTenant(t.id, (tx) =>
        tx
          .update(noroformForms)
          .set({ status: 'published', currentVersionId: y.version!.id })
          .where(eq(noroformForms.id, x.form.id)),
      ),
    ).rejects.toThrow();
  });

  it('published/closed requires a current version', async () => {
    const t = await createTenant();
    const { form } = await createForm(t.id);
    await expect(
      withTenant(t.id, (tx) => tx.update(noroformForms).set({ status: 'published' }).where(eq(noroformForms.id, form.id))),
    ).rejects.toMatchObject({ cause: { constraint: 'noroform_forms_published_has_version' } });
  });

  it('version numbers are unique per form', async () => {
    const t = await createTenant();
    const { form } = await createForm(t.id, 'published');
    await expect(
      withTenant(t.id, (tx) =>
        tx.insert(noroformFormVersions).values({ tenantId: t.id, formId: form.id, versionNumber: 1, definition: {} }),
      ),
    ).rejects.toThrow();
  });

  it('submission version must belong to the submitted form', async () => {
    const t = await createTenant();
    const x = await createForm(t.id, 'published');
    const y = await createForm(t.id, 'published');
    await expect(
      withTenant(t.id, (tx) =>
        tx.insert(noroformSubmissions).values({
          tenantId: t.id,
          formId: x.form.id,
          versionId: y.version!.id,
          answers: {},
          idempotencyKey: uniq('idem'),
        }),
      ),
    ).rejects.toThrow();
  });

  it('slug: reserved, duplicate (across tenants) and malformed are rejected', async () => {
    const a = await createTenant();
    const b = await createTenant();
    const insert = (tenantId: string, slug: string) =>
      withTenant(tenantId, (tx) => tx.insert(noroformForms).values({ tenantId, title: 'x', slug, draftDefinition: {} }));
    await expect(insert(a.id, 'form')).rejects.toThrow();
    await expect(insert(a.id, 'Bad_Slug')).rejects.toThrow();
    const slug = uniq('shared');
    await insert(a.id, slug);
    await expect(insert(b.id, slug)).rejects.toThrow();
  });

  it('json columns must be objects', async () => {
    const t = await createTenant();
    await expect(
      withTenant(t.id, (tx) =>
        tx.insert(noroformForms).values({ tenantId: t.id, title: 'x', slug: uniq('frm'), draftDefinition: [] }),
      ),
    ).rejects.toThrow();
  });
});

describe('noroform tables — privileges and immutability', () => {
  it('noroset_app cannot UPDATE or DELETE versions, nor UPDATE/DELETE submissions', async () => {
    const t = await createTenant();
    const { form, version } = await createForm(t.id, 'published');
    const settings = { 'app.current_tenant': t.id };
    await expect(inTx(settings, () => app.query('UPDATE noroform_form_versions SET definition = $1', ['{}']))).rejects.toThrow(
      /permission denied/,
    );
    await expect(inTx(settings, () => app.query('DELETE FROM noroform_form_versions WHERE id = $1', [version!.id]))).rejects.toThrow(
      /permission denied/,
    );
    await expect(inTx(settings, () => app.query("UPDATE noroform_submissions SET answers = '{}'"))).rejects.toThrow(
      /permission denied/,
    );
    await expect(inTx(settings, () => app.query('DELETE FROM noroform_submissions WHERE form_id = $1', [form.id]))).rejects.toThrow(
      /permission denied/,
    );
  });

  it('versions are immutable even for the table owner (no UPDATE policy + trigger)', async () => {
    const t = await createTenant();
    const { version } = await createForm(t.id, 'published');
    await migrator.query('BEGIN');
    try {
      await migrator.query("SELECT set_config('app.current_tenant', $1, true)", [t.id]);
      // FORCE RLS بدون policy برای UPDATE ← حتی owner هیچ ردیفی را به‌روز نمی‌کند.
      const upd = await migrator.query("UPDATE noroform_form_versions SET definition = '{}' WHERE id = $1", [version!.id]);
      expect(upd.rowCount).toBe(0);
    } finally {
      await migrator.query('ROLLBACK');
    }
    // لایه‌ی دوم: trigger فعال BEFORE UPDATE (برای نقش‌هایی که RLS را دور می‌زنند).
    const { rows } = await app.query(
      `SELECT tgenabled FROM pg_trigger WHERE tgname = 'trg_noroform_form_versions_immutable' AND NOT tgisinternal`,
    );
    expect(rows).toEqual([{ tgenabled: 'O' }]);
    const after = await withTenant(t.id, (tx) =>
      tx.select().from(noroformFormVersions).where(eq(noroformFormVersions.id, version!.id)),
    );
    expect(after[0]?.definition).toEqual(PUBLISHED_DEF);
  });

  it('deleting a form cascades to its versions and submissions', async () => {
    const t = await createTenant();
    const { form, version } = await createForm(t.id, 'published');
    await insertPublicSubmission({ slug: form.slug, versionId: version!.id, answers: {}, idempotencyKey: uniq('idem') });
    const left = await withTenant(t.id, async (tx) => {
      await tx.delete(noroformForms).where(eq(noroformForms.id, form.id));
      return {
        versions: await tx.select().from(noroformFormVersions).where(eq(noroformFormVersions.formId, form.id)),
        submissions: await tx.select().from(noroformSubmissions).where(eq(noroformSubmissions.formId, form.id)),
      };
    });
    expect(left).toEqual({ versions: [], submissions: [] });
  });
});

describe('public form path — DB policy', () => {
  it('public slug context sees only that one published form; never drafts, versions or submissions', async () => {
    const t = await createTenant();
    const pub = await createForm(t.id, 'published');
    const draft = await createForm(t.id);
    await insertPublicSubmission({ slug: pub.form.slug, versionId: pub.version!.id, answers: {}, idempotencyKey: uniq('idem') });

    await inTx({ 'app.public_form_slug': pub.form.slug }, async () => {
      const forms = await app.query('SELECT id FROM noroform_forms');
      expect(forms.rows.map((r) => r.id)).toEqual([pub.form.id]);
      expect((await app.query('SELECT * FROM noroform_form_versions')).rows).toHaveLength(0);
      expect((await app.query('SELECT * FROM noroform_submissions')).rows).toHaveLength(0);
      // فقط SELECT: به‌روزرسانی هیچ ردیفی را نمی‌گیرد.
      const upd = await app.query("UPDATE noroform_forms SET title = 'hacked'");
      expect(upd.rowCount).toBe(0);
    });
    await inTx({ 'app.public_form_slug': draft.form.slug }, async () => {
      expect((await app.query('SELECT * FROM noroform_forms')).rows).toHaveLength(0);
    });
  });
});

describe('public form path — findPublicForm', () => {
  it('returns the published version definition, never the draft', async () => {
    const t = await createTenant();
    const { form, version } = await createForm(t.id, 'published');
    const found = await findPublicForm(form.slug);
    expect(found).toEqual({
      formId: form.id,
      tenantId: t.id,
      title: 'فرم تست',
      status: 'published',
      versionId: version!.id,
      versionNumber: 1,
      definition: PUBLISHED_DEF,
    });
  });

  it('returns closed forms (for the closed message) but not drafts', async () => {
    const t = await createTenant();
    const closed = await createForm(t.id, 'closed');
    const draft = await createForm(t.id);
    expect((await findPublicForm(closed.form.slug))?.status).toBe('closed');
    expect(await findPublicForm(draft.form.slug)).toBeNull();
  });

  it('can return an older version of the same form, never another form’s', async () => {
    const t = await createTenant();
    const { form, version: v1 } = await createForm(t.id, 'published');
    const other = await createForm(t.id, 'published');
    const v2 = await withTenant(t.id, async (tx) => {
      const v = await one(
        tx.insert(noroformFormVersions).values({ tenantId: t.id, formId: form.id, versionNumber: 2, definition: { v: 2 } }).returning(),
      );
      await tx.update(noroformForms).set({ currentVersionId: v.id }).where(eq(noroformForms.id, form.id));
      return v;
    });
    expect((await findPublicForm(form.slug))?.versionId).toBe(v2.id);
    expect(await findPublicForm(form.slug, { versionId: v1!.id })).toMatchObject({ versionNumber: 1, definition: PUBLISHED_DEF });
    expect(await findPublicForm(form.slug, { versionId: other.version!.id })).toBeNull();
    expect(await findPublicForm(form.slug, { versionId: 'not-a-uuid' })).toBeNull();
  });

  it('returns null for unknown/malformed slugs and suspended tenants', async () => {
    expect(await findPublicForm('does-not-exist')).toBeNull();
    expect(await findPublicForm("x' OR 1=1 --")).toBeNull();
    const s = await createTenant('suspended');
    const { form } = await createForm(s.id, 'published');
    expect(await findPublicForm(form.slug)).toBeNull();
  });

  it('does not leak settings to later queries on the pool', async () => {
    const t = await createTenant();
    const { form } = await createForm(t.id, 'published');
    await findPublicForm(form.slug);
    const forms = await db.select().from(noroformForms);
    expect(forms).toHaveLength(0);
  });
});

describe('public form path — insertPublicSubmission', () => {
  it('inserts into the form’s tenant and is idempotent', async () => {
    const t = await createTenant();
    const other = await createTenant();
    const { form, version } = await createForm(t.id, 'published');
    const key = uniq('idem');
    const input = { slug: form.slug, versionId: version!.id, answers: { f_aaaaaaaa: 'علی' }, idempotencyKey: key, ipHash: 'h'.repeat(64) };

    const first = await insertPublicSubmission(input);
    expect(first.status).toBe('created');
    const again = await insertPublicSubmission({ ...input, answers: { f_aaaaaaaa: 'changed' } });
    expect(again).toEqual({ status: 'duplicate', submissionId: first.status === 'created' ? first.submissionId : '' });

    const rows = await withTenant(t.id, (tx) =>
      tx.select().from(noroformSubmissions).where(eq(noroformSubmissions.formId, form.id)),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ tenantId: t.id, versionId: version!.id, answers: { f_aaaaaaaa: 'علی' }, ipHash: 'h'.repeat(64) });
    expect(await withTenant(other.id, (tx) => tx.select().from(noroformSubmissions))).toHaveLength(0);
  });

  it('rejects closed, draft, unknown and foreign-version submissions', async () => {
    const t = await createTenant();
    const pub = await createForm(t.id, 'published');
    const other = await createForm(t.id, 'published');
    const closed = await createForm(t.id, 'closed');
    const draft = await createForm(t.id);
    const base = { answers: {}, idempotencyKey: uniq('idem') };

    expect(await insertPublicSubmission({ ...base, slug: closed.form.slug, versionId: closed.version!.id })).toEqual({ status: 'closed' });
    expect(await insertPublicSubmission({ ...base, slug: draft.form.slug, versionId: pub.version!.id })).toEqual({ status: 'not_found' });
    expect(await insertPublicSubmission({ ...base, slug: 'no-such-form', versionId: pub.version!.id })).toEqual({ status: 'not_found' });
    expect(await insertPublicSubmission({ ...base, slug: pub.form.slug, versionId: other.version!.id })).toEqual({
      status: 'invalid_version',
    });
  });
});

describe('internal form path', () => {
  it('resolves only published internal forms and records the submitter', async () => {
    const t = await createTenant();
    const pub = await createForm(t.id, 'published');
    const draft = await createForm(t.id, 'draft');
    await withTenant(t.id, (tx) =>
      tx.update(noroformForms).set({ channel: 'internal' }).where(eq(noroformForms.id, pub.form.id)),
    );
    await withTenant(t.id, (tx) =>
      tx.update(noroformForms).set({ channel: 'internal' }).where(eq(noroformForms.id, draft.form.id)),
    );

    expect(await findPublicForm(pub.form.slug)).toBeNull();
    expect(await findInternalForm(pub.form.id)).toMatchObject({
      formId: pub.form.id,
      status: 'published',
      versionNumber: 1,
      definition: PUBLISHED_DEF,
    });
    expect(await findInternalForm(draft.form.id)).toBeNull();

    const [user] = await db.insert(platformUsers).values({ email: `${uniq('internal')}@test.local` }).returning();
    const created = await insertInternalSubmission({
      formId: pub.form.id,
      versionId: pub.version!.id,
      answers: { f_aaaaaaaa: 'داخلی' },
      idempotencyKey: uniq('idem'),
      submittedBy: user!.id,
    });
    expect(created.status).toBe('created');
    const rows = await withTenant(t.id, (tx) =>
      tx.select().from(noroformSubmissions).where(eq(noroformSubmissions.formId, pub.form.id)),
    );
    expect(rows[0]).toMatchObject({ submittedBy: user!.id, answers: { f_aaaaaaaa: 'داخلی' } });
  });
});

describe('response link path', () => {
  it('creates, resolves and revokes a link without exposing other tenants', async () => {
    const t = await createTenant();
    const other = await createTenant();
    const { form, version } = await createForm(t.id, 'published');
    const created = await insertPublicSubmission({
      slug: form.slug,
      versionId: version!.id,
      answers: { f_aaaaaaaa: 'علی' },
      idempotencyKey: uniq('idem'),
    });
    expect(created.status).toBe('created');
    if (created.status !== 'created') return;

    const tokenHash = createHash('sha256').update(uniq('token')).digest('hex');
    const link = await createResponseLink({
      tenantId: t.id,
      formId: form.id,
      submissionId: created.submissionId,
      tokenHash,
      authMode: 'link',
      keyHash: null,
      expiresAt: new Date(Date.now() + 60_000),
      createdBy: null,
    });
    expect(link).toMatchObject({ tenantId: t.id, submissionId: created.submissionId });

    expect(await findResponseLink(tokenHash)).toMatchObject({ id: link!.id });
    expect(await findResponseForLink(link!)).toMatchObject({
      formId: form.id,
      title: 'فرم تست',
      versionNumber: 1,
      answers: { f_aaaaaaaa: 'علی' },
    });
    expect(await withTenant(other.id, (tx) => tx.select().from(noroformResponseLinks))).toHaveLength(0);

    await revokeResponseLinks(t.id, form.id, created.submissionId);
    expect(await findResponseLink(tokenHash)).toBeNull();
  });

  it('does not create a link for a submission of another form or tenant', async () => {
    const t = await createTenant();
    const other = await createTenant();
    const { form, version } = await createForm(t.id, 'published');
    const created = await insertPublicSubmission({
      slug: form.slug,
      versionId: version!.id,
      answers: {},
      idempotencyKey: uniq('idem'),
    });
    if (created.status !== 'created') throw new Error('submission not created');
    const tokenHash = createHash('sha256').update(uniq('token')).digest('hex');

    const foreignForm = await createForm(t.id, 'published');
    expect(
      await createResponseLink({
        tenantId: t.id,
        formId: foreignForm.form.id,
        submissionId: created.submissionId,
        tokenHash,
        authMode: 'link',
        keyHash: null,
        expiresAt: null,
        createdBy: null,
      }),
    ).toBeNull();
    expect(
      await createResponseLink({
        tenantId: other.id,
        formId: form.id,
        submissionId: created.submissionId,
        tokenHash,
        authMode: 'link',
        keyHash: null,
        expiresAt: null,
        createdBy: null,
      }),
    ).toBeNull();
  });
});
