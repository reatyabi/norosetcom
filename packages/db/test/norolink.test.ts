import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from 'pg';
import {
  checkNorolinkSlug,
  claimNorolinkTemplate,
  db,
  eq,
  findClaimableTemplate,
  norolinkClaimLinks,
  norolinkTemplates,
  withPlatformAdmin,
  findPublicLinkPage,
  insertPublicLinkEvent,
  listPublicDirectoryPages,
  listPublicSitemapPages,
  norolinkElements,
  norolinkPageStats,
  norolinkPages,
  platformUsers,
  tenants,
  withTenant,
} from '../src/index';

const TABLES = ['norolink_pages', 'norolink_elements', 'norolink_page_stats'];
const DRAFT = { marker: 'draft-only', profile: { name: 'پیش‌نویس' } };

async function one<T>(rows: Promise<T[]>): Promise<T> {
  const [row] = await rows;
  if (!row) throw new Error('expected one row');
  return row;
}

let seq = 0;
const uniq = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${++seq}`;

async function createTenant(status: 'active' | 'suspended' = 'active') {
  return one(db.insert(tenants).values({ name: 'NL', slug: uniq('nl'), status }).returning());
}

/** صفحه با یک المان؛ در صورت درخواست snapshot منتشر می‌شود. */
async function createPage(tenantId: string, publish = false, indexable = false) {
  return withTenant(tenantId, async (tx) => {
    const page = await one(
      tx.insert(norolinkPages).values({ tenantId, slug: uniq('pg'), title: 'صفحه', draftContent: DRAFT }).returning(),
    );
    const element = await one(
      tx
        .insert(norolinkElements)
        .values({ tenantId, pageId: page.id, kind: 'link_button', sortKey: 'a0', settings: { label: 'x' } })
        .returning(),
    );
    if (!publish) return { page, element };
    const snapshot = { content: { marker: 'published', seo: { indexable } }, elements: [{ id: element.id, kind: 'link_button' }] };
    await tx
      .update(norolinkPages)
      .set({ status: 'published', publishedSnapshot: snapshot, publishedAt: new Date() })
      .where(eq(norolinkPages.id, page.id));
    return { page: { ...page, status: 'published' as const }, element };
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

describe('norolink tables — RLS and tenant isolation', () => {
  it('all three tables have RLS + FORCE', async () => {
    const { rows } = await app.query(
      `SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = ANY($1) ORDER BY relname`,
      [TABLES],
    );
    expect(rows).toHaveLength(TABLES.length);
    for (const r of rows) expect([r.relname, r.relrowsecurity, r.relforcerowsecurity]).toEqual([r.relname, true, true]);
  });

  it('tenant A sees only its own rows', async () => {
    const a = await createTenant();
    const b = await createTenant();
    const pa = await createPage(a.id, true);
    const pb = await createPage(b.id, true);
    expect((await insertPublicLinkEvent({ slug: pa.page.slug, kind: 'page_view' })).status).toBe('created');
    expect((await insertPublicLinkEvent({ slug: pb.page.slug, kind: 'page_view' })).status).toBe('created');

    const seen = await withTenant(a.id, async (tx) => [
      await tx.select().from(norolinkPages),
      await tx.select().from(norolinkElements),
      await tx.select().from(norolinkPageStats),
    ]);
    for (const rows of seen) {
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((r) => r.tenantId === a.id)).toBe(true);
    }
  });

  it('nothing is visible without a tenant', async () => {
    const t = await createTenant();
    await createPage(t.id, true);
    for (const table of TABLES) {
      const { rows } = await app.query(`SELECT * FROM ${table}`);
      expect(rows, table).toHaveLength(0);
    }
  });

  it('rejects writes for another tenant', async () => {
    const a = await createTenant();
    const b = await createTenant();
    await expect(
      withTenant(a.id, (tx) =>
        tx.insert(norolinkPages).values({ tenantId: b.id, slug: uniq('pg'), title: 'x', draftContent: {} }),
      ),
    ).rejects.toThrow();
  });

  it('element cannot point to a page of another tenant (composite FK)', async () => {
    const a = await createTenant();
    const b = await createTenant();
    const pb = await createPage(b.id);
    await expect(
      withTenant(a.id, (tx) =>
        tx.insert(norolinkElements).values({ tenantId: a.id, pageId: pb.page.id, kind: 'rich_text', sortKey: 'a1', settings: {} }),
      ),
    ).rejects.toThrow();
  });

  it('noroset_app cannot update or delete page stats', async () => {
    const t = await createTenant();
    const p = await createPage(t.id, true);
    await insertPublicLinkEvent({ slug: p.page.slug, kind: 'page_view' });
    for (const stmt of ['UPDATE norolink_page_stats SET os = $1', 'DELETE FROM norolink_page_stats WHERE os = $1']) {
      await app.query('BEGIN');
      try {
        await app.query("SELECT set_config('app.current_tenant', $1, true)", [t.id]);
        await expect(app.query(stmt, ['x'])).rejects.toThrow(/permission denied/);
      } finally {
        await app.query('ROLLBACK');
      }
    }
  });
});

describe('norolink constraints', () => {
  it('rejects reserved, duplicate and malformed slugs', async () => {
    const t = await createTenant();
    const p = await createPage(t.id);
    for (const slug of ['www', p.page.slug, 'Bad_Slug', 'a']) {
      await expect(
        withTenant(t.id, (tx) => tx.insert(norolinkPages).values({ tenantId: t.id, slug, title: 'x', draftContent: {} })),
        slug,
      ).rejects.toThrow();
    }
  });

  it('published page requires a snapshot', async () => {
    const t = await createTenant();
    await expect(
      withTenant(t.id, (tx) =>
        tx.insert(norolinkPages).values({ tenantId: t.id, slug: uniq('pg'), title: 'x', draftContent: {}, status: 'published' }),
      ),
    ).rejects.toThrow();
  });

  it('sort_key is unique per page', async () => {
    const t = await createTenant();
    const p = await createPage(t.id);
    await expect(
      withTenant(t.id, (tx) =>
        tx.insert(norolinkElements).values({ tenantId: t.id, pageId: p.page.id, kind: 'image', sortKey: 'a0', settings: {} }),
      ),
    ).rejects.toThrow();
  });

  it('deleting a page cascades to elements and stats', async () => {
    const t = await createTenant();
    const p = await createPage(t.id, true);
    await insertPublicLinkEvent({ slug: p.page.slug, kind: 'element_click', elementId: p.element.id });
    const counts = await withTenant(t.id, async (tx) => {
      await tx.delete(norolinkPages).where(eq(norolinkPages.id, p.page.id));
      return [
        (await tx.select().from(norolinkElements).where(eq(norolinkElements.pageId, p.page.id))).length,
        (await tx.select().from(norolinkPageStats).where(eq(norolinkPageStats.pageId, p.page.id))).length,
      ];
    });
    expect(counts).toEqual([0, 0]);
  });
});

describe('norolink public path', () => {
  it('returns only the published snapshot, never the draft', async () => {
    const t = await createTenant();
    const p = await createPage(t.id, true);
    const found = await findPublicLinkPage(p.page.slug);
    expect(found?.pageId).toBe(p.page.id);
    expect(found?.tenantId).toBe(t.id);
    expect(JSON.stringify(found)).not.toContain('draft-only');
    expect(found?.snapshot).toMatchObject({ content: { marker: 'published' } });
  });

  it('draft, unknown, invalid and suspended-tenant pages are not found', async () => {
    const t = await createTenant();
    const draft = await createPage(t.id);
    const s = await createTenant('suspended');
    const suspended = await createPage(s.id, true);
    for (const slug of [draft.page.slug, 'no-such-page', 'BAD', suspended.page.slug]) {
      expect(await findPublicLinkPage(slug), slug).toBeNull();
      expect((await insertPublicLinkEvent({ slug, kind: 'page_view' })).status, slug).toBe('not_found');
    }
  });

  it('listPublicDirectoryPages lists only published, indexable pages of active tenants', async () => {
    const t1 = await createTenant();
    const published = await createPage(t1.id, true, true);
    const noindex = await createPage(t1.id, true);
    const draft = await createPage(t1.id, false);
    const s = await createTenant('suspended');
    const suspendedPublished = await createPage(s.id, true, true);

    const directory = await listPublicDirectoryPages();
    const slugs = directory.map((d) => d.slug);

    expect(slugs).toContain(published.page.slug);
    expect(slugs).not.toContain(noindex.page.slug);
    expect(slugs).not.toContain(draft.page.slug);
    expect(slugs).not.toContain(suspendedPublished.page.slug);
  });

  it('listPublicSitemapPages returns only published, indexable pages of active tenants without content', async () => {
    const t = await createTenant();
    const indexed = await createPage(t.id, true, true);
    const noindex = await createPage(t.id, true);
    const draft = await createPage(t.id, false);
    const s = await createTenant('suspended');
    const suspended = await createPage(s.id, true, true);

    const rows = await listPublicSitemapPages();
    const slugs = rows.map((r) => r.slug);
    expect(slugs).toContain(indexed.page.slug);
    for (const p of [noindex, draft, suspended]) expect(slugs).not.toContain(p.page.slug);
    expect(Object.keys(rows.find((r) => r.slug === indexed.page.slug)!).sort()).toEqual(['description', 'publishedAt', 'slug', 'tenantId']);
  });

  it('the directory policy alone never exposes noindex pages', async () => {
    const t = await createTenant();
    const noindex = await createPage(t.id, true);
    const indexed = await createPage(t.id, true, true);
    // بدون شرط WHERE تابع: فقط policy (migration 0024) جلوی صفحه‌ی noindex را می‌گیرد
    await app.query('BEGIN');
    try {
      await app.query("SELECT set_config('app.public_directory', 'on', true)");
      const { rows } = await app.query<{ slug: string }>('SELECT slug FROM norolink_pages WHERE slug = ANY($1)', [
        [noindex.page.slug, indexed.page.slug],
      ]);
      expect(rows.map((r) => r.slug)).toEqual([indexed.page.slug]);
    } finally {
      await app.query('ROLLBACK');
    }
  });

  it('checkNorolinkSlug checks availability across reserved slugs and all tenants', async () => {
    const t = await createTenant();
    const draft = await createPage(t.id);
    expect(await checkNorolinkSlug(draft.page.slug)).toEqual({ taken: true, reason: 'taken' });
    expect(await checkNorolinkSlug('login')).toEqual({ taken: true, reason: 'reserved' });
    expect(await checkNorolinkSlug(uniq('free-slug'))).toEqual({ taken: false });
  });

  it('public slug setting does not expose elements', async () => {
    const t = await createTenant();
    const p = await createPage(t.id, true);
    await app.query('BEGIN');
    try {
      await app.query("SELECT set_config('app.public_link_slug', $1, true)", [p.page.slug]);
      expect((await app.query('SELECT id FROM norolink_pages')).rows).toHaveLength(1);
      expect((await app.query('SELECT id FROM norolink_elements')).rows).toHaveLength(0);
    } finally {
      await app.query('ROLLBACK');
    }
  });

  it('element clicks must reference an element in the published snapshot', async () => {
    const t = await createTenant();
    const p = await createPage(t.id, true);
    const other = await createPage(t.id, true);
    expect((await insertPublicLinkEvent({ slug: p.page.slug, kind: 'element_click', elementId: p.element.id })).status).toBe('created');
    for (const elementId of [other.element.id, 'not-a-uuid', null]) {
      expect((await insertPublicLinkEvent({ slug: p.page.slug, kind: 'element_click', elementId })).status).toBe('invalid_element');
    }
    expect((await insertPublicLinkEvent({ slug: p.page.slug, kind: 'page_view', elementId: p.element.id })).status).toBe(
      'invalid_element',
    );
  });

  describe('claim link (norolink_claim_links)', () => {
    async function admin() {
      return one(db.insert(platformUsers).values({ email: `${uniq('tpl-admin')}@test.local`, platformRole: 'superadmin' }).returning());
    }
    /** قالب پیش‌نویس با یک لینک فعال؛ `slug` نشانی رزروشده برای مشتری. */
    async function link(token: string, slug: string | null = null) {
      const a = await admin();
      return withPlatformAdmin(a.id, async (tx) => {
        const template = await one(tx.insert(norolinkTemplates).values({ title: 'قالب نمونه', draftContent: { mark: 'draft' } }).returning());
        const row = await one(
          tx.insert(norolinkClaimLinks).values({ templateId: template.id, token, slug, businessName: 'کافه', createdBy: a.id }).returning(),
        );
        return { template, link: row, adminId: a.id };
      });
    }
    async function customer() {
      return one(db.insert(platformUsers).values({ email: `${uniq('customer')}@test.local` }).returning());
    }
    const newPage = async (tx: Parameters<Parameters<typeof withTenant>[1]>[0], tenantId: string, slug = uniq('claimed')) => {
      const page = await one(tx.insert(norolinkPages).values({ tenantId, slug, title: 't', draftContent: {} }).returning());
      return { pageId: page.id, slug: page.slug };
    };
    const readLink = (adminId: string, id: string) =>
      withPlatformAdmin(adminId, (tx) => one(tx.select().from(norolinkClaimLinks).where(eq(norolinkClaimLinks.id, id))));

    it('shows a draft template only with its token, and the token creates one page recorded on the link', async () => {
      const tenant = await createTenant();
      const user = await customer();
      const token = 'claim-token-' + uniq('ct');
      const { template, link: row, adminId } = await link(token);

      expect(await findClaimableTemplate('wrong-token')).toBeNull();
      expect(await db.select().from(norolinkTemplates).where(eq(norolinkTemplates.id, template.id))).toEqual([]);
      expect(await db.select().from(norolinkClaimLinks).where(eq(norolinkClaimLinks.id, row.id))).toEqual([]);
      expect(await findClaimableTemplate(token)).toMatchObject({
        id: template.id,
        linkId: row.id,
        businessName: 'کافه',
        slug: null,
        draftContent: { mark: 'draft' },
      });

      const page = await claimNorolinkTemplate(token, tenant.id, user.id, async (tx, found) => {
        expect(found.id).toBe(template.id);
        return newPage(tx, tenant.id);
      });
      const [inTenant] = await withTenant(tenant.id, (tx) => tx.select().from(norolinkPages).where(eq(norolinkPages.id, page!.pageId)));
      expect(inTenant).toBeDefined();
      expect(await readLink(adminId, row.id)).toMatchObject({
        claimedBy: user.id,
        claimedTenantId: tenant.id,
        claimedPageId: page!.pageId,
        slug: page!.slug,
      });

      expect(await findClaimableTemplate(token)).toBeNull();
      expect(await claimNorolinkTemplate(token, tenant.id, user.id, () => Promise.reject(new Error('must not run')))).toBeNull();
    });

    it('counts opens only when asked, and a revoked link is dead', async () => {
      const token = 'claim-token-' + uniq('open');
      const { link: row, adminId } = await link(token);
      await findClaimableTemplate(token);
      await findClaimableTemplate(token, { countOpen: true });
      await findClaimableTemplate(token, { countOpen: true });
      const opened = await readLink(adminId, row.id);
      expect(opened.openCount).toBe(2);
      expect(opened.firstOpenedAt).not.toBeNull();

      await withPlatformAdmin(adminId, (tx) => tx.update(norolinkClaimLinks).set({ revokedAt: new Date() }).where(eq(norolinkClaimLinks.id, row.id)));
      expect(await findClaimableTemplate(token)).toBeNull();
      const tenant = await createTenant();
      expect(await claimNorolinkTemplate(token, tenant.id, (await customer()).id, (tx) => newPage(tx, tenant.id))).toBeNull();
    });

    it('reserves its address against every tenant until claimed, but the claim itself may use it', async () => {
      const token = 'claim-token-' + uniq('slug');
      const slug = uniq('reserved').toLowerCase();
      await link(token, slug);
      const stranger = await createTenant();

      expect(await checkNorolinkSlug(slug)).toEqual({ taken: true, reason: 'taken' });
      expect(await checkNorolinkSlug(slug, { exceptClaimToken: token })).toEqual({ taken: false });
      await expect(withTenant(stranger.id, (tx) => newPage(tx, stranger.id, slug))).rejects.toMatchObject({ cause: { code: '23505' } });

      const tenant = await createTenant();
      const page = await claimNorolinkTemplate(token, tenant.id, (await customer()).id, (tx, found) => newPage(tx, tenant.id, found.slug!));
      expect(page!.slug).toBe(slug);
      // پس از تحویل نشانی مال صفحه است (یکتایی صفحه‌ها)، نه رزرو لینک.
      expect(await checkNorolinkSlug(slug)).toEqual({ taken: true, reason: 'taken' });
    });

    it('keeps the link usable if creating the page fails, and refuses a page in another tenant', async () => {
      const tenant = await createTenant();
      const other = await createTenant();
      const user = await customer();
      const token = 'claim-token-' + uniq('re');
      await link(token);

      await expect(claimNorolinkTemplate(token, tenant.id, user.id, () => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
      expect(await findClaimableTemplate(token)).not.toBeNull();

      await expect(claimNorolinkTemplate(token, tenant.id, user.id, (tx) => newPage(tx, other.id))).rejects.toThrow();
      expect(await findClaimableTemplate(token)).not.toBeNull();
    });

    it('two simultaneous claims create only one page', async () => {
      const tenant = await createTenant();
      const user = await customer();
      const token = 'claim-token-' + uniq('race');
      await link(token);
      const results = await Promise.all([1, 2].map(() => claimNorolinkTemplate(token, tenant.id, user.id, (tx) => newPage(tx, tenant.id))));
      expect(results.filter(Boolean)).toHaveLength(1);
    });
  });
});
