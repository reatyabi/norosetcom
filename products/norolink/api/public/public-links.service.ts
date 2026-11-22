import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  FILE_SERVICE,
  findClaimableTemplate,
  findPublicLinkPage,
  findPublicLinkRedirect,
  insertPublicLinkEvent,
  insertPublicPageReport,
  IP_HASHER,
  listPublicDirectoryPages,
  listPublicSitemapPages,
  PLAN_RESOLVER,
  RATE_LIMITER,
  type FileService,
  type IpHasher,
  type PlanResolver,
  type RateLimiter,
} from '@noroset/core';
import {
  assetUrlFor,
  defaultModerationNotice,
  effectiveModeration,
  isSearchIndexable,
  moderationAllowsListing,
  suspendedHttpStatus,
  type ModerationReason,
  SEO_DESCRIPTION_MIN,
  seoDescriptionLength,
  type AnyElement,
  type PageContent,
  type Snapshot,
} from '../../shared';
import { limitsFor, norolinkExpired, seoAllowed } from '../access';
import { byKey, slugAvailability, type EditorElement, type SlugAvailability } from '../pages/pages.service';
import { tehranToday } from '../stats/stats.service';
import type { PublicEventDto, PublicReportDto } from './dto';
import { isBot, parseUserAgent, referrerDomain } from './user-agent';

// صفحه‌ی لینک عمومی (docs/architecture.md §9). دسترسی به DB فقط از مسیر ویژه‌ی @noroset/db:
// فقط snapshot منتشرشده خوانده و فقط رویداد آمار INSERT می‌شود.

export const PUBLIC_LINK_RATE_LIMITS = {
  // چند کاربر موبایل پشت CGNAT یک IP مشترک دارند؛ این سقف فقط جلوی crawl سنگین را می‌گیرد.
  read: { limit: 600, windowMs: 60 * 1000 },
  event: { limit: 120, windowMs: 60 * 1000 },
  // گزارش تخلف (§9.13): کم، چون هر گزارش وقت ادمین را می‌گیرد.
  report: { limit: 5, windowMs: 10 * 60 * 1000 },
} as const;

export interface PublicLinkView {
  slug: string;
  title: string;
  content: PageContent;
  elements: AnyElement[];
  assetBaseUrl: string;
  branding: { forceLicense: boolean };
  /** صفحه‌ی هشدار پیش از محتوا (کنترل مدیریت پلتفرم، §9.13)؛ بدون محدودیت یا «حذف از فهرست» ← null. */
  moderation: { status: 'warning'; reason: ModerationReason; notice: string } | null;
}

/** پلن فضای کاری تمام شده: هیچ محتوایی از صفحه برنمی‌گردد و وب پیام «در دسترس نیست» را نشان می‌دهد. */
export interface PublicLinkUnavailable {
  unavailable: true;
  notice: null;
}

export interface PublicClaimView {
  title: string;
  /** نام کسب‌وکاری که ادمین برای این لینک ثبت کرده. */
  businessName: string;
  /** نشانی رزروشده؛ null ← هنگام تحویل تصادفی ساخته می‌شود. */
  slug: string | null;
  content: PageContent;
  elements: AnyElement[];
  assetBaseUrl: string;
}

export interface PublicDirectoryLinkPreview {
  label: string;
  url: string;
  icon?: string | null;
}

export interface PublicDirectoryItem {
  slug: string;
  title: string;
  name: string;
  bio: string;
  avatarUrl: string | null;
  themePreset: string;
  elementCount: number;
  publishedAt: string | null;
  isIndexable: boolean;
  socialPlatforms: string[];
  links: PublicDirectoryLinkPreview[];
}

export interface PublicDirectoryResponse {
  items: PublicDirectoryItem[];
  total: number;
}

export interface PublicSitemapResponse {
  pages: Array<{ slug: string; lastmod: string | null }>;
}

/** نشانی قبلی صفحه: وب آن را با ریدایرکت دائمی به نشانی فعلی می‌فرستد. */
export interface PublicLinkRedirect {
  redirectTo: string;
}

@Injectable()
export class PublicLinksService {
  constructor(
    @Inject(RATE_LIMITER) private readonly rateLimiter: RateLimiter,
    @Inject(IP_HASHER) private readonly hasher: IpHasher,
    @Inject(PLAN_RESOLVER) private readonly plans: PlanResolver,
    @Inject(FILE_SERVICE) private readonly files: FileService,
  ) {}

  /** دایرکتوری صفحات لینک منتشرشده (n8l.ir) */
  async directory(
    options: { query?: string; category?: string; limit?: number; offset?: number },
    ip: string | undefined,
  ): Promise<PublicDirectoryResponse> {
    this.limit(`norolink_public_read:ip:${ip ?? 'unknown'}`, PUBLIC_LINK_RATE_LIMITS.read);
    const pages = await listPublicDirectoryPages({
      limit: options.limit ?? 60,
      offset: options.offset ?? 0,
    });

    const assetUrl = assetUrlFor(this.files.publicBaseUrl());
    const items: PublicDirectoryItem[] = [];

    for (const page of pages) {
      // فقط صفحه‌هایی که در موتور جستجو هم نمایش داده می‌شوند (همان قاعده‌ی read)؛ پلن بدون سئو یعنی noindex.
      const plan = await this.plans.resolve(page.tenantId);
      if (!seoAllowed(plan)) continue;

      const snapshot = page.snapshot as Snapshot | null;
      if (!snapshot || typeof snapshot !== 'object') continue;

      const content = snapshot.content;
      const elements = snapshot.elements ?? [];
      const profile = content?.profile;
      const seo = content?.seo;
      const theme = content?.theme;
      // همان قاعده‌ی صفحه‌ی عمومی (روشن + توضیح کافی)؛ policy فقط روشن بودن را می‌بیند.
      if (!content || !isSearchIndexable(content, true)) continue;

      const avatar = profile?.avatar ? assetUrl(profile.avatar) : null;
      const name = profile?.name?.trim() || page.title;
      const bio = profile?.bio?.trim() || seo?.description?.trim() || '';

      const socialElem = elements.find((e) => e.kind === 'social_icons');
      const socialPlatforms = (
        (socialElem?.settings as { items?: Array<{ platform: string }> } | undefined)?.items ?? []
      )
        .map((i) => i.platform)
        .filter(Boolean);

      const linkButtons: PublicDirectoryLinkPreview[] = elements
        .filter((e) => e.kind === 'link_button')
        .slice(0, 3)
        .map((e) => {
          const s = (typeof e.settings === 'object' && e.settings !== null ? e.settings : {}) as {
            label?: string;
            url?: string;
            icon?: string | null;
          };
          return {
            label: s.label ?? '',
            url: s.url ?? '',
            icon: s.icon ?? null,
          };
        });

      items.push({
        slug: page.slug,
        title: page.title,
        name,
        bio,
        avatarUrl: avatar,
        themePreset: theme?.preset ?? 'default',
        elementCount: elements.length,
        publishedAt: page.publishedAt ? page.publishedAt.toISOString() : null,
        isIndexable: Boolean(seo?.indexable),
        socialPlatforms,
        links: linkButtons,
      });
    }

    let filtered = items;
    if (options.query?.trim()) {
      const q = options.query.trim().toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.slug.toLowerCase().includes(q) ||
          i.title.toLowerCase().includes(q) ||
          i.name.toLowerCase().includes(q) ||
          i.bio.toLowerCase().includes(q),
      );
    }

    return {
      items: filtered,
      total: filtered.length,
    };
  }

  /**
   * نشانی صفحه‌هایی که موتور جستجو می‌تواند ایندکس کند (sitemap دامنه‌ی کوتاه): همان قاعده‌ی read و دایرکتوری؛
   * پلن هر فضای کاری یک بار خوانده می‌شود.
   */
  async sitemap(ip: string | undefined): Promise<PublicSitemapResponse> {
    this.limit(`norolink_public_read:ip:${ip ?? 'unknown'}`, PUBLIC_LINK_RATE_LIMITS.read);
    const rows = await listPublicSitemapPages();
    const seo = new Map<string, boolean>();
    const pages: PublicSitemapResponse['pages'] = [];
    for (const row of rows) {
      let allowed = seo.get(row.tenantId);
      if (allowed === undefined) {
        const plan = await this.plans.resolve(row.tenantId);
        allowed = seoAllowed(plan);
        seo.set(row.tenantId, allowed);
      }
      if (allowed && seoDescriptionLength(row.description ?? '') >= SEO_DESCRIPTION_MIN) pages.push({ slug: row.slug, lastmod: row.publishedAt?.toISOString() ?? null });
    }
    return { pages };
  }

  async read(slug: string, ip: string | undefined): Promise<PublicLinkView | PublicLinkRedirect | PublicLinkUnavailable> {
    this.limit(`norolink_public_read:ip:${ip ?? 'unknown'}`, PUBLIC_LINK_RATE_LIMITS.read);
    const page = await findPublicLinkPage(slug.toLowerCase());
    if (!page) {
      const redirectTo = await findPublicLinkRedirect(slug.toLowerCase());
      if (redirectTo) return { redirectTo };
      throw new NotFoundException();
    }
    const moderation = effectiveModeration(page.moderation);
    if (moderation === 'suspended') {
      // تعلیق مدیریت پلتفرم: هیچ محتوایی برنمی‌گردد؛ دستور مرجع قانونی ← ۴۵۱ (RFC 7725)، بقیه ← ۴۰۳.
      const reason = page.moderation.reason;
      throw new HttpException(
        { message: 'page_suspended', legal: reason === 'legal_order', notice: page.moderation.notice || defaultModerationNotice('suspended', reason) },
        suspendedHttpStatus(reason),
      );
    }
    if (norolinkExpired(await this.plans.resolve(page.tenantId))) return { unavailable: true, notice: null };
    // snapshot هنگام انتشار از داده‌ی validateشده ساخته شده است.
    const snapshot = page.snapshot as Snapshot;
    const limits = await limitsFor(this.plans, page.tenantId);
    // indexable مؤثر (shared/seo.ts): خواست کاربر + توضیح کافی + پلن (نه دوره‌ی رایگان)؛ با کاهش یا پایان پلن، یا کوتاه شدن
    // توضیح، صفحه‌ای که قبلاً روشن شده بدون انتشار دوباره noindex می‌شود.
    // صفحه‌ی دارای محدودیت مدیریتی (حذف از فهرست / هشدار) هرگز ایندکس نمی‌شود.
    const indexable = isSearchIndexable(snapshot.content, limits.seo) && moderationAllowsListing(moderation);
    const content: PageContent = { ...snapshot.content, seo: { ...snapshot.content.seo, indexable } };
    return {
      slug: page.slug,
      title: page.title,
      content,
      elements: snapshot.elements,
      assetBaseUrl: this.files.publicBaseUrl(),
      branding: { forceLicense: limits.forceBranding },
      moderation:
        moderation === 'warning'
          ? { status: 'warning', reason: page.moderation.reason!, notice: page.moderation.notice || defaultModerationNotice('warning', page.moderation.reason) }
          : null,
    };
  }

  /**
   * گزارش تخلف بازدیدکننده (§9.13). honeypot پرشده و گزارش تکراری همان IP همان پاسخ موفق را بی‌صدا می‌گیرند؛ IP فقط
   * به‌صورت HMAC ذخیره می‌شود. صفحه‌ی ناموجود یا منتشرنشده ← ۴۰۴.
   */
  async report(slug: string, dto: PublicReportDto, ip: string | undefined): Promise<{ ok: true }> {
    this.limit(`norolink_report:ip:${ip ?? 'unknown'}`, PUBLIC_LINK_RATE_LIMITS.report);
    if (dto.website) return { ok: true };
    const contact = dto.contact?.trim() || null;
    const result = await insertPublicPageReport({
      slug: slug.toLowerCase(),
      reason: dto.reason,
      details: dto.details?.trim() ?? '',
      contact,
      ipHash: ip ? this.hasher.hash(`norolink-report|${ip}`) : null,
    });
    if (result.status === 'not_found') throw new NotFoundException();
    return { ok: true };
  }

  /**
   * پیش‌نمایش صفحه‌ی آماده‌ی واگذاری به مشتری (بدون احراز هویت): پیش‌نویس قالبی که لینک فعال دارد. هر باز شدن (جز ربات‌ها و
   * پیش‌نمایش‌گرهای لینک پیام‌رسان‌ها) در قیف لینک شمرده می‌شود.
   */
  async readClaim(token: string, ip: string | undefined, userAgent?: string): Promise<PublicClaimView> {
    this.limit(`norolink_public_read:ip:${ip ?? 'unknown'}`, PUBLIC_LINK_RATE_LIMITS.read);
    const template = await findClaimableTemplate(token, { countOpen: !isBot((userAgent ?? '').slice(0, 512)) });
    if (!template) throw new NotFoundException('claim_link_invalid_or_expired');
    const content = template.draftContent as PageContent;
    return {
      title: content.profile.name.trim() || template.title,
      businessName: template.businessName,
      slug: template.slug,
      content,
      elements: (template.draftElements as EditorElement[])
        .filter((e) => e.visible)
        .sort(byKey)
        .map((e) => ({ id: e.id, kind: e.kind, settings: e.settings }) as AnyElement),
      assetBaseUrl: this.files.publicBaseUrl(),
    };
  }

  /** نشانی دلخواه مشتری روی صفحه‌ی تحویل؛ فقط با لینک فعال (وگرنه ۴۰۴). */
  async checkClaimSlug(token: string, slug: string, ip: string | undefined): Promise<SlugAvailability> {
    this.limit(`norolink_public_read:ip:${ip ?? 'unknown'}`, PUBLIC_LINK_RATE_LIMITS.read);
    if (!(await findClaimableTemplate(token))) throw new NotFoundException('claim_link_invalid_or_expired');
    return slugAvailability(slug, { exceptClaimToken: token });
  }

  /** بازدید/کلیک؛ ربات‌ها بی‌صدا نادیده گرفته می‌شوند. */
  async event(slug: string, dto: PublicEventDto, ip: string | undefined, userAgent: string | undefined): Promise<void> {
    this.limit(`norolink_event:ip:${ip ?? 'unknown'}`, PUBLIC_LINK_RATE_LIMITS.event);
    const ua = (userAgent ?? '').slice(0, 512);
    if (isBot(ua)) return;
    const client = parseUserAgent(ua);
    const result = await insertPublicLinkEvent({
      slug: slug.toLowerCase(),
      kind: dto.kind,
      elementId: dto.elementId ?? null,
      // salt روزانه: همان بازدیدکننده فردا هش دیگری دارد (بدون IP خام، بدون ردگیری طولانی).
      visitorHash: ip ? this.hasher.hash(`norolink|${tehranToday()}|${ip}|${ua}`) : null,
      deviceType: client.deviceType,
      os: client.os,
      browser: client.browser,
      referrerDomain: referrerDomain(dto.referrer),
    });
    if (result.status === 'not_found') throw new NotFoundException();
    if (result.status === 'invalid_element') throw new UnprocessableEntityException('invalid_element');
  }

  private limit(key: string, rule: { limit: number; windowMs: number }): void {
    if (!this.rateLimiter.consume(key, rule.limit, rule.windowMs)) {
      throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}
