import { and, desc, eq, gt, isNull, or, sql } from 'drizzle-orm';
import { db, withSetting, type Db } from './connection';
import {
  norolinkClaimLinks,
  norolinkModerationReason,
  norolinkModerationStatus,
  norolinkPageReports,
  norolinkPageStats,
  norolinkPages,
  norolinkSlugRedirects,
  norolinkTemplates,
} from './norolink.schema';
import { reservedSlugs, tenants } from './schema';

// مسیر ویژه‌ی صفحه‌ی لینک عمومی (docs/architecture.md §9). مخاطب ناشناس است:
// 1) تراکنش فقط app.public_link_slug را ست می‌کند؛ policy «norolink_pages_public_select» فقط همان یک
//    صفحه‌ی published را نشان می‌دهد. draft_content و norolink_elements هرگز خوانده نمی‌شوند.
// 2) tenant از همان ردیف پیدا و app.current_tenant در همان تراکنش ست می‌شود.
// 3) فقط published_snapshot خوانده و فقط رویداد INSERT می‌شود.

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PageModerationStatus = (typeof norolinkModerationStatus.enumValues)[number];
export type PageModerationReason = (typeof norolinkModerationReason.enumValues)[number];

/** وضعیت مدیریتی ذخیره‌شده‌ی صفحه (§9.13)؛ مهلت گذشته را سرویس «بدون محدودیت» حساب می‌کند. */
export interface PageModeration {
  status: PageModerationStatus;
  reason: PageModerationReason | null;
  notice: string | null;
  until: Date | null;
}

export interface PublicLinkPage {
  pageId: string;
  tenantId: string;
  slug: string;
  title: string;
  /** { content, elements[] } آخرین انتشار (نه پیش‌نویس). */
  snapshot: unknown;
  publishedAt: Date | null;
  moderation: PageModeration;
}

/** صفحه بدون محدودیت مدیریتیِ مؤثر (دایرکتوری و sitemap؛ همان شرط policy `norolink_pages_directory_select`). */
const notModerated = () =>
  or(eq(norolinkPages.moderationStatus, 'none'), sql`(${norolinkPages.moderationUntil} IS NOT NULL AND ${norolinkPages.moderationUntil} <= now())`);

function isValidSlug(slug: string): boolean {
  return slug.length >= 2 && slug.length <= 63 && SLUG.test(slug);
}

async function resolvePage(tx: Db, slug: string): Promise<PublicLinkPage | null> {
  const [page] = await tx
    .select({
      pageId: norolinkPages.id,
      tenantId: norolinkPages.tenantId,
      slug: norolinkPages.slug,
      title: norolinkPages.title,
      snapshot: norolinkPages.publishedSnapshot,
      publishedAt: norolinkPages.publishedAt,
      moderationStatus: norolinkPages.moderationStatus,
      moderationReason: norolinkPages.moderationReason,
      moderationNotice: norolinkPages.moderationNotice,
      moderationUntil: norolinkPages.moderationUntil,
    })
    .from(norolinkPages)
    .innerJoin(tenants, eq(tenants.id, norolinkPages.tenantId))
    .where(and(eq(norolinkPages.slug, slug), eq(norolinkPages.status, 'published'), eq(tenants.status, 'active')))
    .limit(1);
  if (!page || page.snapshot === null) return null;

  await tx.execute(sql`SELECT set_config('app.current_tenant', ${page.tenantId}, true)`);
  const { moderationStatus, moderationReason, moderationNotice, moderationUntil, ...rest } = page;
  return { ...rest, moderation: { status: moderationStatus, reason: moderationReason, notice: moderationNotice, until: moderationUntil } };
}

/** صفحه‌ی منتشرشده با این slug (زیردامنه)؛ draft/ناموجود/tenant معلق ← null. */
export async function findPublicLinkPage(slug: string): Promise<PublicLinkPage | null> {
  if (!isValidSlug(slug)) return null;
  return withSetting('app.public_link_slug', slug, (tx) => resolvePage(tx, slug));
}

/**
 * نشانی فعلی صفحه‌ای که این slug نشانی قبلی آن است (برای ریدایرکت دائمی). فقط وقتی صفحه منتشرشده و tenant فعال باشد؛
 * policy فقط همان یک ردیف را نشان می‌دهد و چیزی از پیش‌نویس خوانده نمی‌شود.
 */
export async function findPublicLinkRedirect(slug: string): Promise<string | null> {
  if (!isValidSlug(slug)) return null;
  return withSetting('app.public_link_slug', slug, async (tx) => {
    const [redirect] = await tx
      .select({ tenantId: norolinkSlugRedirects.tenantId, pageId: norolinkSlugRedirects.pageId })
      .from(norolinkSlugRedirects)
      .where(eq(norolinkSlugRedirects.oldSlug, slug))
      .limit(1);
    if (!redirect) return null;
    await tx.execute(sql`SELECT set_config('app.current_tenant', ${redirect.tenantId}, true)`);
    const [page] = await tx
      .select({ slug: norolinkPages.slug })
      .from(norolinkPages)
      .innerJoin(tenants, eq(tenants.id, norolinkPages.tenantId))
      .where(and(eq(norolinkPages.id, redirect.pageId), eq(norolinkPages.status, 'published'), eq(tenants.status, 'active')))
      .limit(1);
    return page?.slug ?? null;
  });
}

export interface PublicLinkEventInput {
  slug: string;
  kind: 'page_view' | 'element_click';
  /** برای element_click الزامی و باید در snapshot منتشرشده باشد. */
  elementId?: string | null;
  visitorHash?: string | null;
  deviceType?: 'mobile' | 'tablet' | 'desktop' | 'other' | null;
  os?: string | null;
  browser?: string | null;
  referrerDomain?: string | null;
}

export type PublicLinkEventResult = { status: 'created' } | { status: 'not_found' } | { status: 'invalid_element' };

function snapshotHasElement(snapshot: unknown, elementId: string): boolean {
  if (typeof snapshot !== 'object' || snapshot === null) return false;
  const elements = (snapshot as { elements?: unknown }).elements;
  return Array.isArray(elements) && elements.some((e) => (e as { id?: unknown } | null)?.id === elementId);
}

/** ثبت بازدید یا کلیک روی صفحه‌ی منتشرشده. */
export async function insertPublicLinkEvent(input: PublicLinkEventInput): Promise<PublicLinkEventResult> {
  if (!isValidSlug(input.slug)) return { status: 'not_found' };
  const elementId = input.elementId ?? null;
  if (input.kind === 'page_view' && elementId !== null) return { status: 'invalid_element' };
  if (input.kind === 'element_click' && (elementId === null || !UUID.test(elementId))) {
    return { status: 'invalid_element' };
  }
  return withSetting('app.public_link_slug', input.slug, async (tx) => {
    const page = await resolvePage(tx, input.slug);
    if (!page) return { status: 'not_found' };
    if (elementId !== null && !snapshotHasElement(page.snapshot, elementId)) return { status: 'invalid_element' };

    await tx.insert(norolinkPageStats).values({
      tenantId: page.tenantId,
      pageId: page.pageId,
      elementId,
      kind: input.kind,
      visitorHash: input.visitorHash ?? null,
      deviceType: input.deviceType ?? null,
      os: input.os ?? null,
      browser: input.browser ?? null,
      referrerDomain: input.referrerDomain ?? null,
    });
    return { status: 'created' };
  });
}

export interface ClaimableTemplate {
  id: string;
  title: string;
  draftContent: unknown;
  draftElements: unknown;
  /** لینک واگذاری (`norolink_claim_links`). */
  linkId: string;
  /** نشانی رزروشده برای مشتری؛ null ← تصادفی (لینک‌های منتقل‌شده از قبل). */
  slug: string | null;
  businessName: string;
}

const claimLinkColumns = {
  linkId: norolinkClaimLinks.id,
  templateId: norolinkClaimLinks.templateId,
  slug: norolinkClaimLinks.slug,
  businessName: norolinkClaimLinks.businessName,
};

const activeLink = (token: string) =>
  and(eq(norolinkClaimLinks.token, token), isNull(norolinkClaimLinks.claimedAt), isNull(norolinkClaimLinks.revokedAt));

async function templateOf(
  tx: Db,
  link: { linkId: string; templateId: string | null; slug: string | null; businessName: string },
): Promise<ClaimableTemplate | null> {
  if (!link.templateId) return null;
  const [template] = await tx
    .select({
      id: norolinkTemplates.id,
      title: norolinkTemplates.title,
      draftContent: norolinkTemplates.draftContent,
      draftElements: norolinkTemplates.draftElements,
    })
    .from(norolinkTemplates)
    .where(eq(norolinkTemplates.id, link.templateId))
    .limit(1);
  return template ? { ...template, linkId: link.linkId, slug: link.slug, businessName: link.businessName } : null;
}

/**
 * پیش‌نویس قالبِ لینک واگذاری فعال؛ توکن نامعتبر، ابطال‌شده یا تحویل‌شده ← null. با `countOpen` یک بازدید صفحه‌ی تحویل
 * ثبت می‌شود (قیف لینک در مدیریت پلتفرم).
 */
export async function findClaimableTemplate(claimToken: string, options: { countOpen?: boolean } = {}): Promise<ClaimableTemplate | null> {
  if (!claimToken) return null;
  return withSetting('app.claim_token', claimToken, async (tx) => {
    const [link] = await tx.select(claimLinkColumns).from(norolinkClaimLinks).where(activeLink(claimToken)).limit(1);
    if (!link) return null;
    const template = await templateOf(tx, link);
    if (template && options.countOpen) {
      const now = new Date();
      await tx
        .update(norolinkClaimLinks)
        .set({
          openCount: sql`${norolinkClaimLinks.openCount} + 1`,
          firstOpenedAt: sql`COALESCE(${norolinkClaimLinks.firstOpenedAt}, ${now})`,
          lastOpenedAt: now,
        })
        .where(eq(norolinkClaimLinks.id, link.linkId));
    }
    return template;
  });
}

/**
 * مصرف یک‌باره‌ی لینک واگذاری: در یک تراکنش با tenant مشتری، `createPage` صفحه را می‌سازد و لینک با کاربر، tenant، صفحه و نشانی نهایی
 * علامت می‌خورد؛ خطا در ساخت لینک را مصرف‌نشده می‌گذارد. قفل ردیف لینک نمی‌گذارد دو نفر هم‌زمان با یک لینک تحویل بگیرند.
 * نشانی رزروشده‌ی همین لینک در این تراکنش آزاد است (trigger `check_norolink_slug_claim` با `app.claim_token`). لینک نامعتبر ← null.
 */
export async function claimNorolinkTemplate<T extends { pageId: string; slug: string }>(
  claimToken: string,
  tenantId: string,
  userId: string,
  createPage: (tx: Db, template: ClaimableTemplate) => Promise<T>,
): Promise<T | null> {
  if (!claimToken) return null;
  return withSetting('app.claim_token', claimToken, async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_tenant', ${tenantId}, true)`);
    const [link] = await tx.select(claimLinkColumns).from(norolinkClaimLinks).where(activeLink(claimToken)).for('update');
    if (!link) return null;
    const template = await templateOf(tx, link);
    if (!template) return null;
    const created = await createPage(tx, template);
    await tx
      .update(norolinkClaimLinks)
      .set({ claimedAt: new Date(), claimedBy: userId, claimedTenantId: tenantId, claimedPageId: created.pageId, slug: created.slug })
      .where(eq(norolinkClaimLinks.id, link.linkId));
    return created;
  });
}

export type SlugCheckResult =
  | { taken: false }
  | { taken: true; reason: 'reserved' | 'taken' };

/**
 * بررسی یکتایی نشانی در کل پلتفرم (لیست رزرو، صفحه‌های موجود همهٔ tenantها، ریدایرکت‌های نشانی قبلی و نشانی رزروشده‌ی
 * لینک‌های واگذاری).
 */
export async function checkNorolinkSlug(slug: string, options: { exceptClaimToken?: string } = {}): Promise<SlugCheckResult> {
  const clean = slug.trim().toLowerCase();
  if (!clean) return { taken: false };

  // ۱. بررسی جدول نشانی‌های رزروشده (بدون RLS)
  const [reserved] = await db
    .select({ slug: reservedSlugs.slug })
    .from(reservedSlugs)
    .where(eq(reservedSlugs.slug, clean))
    .limit(1);
  if (reserved) return { taken: true, reason: 'reserved' };

  // ۲. بررسی ریدایرکت‌های نشانی قبلی (با policy app.slug_redirect_check)
  const redirectTaken = await withSetting('app.slug_redirect_check', clean, async (tx) => {
    const [row] = await tx
      .select({ id: norolinkSlugRedirects.id })
      .from(norolinkSlugRedirects)
      .where(eq(norolinkSlugRedirects.oldSlug, clean))
      .limit(1);
    return Boolean(row);
  });
  if (redirectTaken) return { taken: true, reason: 'taken' };

  // ۳. بررسی صفحه‌های موجود در کل پلتفرم (با policy app.slug_check)
  const pageTaken = await withSetting('app.slug_check', clean, async (tx) => {
    const [row] = await tx
      .select({ id: norolinkPages.id })
      .from(norolinkPages)
      .where(eq(norolinkPages.slug, clean))
      .limit(1);
    return Boolean(row);
  });
  if (pageTaken) return { taken: true, reason: 'taken' };

  // ۴. نشانی رزروشده‌ی لینک واگذاری فعال (با policy app.claim_slug_check)؛ رزرو خود `exceptClaimToken` آزاد است.
  const claimTaken = await withSetting('app.claim_slug_check', clean, async (tx) => {
    const [row] = await tx
      .select({ token: norolinkClaimLinks.token })
      .from(norolinkClaimLinks)
      .where(and(eq(norolinkClaimLinks.slug, clean), isNull(norolinkClaimLinks.claimedAt), isNull(norolinkClaimLinks.revokedAt)))
      .limit(1);
    return Boolean(row && row.token !== options.exceptClaimToken);
  });
  if (claimTaken) return { taken: true, reason: 'taken' };

  return { taken: false };
}

export interface PublicDirectoryPage {
  slug: string;
  title: string;
  snapshot: unknown;
  publishedAt: Date | null;
  tenantId: string;
}

export interface ListDirectoryOptions {
  limit?: number;
  offset?: number;
}

/**
 * فهرست عمومی صفحات لینک منتشرشده برای دایرکتوری (n8l.ir).
 * فقط ردیف‌های published از tenant فعال، بدون محدودیت مدیریتی مؤثر (§9.13)، که در snapshot منتشرشده `seo.indexable` روشن دارند؛ صفحه‌ی noindex
 * هرگز فهرست نمی‌شود (policy همین شرط را هم دارد، migration `0024`). سقف پلن (`norolink.seo`) را سرویس بررسی می‌کند.
 */
export async function listPublicDirectoryPages(options?: ListDirectoryOptions): Promise<PublicDirectoryPage[]> {
  const limit = Math.min(Math.max(options?.limit ?? 60, 1), 100);
  const offset = Math.max(options?.offset ?? 0, 0);

  return withSetting('app.public_directory', 'on', async (tx) => {
    return tx
      .select({
        slug: norolinkPages.slug,
        title: norolinkPages.title,
        snapshot: norolinkPages.publishedSnapshot,
        publishedAt: norolinkPages.publishedAt,
        tenantId: norolinkPages.tenantId,
      })
      .from(norolinkPages)
      .innerJoin(tenants, eq(tenants.id, norolinkPages.tenantId))
      .where(
        and(
          eq(norolinkPages.status, 'published'),
          eq(tenants.status, 'active'),
          sql`${norolinkPages.publishedSnapshot} IS NOT NULL`,
          sql`(${norolinkPages.publishedSnapshot} #>> '{content,seo,indexable}') = 'true'`,
          notModerated(),
        ),
      )
      .orderBy(desc(norolinkPages.publishedAt), desc(norolinkPages.createdAt))
      .limit(limit)
      .offset(offset);
  });
}

export interface PublicSitemapPage {
  slug: string;
  /** توضیح موتور جستجوی snapshot (شرط حداقل طول را سرویس بررسی می‌کند). */
  description: string | null;
  publishedAt: Date | null;
  tenantId: string;
}

/** سقف نشانی‌های یک فایل sitemap (sitemaps.org). */
export const SITEMAP_MAX_URLS = 50_000;

/**
 * نشانی صفحه‌های لینک برای sitemap دامنه‌ی کوتاه (n8l.ir/sitemap.xml): همان قاعده‌ی دایرکتوری (published، tenant فعال،
 * `seo.indexable` روشن در snapshot؛ policy `norolink_pages_directory_select`) ولی بدون snapshot و تا سقف sitemap.
 * سقف پلن (`norolink.seo`) و پایان پلن را سرویس بررسی می‌کند.
 */
export async function listPublicSitemapPages(limit = SITEMAP_MAX_URLS): Promise<PublicSitemapPage[]> {
  return withSetting('app.public_directory', 'on', async (tx) =>
    tx
      .select({
        slug: norolinkPages.slug,
        publishedAt: norolinkPages.publishedAt,
        tenantId: norolinkPages.tenantId,
        description: sql<string | null>`${norolinkPages.publishedSnapshot} #>> '{content,seo,description}'`,
      })
      .from(norolinkPages)
      .innerJoin(tenants, eq(tenants.id, norolinkPages.tenantId))
      .where(
        and(
          eq(norolinkPages.status, 'published'),
          eq(tenants.status, 'active'),
          sql`(${norolinkPages.publishedSnapshot} #>> '{content,seo,indexable}') = 'true'`,
          notModerated(),
        ),
      )
      .orderBy(desc(norolinkPages.publishedAt))
      .limit(Math.min(Math.max(limit, 1), SITEMAP_MAX_URLS)),
  );
}

export type PageReportReason = Exclude<PageModerationReason, 'legal_order'>;

export interface PublicPageReportInput {
  slug: string;
  reason: PageReportReason;
  details: string;
  contact: string | null;
  /** HMAC آی‌پی گزارش‌دهنده (نه IP خام)؛ گزارش باز تکراری همان هش برای همان صفحه ثبت نمی‌شود. */
  ipHash: string | null;
}

export type PublicPageReportResult = { status: 'created' } | { status: 'duplicate' } | { status: 'not_found' };

/**
 * گزارش تخلف بازدیدکننده (§9.13): فقط برای صفحه‌ی منتشرشده‌ی همین نشانی (policy عمومی صفحه و policy ثبت گزارش).
 * گزارش باز قبلی همان IP برای همان صفحه ← `duplicate` بدون ثبت (پاسخ بیرونی یکسان است).
 */
export async function insertPublicPageReport(input: PublicPageReportInput): Promise<PublicPageReportResult> {
  if (!isValidSlug(input.slug)) return { status: 'not_found' };
  return withSetting('app.public_link_slug', input.slug, async (tx) => {
    const page = await resolvePage(tx, input.slug);
    if (!page) return { status: 'not_found' };
    if (input.ipHash) {
      await tx.execute(sql`SELECT set_config('app.report_ip_hash', ${input.ipHash}, true)`);
      const [open] = await tx
        .select({ id: norolinkPageReports.id })
        .from(norolinkPageReports)
        .where(and(eq(norolinkPageReports.pageId, page.pageId), gt(norolinkPageReports.createdAt, sql`now() - interval '1 day'`)))
        .limit(1);
      if (open) return { status: 'duplicate' };
    }
    await tx.insert(norolinkPageReports).values({
      tenantId: page.tenantId,
      pageId: page.pageId,
      slug: page.slug,
      reason: input.reason,
      details: input.details,
      contact: input.contact,
      ipHash: input.ipHash,
    });
    return { status: 'created' };
  });
}
