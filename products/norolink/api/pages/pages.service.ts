import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomInt } from 'node:crypto';
import {
  and,
  asc,
  checkNorolinkSlug,
  claimNorolinkTemplate,
  count,
  desc,
  eq,
  FILE_SERVICE,
  norolinkElements,
  norolinkSlugRedirects,
  norolinkPages,
  PLAN_RESOLVER,
  platformUsers,
  reservedSlugs,
  sql,
  TENANT_CONTEXT,
  type Db,
  type FileService,
  type PlanResolver,
  type TenantContext,
} from '@noroset/core';
import { MAX_SLUG_CHANGES,
  SEO_DESCRIPTION_MIN,
  seoDescriptionReady,
  PAGE_SLUG,
  PAGE_SLUG_MAX,
  PAGE_SLUG_MIN,
  contentImages,
  defaultContent,
  effectiveModeration,
  moderationLocks,
  type ModerationReason,
  type ModerationStatus,
  defaultSettings,
  elementImages,
  imageFileIds,
  keyBetween,
  pageContentSchema,
  parseSettings,
  publishIssues,
  snapshotImages,
  type AnyElement,
  type ElementKind,
  type NorolinkLimits,
  type PageContent,
  type PublishIssue,
  type Snapshot,
} from '../../shared';
import { IMAGE_REQUIREMENT, limitsFor, MAP_FETCHER, norolinkExpired, PAGE_FILE_OWNER, pgCode, planExpired, planLimit } from '../access';
import { deriveEmbedData } from '../embeds/derive';
import type { Fetcher } from '../embeds/map-resolver';
import type { CreatePageDto, UpdatePageDto } from './dto';

export type PageStatus = 'draft' | 'published';

export interface PageSummary {
  id: string;
  slug: string;
  /** چند بار نشانی عوض شده (سقف: MAX_SLUG_CHANGES). */
  slugChanges: number;
  title: string;
  status: PageStatus;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  /** پیش‌نویس بعد از آخرین انتشار تغییر کرده است. */
  hasUnpublishedChanges: boolean;
  /** سازنده (فیلتر «مالک»)؛ صفحه‌های قدیمی‌تر ← null. */
  createdBy: string | null;
  createdByName: string | null;
  /** محدودیت مؤثر مدیریت پلتفرم (§9.13)؛ بدون محدودیت ← null. یادداشت داخلی و گزارش‌ها هرگز به مالک نمی‌رسند. */
  moderation: OwnerModeration | null;
}

export interface OwnerModeration {
  status: Exclude<ModerationStatus, 'none'>;
  reason: ModerationReason;
  notice: string | null;
  until: Date | null;
  /** انتشار، تغییر نشانی و حذف قفل است. */
  locked: boolean;
}

interface ModerationColumns {
  moderationStatus: ModerationStatus;
  moderationReason: ModerationReason | null;
  moderationNotice: string | null;
  moderationUntil: Date | null;
}

export function ownerModeration(row: ModerationColumns, now: Date = new Date()): OwnerModeration | null {
  const status = effectiveModeration({ status: row.moderationStatus, reason: row.moderationReason, notice: row.moderationNotice, until: row.moderationUntil }, now);
  if (status === 'none') return null;
  return { status, reason: row.moderationReason!, notice: row.moderationNotice, until: row.moderationUntil, locked: moderationLocks(status) };
}

/** صفحه‌ای که مدیریت پلتفرم محدود کرده: مالک منتشر نمی‌کند، نشانی را عوض نمی‌کند و حذف نمی‌کند (trigger DB هم همین را می‌گیرد). */
export function pageModerated(): ForbiddenException {
  return new ForbiddenException('page_moderated');
}

/** تعداد المان‌های پیش‌نویس در تصویر بندانگشتی فهرست. */
export const PREVIEW_ELEMENTS = 6;

/** ردیف فهرست: خلاصه + پیش‌نویس کوتاه برای تصویر بندانگشتی (همان رندر صفحه، کوچک‌شده). */
export interface PageListItem extends PageSummary {
  preview: { content: PageContent; elements: AnyElement[]; assetBaseUrl: string };
}

export type EditorElement = AnyElement & { visible: boolean; sortKey: string };

/** همان ترتیب `COLLATE "C"` برای المان‌هایی که در jsonb قالب ذخیره شده‌اند. */
export const byKey = (a: EditorElement, b: EditorElement) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0);

export interface PageDetail extends PageSummary {
  content: PageContent;
  elements: EditorElement[];
  /** مشکلاتی که انتشار را مانع می‌شوند (خالی = قابل انتشار). */
  issues: PublishIssue[];
  assetBaseUrl: string;
  limits: NorolinkLimits;
}

const SLUG_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const RANDOM_SLUG_LENGTH = 8;
const SLUG_ATTEMPTS = 5;

function randomSlug(): string {
  let s = '';
  for (let i = 0; i < RANDOM_SLUG_LENGTH; i++) s += SLUG_ALPHABET[randomInt(SLUG_ALPHABET.length)];
  return s;
}

export interface SlugAvailability {
  available: boolean;
  message?: string;
}

/**
 * قالب و یکتایی نشانی در کل پلتفرم با پیام فارسی؛ مشترک ادیتور، ساخت لینک واگذاری و صفحه‌ی تحویل (که رزرو همان لینک
 * برایش آزاد است: `exceptClaimToken`).
 */
export async function slugAvailability(rawSlug: string, options: { exceptClaimToken?: string } = {}): Promise<SlugAvailability> {
  const slug = (rawSlug ?? '').trim().toLowerCase();
  if (!slug) {
    return { available: false, message: 'نشانی صفحه را وارد کنید.' };
  }
  if (slug.length < PAGE_SLUG_MIN) {
    return { available: false, message: 'حداقل ۲ نویسه؛ فقط حروف کوچک انگلیسی، عدد و خط تیره.' };
  }
  if (slug.length > PAGE_SLUG_MAX) {
    return { available: false, message: `حداکثر ${PAGE_SLUG_MAX} نویسه.` };
  }
  if (!PAGE_SLUG.test(slug)) {
    return { available: false, message: 'فقط حروف کوچک لاتین و رقم، و خط تیره بین آن‌ها.' };
  }
  const result = await checkNorolinkSlug(slug, options);
  if (result.taken) {
    return {
      available: false,
      message: result.reason === 'reserved' ? 'این نشانی رزرو شده و قابل استفاده نیست.' : 'این نشانی قبلاً گرفته شده است.',
    };
  }
  return { available: true };
}

export const ORDER_BY_SORT_KEY = sql`${norolinkElements.sortKey} COLLATE "C"`;

const summaryColumns = {
  id: norolinkPages.id,
  slug: norolinkPages.slug,
  slugChanges: norolinkPages.slugChanges,
  title: norolinkPages.title,
  status: norolinkPages.status,
  publishedAt: norolinkPages.publishedAt,
  createdAt: norolinkPages.createdAt,
  updatedAt: norolinkPages.updatedAt,
  createdBy: norolinkPages.createdBy,
  createdByName: platformUsers.fullName,
  moderationStatus: norolinkPages.moderationStatus,
  moderationReason: norolinkPages.moderationReason,
  moderationNotice: norolinkPages.moderationNotice,
  moderationUntil: norolinkPages.moderationUntil,
};

const moderationColumns = {
  moderationStatus: norolinkPages.moderationStatus,
  moderationReason: norolinkPages.moderationReason,
  moderationNotice: norolinkPages.moderationNotice,
  moderationUntil: norolinkPages.moderationUntil,
};

/**
 * عنوان صفحه همان نام پروفایل است: هر کدام عوض شود دیگری هم عوض می‌شود. صفحه‌های قدیمی که این دو در آن‌ها فرق دارند
 * با نام پروفایل نمایش داده می‌شوند؛ نام خالی (پیش‌نویس ناقص) آخرین عنوان را نگه می‌دارد.
 */
const MAX_PROFILE_NAME = 80;
/**
 * روشن کردن «نمایش در موتورهای جستجو»: پلن اجازه دهد (۴۰۳ `plan_limit`، `limit: 'seo'`؛ دوره‌ی رایگان هم بسته است)
 * و توضیح موتور جستجو دست‌کم SEO_DESCRIPTION_MIN نویسه باشد (۴۲۲ `seo_description_too_short`).
 */
function assertCanIndex(content: PageContent, limits: NorolinkLimits): void {
  if (!limits.seo) throw planLimit('seo');
  if (!seoDescriptionReady(content)) {
    throw new UnprocessableEntityException({ message: 'seo_description_too_short', min: SEO_DESCRIPTION_MIN });
  }
}

function displayTitle(title: string, content: PageContent): string {
  return content.profile.name.trim() || title;
}
function withName(content: PageContent, title: string): PageContent {
  return { ...content, profile: { ...content.profile, name: title.trim().slice(0, MAX_PROFILE_NAME) } };
}

function withChangeFlag<T extends Omit<PageSummary, 'hasUnpublishedChanges' | 'moderation'> & ModerationColumns>(
  row: T,
): Omit<T, keyof ModerationColumns> & PageSummary {
  const { moderationStatus, moderationReason, moderationNotice, moderationUntil, ...rest } = row;
  return {
    ...rest,
    createdByName: row.createdByName || null,
    hasUnpublishedChanges: !row.publishedAt || row.updatedAt.getTime() > row.publishedAt.getTime(),
    moderation: ownerModeration({ moderationStatus, moderationReason, moderationNotice, moderationUntil }),
  };
}

/** المان‌های صفحه به ترتیب نمایش (داده‌ی ذخیره‌شده هنگام نوشتن validate شده است). */
export async function loadElements(tx: Db, pageId: string): Promise<EditorElement[]> {
  const rows = await tx
    .select({
      id: norolinkElements.id,
      kind: norolinkElements.kind,
      settings: norolinkElements.settings,
      visible: norolinkElements.visible,
      sortKey: norolinkElements.sortKey,
    })
    .from(norolinkElements)
    .where(eq(norolinkElements.pageId, pageId))
    .orderBy(ORDER_BY_SORT_KEY);
  return rows as EditorElement[];
}

/** هر تغییر پیش‌نویس (صفحه یا المان) زمان تغییر صفحه را جلو می‌برد. */
export async function touchPage(tx: Db, pageId: string): Promise<void> {
  const updated = await tx
    .update(norolinkPages)
    .set({ updatedAt: new Date() })
    .where(eq(norolinkPages.id, pageId))
    .returning({ id: norolinkPages.id });
  if (!updated[0]) throw new NotFoundException();
}

/**
 * تصاویر پیش‌نویس، المان‌ها و snapshot منتشرشده‌ی صفحه را در همان تراکنش در norofile ثبت می‌کند تا
 * فایل در حال استفاده از مدیر فایل حذف نشود. فایل نامعتبر/tenant دیگر ← ۴۲۲ `invalid_asset` (rollback).
 */
export async function syncPageFiles(tx: Db, files: FileService, pageId: string): Promise<void> {
  const [page] = await tx
    .select({ draft: norolinkPages.draftContent, snapshot: norolinkPages.publishedSnapshot })
    .from(norolinkPages)
    .where(eq(norolinkPages.id, pageId));
  if (!page) throw new NotFoundException();
  const elements = await loadElements(tx, pageId);
  const images = [
    ...contentImages(page.draft as PageContent),
    ...elements.flatMap(elementImages),
    ...(page.snapshot ? snapshotImages(page.snapshot as Snapshot) : []),
  ];
  await files.syncUsage(tx, { type: PAGE_FILE_OWNER, id: pageId }, imageFileIds(images), IMAGE_REQUIREMENT);
}

@Injectable()
export class PagesService {
  constructor(
    @Inject(TENANT_CONTEXT) private readonly ctx: TenantContext,
    @Inject(PLAN_RESOLVER) private readonly plans: PlanResolver,
    @Inject(FILE_SERVICE) private readonly files: FileService,
    @Inject(MAP_FETCHER) private readonly fetcher: Fetcher,
  ) {}

  async list(): Promise<PageListItem[]> {
    const { rows, elements } = await this.ctx.run(async (tx) => ({
      rows: await tx
        .select({ ...summaryColumns, draft: norolinkPages.draftContent })
        .from(norolinkPages)
        .leftJoin(platformUsers, eq(platformUsers.id, norolinkPages.createdBy))
        .orderBy(desc(norolinkPages.createdAt)),
      // المان‌های قابل‌نمایش همه‌ی صفحه‌ها در یک query (فهرست کوچک است: سقف پلن).
      elements: await tx
        .select({ id: norolinkElements.id, pageId: norolinkElements.pageId, kind: norolinkElements.kind, settings: norolinkElements.settings })
        .from(norolinkElements)
        .where(eq(norolinkElements.visible, true))
        .orderBy(asc(norolinkElements.pageId), ORDER_BY_SORT_KEY),
    }));
    const byPage = new Map<string, AnyElement[]>();
    for (const { pageId, ...el } of elements) {
      const list = byPage.get(pageId) ?? [];
      if (list.length < PREVIEW_ELEMENTS) list.push(el as AnyElement);
      byPage.set(pageId, list);
    }
    const assetBaseUrl = this.files.publicBaseUrl();
    return rows.map(({ draft, ...row }) => ({
      ...withChangeFlag({ ...row, title: displayTitle(row.title, draft as PageContent) }),
      preview: { content: draft as PageContent, elements: byPage.get(row.id) ?? [], assetBaseUrl },
    }));
  }

  async get(id: string): Promise<PageDetail> {
    const limits = await limitsFor(this.plans, this.ctx.tenantId());
    return this.ctx.run((tx) => this.detail(tx, id, limits));
  }

  checkSlug(rawSlug: string): Promise<SlugAvailability> {
    return slugAvailability(rawSlug);
  }

  async getBySlug(slug: string): Promise<PageDetail> {
    const [row] = await this.ctx.run((tx) =>
      tx.select({ id: norolinkPages.id }).from(norolinkPages).where(eq(norolinkPages.slug, slug)).limit(1),
    );
    if (!row) throw new NotFoundException();
    return this.get(row.id);
  }

  async create(dto: CreatePageDto): Promise<PageDetail> {
    const tenantId = this.ctx.tenantId();
    const limits = await limitsFor(this.plans, tenantId);
    const initial = await this.initialDraft(dto, limits);
    if (initial.content.seo.indexable) assertCanIndex(initial.content, limits);
    if (dto.slug) await this.assertNotReserved(dto.slug);
    const attempts = dto.slug ? 1 : SLUG_ATTEMPTS;
    for (let i = 0; i < attempts; i++) {
      const slug = dto.slug ?? randomSlug();
      try {
        return await this.ctx.run(async (tx) => {
          const [{ n } = { n: 0 }] = await tx.select({ n: count() }).from(norolinkPages);
          if (n >= limits.maxPages) throw planLimit('max_pages');
          const [page] = await tx
            .insert(norolinkPages)
            .values({ tenantId, slug, title: dto.title, draftContent: withName(initial.content, dto.title), createdBy: this.ctx.userId() })
            .returning({ id: norolinkPages.id });
          let key: string | null = null;
          for (const el of initial.elements) {
            key = keyBetween(key, null);
            await tx.insert(norolinkElements).values({ tenantId, pageId: page!.id, kind: el.kind, sortKey: key, settings: el.settings });
          }
          // تصاویر محتوای آغازین مثل ویرایش: فقط فایل public همین فضای کاری (وگرنه ۴۲۲ invalid_asset).
          if (dto.content !== undefined || initial.elements.length) await syncPageFiles(tx, this.files, page!.id);
          return this.detail(tx, page!.id, limits);
        });
      } catch (err) {
        if (pgCode(err) !== '23505') throw err;
        if (dto.slug) throw new ConflictException('slug_taken');
      }
    }
    throw new ConflictException('slug_generation_failed');
  }

  async update(id: string, dto: UpdatePageDto): Promise<PageDetail> {
    const tenantId = this.ctx.tenantId();
    const limits = await limitsFor(this.plans, tenantId);
    let content: PageContent | undefined;
    if (dto.content !== undefined) {
      const parsed = pageContentSchema.safeParse(dto.content);
      if (!parsed.success) {
        throw new UnprocessableEntityException({
          message: 'invalid_content',
          issues: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
        });
      }
      content = parsed.data;
    }
    if (dto.slug) await this.assertNotReserved(dto.slug);
    try {
      return await this.ctx.run(async (tx) => {
        // روشن کردن «نمایش در موتورهای جستجو» فقط با پلن دارای سئو. مقداری که در پلن قبلی روشن شده ذخیره می‌ماند
        // (تا با ارتقا برگردد)؛ صفحه‌ی عمومی آن را تا وقتی پلن سئو ندارد noindex نشان می‌دهد (PublicLinksService.read).
        // شرط توضیح هم فقط هنگام روشن کردن؛ کوتاه کردن بعدی ذخیره می‌شود و صفحه تا کامل شدن noindex است (isSearchIndexable).
        if (content?.seo.indexable && !(await this.currentDraft(tx, id)).seo?.indexable) assertCanIndex(content, limits);
        const patch: Partial<typeof norolinkPages.$inferInsert> = { updatedAt: new Date() };
        let previousSlug: string | null = null;
        if (dto.slug !== undefined) {
          const [row] = await tx
            .select({ slug: norolinkPages.slug, slugChanges: norolinkPages.slugChanges, ...moderationColumns })
            .from(norolinkPages)
            .where(eq(norolinkPages.id, id))
            .for('update');
          if (!row) throw new NotFoundException();
          if (dto.slug !== row.slug) {
            if (ownerModeration(row)?.locked) throw pageModerated();
            if (row.slugChanges >= MAX_SLUG_CHANGES) throw new ConflictException('slug_change_limit');
            previousSlug = row.slug;
            patch.slug = dto.slug;
            patch.slugChanges = row.slugChanges + 1;
          }
        }
        if (dto.title !== undefined) {
          patch.title = dto.title;
          // فقط عنوان: نام پیش‌نویس فعلی هم عوض می‌شود
          const base = content ?? (await this.currentDraft(tx, id));
          patch.draftContent = withName(base, dto.title);
        } else if (content !== undefined) {
          patch.draftContent = content;
          if (content.profile.name) patch.title = content.profile.name;
        }
        const updated = await tx.update(norolinkPages).set(patch).where(eq(norolinkPages.id, id)).returning({ id: norolinkPages.id });
        if (!updated[0]) throw new NotFoundException();
        if (previousSlug && dto.slug) {
          // برگشت به نشانی قبلی همین صفحه: دیگر ریدایرکت نیست. نشانی قبلی به نشانی فعلی ریدایرکت می‌شود، پس زنجیره‌ای ساخته نمی‌شود.
          await tx.delete(norolinkSlugRedirects).where(and(eq(norolinkSlugRedirects.pageId, id), eq(norolinkSlugRedirects.oldSlug, dto.slug)));
          await tx.insert(norolinkSlugRedirects).values({ tenantId, pageId: id, oldSlug: previousSlug });
        }
        if (content !== undefined) await syncPageFiles(tx, this.files, id);
        return this.detail(tx, id, limits);
      });
    } catch (err) {
      if (pgCode(err) === '23505') throw new ConflictException('slug_taken');
      throw err;
    }
  }

  /** پیش‌نویس (محتوا + المان‌های قابل‌نمایش به ترتیب) را در published_snapshot کپی می‌کند. */
  async publish(id: string): Promise<PageDetail> {
    if (norolinkExpired(await this.plans.resolve(this.ctx.tenantId()))) throw planExpired();
    const limits = await limitsFor(this.plans, this.ctx.tenantId());
    return this.ctx.run(async (tx) => {
      const [page] = await tx
        .select({ draft: norolinkPages.draftContent, ...moderationColumns })
        .from(norolinkPages)
        .where(eq(norolinkPages.id, id))
        .for('update');
      if (!page) throw new NotFoundException();
      if (ownerModeration(page)?.locked) throw pageModerated();
      const content = page.draft as PageContent;
      const visible = (await loadElements(tx, id)).filter((e) => e.visible);
      const issues = publishIssues(content, visible);
      if (issues.length) throw new UnprocessableEntityException({ message: 'not_publishable', issues });

      const snapshot: Snapshot = {
        content,
        elements: visible.map((e) => ({ id: e.id, kind: e.kind, settings: e.settings }) as AnyElement),
      };
      const now = new Date();
      await tx
        .update(norolinkPages)
        .set({ status: 'published', publishedSnapshot: snapshot, publishedAt: now, updatedAt: now })
        .where(eq(norolinkPages.id, id));
      return this.detail(tx, id, limits);
    });
  }

  /** صفحه از دسترس عمومی خارج می‌شود؛ snapshot برای انتشار دوباره می‌ماند. */
  async unpublish(id: string): Promise<PageDetail> {
    const limits = await limitsFor(this.plans, this.ctx.tenantId());
    return this.ctx.run(async (tx) => {
      const updated = await tx
        .update(norolinkPages)
        .set({ status: 'draft' })
        .where(eq(norolinkPages.id, id))
        .returning({ id: norolinkPages.id });
      if (!updated[0]) throw new NotFoundException();
      return this.detail(tx, id, limits);
    });
  }

  /**
   * حذف صفحه (المان‌ها و آمار cascade). استفاده از فایل‌ها آزاد می‌شود؛ خود فایل‌ها در مدیر فایل
   * (norofile) می‌مانند تا کاربر حذفشان کند.
   */
  async remove(id: string): Promise<void> {
    await this.ctx.run(async (tx) => {
      // صفحه‌ی محدودشده برای نگه‌داری مدرک حذف نمی‌شود (§9.13).
      const [row] = await tx.select(moderationColumns).from(norolinkPages).where(eq(norolinkPages.id, id)).for('update');
      if (row && ownerModeration(row)?.locked) throw pageModerated();
      const deleted = await tx.delete(norolinkPages).where(eq(norolinkPages.id, id)).returning({ id: norolinkPages.id });
      if (!deleted[0]) throw new NotFoundException();
      await this.files.syncUsage(tx, { type: PAGE_FILE_OWNER, id }, []);
    });
  }

  /**
   * تحویل لینک واگذاری (docs/architecture.md §9.8): صفحه‌ای تازه از روی پیش‌نویس قالب در فضای کاری مشتری. اگر ۱۴ روز رایگان
   * قبلاً مصرف شده، `planExpired` می‌گوید صفحه تا خرید پلن غیرفعال است. `slug` نشانی‌ای است که مشتری به‌جای نشانی رزروشده خواسته.
   */
  async claim(
    token: string,
    requestedSlug?: string,
  ): Promise<{ pageId: string; slug: string; title: string; published: boolean; trialStarted: boolean; planExpired: boolean }> {
    const tenantId = this.ctx.tenantId();
    const userId = this.ctx.userId();
    let slug: string | undefined;
    if (requestedSlug) {
      slug = requestedSlug.trim().toLowerCase();
      const check = await slugAvailability(slug, { exceptClaimToken: token });
      if (!check.available) throw new ConflictException({ message: 'slug_taken', detail: check.message });
    }
    const page = await this.createClaimedPage(token, tenantId, userId, slug);
    let trialStarted = false;
    try {
      trialStarted = (await this.plans.startTrial?.(tenantId, userId)) ?? false;
    } catch {
      trialStarted = false;
    }
    return {
      ...page,
      trialStarted,
      planExpired: norolinkExpired(await this.plans.resolve(tenantId)),
    };
  }

  /**
   * نشانی: درخواست مشتری، وگرنه رزرو ادمین روی لینک، وگرنه تصادفی (نشانی هنگام ساخت جزو سقف تغییر نیست). تصویر قالب فقط فایل
   * پلتفرم یا ایستاست، پس فایلی برای کپی و ثبت استفاده نیست. لینک فقط برای قالب کامل ساخته می‌شود؛ اگر پیش‌نویس بعد از آن ناقص
   * شده باشد صفحه پیش‌نویس می‌ماند تا مشتری کاملش کند.
   */
  private async createClaimedPage(
    token: string,
    tenantId: string,
    userId: string,
    requestedSlug: string | undefined,
  ): Promise<{ pageId: string; slug: string; title: string; published: boolean }> {
    for (let i = 0; i < SLUG_ATTEMPTS; i++) {
      // تلاش اول نشانی رزروشده؛ اگر در این فاصله گرفته شده باشد (نباید)، تلاش‌های بعد تصادفی‌اند.
      try {
        const created = await claimNorolinkTemplate(token, tenantId, userId, async (tx, template) => {
          const reserved = i === 0 ? template.slug : null;
          const slug = requestedSlug ?? reserved ?? randomSlug();
          const draft = template.draftContent as PageContent;
          const title = displayTitle(template.title, draft);
          const content = withName(draft, title);
          const [page] = await tx
            .insert(norolinkPages)
            .values({ tenantId, slug, title, draftContent: content, createdBy: userId })
            .returning({ id: norolinkPages.id });
          const pageId = page!.id;
          const elements: EditorElement[] = [];
          for (const el of [...(template.draftElements as EditorElement[])].sort(byKey)) {
            const [row] = await tx
              .insert(norolinkElements)
              .values({ tenantId, pageId, kind: el.kind, sortKey: el.sortKey, settings: el.settings, visible: el.visible })
              .returning({ id: norolinkElements.id });
            elements.push({ ...el, id: row!.id });
          }
          const visible = elements.filter((e) => e.visible);
          const published = publishIssues(content, visible).length === 0;
          if (published) {
            const snapshot: Snapshot = { content, elements: visible.map((e) => ({ id: e.id, kind: e.kind, settings: e.settings }) as AnyElement) };
            const now = new Date();
            await tx.update(norolinkPages).set({ status: 'published', publishedSnapshot: snapshot, publishedAt: now, updatedAt: now }).where(eq(norolinkPages.id, pageId));
          }
          return { pageId, slug, title, published };
        });
        if (!created) throw new NotFoundException('claim_link_invalid_or_expired');
        return created;
      } catch (err) {
        if (pgCode(err) !== '23505') throw err;
        if (requestedSlug) throw new ConflictException('slug_taken');
      }
    }
    throw new ConflictException('slug_generation_failed');
  }

  private async currentDraft(tx: Db, id: string): Promise<PageContent> {
    const [row] = await tx.select({ draft: norolinkPages.draftContent }).from(norolinkPages).where(eq(norolinkPages.id, id)).limit(1);
    if (!row) throw new NotFoundException();
    return row.draft as PageContent;
  }

  async detail(tx: Db, id: string, limits: NorolinkLimits): Promise<PageDetail> {
    const [row] = await tx
      .select({ ...summaryColumns, draft: norolinkPages.draftContent })
      .from(norolinkPages)
      .leftJoin(platformUsers, eq(platformUsers.id, norolinkPages.createdBy))
      .where(eq(norolinkPages.id, id))
      .limit(1);
    if (!row) throw new NotFoundException();
    const { draft, ...summary } = row;
    const content = draft as PageContent;
    const elements = await loadElements(tx, id);
    return {
      ...withChangeFlag({ ...summary, title: displayTitle(summary.title, content) }),
      content,
      elements,
      issues: publishIssues(
        content,
        elements.filter((e) => e.visible),
      ),
      assetBaseUrl: this.files.publicBaseUrl(),
      limits,
    };
  }

  /**
   * محتوا و المان‌های آغازین (مثلاً از قالب) با همان قواعد ویرایش: schema، سقف و نوع المان‌های پلن و
   * شخصی‌سازی کامل تم. داده‌ی مشتق ویدیو/نقشه از کلاینت پذیرفته نمی‌شود و مثل ویرایش از source_url ساخته می‌شود.
   */
  private async initialDraft(dto: CreatePageDto, limits: NorolinkLimits): Promise<{ content: PageContent; elements: Array<{ kind: ElementKind; settings: unknown }> }> {
    let content = defaultContent(dto.title);
    if (dto.content !== undefined) {
      const parsed = pageContentSchema.safeParse(dto.content);
      if (!parsed.success) {
        throw new UnprocessableEntityException({
          message: 'invalid_content',
          issues: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
        });
      }
      content = parsed.data;
    }
    const elements = (dto.elements ?? []).map((raw, i) => {
      if (!limits.allowedKinds.includes(raw.kind)) throw planLimit('element_kind');
      // مثل افزودن در ویرایشگر از تنظیمات پیش‌فرض همان نوع شروع می‌شود؛ قالب فقط تفاوت‌ها را می‌دهد.
      const parsed = parseSettings(raw.kind, { ...defaultSettings(raw.kind), ...raw.settings });
      if (!parsed.ok) {
        throw new UnprocessableEntityException({ message: 'invalid_settings', issues: parsed.issues.map((m) => `elements.${i}: ${m}`) });
      }
      return { kind: raw.kind, settings: parsed.value };
    });
    if (elements.length > limits.maxElementsPerPage) throw planLimit('max_elements');
    const derived = await Promise.all(
      elements.map(async (el) => ({ kind: el.kind, settings: await deriveEmbedData(el as AnyElement, this.fetcher) as unknown })),
    );
    return { content, elements: derived };
  }

  private async assertNotReserved(slug: string): Promise<void> {
    const reserved = await this.ctx.run((tx) => tx.select().from(reservedSlugs).where(eq(reservedSlugs.slug, slug)).limit(1));
    if (reserved[0]) throw new ConflictException('slug_reserved');
  }
}
