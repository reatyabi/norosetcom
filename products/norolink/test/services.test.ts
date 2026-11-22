import { createHash, randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  ConflictException,
  ForbiddenException,
  HttpException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  adminAuditLog,
  and,
  db,
  eq,
  findPublicLinkRedirect,
  norolinkTemplates,
  platformUsers,
  tenants,
  withPlatformAdmin,
  withTenant,
  type Db,
  type PlatformAdminContext,
  type FileOwner,
  type FileRequirement,
  type FileService,
  type IpHasher,
  type StoredFile,
  type UploadFileInput,
  type MembershipRole,
  type RateLimiter,
  type TenantContext,
} from '@noroset/core';
import { fixedPlan, type PlanResolver } from '@noroset/core';
import { defaultContent, SEO_DESCRIPTION_MIN, type ImageRef, type PageContent } from '../shared';

/** همان سقف‌های pro قبلی (پلن «حرفه‌ای» در seed). */
const PRO = {
  'norolink.pages': 10,
  'norolink.elements_per_page': 100,
  'norolink.detailed_stats': true,
  'branding.remove': true,
} as const;
/** پلن دارای «نمایش در نتایج گوگل» (`norolink.seo`؛ در seed هیچ پلنی روشن نیست و ادمین روشنش می‌کند). */
const SEO = { ...PRO, 'norolink.seo': true } as const;
type PlanTier = 'free' | 'pro' | 'seo';
/** توضیح موتور جستجو با طول کافی برای ایندکس (SEO_DESCRIPTION_MIN). */
const SEO_DESC = 'نانوایی سنتی محله با نان تازه‌ی هر صبح، سفارش آنلاین و ارسال سریع در شهر.';
import { PagesService } from '../api/pages/pages.service';
import { ElementsService } from '../api/pages/elements.service';
import { UploadsService } from '../api/uploads/uploads.service';
import { claimLinkUrl, ClaimLinksService } from '../api/claims/claim-links.service';
import { TemplatesService } from '../api/templates/templates.service';
import { StatsService, tehranToday } from '../api/stats/stats.service';
import { PublicLinksService, type PublicLinkView } from '../api/public/public-links.service';
import { limitsFor } from '../api/access';
import type { Fetcher } from '../api/embeds/map-resolver';

let seq = 0;
const uniq = (p: string) => `${p}-${Date.now().toString(36)}-${++seq}`;

/** کاربر واقعی برای ستون created_by (FK به platform_users). */
let testUserId = '';
beforeAll(async () => {
  const [u] = await db.insert(platformUsers).values({ email: `${uniq('creator')}@test.local` }).returning();
  testUserId = u!.id;
});

/** جایگزین Port FILE_SERVICE (norofile در تست خودش علیه DB آزموده می‌شود؛ norolink به آن وابسته نیست). */
class FakeFiles implements FileService {
  uploads: UploadFileInput[] = [];
  /** فایل‌های همین tenant: id ← public بودن. */
  owned = new Map<string, boolean>();
  usages = new Map<string, string[]>();
  async upload(input: UploadFileInput): Promise<StoredFile> {
    const isGif = String.fromCharCode(...input.body.subarray(0, 6)) === 'GIF89a';
    if (!isGif) throw new UnprocessableEntityException('invalid_file');
    this.uploads.push(input);
    const id = randomUUID();
    this.owned.set(id, input.visibility === 'public');
    return {
      id,
      name: 'image.gif',
      kind: 'image',
      mimeType: 'image/gif',
      sizeBytes: input.body.length,
      width: 7,
      height: 9,
      visibility: input.visibility ?? 'private',
      url: `${this.publicBaseUrl()}/${id}`,
      createdAt: new Date(),
    };
  }
  async syncUsage(_tx: Db, owner: FileOwner, fileIds: string[], require?: FileRequirement) {
    if (fileIds.some((id) => !this.owned.has(id) || (require?.visibility === 'public' && !this.owned.get(id)))) {
      throw new UnprocessableEntityException('invalid_asset');
    }
    this.usages.set(`${owner.type}:${owner.id}`, [...fileIds]);
  }
  uploadPersonal(): Promise<StoredFile> {
    throw new Error('not used by norolink');
  }
  async removePersonal() {}
  platformUploads: string[] = [];
  async uploadPlatform(adminUserId: string, input: { body: Uint8Array }): Promise<StoredFile> {
    if (String.fromCharCode(...input.body.subarray(0, 6)) !== 'GIF89a') throw new UnprocessableEntityException('invalid_file');
    this.platformUploads.push(adminUserId);
    const id = randomUUID();
    return {
      id,
      name: 'image.gif',
      kind: 'image',
      mimeType: 'image/gif',
      sizeBytes: input.body.length,
      width: 7,
      height: 9,
      visibility: 'public',
      url: `${this.publicBaseUrl()}/platform/${id}`,
      createdAt: new Date(),
    };
  }
  publicBaseUrl() {
    return 'https://noroset.test/api/norofile/public/files';
  }
}

const allow: RateLimiter = { consume: () => true };
const hasher: IpHasher = { hash: (s) => createHash('sha256').update(s).digest('hex') };

const redirects: Record<string, string> = {
  'https://maps.app.goo.gl/Short1': 'https://www.google.com/maps/@35.75,51.41,16z',
};
const fetcher: Fetcher = async (url) => ({
  status: redirects[url] ? 302 : 404,
  headers: { get: (n) => (n === 'location' ? (redirects[url] ?? null) : null) },
});

const withProfileName = (content: PageContent, name: string): PageContent => ({ ...content, profile: { ...content.profile, name } });

async function setup(tier: PlanTier = 'free', role: MembershipRole = 'owner') {
  const [t] = await db.insert(tenants).values({ name: 'NL API', slug: uniq('nlapi') }).returning();
  const tenantId = t!.id;
  const ctx: TenantContext = {
    tenantId: () => tenantId,
    userId: () => testUserId,
    role: () => role,
    run: (fn) => withTenant(tenantId, fn),
  };
  const plans = tier === 'free' ? fixedPlan({}, tier) : fixedPlan(tier === 'seo' ? SEO : PRO, tier);
  const files = new FakeFiles();
  return {
    tenantId,
    ctx,
    files,
    pages: new PagesService(ctx, plans, files, fetcher),
    elements: new ElementsService(ctx, plans, fetcher, files),
    uploads: new UploadsService(ctx, files),
    stats: new StatsService(ctx, plans),
    publicLinks: new PublicLinksService(allow, hasher, plans, files),
  };
}

const GIF = new Uint8Array([...'GIF89a'].map((c) => c.charCodeAt(0)).concat([7, 0, 9, 0, 0, 0]));
const UA_MOBILE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1';

async function rejects(p: Promise<unknown>, type: new (...a: never[]) => Error, message?: string) {
  const err = await p.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(type);
  if (message) expect(JSON.stringify((err as HttpException).getResponse())).toContain(message);
}

describe('pages', () => {
  it('creates a draft page with default content and enforces the free page limit', async () => {
    const s = await setup();
    const page = await s.pages.create({ title: 'علی' });
    expect(page).toMatchObject({ title: 'علی', status: 'draft', elements: [], hasUnpublishedChanges: true });
    expect(page.slug).toMatch(/^[a-z0-9]{8}$/);
    expect(page.content.profile.name).toBe('علی');
    expect(page.limits.maxPages).toBe(1);
    expect((await s.pages.getBySlug(page.slug)).id).toBe(page.id);
    await rejects(s.pages.create({ title: 'دوم' }), ForbiddenException, 'max_pages');
  });

  it('rejects reserved and taken slugs', async () => {
    const a = await setup();
    const b = await setup();
    const slug = uniq('me');
    await a.pages.create({ title: 'x', slug });
    await rejects(b.pages.create({ title: 'y', slug }), ConflictException, 'slug_taken');
    await rejects(b.pages.create({ title: 'y', slug: 'www' }), ConflictException, 'slug_reserved');
  });

  it('checks slug availability online', async () => {
    const s = await setup();
    const slug = uniq('online-slug');
    expect(await s.pages.checkSlug(slug)).toEqual({ available: true });

    // Invalid format
    expect(await s.pages.checkSlug('a')).toMatchObject({ available: false });
    expect(await s.pages.checkSlug('invalid_slug!')).toMatchObject({ available: false });

    // Reserved
    expect(await s.pages.checkSlug('admin')).toMatchObject({ available: false });

    // Taken by existing page
    await s.pages.create({ title: 'test', slug });
    expect(await s.pages.checkSlug(slug)).toMatchObject({ available: false, message: 'این نشانی قبلاً گرفته شده است.' });
  });

  it('redirects old addresses, keeps them reserved and limits slug changes', async () => {
    const s = await setup();
    const [a, b, c, d] = [uniq('sa'), uniq('sb'), uniq('sc'), uniq('sd')];
    const page = await s.pages.create({ title: 'x', slug: a });
    const btn = await s.elements.add(page.id, { kind: 'link_button' });
    await s.elements.update(page.id, btn.id, { settings: { label: 'x', url: 'https://example.com' } });
    expect(page.slugChanges).toBe(0);

    // ذخیره‌ی همان نشانی تغییر حساب نمی‌شود
    expect((await s.pages.update(page.id, { slug: a })).slugChanges).toBe(0);
    const moved = await s.pages.update(page.id, { slug: b });
    expect(moved).toMatchObject({ slug: b, slugChanges: 1 });

    // صفحه‌ی منتشرنشده ریدایرکت نمی‌شود؛ پس از انتشار، نشانی قبلی به فعلی می‌رود
    expect(await findPublicLinkRedirect(a)).toBeNull();
    await s.pages.publish(page.id);
    expect(await findPublicLinkRedirect(a)).toBe(b);
    expect(await s.publicLinks.read(a, '1.1.1.1')).toEqual({ redirectTo: b });

    // نشانی قبلی برای صفحه‌ی دیگر (حتی tenant دیگر) رزرو است
    const other = await setup('pro');
    await rejects(other.pages.create({ title: 'y', slug: a }), ConflictException, 'slug_taken');
    const otherPage = await other.pages.create({ title: 'y' });
    await rejects(other.pages.update(otherPage.id, { slug: a }), ConflictException, 'slug_taken');

    // برگشت به نشانی قبلی ممکن است، زنجیره نمی‌سازد و حساب می‌شود
    expect(await s.pages.update(page.id, { slug: a })).toMatchObject({ slug: a, slugChanges: 2 });
    expect(await findPublicLinkRedirect(a)).toBeNull();
    expect(await findPublicLinkRedirect(b)).toBe(a);

    expect(await s.pages.update(page.id, { slug: c })).toMatchObject({ slug: c, slugChanges: 3 });
    expect(await findPublicLinkRedirect(a)).toBe(c);
    expect(await findPublicLinkRedirect(b)).toBe(c);

    // سقف
    await rejects(s.pages.update(page.id, { slug: d }), ConflictException, 'slug_change_limit');
    expect((await s.pages.update(page.id, { slug: c })).slug).toBe(c);

    // لغو انتشار ریدایرکت را می‌بندد؛ حذف صفحه نشانی‌ها را آزاد می‌کند
    await s.pages.unpublish(page.id);
    expect(await findPublicLinkRedirect(a)).toBeNull();
    await s.pages.remove(page.id);
    expect((await other.pages.update(otherPage.id, { slug: a })).slug).toBe(a);
  });

  it('keeps pages out of search engines by default and needs an SEO plan to index them', async () => {
    const indexed = (c: PageContent): PageContent => ({ ...c, seo: { ...c.seo, indexable: true, description: SEO_DESC } });
    // پلن بدون سئو: روشن کردن در سرور رد می‌شود، نه فقط در UI
    const free = await setup();
    const draft = await free.pages.create({ title: 'x' });
    expect(draft.content.seo.indexable).toBe(false);
    await rejects(free.pages.update(draft.id, { content: indexed(draft.content) }), ForbiddenException, 'seo');
    await rejects(free.pages.create({ title: 'y', content: indexed(draft.content) }), ForbiddenException, 'seo');
    expect((await free.pages.get(draft.id)).content.seo.indexable).toBe(false);

    const s = await setup('seo');
    const page = await s.pages.create({ title: 'x' });
    expect(page.content.seo.indexable).toBe(false);
    const on = indexed(page.content);
    expect((await s.pages.update(page.id, { content: on })).content.seo.indexable).toBe(true);
    // پس از کاهش پلن، مقدار روشن قبلی با ویرایش‌های دیگر رد یا پاک نمی‌شود (تا با ارتقا برگردد)
    const downgraded = new PagesService(s.ctx, fixedPlan(), s.files, fetcher);
    const bio = { ...on, profile: { ...on.profile, bio: 'بیو' } };
    expect((await downgraded.update(page.id, { content: bio })).content.seo.indexable).toBe(true);
    // روشن‌بودن، نشانی را قفل نمی‌کند: نشانی قبلی ریدایرکت می‌شود
    const renamed = uniq('seo');
    expect((await s.pages.update(page.id, { slug: renamed })).slug).toBe(renamed);
  });

  it('needs a long enough search description to turn indexing on', async () => {
    const s = await setup('seo');
    const page = await s.pages.create({ title: 'x' });
    const withSeo = (description: string, extra: Partial<PageContent['seo']> = {}): PageContent => ({
      ...page.content,
      seo: { ...page.content.seo, indexable: true, description, ...extra },
    });
    const short = 'ن'.repeat(SEO_DESCRIPTION_MIN - 1);
    await rejects(s.pages.update(page.id, { content: withSeo(short) }), UnprocessableEntityException, 'seo_description_too_short');
    // فاصله‌ی اول و آخر حساب نمی‌شود
    await rejects(s.pages.update(page.id, { content: withSeo(`   ${short}   `) }), UnprocessableEntityException, 'seo_description_too_short');
    await rejects(s.pages.create({ title: 'y', content: withSeo(short) }), UnprocessableEntityException, 'seo_description_too_short');
    const on = await s.pages.update(page.id, { content: withSeo(SEO_DESC, { entity: 'organization' }) });
    expect(on.content.seo).toMatchObject({ indexable: true, entity: 'organization' });
    // کوتاه کردن بعدی ذخیره می‌شود (ذخیره‌ی خودکار نمی‌شکند)؛ صفحه‌ی عمومی تا کامل شدن noindex است
    expect((await s.pages.update(page.id, { content: withSeo('کوتاه') })).content.seo.indexable).toBe(true);
  });

  it('keeps SEO closed during the free trial even when the plan includes it, with an upsell', async () => {
    const seo = fixedPlan(SEO, 'seo');
    const trial: PlanResolver = { ...seo, resolve: async (id) => ({ ...(await seo.resolve(id)), status: 'trial' }) };
    const tenantId = randomUUID();
    expect(await limitsFor(trial, tenantId)).toMatchObject({ seo: false, seoUpsell: 'trial' });
    expect(await limitsFor(fixedPlan(PRO, 'pro'), tenantId)).toMatchObject({ seo: false, seoUpsell: 'upgrade' });
    expect(await limitsFor(seo, tenantId)).toMatchObject({ seo: true, seoUpsell: null });
    // دوره‌ی رایگان روی پلنی که سئو ندارد: خرید همان پلن بازش نمی‌کند ← ارتقا
    const proTrial: PlanResolver = { ...fixedPlan(PRO, 'pro'), resolve: async (id) => ({ ...(await fixedPlan(PRO, 'pro').resolve(id)), status: 'trial' }) };
    expect(await limitsFor(proTrial, tenantId)).toMatchObject({ seo: false, seoUpsell: 'upgrade' });
    // بدون اشتراک (تمام‌شده/محدود) ← خرید
    const limited: PlanResolver = { ...seo, resolve: async (id) => ({ ...(await seo.resolve(id)), status: 'limited', expired: true }) };
    expect(await limitsFor(limited, tenantId)).toMatchObject({ seo: false, seoUpsell: 'buy' });
    // مهلت ۷ روزه پس از پایان اشتراک پولی امکانات پلن را نگه می‌دارد
    const grace: PlanResolver = { ...seo, resolve: async (id) => ({ ...(await seo.resolve(id)), status: 'grace' }) };
    expect(await limitsFor(grace, tenantId)).toMatchObject({ seo: true, seoUpsell: null });

    const s = await setup('seo');
    const page = await s.pages.create({ title: 'x' });
    const inTrial = new PagesService(s.ctx, trial, s.files, fetcher);
    const on = { ...page.content, seo: { ...page.content.seo, indexable: true, description: SEO_DESC } };
    await rejects(inTrial.update(page.id, { content: on }), ForbiddenException, 'seo');
  });

  it('keeps the page title and the profile name identical', async () => {
    const s = await setup();
    const page = await s.pages.create({ title: 'عنوان', content: defaultContent('نام نمونه') });
    expect(page).toMatchObject({ title: 'عنوان', content: { profile: { name: 'عنوان' } } });

    const named = await s.pages.update(page.id, { content: withProfileName(page.content, 'نام تازه') });
    expect(named.title).toBe('نام تازه');
    expect((await s.pages.list()).find((p) => p.id === page.id)!.title).toBe('نام تازه');

    const titled = await s.pages.update(page.id, { title: 'عنوان تازه' });
    expect(titled).toMatchObject({ title: 'عنوان تازه', content: { profile: { name: 'عنوان تازه' } } });

    // پیش‌نویس با نام خالی ذخیره می‌شود و آخرین عنوان می‌ماند
    const empty = await s.pages.update(page.id, { content: withProfileName(titled.content, '') });
    expect(empty).toMatchObject({ title: 'عنوان تازه', content: { profile: { name: '' } } });
  });

  it('validates content strictly; full theme is free; images must belong to the tenant', async () => {
    const s = await setup();
    const page = await s.pages.create({ title: 'x' });
    const content = { ...defaultContent('نام'), profile: { name: 'نام', bio: 'بیو', avatar: null } };
    expect((await s.pages.update(page.id, { content })).content.profile.bio).toBe('بیو');

    await rejects(s.pages.update(page.id, { content: { ...content, evil: true } }), UnprocessableEntityException, 'invalid_content');
    const custom = { ...content, theme: { preset: 'minimal', accent: null, overrides: { radius: 'none' } } };
    expect((await s.pages.update(page.id, { content: custom })).content.theme.overrides.radius).toBe('none');

    const foreign: ImageRef = { file_id: randomUUID(), width: 1, height: 1 };
    await rejects(
      s.pages.update(page.id, { content: { ...content, profile: { ...content.profile, avatar: foreign } } }),
      UnprocessableEntityException,
      'invalid_asset',
    );

    const pro = await setup('pro');
    const p2 = await pro.pages.create({ title: 'x' });
    expect((await pro.pages.update(p2.id, { content: custom })).content.theme.overrides.radius).toBe('none');
  });

  it('creates from starting content and elements (templates) with the same rules as editing', async () => {
    const s = await setup();
    const content = { ...defaultContent('کافه'), profile: { name: 'کافه', bio: 'قهوه‌ی تازه', avatar: null, layout: 'stacked' } };
    const page = await s.pages.create({
      title: 'کافه',
      content,
      elements: [
        { kind: 'link_button', settings: { label: 'منو', url: 'example.com/menu' } },
        { kind: 'video_embed', settings: { source_url: '', video: { provider: 'youtube', video_id: 'forged' } } },
        { kind: 'rich_text' },
      ],
    });
    expect(page.createdBy).toBe(testUserId);
    expect(page.content.profile.bio).toBe('قهوه‌ی تازه');
    expect(page.elements.map((e) => e.kind)).toEqual(['link_button', 'video_embed', 'rich_text']);
    // لینک مثل ویرایش نرمال می‌شود و داده‌ی مشتق ویدیو از کلاینت پذیرفته نمی‌شود.
    expect(page.elements[0]!.settings).toMatchObject({ label: 'منو', url: 'https://example.com/menu' });
    expect(page.elements[1]!.settings).toMatchObject({ video: null });

    const [item] = await s.pages.list();
    expect(item).toMatchObject({ id: page.id, createdBy: testUserId });
    expect(item!.preview.content.profile.name).toBe('کافه');
    expect(item!.preview.elements.map((e) => e.kind)).toEqual(['link_button', 'video_embed', 'rich_text']);

    const other = await setup();
    await rejects(other.pages.create({ title: 'x', elements: [{ kind: 'link_button', settings: { label: 5 } }] }), UnprocessableEntityException, 'invalid_settings');
    await rejects(other.pages.create({ title: 'x', content: { ...content, evil: true } }), UnprocessableEntityException, 'invalid_content');
    const tooMany = Array.from({ length: 31 }, () => ({ kind: 'rich_text' as const }));
    await rejects(other.pages.create({ title: 'x', elements: tooMany }), ForbiddenException, 'max_elements');
    const foreign: ImageRef = { file_id: randomUUID(), width: 1, height: 1 };
    await rejects(
      other.pages.create({ title: 'x', content: { ...content, profile: { ...content.profile, avatar: foreign } } }),
      UnprocessableEntityException,
      'invalid_asset',
    );
    // تصویر اسلایدهای بعدی هم مثل تصویر اول باید فایل public همین فضای کاری باشد
    const slider = { image: { file_id: '/images/templates/cafe-hero-showcase.jpg', width: 1, height: 1 }, alt: '', slides: [{ image: foreign }] };
    await rejects(other.pages.create({ title: 'x', elements: [{ kind: 'image', settings: slider }] }), UnprocessableEntityException, 'invalid_asset');
    // ساخت ناموفق صفحه‌ای باقی نمی‌گذارد.
    expect(await other.pages.list()).toEqual([]);
  });

  it('pages of another tenant are not found', async () => {
    const a = await setup();
    const b = await setup();
    const page = await a.pages.create({ title: 'x' });
    await rejects(b.pages.get(page.id), NotFoundException);
    await rejects(b.elements.add(page.id, { kind: 'rich_text' }), NotFoundException);
  });
});

describe('elements', () => {
  it('adds, orders, moves and removes elements', async () => {
    const s = await setup();
    const page = await s.pages.create({ title: 'x' });
    const a = await s.elements.add(page.id, { kind: 'link_button' });
    const b = await s.elements.add(page.id, { kind: 'rich_text' });
    const c = await s.elements.add(page.id, { kind: 'image', afterId: a.id });
    const order = async () => (await s.pages.get(page.id)).elements.map((e) => e.id);
    expect(await order()).toEqual([a.id, c.id, b.id]);

    await s.elements.move(page.id, b.id, { direction: 'up' });
    expect(await order()).toEqual([a.id, b.id, c.id]);
    await s.elements.move(page.id, a.id, { direction: 'down' });
    expect(await order()).toEqual([b.id, a.id, c.id]);
    await s.elements.move(page.id, b.id, { direction: 'up' }); // اولی: بی‌تغییر
    expect(await order()).toEqual([b.id, a.id, c.id]);

    await s.elements.remove(page.id, a.id);
    expect(await order()).toEqual([b.id, c.id]);
  });

  it('validates settings and derives video/map data on the server', async () => {
    const s = await setup();
    const page = await s.pages.create({ title: 'x' });
    const v = await s.elements.add(page.id, { kind: 'video_embed' });
    const updated = await s.elements.update(page.id, v.id, {
      settings: { source_url: 'https://youtu.be/dQw4w9WgXcQ', video: { provider: 'vimeo', video_id: 'forged' } },
    });
    expect(updated.settings).toEqual({ source_url: 'https://youtu.be/dQw4w9WgXcQ', video: { provider: 'youtube', video_id: 'dQw4w9WgXcQ' } });
    // لینک ناشناخته ذخیره می‌شود ولی داده‌ی مشتق ندارد (انتشار را missing_video رد می‌کند)
    expect((await s.elements.update(page.id, v.id, { settings: { source_url: 'evil.com/x' } })).settings).toEqual({
      source_url: 'https://evil.com/x',
      video: null,
    });

    const m = await s.elements.add(page.id, { kind: 'map_embed' });
    const map = await s.elements.update(page.id, m.id, { settings: { source_url: 'https://maps.app.goo.gl/Short1' } });
    expect(map.settings).toMatchObject({ location: { provider: 'google', lat: 35.75, lng: 51.41, zoom: 16 } });
    expect(
      (await s.elements.update(page.id, m.id, { settings: { source_url: 'https://balad.ir/p/no-coords' } })).settings,
    ).toMatchObject({ location: null });

    const btn = await s.elements.add(page.id, { kind: 'link_button' });
    // لینک نامعتبر ذخیره می‌شود ولی انتشار را رد می‌کند؛ لینک بدون https نرمال می‌شود
    await s.elements.update(page.id, btn.id, { settings: { label: 'x', url: 'javascript:alert(1)' } });
    await rejects(s.pages.publish(page.id), UnprocessableEntityException, 'not_publishable');
    expect((await s.elements.update(page.id, btn.id, { settings: { label: 'x', url: 'example.com/a' } })).settings).toMatchObject({
      url: 'https://example.com/a',
    });
    await rejects(
      s.elements.update(page.id, btn.id, { settings: { label: 'x', url: 'https://a.com', html: '<b>' } }),
      UnprocessableEntityException,
      'invalid_settings',
    );
    expect((await s.elements.update(page.id, btn.id, { visible: false })).visible).toBe(false);
  });

  it('enforces the per-page element limit', async () => {
    const s = await setup();
    const page = await s.pages.create({ title: 'x' });
    for (let i = 0; i < page.limits.maxElementsPerPage; i++) await s.elements.add(page.id, { kind: 'rich_text' });
    await rejects(s.elements.add(page.id, { kind: 'rich_text' }), ForbiddenException, 'max_elements');
  });
});

describe('uploads', () => {
  it('stores images as public norofile files and returns the file id', async () => {
    const s = await setup();
    const page = await s.pages.create({ title: 'x' });
    const r = await s.uploads.uploadImage(page.id, Buffer.from(GIF));
    expect(r).toMatchObject({ width: 7, height: 9, url: `https://noroset.test/api/norofile/public/files/${r.file_id}` });
    expect(s.files.uploads[0]).toMatchObject({ source: 'norolink', accept: 'image', visibility: 'public', maxBytes: 5 * 1024 * 1024 });
    await rejects(s.uploads.uploadImage(page.id, Buffer.from('<svg/>')), UnprocessableEntityException, 'invalid_file');
    const other = await setup();
    await rejects(other.uploads.uploadImage(page.id, Buffer.from(GIF)), NotFoundException);
  });
});

describe('publish, public page and stats', () => {
  async function publishedPage(tier: PlanTier = 'free') {
    const s = await setup(tier);
    const page = await s.pages.create({ title: 'صفحه', slug: uniq('pub') });
    const btn = await s.elements.add(page.id, { kind: 'link_button' });
    const hidden = await s.elements.add(page.id, { kind: 'rich_text' });
    await s.elements.update(page.id, hidden.id, { visible: false });
    return { s, page, btn, hidden };
  }

  it('an expired plan hides the public page content and blocks publishing', async () => {
    const { s, page, btn } = await publishedPage();
    await s.elements.update(page.id, btn.id, { settings: { label: 'سایت', url: 'https://example.com' } });
    await s.pages.publish(page.id);
    const active = fixedPlan();
    const expired: PlanResolver = { ...active, resolve: async (id) => ({ ...(await active.resolve(id)), status: 'limited', expired: true }) };
    expect(await new PublicLinksService(allow, hasher, expired, s.files).read(page.slug, '1.1.1.1')).toEqual({ unavailable: true, notice: null });
    await rejects(new PagesService(s.ctx, expired, s.files, fetcher).publish(page.id), ForbiddenException, 'plan_expired');
  });

  it('refuses to publish incomplete pages, then snapshots visible elements', async () => {
    const { s, page, btn } = await publishedPage();
    await rejects(s.pages.publish(page.id), UnprocessableEntityException, 'missing_url');
    await s.elements.update(page.id, btn.id, { settings: { label: 'سایت', url: 'https://example.com' } });
    const published = await s.pages.publish(page.id);
    expect(published).toMatchObject({ status: 'published', hasUnpublishedChanges: false, issues: [] });

    const view = (await s.publicLinks.read(page.slug, '1.1.1.1')) as PublicLinkView;
    expect(view.elements.map((e) => e.id)).toEqual([btn.id]);
    expect(view.branding.forceLicense).toBe(true);
    expect(view.assetBaseUrl).toBe('https://noroset.test/api/norofile/public/files');

    // نشان روی صفحه‌ی لینک در همه‌ی پلن‌ها، حتی با branding.remove
    expect((await limitsFor(fixedPlan(PRO, 'pro'), randomUUID())).forceBranding).toBe(true);

    // تغییر پیش‌نویس روی صفحه‌ی عمومی اثر ندارد تا انتشار بعدی.
    await s.elements.update(page.id, btn.id, { settings: { label: 'جدید', url: 'https://example.com' } });
    expect((await s.pages.get(page.id)).hasUnpublishedChanges).toBe(true);
    const again = (await s.publicLinks.read(page.slug, '1.1.1.1')) as PublicLinkView;
    expect((again.elements[0]!.settings as { label: string }).label).toBe('سایت');

    await s.pages.unpublish(page.id);
    await rejects(s.publicLinks.read(page.slug, '1.1.1.1'), NotFoundException);
  });

  it('serves noindex unless the page opted in and the plan includes SEO', async () => {
    const { s, page, btn } = await publishedPage('seo');
    await s.elements.update(page.id, btn.id, { settings: { label: 'سایت', url: 'https://example.com' } });
    const content = (await s.pages.get(page.id)).content;
    await s.pages.update(page.id, { content: { ...content, seo: { ...content.seo, indexable: true, description: SEO_DESC } } });
    await s.pages.publish(page.id);
    expect(((await s.publicLinks.read(page.slug, '1.1.1.1')) as PublicLinkView).content.seo.indexable).toBe(true);
    // کاهش پلن یا پایان آن: صفحه‌ی منتشرشده بدون انتشار دوباره noindex می‌شود
    const noSeo = new PublicLinksService(allow, hasher, fixedPlan(PRO, 'pro'), s.files);
    expect(((await noSeo.read(page.slug, '1.1.1.1')) as PublicLinkView).content.seo.indexable).toBe(false);
    // دوره‌ی رایگان، حتی با پلن دارای سئو
    const seo = fixedPlan(SEO, 'seo');
    const trial: PlanResolver = { ...seo, resolve: async (id) => ({ ...(await seo.resolve(id)), status: 'trial' }) };
    const inTrial = new PublicLinksService(allow, hasher, trial, s.files);
    expect(((await inTrial.read(page.slug, '1.1.1.1')) as PublicLinkView).content.seo.indexable).toBe(false);
    expect((await inTrial.sitemap('1.1.1.1')).pages.some((p) => p.slug === page.slug)).toBe(false);
    expect((await inTrial.directory({ query: page.slug }, '1.1.1.1')).items).toHaveLength(0);

    // توضیح کوتاه‌شده پس از روشن کردن: noindex و بیرون از sitemap و دایرکتوری تا کامل شدن
    await s.pages.update(page.id, { content: { ...content, seo: { ...content.seo, indexable: true, description: 'کوتاه' } } });
    await s.pages.publish(page.id);
    expect(((await s.publicLinks.read(page.slug, '1.1.1.1')) as PublicLinkView).content.seo.indexable).toBe(false);
    expect((await s.publicLinks.sitemap('1.1.1.1')).pages.some((p) => p.slug === page.slug)).toBe(false);
    expect((await s.publicLinks.directory({ query: page.slug }, '1.1.1.1')).items).toHaveLength(0);
  });

  it('puts only indexable pages with an active SEO plan in the sitemap', async () => {
    const { s, page, btn } = await publishedPage('seo');
    await s.elements.update(page.id, btn.id, { settings: { label: 'سایت', url: 'https://example.com' } });
    await s.pages.publish(page.id);
    const inSitemap = async (svc = s.publicLinks) => (await svc.sitemap('1.1.1.1')).pages.find((p) => p.slug === page.slug);

    expect(await inSitemap()).toBeUndefined();
    const content = (await s.pages.get(page.id)).content;
    await s.pages.update(page.id, { content: { ...content, seo: { ...content.seo, indexable: true, description: SEO_DESC } } });
    expect(await inSitemap()).toBeUndefined();
    const published = await s.pages.publish(page.id);
    expect(await inSitemap()).toEqual({ slug: page.slug, lastmod: published.publishedAt!.toISOString() });

    // پلن بدون سئو یا تمام‌شده: بیرون از sitemap
    expect(await inSitemap(new PublicLinksService(allow, hasher, fixedPlan(PRO, 'pro'), s.files))).toBeUndefined();
    const seo = fixedPlan(SEO, 'seo');
    const expired: PlanResolver = { ...seo, resolve: async (id) => ({ ...(await seo.resolve(id)), status: 'limited', expired: true }) };
    expect(await inSitemap(new PublicLinksService(allow, hasher, expired, s.files))).toBeUndefined();
    // لغو انتشار: بیرون
    await s.pages.unpublish(page.id);
    expect(await inSitemap()).toBeUndefined();
  });

  it('lists only published, indexable pages with an SEO plan in the public directory', async () => {
    const { s, page, btn } = await publishedPage('seo');
    await s.elements.update(page.id, btn.id, { settings: { label: 'فروشگاه آنلاین', url: 'https://example.com' } });
    await s.pages.publish(page.id);
    const listed = async (svc = s.publicLinks) =>
      (await svc.directory({ query: page.slug }, '1.1.1.1')).items.some((i) => i.slug === page.slug);

    // پیش‌فرض noindex: در دایرکتوری نیست
    expect(await listed()).toBe(false);
    // روشن در پیش‌نویس ولی منتشرنشده: هنوز نیست
    const content = (await s.pages.get(page.id)).content;
    await s.pages.update(page.id, { content: { ...content, seo: { ...content.seo, indexable: true, description: SEO_DESC } } });
    expect(await listed()).toBe(false);
    await s.pages.publish(page.id);

    const dir = await s.publicLinks.directory({}, '1.1.1.1');
    expect(dir.items.some((i) => i.slug === page.slug)).toBe(true);
    expect(dir.items.every((i) => i.isIndexable)).toBe(true);
    // پلن بدون سئو: حتی با مقدار روشن فهرست نمی‌شود
    expect(await listed(new PublicLinksService(allow, hasher, fixedPlan(PRO, 'pro'), s.files))).toBe(false);

    const match = await s.publicLinks.directory({ query: page.slug }, '1.1.1.1');
    expect(match.items).toHaveLength(1);
    expect(match.items[0]?.slug).toBe(page.slug);

    const noMatch = await s.publicLinks.directory({ query: 'non-existent-query-xyz' }, '1.1.1.1');
    expect(noMatch.items).toHaveLength(0);
  });

  it('records views and clicks and aggregates stats', async () => {
    const { s, page, btn } = await publishedPage();
    await s.elements.update(page.id, btn.id, { settings: { label: 'سایت', url: 'https://example.com' } });
    await s.pages.publish(page.id);

    await s.publicLinks.event(page.slug, { kind: 'page_view', referrer: 'https://www.instagram.com/x' }, '2.2.2.2', UA_MOBILE);
    await s.publicLinks.event(page.slug, { kind: 'page_view' }, '2.2.2.2', UA_MOBILE);
    await s.publicLinks.event(page.slug, { kind: 'page_view' }, '3.3.3.3', UA_MOBILE);
    await s.publicLinks.event(page.slug, { kind: 'element_click', elementId: btn.id }, '2.2.2.2', UA_MOBILE);
    // ربات شمرده نمی‌شود؛ المان ناشناس ← ۴۲۲.
    await s.publicLinks.event(page.slug, { kind: 'page_view' }, '4.4.4.4', 'TelegramBot (like TwitterBot)');
    await rejects(
      s.publicLinks.event(page.slug, { kind: 'element_click', elementId: '00000000-0000-0000-0000-000000000009' }, '2.2.2.2', UA_MOBILE),
      UnprocessableEntityException,
    );

    const stats = await s.stats.get(page.id, {});
    expect(stats.to).toBe(tehranToday());
    expect(stats.totals).toEqual({ views: 3, clicks: 1, uniqueVisitors: 2 });
    expect(stats.daily).toEqual([{ day: tehranToday(), views: 3, clicks: 1 }]);
    expect(stats.elements).toEqual([{ elementId: btn.id, clicks: 1 }]);
    expect(stats.detailed).toBeNull();
  });

  it('tracks image usage in norofile and releases it when the page is deleted', async () => {
    const s = await setup();
    const page = await s.pages.create({ title: 'x' });
    const owner = `norolink_page:${page.id}`;
    const img = await s.uploads.uploadImage(page.id, Buffer.from(GIF));
    const avatar = await s.uploads.uploadImage(page.id, Buffer.from(GIF));
    const el = await s.elements.add(page.id, { kind: 'image' });
    await s.elements.update(page.id, el.id, {
      settings: { image: { file_id: img.file_id, width: img.width, height: img.height }, alt: 'عکس' },
    });
    expect(s.files.usages.get(owner)).toEqual([img.file_id]);

    const content = (await s.pages.get(page.id)).content;
    const avatarRef = { file_id: avatar.file_id, width: avatar.width, height: avatar.height };
    await s.pages.update(page.id, { content: { ...content, profile: { ...content.profile, avatar: avatarRef } } });
    expect(s.files.usages.get(owner)).toEqual([avatar.file_id, img.file_id]);

    await s.elements.remove(page.id, el.id);
    expect(s.files.usages.get(owner)).toEqual([avatar.file_id]);

    await s.pages.remove(page.id);
    expect(s.files.usages.get(owner)).toEqual([]);
    await rejects(s.pages.get(page.id), NotFoundException);
  });
});

describe('templates', () => {
  it('every template creates a page on the free plan', async () => {
    const { LINK_TEMPLATES } = await import('../shared');
    for (const t of LINK_TEMPLATES) {
      const s = await setup();
      const page = await s.pages.create({ title: t.title, content: t.content, elements: t.elements });
      expect(page.elements.map((e) => e.kind)).toEqual(t.elements.map((e) => e.kind));
      expect(page.content.theme.preset).toBe(t.content.theme.preset);
    }
  });
});

describe('platform templates', () => {
  const youtube = 'https://youtu.be/dQw4w9WgXcQ';

  /** superadmin واقعی: RLS جدول قالب‌ها و لاگ ممیزی با is_platform_admin() دوباره بررسی می‌کنند. */
  async function adminSetup() {
    const [u] = await db.insert(platformUsers).values({ email: `${uniq('tpl-admin')}@test.local`, platformRole: 'superadmin' }).returning();
    const adminId = u!.id;
    const ctx: PlatformAdminContext = { adminId: () => adminId, ip: () => '1.2.3.4', run: (fn) => withPlatformAdmin(adminId, fn) };
    const files = new FakeFiles();
    return { adminId, files, ctx, templates: new TemplatesService(ctx, files, fetcher) };
  }

  const inGallery = async (s: { templates: TemplatesService }, id: string) => (await s.templates.gallery()).find((t) => t.id === id);

  it('drafts stay out of the gallery; publishing shows the snapshot and later edits wait for the next publish', async () => {
    const s = await adminSetup();
    const created = await s.templates.create({ title: 'قالب کافه', description: 'برای کافه‌ها', category: 'business' });
    expect(created).toMatchObject({ status: 'draft', title: 'قالب کافه', slug: '', hasUnpublishedChanges: true, elements: [] });
    expect(await inGallery(s, created.id)).toBeUndefined();

    const first = await s.templates.addElement(created.id, { kind: 'link_button' });
    await s.templates.updateElement(created.id, first.id, { settings: { ...first.settings, label: 'منو', url: 'example.com/menu' } });
    const video = await s.templates.addElement(created.id, { kind: 'video_embed', afterId: first.id });
    const saved = await s.templates.updateElement(created.id, video.id, { settings: { source_url: youtube, video: { provider: 'vimeo', video_id: 'forged' } } });
    // داده‌ی مشتق مثل ویرایش صفحه فقط در سرور از لینک ساخته می‌شود
    expect(saved.settings).toMatchObject({ video: { provider: 'youtube', video_id: 'dQw4w9WgXcQ' } });

    const hidden = await s.templates.addElement(created.id, { kind: 'rich_text' });
    await s.templates.updateElement(created.id, hidden.id, { visible: false });
    await s.templates.moveElement(created.id, video.id, { direction: 'up' });
    await s.templates.update(created.id, { content: withProfileName(created.content, 'کافه نور') });

    const published = await s.templates.publish(created.id);
    expect(published).toMatchObject({ status: 'published', hasUnpublishedChanges: false });
    const live = await inGallery(s, created.id);
    expect(live).toMatchObject({ title: 'قالب کافه', description: 'برای کافه‌ها', category: 'business' });
    expect(live!.content.profile.name).toBe('کافه نور');
    expect(live!.elements.map((e) => e.kind)).toEqual(['video_embed', 'link_button']);
    expect(live!.thumb).toBeUndefined();

    // بندانگشتی ساخته‌شده در مرورگر ادمین با همان انتشار در گالری می‌آید و انتشار بعدی جایش را می‌گیرد
    const thumb = 'platform/00000000-0000-4000-8000-000000000001';
    await s.templates.publish(created.id, thumb);
    expect((await inGallery(s, created.id))!.thumb).toBe(thumb);
    await s.templates.publish(created.id);
    expect((await inGallery(s, created.id))!.thumb).toBeUndefined();

    await s.templates.update(created.id, { content: withProfileName(created.content, 'تغییر منتشرنشده') });
    expect((await inGallery(s, created.id))!.content.profile.name).toBe('کافه نور');
    expect((await s.templates.get(created.id)).hasUnpublishedChanges).toBe(true);

    await s.templates.unpublish(created.id);
    expect(await inGallery(s, created.id)).toBeUndefined();
    await s.templates.publish(created.id);
    await s.templates.remove(created.id);
    expect(await inGallery(s, created.id)).toBeUndefined();
    await rejects(s.templates.get(created.id), NotFoundException);

    const actions = await s.ctx.run((tx) =>
      tx.select({ action: adminAuditLog.action, ip: adminAuditLog.ip }).from(adminAuditLog).where(eq(adminAuditLog.targetId, created.id)),
    );
    expect(actions.map((a) => a.action).sort()).toEqual([
      'link_template.create',
      'link_template.delete',
      'link_template.publish',
      'link_template.publish',
      'link_template.publish',
      'link_template.publish',
      'link_template.unpublish',
    ]);
  });

  it('a page made from the template works in another workspace, with its images and derived embeds', async () => {
    const s = await adminSetup();
    const created = await s.templates.create({ title: 'قالب', category: 'personal' });
    const uploaded = await s.templates.uploadImage(created.id, GIF);
    expect(uploaded.file_id).toMatch(/^platform\/[0-9a-f-]{36}$/);
    expect(uploaded.url).toBe(`${s.files.publicBaseUrl()}/${uploaded.file_id}`);
    expect(s.files.platformUploads).toEqual([s.adminId]);
    const image = { file_id: uploaded.file_id, width: uploaded.width, height: uploaded.height };
    await s.templates.update(created.id, {
      content: { ...created.content, profile: { ...created.content.profile, avatar: image } },
    });
    const el = await s.templates.addElement(created.id, { kind: 'image' });
    await s.templates.updateElement(created.id, el.id, { settings: { ...el.settings, image, alt: 'x' } });
    const video = await s.templates.addElement(created.id, { kind: 'video_embed' });
    await s.templates.updateElement(created.id, video.id, { settings: { source_url: youtube, video: null } });
    await s.templates.publish(created.id);

    const template = (await inGallery(s, created.id))!;
    const user = await setup();
    const page = await user.pages.create({ title: template.title, content: template.content, elements: template.elements });
    expect(page.content.profile.avatar?.file_id).toBe(uploaded.file_id);
    expect(page.elements.map((e) => e.kind)).toEqual(['image', 'video_embed']);
    expect(page.elements[1]!.settings).toMatchObject({ video: { provider: 'youtube', video_id: 'dQw4w9WgXcQ' } });
    // در norofile فضای کاری ثبت نمی‌شود: فایل مال پلتفرم است
    expect(user.files.usages.get(`norolink_page:${page.id}`)).toEqual([]);
  });

  it('rejects workspace files and invalid data; caps elements at the free plan limit', async () => {
    const s = await adminSetup();
    const created = await s.templates.create({ title: 'قالب', category: 'creator' });
    const foreign: ImageRef = { file_id: randomUUID(), width: 1, height: 1 };
    await rejects(
      s.templates.update(created.id, { content: { ...created.content, profile: { ...created.content.profile, avatar: foreign } } }),
      UnprocessableEntityException,
      'invalid_asset',
    );
    const el = await s.templates.addElement(created.id, { kind: 'image' });
    await rejects(s.templates.updateElement(created.id, el.id, { settings: { ...el.settings, image: foreign } }), UnprocessableEntityException, 'invalid_asset');
    await rejects(s.templates.update(created.id, { content: { evil: true } }), UnprocessableEntityException, 'invalid_content');
    await rejects(s.templates.updateElement(created.id, el.id, { settings: { evil: true } }), UnprocessableEntityException, 'invalid_settings');
    await rejects(s.templates.uploadImage(created.id, new Uint8Array([1, 2, 3])), UnprocessableEntityException, 'invalid_file');

    for (let i = 1; i < 30; i++) await s.templates.addElement(created.id, { kind: 'rich_text' });
    await rejects(s.templates.addElement(created.id, { kind: 'rich_text' }), ForbiddenException, 'max_elements');
  });

  it('removes and restores built-in templates, in the gallery and the admin list', async () => {
    const s = await adminSetup();
    const key = 'bio';
    await s.templates.removeBuiltin(key);
    await s.templates.removeBuiltin(key); // تکرار بی‌اثر
    expect(await inGallery(s, key)).toBeUndefined();
    const listed = (await s.templates.list()).find((t) => t.id === key);
    expect(listed).toMatchObject({ source: 'builtin', removed: true });
    expect(listed!.preview.elements.length).toBeGreaterThan(0);

    await s.templates.restoreBuiltin(key);
    expect(await inGallery(s, key)).toMatchObject({ id: key });
    await rejects(s.templates.removeBuiltin('no-such-template'), NotFoundException);
  });

  it('only a superadmin can write, at the database level', async () => {
    const [u] = await db.insert(platformUsers).values({ email: `${uniq('tpl-user')}@test.local` }).returning();
    const ctx: PlatformAdminContext = { adminId: () => u!.id, ip: () => null, run: (fn) => withPlatformAdmin(u!.id, fn) };
    const service = new TemplatesService(ctx, new FakeFiles(), fetcher);
    await expect(service.create({ title: 'x', category: 'personal' })).rejects.toThrow();
    await expect(service.removeBuiltin('bio')).rejects.toThrow();
    // بدون هویت ادمین پیش‌نویس هیچ قالبی دیده نمی‌شود
    const s = await adminSetup();
    const draft = await s.templates.create({ title: 'پیش‌نویس', category: 'personal' });
    expect(await db.select().from(norolinkTemplates).where(eq(norolinkTemplates.id, draft.id))).toEqual([]);
  });
});

describe('claim link from a platform template', () => {
  async function adminSetup(role: 'superadmin' | 'user' = 'superadmin', plans: PlanResolver = fixedPlan()) {
    const [u] = await db.insert(platformUsers).values({ email: `${uniq('claim-admin')}@test.local`, platformRole: role }).returning();
    const ctx: PlatformAdminContext = { adminId: () => u!.id, ip: () => '1.2.3.4', run: (fn) => withPlatformAdmin(u!.id, fn) };
    return { adminId: u!.id, ctx, templates: new TemplatesService(ctx, new FakeFiles(), fetcher), links: new ClaimLinksService(ctx, plans) };
  }

  const inGallery = async (s: { templates: TemplatesService }, id: string) => (await s.templates.gallery()).find((t) => t.id === id);
  const slugFor = (prefix: string) => uniq(prefix).toLowerCase();
  const linkFor = (admin: Awaited<ReturnType<typeof adminSetup>>, id: string, slug = slugFor('cafe'), businessName = 'کافه نارنج') =>
    admin.templates.createClaimToken(id, { slug, businessName, note: 'دایرکت اینستاگرام' });

  /** قالب کامل با یک دکمه‌ی نمایان و یک متن پنهان. */
  async function readyTemplate(admin: Awaited<ReturnType<typeof adminSetup>>, name: string, title = uniq('tpl')) {
    const created = await admin.templates.create({ title, category: 'business' });
    await admin.templates.update(created.id, { content: withProfileName(created.content, name) });
    const button = await admin.templates.addElement(created.id, { kind: 'link_button' });
    await admin.templates.updateElement(created.id, button.id, { settings: { ...button.settings, label: 'منو', url: 'example.com/menu' } });
    const hidden = await admin.templates.addElement(created.id, { kind: 'rich_text' });
    await admin.templates.updateElement(created.id, hidden.id, { visible: false });
    return { ...created, buttonId: button.id };
  }

  it('previews publicly and delivers a published page on the reserved address, once per link', async () => {
    const admin = await adminSetup();
    const template = await readyTemplate(admin, 'رستوران سنتی فردوس');
    const customer = await setup('free');
    const slug = slugFor('ferdows');

    const link = await linkFor(admin, template.id, slug, 'رستوران فردوس');
    expect(link).toMatchObject({ slug, businessName: 'رستوران فردوس', note: 'دایرکت اینستاگرام', openCount: 0 });
    expect(link.token).toMatch(/^[A-Za-z0-9]{12}$/);
    // لینکی که شاید برای مشتری فرستاده شده با درخواست دوباره عوض نمی‌شود
    expect((await linkFor(admin, template.id, slugFor('other'))).token).toBe(link.token);
    expect(await admin.templates.get(template.id)).toMatchObject({ claimLink: { token: link.token }, claimedAt: null });

    // تغییر بعد از ساخت لینک هم به مشتری می‌رسد، بدون انتشار در گالری؛ پیش‌نمایش پیام‌رسان‌ها شمرده نمی‌شود
    await admin.templates.update(template.id, { content: withProfileName(template.content, 'فردوس') });
    const preview = await customer.publicLinks.readClaim(link.token, undefined, UA_MOBILE);
    expect(preview).toMatchObject({ title: 'فردوس', businessName: 'رستوران فردوس', slug });
    expect(preview.elements.map((e) => e.kind)).toEqual(['link_button']);
    await customer.publicLinks.readClaim(link.token, undefined, 'WhatsApp/2.23');
    expect((await admin.templates.get(template.id)).claimLink!.openCount).toBe(1);
    expect(await inGallery(admin, template.id)).toBeUndefined();

    const claimed = await customer.pages.claim(link.token);
    expect(claimed).toMatchObject({ title: 'فردوس', slug, published: true, trialStarted: true });

    const page = await customer.pages.get(claimed.pageId);
    expect(page).toMatchObject({ status: 'published', slug, slugChanges: 0, createdBy: testUserId, hasUnpublishedChanges: false });
    expect(page.elements.map((e) => [e.kind, e.visible])).toEqual([['link_button', true], ['rich_text', false]]);
    expect(page.elements[0]!.id).not.toBe(template.buttonId);
    const live = (await customer.publicLinks.read(slug, undefined)) as PublicLinkView;
    expect(live.content.profile.name).toBe('فردوس');
    expect(live.elements).toHaveLength(1);
    // صفحه مال مشتری است: ویرایش می‌شود و به قالب برنمی‌گردد
    await customer.elements.update(page.id, page.elements[0]!.id, { settings: { ...page.elements[0]!.settings, label: 'سفارش' } });
    expect((await admin.templates.get(template.id)).elements[0]!.settings).toMatchObject({ label: 'منو' });

    await rejects(customer.publicLinks.readClaim(link.token, undefined), NotFoundException);
    await rejects(customer.pages.claim(link.token), NotFoundException, 'claim_link_invalid_or_expired');

    // قالب می‌ماند و لینک تازه برای مشتری دیگر صفحه‌ی جدای خودش را می‌سازد
    const after = await admin.templates.get(template.id);
    expect(after.claimLink).toBeNull();
    expect(after.claimedAt).not.toBeNull();
    const next = await linkFor(admin, template.id);
    expect(next.token).not.toBe(link.token);
    const another = await setup('free');
    const second = await another.pages.claim(next.token);
    expect(second.pageId).not.toBe(claimed.pageId);
    expect(second.slug).toBe(next.slug);
  });

  it('reserves the address against everyone else, and the customer may pick another one before claiming', async () => {
    const admin = await adminSetup();
    const template = await readyTemplate(admin, 'کافه');
    const reserved = slugFor('reserved');
    const link = await linkFor(admin, template.id, reserved);
    const stranger = await setup('pro');

    await rejects(stranger.pages.create({ title: 'x', slug: reserved }), ConflictException, 'slug_taken');
    expect((await stranger.pages.checkSlug(reserved)).available).toBe(false);
    expect((await stranger.publicLinks.checkClaimSlug(link.token, reserved, undefined)).available).toBe(true);
    await rejects(linkFor(admin, (await readyTemplate(admin, 'دیگر')).id, reserved), ConflictException);

    const taken = slugFor('taken');
    await stranger.pages.create({ title: 'y', slug: taken });
    const customer = await setup('free');
    await rejects(customer.pages.claim(link.token, taken), ConflictException, 'slug_taken');

    const chosen = slugFor('chosen');
    const claimed = await customer.pages.claim(link.token, chosen);
    expect(claimed.slug).toBe(chosen);
    expect((await customer.pages.get(claimed.pageId)).slugChanges).toBe(0);
    // نشانی رزروشده با تحویل آزاد شد
    expect((await stranger.pages.checkSlug(reserved)).available).toBe(true);
  });

  it('refuses a link for an incomplete template and delivers a draft if the template breaks afterwards', async () => {
    const admin = await adminSetup();
    const created = await admin.templates.create({ title: uniq('tpl'), category: 'business' });
    await admin.templates.update(created.id, { content: withProfileName(created.content, 'ناقص') });
    const button = await admin.templates.addElement(created.id, { kind: 'link_button' });
    await rejects(linkFor(admin, created.id), UnprocessableEntityException, 'not_publishable');

    await admin.templates.updateElement(created.id, button.id, { settings: { ...button.settings, label: 'منو', url: 'example.com' } });
    const { token } = await linkFor(admin, created.id);
    await admin.templates.updateElement(created.id, button.id, { settings: { ...button.settings, label: 'منو', url: '' } });

    const customer = await setup('free');
    const claimed = await customer.pages.claim(token);
    expect(claimed.published).toBe(false);
    expect(await customer.pages.get(claimed.pageId)).toMatchObject({ status: 'draft', slug: claimed.slug });
    await rejects(customer.publicLinks.read(claimed.slug, undefined), NotFoundException);
  });

  it('a revoked link stops working, frees its address and audits the change', async () => {
    const admin = await adminSetup();
    const template = await readyTemplate(admin, 'کافه');
    const slug = slugFor('revoked');
    const { token } = await linkFor(admin, template.id, slug);
    await admin.templates.revokeClaimToken(template.id);
    expect(await admin.templates.get(template.id)).toMatchObject({ claimLink: null, claimedAt: null });
    const customer = await setup('free');
    await rejects(customer.pages.claim(token), NotFoundException);
    await rejects(customer.publicLinks.readClaim(token, undefined), NotFoundException);
    expect((await customer.pages.checkSlug(slug)).available).toBe(true);

    const logs = await admin.ctx.run((tx) => tx.select().from(adminAuditLog).where(eq(adminAuditLog.targetId, template.id)));
    expect(logs.map((l) => l.action)).toEqual(expect.arrayContaining(['link_template.claim_link', 'link_template.claim_revoke']));
  });

  it('is out of reach for everyone but the superadmin, and the token never reaches the gallery', async () => {
    const admin = await adminSetup();
    const template = await readyTemplate(admin, 'کافه');
    const user = await adminSetup('user');
    await rejects(linkFor(user, template.id), NotFoundException);

    const { token } = await linkFor(admin, template.id);
    await rejects(user.templates.revokeClaimToken(template.id), NotFoundException);
    expect(await admin.templates.get(template.id)).toMatchObject({ claimLink: { token } });
    await admin.templates.publish(template.id);
    expect(JSON.stringify(await admin.templates.gallery())).not.toContain(token);
    expect(JSON.stringify(await user.links.summary())).not.toContain(token);
  });

  it('reports the funnel per link: opened, claimed and paid', async () => {
    const plans: PlanResolver = { ...fixedPlan(), paidRial: async () => 8_690_000 };
    const admin = await adminSetup('superadmin', plans);
    const opened = await linkFor(admin, (await readyTemplate(admin, 'الف')).id, slugFor('opened'), 'باز شده');
    const claimedLink = await linkFor(admin, (await readyTemplate(admin, 'ب')).id, slugFor('claimed'), 'تحویل‌شده');
    const customer = await setup('free');
    await customer.publicLinks.readClaim(opened.token, undefined, UA_MOBILE);
    await customer.publicLinks.readClaim(claimedLink.token, undefined, UA_MOBILE);
    await customer.pages.claim(claimedLink.token);

    const funnel = await admin.links.summary();
    const item = (id: string) => funnel.items.find((i) => i.id === id)!;
    expect(item(opened.id)).toMatchObject({ status: 'active', openCount: 1, note: 'دایرکت اینستاگرام', claimedBy: null, plan: null });
    expect(item(opened.id).url).toBe(claimLinkUrl(opened.token));
    expect(item(claimedLink.id)).toMatchObject({
      status: 'claimed',
      url: null,
      claimedTenantId: customer.tenantId,
      claimedBy: { id: testUserId },
      plan: { paidRial: 8_690_000 },
    });
    expect(funnel.totals.claimed).toBeGreaterThanOrEqual(1);
    expect(funnel.totals.paid).toBeGreaterThanOrEqual(1);
  });

  it('exports only active links as text and audits the download', async () => {
    const admin = await adminSetup();
    const customer = await setup('free');
    const name = `کافه  ${uniq('t')}`;
    const active = await readyTemplate(admin, 'الف');
    const taken = await readyTemplate(admin, 'ب');
    const revoked = await readyTemplate(admin, 'پ');
    const none = await readyTemplate(admin, 'ت');
    const tokenActive = (await linkFor(admin, active.id, slugFor('a'), name)).token;
    const tokenTaken = (await linkFor(admin, taken.id)).token;
    const tokenRevoked = (await linkFor(admin, revoked.id)).token;
    await customer.pages.claim(tokenTaken);
    await admin.templates.revokeClaimToken(revoked.id);

    const summary = await admin.links.summary();
    const text = await admin.links.exportText();
    const exported = text.match(/\/c\//g)!.length;
    expect(text.startsWith('﻿')).toBe(true);
    expect(text).toContain(`${name.replace(/\s+/g, ' ')}\n${claimLinkUrl(tokenActive)}\n`);
    expect(text).not.toContain(tokenTaken);
    expect(text).not.toContain(tokenRevoked);
    expect(text).not.toContain(none.title);
    expect(summary.count).toBeGreaterThanOrEqual(1);

    const [log] = await admin.ctx.run((tx) => tx.select().from(adminAuditLog).where(and(eq(adminAuditLog.actorUserId, admin.adminId), eq(adminAuditLog.action, 'link_claim.export'))));
    expect(log).toMatchObject({ targetType: 'link_claim', ip: '1.2.3.4', details: { count: exported } });
  });

  it('builds a short link from the web origin', () => {
    expect(claimLinkUrl('Ab12Cd34Ef56', { WEB_ORIGIN: 'https://noroset.com/' })).toBe('https://noroset.com/c/Ab12Cd34Ef56');
  });
});
