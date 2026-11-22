import { createHash, randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { ConflictException, ForbiddenException, HttpException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import {
  adminAuditLog,
  and,
  db,
  eq,
  fixedPlan,
  norolinkPages,
  platformUsers,
  sql,
  tenants,
  withPlatformAdmin,
  withTenant,
  type FileService,
  type IpHasher,
  type PlatformAdminContext,
  type RateLimiter,
  type StoredFile,
  type TenantContext,
} from '@noroset/core';
import { SEO_DESCRIPTION_MIN } from '../shared';
import { ModerationService, searchTerm } from '../api/moderation/moderation.service';
import { ElementsService } from '../api/pages/elements.service';
import { PagesService } from '../api/pages/pages.service';
import { PublicLinksService, type PublicLinkView } from '../api/public/public-links.service';
import type { Fetcher } from '../api/embeds/map-resolver';

// کنترل صفحه‌ها از سوی مدیریت پلتفرم و گزارش تخلف (docs/architecture.md §9.13) علیه PostgreSQL واقعی با نقش noroset_app.

let seq = 0;
const uniq = (p: string) => `${p}-${Date.now().toString(36)}-${++seq}`;
const SEO_PLAN = fixedPlan(
  { 'norolink.pages': 10, 'norolink.elements_per_page': 100, 'norolink.detailed_stats': true, 'branding.remove': true, 'norolink.seo': true },
  'seo',
);
const SEO_DESC = 'نانوایی سنتی محله با نان تازه‌ی هر صبح، سفارش آنلاین و ارسال سریع در شهر.';
const allow: RateLimiter = { consume: () => true };
const hasher: IpHasher = { hash: (s) => createHash('sha256').update(s).digest('hex') };
const fetcher: Fetcher = async () => ({ status: 404, headers: { get: () => null } });

class NoFiles implements FileService {
  async upload(): Promise<StoredFile> {
    throw new Error('not used');
  }
  async uploadPersonal(): Promise<StoredFile> {
    throw new Error('not used');
  }
  async uploadPlatform(): Promise<StoredFile> {
    throw new Error('not used');
  }
  async removePersonal(): Promise<void> {}
  async syncUsage(): Promise<void> {}
  publicBaseUrl(): string {
    return 'https://files.test';
  }
}

let ownerId = '';
let adminId = '';
let admin: ModerationService;
beforeAll(async () => {
  const [u] = await db.insert(platformUsers).values({ email: `${uniq('mod-owner')}@test.local` }).returning();
  ownerId = u!.id;
  const [a] = await db.insert(platformUsers).values({ email: `${uniq('mod-admin')}@test.local`, platformRole: 'superadmin' }).returning();
  adminId = a!.id;
  const ctx: PlatformAdminContext = { adminId: () => adminId, ip: () => '1.2.3.4', run: (fn) => withPlatformAdmin(adminId, fn) };
  admin = new ModerationService(ctx, new NoFiles());
});

/** صفحه‌ی منتشرشده و قابل ایندکس (در دایرکتوری). */
async function publishedPage() {
  const [t] = await db.insert(tenants).values({ name: 'Moderation', slug: uniq('mod') }).returning();
  const tenantId = t!.id;
  const ctx: TenantContext = { tenantId: () => tenantId, userId: () => ownerId, role: () => 'owner', run: (fn) => withTenant(tenantId, fn) };
  const files = new NoFiles();
  const pages = new PagesService(ctx, SEO_PLAN, files, fetcher);
  const elements = new ElementsService(ctx, SEO_PLAN, fetcher, files);
  const publicLinks = new PublicLinksService(allow, hasher, SEO_PLAN, files);
  const page = await pages.create({ title: 'نانوایی', slug: uniq('bakery') });
  const btn = await elements.add(page.id, { kind: 'link_button' });
  await elements.update(page.id, btn.id, { settings: { label: 'سفارش', url: 'https://example.com' } });
  const content = (await pages.get(page.id)).content;
  expect(SEO_DESC.length).toBeGreaterThanOrEqual(SEO_DESCRIPTION_MIN);
  await pages.update(page.id, { content: { ...content, seo: { ...content.seo, indexable: true, description: SEO_DESC } } });
  await pages.publish(page.id);
  return { tenantId, pages, publicLinks, page };
}

async function error(p: Promise<unknown>): Promise<HttpException> {
  const err = await p.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(HttpException);
  return err as HttpException;
}

const listed = async (s: { publicLinks: PublicLinksService }, slug: string) =>
  (await s.publicLinks.directory({ query: slug }, '1.1.1.1')).items.some((i) => i.slug === slug);
const inSitemap = async (s: { publicLinks: PublicLinksService }, slug: string) =>
  (await s.publicLinks.sitemap('1.1.1.1')).pages.some((p) => p.slug === slug);

describe('page moderation', () => {
  it('delisting keeps the page up but out of the directory, sitemap and index; lifting restores it', async () => {
    const s = await publishedPage();
    expect(await listed(s, s.page.slug)).toBe(true);
    expect(await inSitemap(s, s.page.slug)).toBe(true);

    const detail = await admin.setModeration(s.page.id, { status: 'delisted', reason: 'spam', note: 'صفحه‌ی تکراری تبلیغاتی' });
    expect(detail.moderation).toMatchObject({ status: 'delisted', effective: 'delisted', reason: 'spam' });
    const view = (await s.publicLinks.read(s.page.slug, '1.1.1.1')) as PublicLinkView;
    expect(view.content.seo.indexable).toBe(false);
    expect(view.moderation).toBeNull();
    expect(await listed(s, s.page.slug)).toBe(false);
    expect(await inSitemap(s, s.page.slug)).toBe(false);
    // مالک می‌بیند ولی قفل نیست
    const owner = await s.pages.get(s.page.id);
    expect(owner.moderation).toMatchObject({ status: 'delisted', reason: 'spam', locked: false });
    await s.pages.publish(s.page.id);

    await admin.setModeration(s.page.id, { status: 'none', note: 'بررسی شد، مشکلی نیست' });
    expect(await listed(s, s.page.slug)).toBe(true);
    expect((await s.pages.get(s.page.id)).moderation).toBeNull();
  });

  it('warning shows a notice before the content and locks publish, slug change and delete for the owner', async () => {
    const s = await publishedPage();
    await admin.setModeration(s.page.id, { status: 'warning', reason: 'phishing', note: 'گزارش فیشینگ درگاه جعلی' });
    const view = (await s.publicLinks.read(s.page.slug, '1.1.1.1')) as PublicLinkView;
    expect(view.moderation?.status).toBe('warning');
    expect(view.moderation?.notice).toContain('اطلاعات بانکی');
    expect(view.elements.length).toBeGreaterThan(0);
    expect(view.content.seo.indexable).toBe(false);

    expect((await error(s.pages.publish(s.page.id))).getResponse()).toMatchObject({ message: 'page_moderated' });
    await expect(s.pages.update(s.page.id, { slug: uniq('moved') })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(s.pages.remove(s.page.id)).rejects.toBeInstanceOf(ForbiddenException);
    // ویرایش پیش‌نویس و لغو انتشار آزاد است
    await s.pages.update(s.page.id, { title: 'نانوایی اصلاح‌شده' });
    await s.pages.unpublish(s.page.id);
  });

  it('suspension returns 451 for a legal order and 403 otherwise, without any content', async () => {
    const s = await publishedPage();
    await admin.setModeration(s.page.id, { status: 'suspended', reason: 'legal_order', note: 'نامه‌ی مرجع', reference: '۱۴۰۵/۱۲۳', notice: 'به دستور مرجع قضایی' });
    const legal = await error(s.publicLinks.read(s.page.slug, '1.1.1.1'));
    expect(legal.getStatus()).toBe(451);
    expect(legal.getResponse()).toEqual({ message: 'page_suspended', legal: true, notice: 'به دستور مرجع قضایی' });

    await admin.setModeration(s.page.id, { status: 'suspended', reason: 'scam', note: 'کلاهبرداری' });
    const other = await error(s.publicLinks.read(s.page.slug, '1.1.1.1'));
    expect(other.getStatus()).toBe(403);
    expect(JSON.stringify(other.getResponse())).not.toContain('سفارش');
    expect(await listed(s, s.page.slug)).toBe(false);
  });

  it('a temporary restriction lifts itself once its deadline passes', async () => {
    const s = await publishedPage();
    await admin.setModeration(s.page.id, { status: 'suspended', reason: 'spam', note: 'موقت', days: 1 });
    expect((await error(s.publicLinks.read(s.page.slug, '1.1.1.1'))).getStatus()).toBe(403);
    // مهلت را با مسیر ادمین به گذشته می‌بریم
    await withPlatformAdmin(adminId, async (tx) => {
      await tx.execute(sql`SELECT set_config('app.page_moderation', 'on', true)`);
      await tx.update(norolinkPages).set({ moderationUntil: new Date(Date.now() - 1000) }).where(eq(norolinkPages.id, s.page.id));
    });
    expect(((await s.publicLinks.read(s.page.slug, '1.1.1.1')) as PublicLinkView).slug).toBe(s.page.slug);
    expect(await listed(s, s.page.slug)).toBe(true);
    expect((await s.pages.get(s.page.id)).moderation).toBeNull();
    await s.pages.publish(s.page.id);
    expect((await admin.get(s.page.id)).moderation).toMatchObject({ status: 'suspended', effective: 'none' });
  });

  it('requires a reason category, writes the internal note only to the audit log and resolves open reports', async () => {
    const s = await publishedPage();
    await expect(admin.setModeration(s.page.id, { status: 'warning', note: 'بدون دسته' })).rejects.toBeInstanceOf(UnprocessableEntityException);
    await s.publicLinks.report(s.page.slug, { reason: 'phishing', details: 'درگاه جعلی' }, '9.9.9.1');
    expect((await admin.list({ q: s.page.slug, filter: 'reported' })).items.map((i) => i.id)).toEqual([s.page.id]);

    const detail = await admin.setModeration(s.page.id, { status: 'warning', reason: 'phishing', note: 'یادداشت محرمانه', resolveReports: true });
    expect(detail.reports.every((r) => r.status === 'actioned')).toBe(true);
    expect(detail.openReports).toBe(0);
    const [log] = await withPlatformAdmin(adminId, (tx) =>
      tx.select().from(adminAuditLog).where(and(eq(adminAuditLog.targetType, 'link_page'), eq(adminAuditLog.targetId, s.page.id))),
    );
    expect(log).toMatchObject({ action: 'link_page.moderate', reason: 'یادداشت محرمانه', actorUserId: adminId });
    expect(log!.details).toMatchObject({ from: 'none', to: 'warning', reason: 'phishing', resolvedReports: 1 });
    // مالک یادداشت را نمی‌بیند
    expect(JSON.stringify(await s.pages.get(s.page.id))).not.toContain('یادداشت محرمانه');
  });

  it('only sees pages that have been published and finds them by full link', async () => {
    const s = await publishedPage();
    const draft = await s.pages.create({ title: 'پیش‌نویس', slug: uniq('draft') });
    await expect(admin.get(draft.id)).rejects.toBeInstanceOf(NotFoundException);
    expect((await admin.list({ q: `https://${s.page.slug}.n8l.ir/` })).items.map((i) => i.id)).toEqual([s.page.id]);
    expect(searchTerm('HTTPS://Shop.n8l.ir')).toBe('shop');
    expect(searchTerm('50%_off')).toBe('50\\%\\_off');
  });
});

describe('database guard', () => {
  it('the owner cannot change moderation columns, and the admin path cannot change anything else', async () => {
    const s = await publishedPage();
    await expect(
      withTenant(s.tenantId, (tx) => tx.update(norolinkPages).set({ moderationStatus: 'delisted', moderationReason: 'spam' }).where(eq(norolinkPages.id, s.page.id))),
    ).rejects.toThrow();
    await expect(
      withPlatformAdmin(adminId, async (tx) => {
        await tx.execute(sql`SELECT set_config('app.page_moderation', 'on', true)`);
        await tx.update(norolinkPages).set({ title: 'hijacked' }).where(eq(norolinkPages.id, s.page.id));
      }),
    ).rejects.toThrow();
    // ادمین بدون مسیر moderation هم نمی‌تواند (trigger: ستون‌های moderation_* فقط از همان مسیر)
    await expect(
      withPlatformAdmin(adminId, (tx) => tx.update(norolinkPages).set({ moderationStatus: 'delisted', moderationReason: 'spam' }).where(eq(norolinkPages.id, s.page.id))),
    ).rejects.toThrow();
    // کاربر عادی با app.page_moderation: RLS ردیفی نشان نمی‌دهد، پس بی‌اثر
    await withPlatformAdmin(ownerId, async (tx) => {
      await tx.execute(sql`SELECT set_config('app.page_moderation', 'on', true)`);
      await tx.update(norolinkPages).set({ moderationStatus: 'delisted', moderationReason: 'spam' }).where(eq(norolinkPages.id, s.page.id));
    });
    expect((await admin.get(s.page.id)).moderation.status).toBe('none');
  });

  it('a locked page cannot be deleted, re-published or moved even by direct SQL', async () => {
    const s = await publishedPage();
    await admin.setModeration(s.page.id, { status: 'suspended', reason: 'illegal_content', note: 'نگه‌داری مدرک' });
    await expect(withTenant(s.tenantId, (tx) => tx.delete(norolinkPages).where(eq(norolinkPages.id, s.page.id)))).rejects.toThrow();
    await expect(withTenant(s.tenantId, (tx) => tx.update(norolinkPages).set({ slug: uniq('escape') }).where(eq(norolinkPages.id, s.page.id)))).rejects.toThrow();
    await expect(
      withTenant(s.tenantId, (tx) => tx.update(norolinkPages).set({ publishedSnapshot: { content: {}, elements: [] } }).where(eq(norolinkPages.id, s.page.id))),
    ).rejects.toThrow();
  });
});

describe('abuse reports', () => {
  it('accepts reports only for published pages, ignores the honeypot and duplicate reports from the same IP', async () => {
    const s = await publishedPage();
    expect(await s.publicLinks.report(s.page.slug, { reason: 'scam', details: 'یک' }, '7.7.7.7')).toEqual({ ok: true });
    expect(await s.publicLinks.report(s.page.slug, { reason: 'scam', details: 'تکرار' }, '7.7.7.7')).toEqual({ ok: true });
    expect(await s.publicLinks.report(s.page.slug, { reason: 'spam', website: 'bot' }, '7.7.7.8')).toEqual({ ok: true });
    expect(await s.publicLinks.report(s.page.slug, { reason: 'spam', contact: 'a@b.ir' }, '7.7.7.9')).toEqual({ ok: true });
    const reports = (await admin.get(s.page.id)).reports;
    expect(reports.map((r) => r.details).sort()).toEqual(['', 'یک']);
    expect(reports.find((r) => r.contact === 'a@b.ir')).toBeDefined();

    await expect(s.publicLinks.report('no-such-page-xyz', { reason: 'spam' }, '7.7.7.7')).rejects.toBeInstanceOf(NotFoundException);
    await s.pages.unpublish(s.page.id);
    await expect(s.publicLinks.report(s.page.slug, { reason: 'spam' }, '7.7.7.10')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rate-limits reports per IP', async () => {
    const s = await publishedPage();
    let n = 0;
    const limited = new PublicLinksService({ consume: () => ++n <= 1 }, hasher, SEO_PLAN, new NoFiles());
    await limited.report(s.page.slug, { reason: 'spam' }, '6.6.6.6');
    await expect(limited.report(s.page.slug, { reason: 'spam' }, '6.6.6.6')).rejects.toMatchObject({ status: 429 });
  });

  it('resolving a report is one-time and logged', async () => {
    const s = await publishedPage();
    await s.publicLinks.report(s.page.slug, { reason: 'privacy' }, '5.5.5.5');
    const [report] = (await admin.get(s.page.id)).reports;
    const resolved = await admin.resolveReport(report!.id, { status: 'dismissed', note: 'محتوای عادی' });
    expect(resolved).toMatchObject({ status: 'dismissed', resolutionNote: 'محتوای عادی' });
    await expect(admin.resolveReport(report!.id, { status: 'actioned' })).rejects.toBeInstanceOf(ConflictException);
    await expect(admin.resolveReport(randomUUID(), { status: 'actioned' })).rejects.toBeInstanceOf(NotFoundException);
    expect((await admin.reports({ status: 'dismissed' })).items.some((r) => r.id === report!.id)).toBe(true);
  });

  it('reports are invisible to the page owner and to anonymous readers', async () => {
    const s = await publishedPage();
    await s.publicLinks.report(s.page.slug, { reason: 'adult' }, '4.4.4.4');
    const { norolinkPageReports } = await import('@noroset/core');
    expect(await withTenant(s.tenantId, (tx) => tx.select().from(norolinkPageReports))).toEqual([]);
    expect(await db.select().from(norolinkPageReports)).toEqual([]);
  });
});
