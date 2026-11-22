import { ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  adminAuditLog,
  and,
  db,
  desc,
  eq,
  FILE_SERVICE,
  FREE_ENTITLEMENTS,
  isNotNull,
  isNull,
  norolinkClaimLinks,
  norolinkRemovedTemplates,
  norolinkTemplates,
  PLATFORM_ADMIN_CONTEXT,
  platformUsers,
  type Db,
  type FileService,
  type PlatformAdminContext,
} from '@noroset/core';
import {
  ALL_ELEMENT_KINDS,
  contentImages,
  defaultContent,
  defaultSettings,
  elementImages,
  imageFileIds,
  keyBetween,
  LINK_TEMPLATES,
  linkTemplate,
  pageContentSchema,
  parseSettings,
  platformAssetId,
  publishIssues,
  templateElements,
  type AnyElement,
  type ImageRef,
  type LinkTemplate,
  type LinkTemplateCategory,
  type NorolinkLimits,
  type PageContent,
  type PublishIssue,
  type Snapshot,
} from '../../shared';
import { MAP_FETCHER, MAX_IMAGE_BYTES, pgCode, planLimit } from '../access';
import { claimLinkUrl, newClaimToken } from '../claims/claim-links.service';
import { deriveEmbedData } from '../embeds/derive';
import type { Fetcher } from '../embeds/map-resolver';
import type { AddElementDto, MoveElementDto, UpdateElementDto } from '../pages/dto';
import type { EditorElement, PageStatus } from '../pages/pages.service';
import { byKey, PREVIEW_ELEMENTS, slugAvailability } from '../pages/pages.service';
import type { CreateClaimLinkDto, CreateTemplateDto, UpdateTemplateDto } from './dto';

// قالب‌های آماده (docs/architecture.md §9.8): قالب‌های کدی (LINK_TEMPLATES) + قالب‌های ساخته‌شده با ادیتور در مدیریت
// پلتفرم. پاسخ‌ها هم‌شکل API صفحه‌اند تا همان ادیتور روی این مسیرها کار کند؛ سطح پلتفرم است، پس tenant و نشانی ندارد.

/** قالب باید روی پلن رایگان هم صفحه بسازد، پس سقف المان‌ها همان سقف پلن رایگان است. */
const TEMPLATE_LIMITS: NorolinkLimits = {
  maxPages: 1,
  maxElementsPerPage: FREE_ENTITLEMENTS['norolink.elements_per_page'],
  allowedKinds: ALL_ELEMENT_KINDS,
  detailedStats: false,
  seo: false,
  seoUpsell: null,
  forceBranding: true,
};

const AUDIT_TARGET = 'link_template';

/** لینک فعال در ادیتور قالب: نشانی رزروشده، اطلاعات پیگیری و شمار باز شدن. */
export interface ClaimLinkView {
  id: string;
  token: string;
  url: string;
  slug: string | null;
  businessName: string;
  note: string;
  createdAt: Date;
  openCount: number;
  lastOpenedAt: Date | null;
}

const claimLinkViewColumns = {
  id: norolinkClaimLinks.id,
  token: norolinkClaimLinks.token,
  slug: norolinkClaimLinks.slug,
  businessName: norolinkClaimLinks.businessName,
  note: norolinkClaimLinks.note,
  createdAt: norolinkClaimLinks.createdAt,
  openCount: norolinkClaimLinks.openCount,
  lastOpenedAt: norolinkClaimLinks.lastOpenedAt,
};

export interface TemplateDetail {
  id: string;
  /** هم‌شکل صفحه؛ قالب نشانی ندارد. */
  slug: '';
  slugChanges: 0;
  title: string;
  description: string;
  category: LinkTemplateCategory;
  status: PageStatus;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  hasUnpublishedChanges: boolean;
  createdBy: string | null;
  createdByName: string | null;
  /** لینک واگذاری فعال (تحویل‌نگرفته و ابطال‌نشده). */
  claimLink: ClaimLinkView | null;
  /** آخرین تحویل از این قالب. */
  claimedAt: Date | null;
  content: PageContent;
  elements: EditorElement[];
  issues: PublishIssue[];
  assetBaseUrl: string;
  limits: NorolinkLimits;
}

/** ردیف فهرست مدیریت: قالب کدی (`builtin`، ویرایش‌نشدنی) یا ساخته‌شده با ادیتور (`custom`). */
export interface AdminTemplateItem {
  id: string;
  source: 'builtin' | 'custom';
  title: string;
  description: string;
  category: LinkTemplateCategory;
  /** قالب کدی همیشه published است و با `removed` از گالری بیرون می‌رود. */
  status: PageStatus;
  removed: boolean;
  hasUnpublishedChanges: boolean;
  updatedAt: Date | null;
  createdByName: string | null;
  preview: { content: PageContent; elements: AnyElement[]; assetBaseUrl: string };
}

type TemplateRow = typeof norolinkTemplates.$inferSelect;

/** تصویر قالب در همه‌ی فضاهای کاری باز می‌شود، پس فایل یک فضای کاری (uuid خام) پذیرفته نیست؛ فقط فایل پلتفرم یا تصویر ایستا. */
function assertPlatformImages(images: ImageRef[]): void {
  if (imageFileIds(images).length) throw new UnprocessableEntityException('invalid_asset');
}

function parseContent(raw: unknown): PageContent {
  const parsed = pageContentSchema.safeParse(raw);
  if (!parsed.success) {
    throw new UnprocessableEntityException({
      message: 'invalid_content',
      issues: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    });
  }
  return parsed.data;
}

@Injectable()
export class TemplatesService {
  constructor(
    @Inject(PLATFORM_ADMIN_CONTEXT) private readonly ctx: PlatformAdminContext,
    @Inject(FILE_SERVICE) private readonly files: FileService,
    @Inject(MAP_FETCHER) private readonly fetcher: Fetcher,
  ) {}

  /** گالری کاربران: قالب‌های منتشرشده‌ی پلتفرم (جدیدترین اول) و قالب‌های کدی که برداشته نشده‌اند. فقط snapshot، هرگز پیش‌نویس. */
  async gallery(): Promise<LinkTemplate[]> {
    const [rows, removed] = await Promise.all([
      db
        .select({
          id: norolinkTemplates.id,
          title: norolinkTemplates.title,
          description: norolinkTemplates.description,
          category: norolinkTemplates.category,
          snapshot: norolinkTemplates.publishedSnapshot,
        })
        .from(norolinkTemplates)
        .where(eq(norolinkTemplates.status, 'published'))
        .orderBy(desc(norolinkTemplates.publishedAt)),
      db.select({ key: norolinkRemovedTemplates.templateKey }).from(norolinkRemovedTemplates),
    ]);
    const hidden = new Set(removed.map((r) => r.key));
    return [
      ...rows.map(({ snapshot, ...row }) => {
        const { content, elements, thumb } = snapshot as Snapshot;
        return {
          ...row,
          content,
          elements: elements.map(({ kind, settings }) => ({ kind, settings: settings as Record<string, unknown> })),
          ...(thumb ? { thumb } : {}),
        };
      }),
      ...LINK_TEMPLATES.filter((t) => !hidden.has(t.id)),
    ];
  }

  async list(): Promise<AdminTemplateItem[]> {
    const assetBaseUrl = this.files.publicBaseUrl();
    const { rows, removed } = await this.ctx.run(async (tx) => ({
      rows: await tx
        .select({ row: norolinkTemplates, createdByName: platformUsers.fullName })
        .from(norolinkTemplates)
        .leftJoin(platformUsers, eq(platformUsers.id, norolinkTemplates.createdBy))
        .orderBy(desc(norolinkTemplates.createdAt)),
      removed: await tx.select({ key: norolinkRemovedTemplates.templateKey }).from(norolinkRemovedTemplates),
    }));
    const hidden = new Set(removed.map((r) => r.key));
    return [
      ...rows.map(({ row, createdByName }): AdminTemplateItem => {
        const elements = (row.draftElements as EditorElement[]).filter((e) => e.visible).sort(byKey).slice(0, PREVIEW_ELEMENTS);
        return {
          id: row.id,
          source: 'custom',
          title: row.title,
          description: row.description,
          category: row.category,
          status: row.status,
          removed: false,
          hasUnpublishedChanges: this.hasChanges(row),
          updatedAt: row.updatedAt,
          createdByName: createdByName || null,
          preview: { content: row.draftContent as PageContent, elements, assetBaseUrl },
        };
      }),
      ...LINK_TEMPLATES.map((t): AdminTemplateItem => ({
        id: t.id,
        source: 'builtin',
        title: t.title,
        description: t.description,
        category: t.category,
        status: 'published',
        removed: hidden.has(t.id),
        hasUnpublishedChanges: false,
        updatedAt: null,
        createdByName: null,
        preview: { content: t.content, elements: templateElements(t).slice(0, PREVIEW_ELEMENTS), assetBaseUrl },
      })),
    ];
  }

  create(dto: CreateTemplateDto): Promise<TemplateDetail> {
    return this.ctx.run(async (tx) => {
      const [row] = await tx
        .insert(norolinkTemplates)
        .values({
          title: dto.title,
          description: dto.description ?? '',
          category: dto.category,
          draftContent: defaultContent(dto.title),
          createdBy: this.ctx.adminId(),
        })
        .returning({ id: norolinkTemplates.id });
      await this.audit(tx, 'link_template.create', row!.id, { title: dto.title });
      return this.detail(tx, row!.id);
    });
  }

  get(id: string): Promise<TemplateDetail> {
    return this.ctx.run((tx) => this.detail(tx, id));
  }

  /** عنوان و توضیح قالب مستقل از نام پروفایل نمونه است (برخلاف صفحه)؛ مشخصات همان لحظه در گالری اعمال می‌شود، محتوا با انتشار. */
  async update(id: string, dto: UpdateTemplateDto): Promise<TemplateDetail> {
    const content = dto.content === undefined ? undefined : parseContent(dto.content);
    if (content) assertPlatformImages(contentImages(content));
    return this.ctx.run(async (tx) => {
      const patch: Partial<typeof norolinkTemplates.$inferInsert> = { updatedAt: new Date() };
      if (dto.title !== undefined) patch.title = dto.title;
      if (dto.description !== undefined) patch.description = dto.description;
      if (dto.category !== undefined) patch.category = dto.category;
      if (content !== undefined) patch.draftContent = content;
      const updated = await tx.update(norolinkTemplates).set(patch).where(eq(norolinkTemplates.id, id)).returning({ id: norolinkTemplates.id });
      if (!updated[0]) throw new NotFoundException();
      return this.detail(tx, id);
    });
  }

  /** پیش‌نویس (محتوا + المان‌های قابل‌نمایش به ترتیب) را در snapshot کپی می‌کند و قالب در گالری می‌آید. */
  publish(id: string, thumb?: string): Promise<TemplateDetail> {
    return this.withRow(id, async (tx, row) => {
      const snapshot: Snapshot = {
        content: row.draftContent as PageContent,
        elements: (row.draftElements as EditorElement[])
          .filter((e) => e.visible)
          .sort(byKey)
          .map((e) => ({ id: e.id, kind: e.kind, settings: e.settings }) as AnyElement),
        ...(thumb ? { thumb } : {}),
      };
      const now = new Date();
      await tx.update(norolinkTemplates).set({ status: 'published', publishedSnapshot: snapshot, publishedAt: now, updatedAt: now }).where(eq(norolinkTemplates.id, id));
      await this.audit(tx, 'link_template.publish', id, { title: row.title });
      return this.detail(tx, id);
    });
  }

  /** قالب از گالری برداشته می‌شود؛ صفحه‌هایی که از آن ساخته شده‌اند کپی خودشان را دارند. */
  unpublish(id: string): Promise<TemplateDetail> {
    return this.withRow(id, async (tx, row) => {
      await tx.update(norolinkTemplates).set({ status: 'draft' }).where(eq(norolinkTemplates.id, id));
      await this.audit(tx, 'link_template.unpublish', id, { title: row.title });
      return this.detail(tx, id);
    });
  }

  /** فایل‌های پلتفرم قالب می‌مانند: صفحه‌های ساخته‌شده از آن هنوز به همان تصویرها اشاره می‌کنند. */
  async remove(id: string): Promise<void> {
    await this.withRow(id, async (tx, row) => {
      await tx.delete(norolinkTemplates).where(eq(norolinkTemplates.id, id));
      await this.audit(tx, 'link_template.delete', id, { title: row.title });
    });
  }

  async removeBuiltin(key: string): Promise<void> {
    const template = this.builtin(key);
    await this.ctx.run(async (tx) => {
      const added = await tx
        .insert(norolinkRemovedTemplates)
        .values({ templateKey: key, removedBy: this.ctx.adminId() })
        .onConflictDoNothing()
        .returning({ key: norolinkRemovedTemplates.templateKey });
      if (added[0]) await this.audit(tx, 'link_template.builtin_remove', null, { key, title: template.title });
    });
  }

  async restoreBuiltin(key: string): Promise<void> {
    const template = this.builtin(key);
    await this.ctx.run(async (tx) => {
      const deleted = await tx
        .delete(norolinkRemovedTemplates)
        .where(eq(norolinkRemovedTemplates.templateKey, key))
        .returning({ key: norolinkRemovedTemplates.templateKey });
      if (deleted[0]) await this.audit(tx, 'link_template.builtin_restore', null, { key, title: template.title });
    });
  }

  // ---------- لینک واگذاری به مشتری (docs/architecture.md §9.8) ----------

  /**
   * مختص شماره‌ی خاصی نیست و هر کس لینک را داشته باشد یک بار تحویل می‌گیرد؛ قالب باید کامل باشد چون صفحه با تحویل منتشر
   * می‌شود. نشانی تا تحویل یا ابطال برای این لینک رزرو است و نام کسب‌وکار و یادداشت برای پیگیری قیف در مدیریت پلتفرم‌اند.
   */
  createClaimToken(id: string, dto: CreateClaimLinkDto): Promise<ClaimLinkView> {
    return this.withRow(id, async (tx, row) => {
      // لینک ممکن است برای مشتری فرستاده شده باشد: تا ابطال یا تحویل عوض نمی‌شود.
      const active = await this.activeClaimLink(tx, id);
      if (active) return active;
      const elements = this.sortedElements(row).filter((e) => e.visible);
      const issues = publishIssues(row.draftContent as PageContent, elements);
      if (issues.length) throw new UnprocessableEntityException({ message: 'not_publishable', issues });
      const slug = dto.slug.trim().toLowerCase();
      const check = await slugAvailability(slug);
      if (!check.available) throw new ConflictException({ message: 'slug_taken', detail: check.message });
      try {
        await tx.insert(norolinkClaimLinks).values({
          templateId: id,
          token: newClaimToken(),
          slug,
          businessName: dto.businessName.trim(),
          note: dto.note?.trim() ?? '',
          createdBy: this.ctx.adminId(),
        });
      } catch (err) {
        if (pgCode(err) === '23505') throw new ConflictException({ message: 'slug_taken', detail: 'این نشانی برای لینک دیگری رزرو شده است.' });
        throw err;
      }
      await this.audit(tx, 'link_template.claim_link', id, { title: row.title, slug, businessName: dto.businessName.trim() });
      return (await this.activeClaimLink(tx, id))!;
    });
  }

  /** فقط لینک فعال؛ نشانی رزروشده آزاد می‌شود و سابقه‌ی لینک می‌ماند. */
  async revokeClaimToken(id: string): Promise<void> {
    await this.withRow(id, async (tx, row) => {
      const active = await this.activeClaimLink(tx, id);
      if (!active) return;
      await tx.update(norolinkClaimLinks).set({ revokedAt: new Date() }).where(eq(norolinkClaimLinks.id, active.id));
      await this.audit(tx, 'link_template.claim_revoke', id, { title: row.title, slug: active.slug });
    });
  }

  private async activeClaimLink(tx: Db, templateId: string): Promise<ClaimLinkView | null> {
    const [link] = await tx
      .select(claimLinkViewColumns)
      .from(norolinkClaimLinks)
      .where(and(eq(norolinkClaimLinks.templateId, templateId), isNull(norolinkClaimLinks.claimedAt), isNull(norolinkClaimLinks.revokedAt)))
      .limit(1);
    return link ? { ...link, url: claimLinkUrl(link.token) } : null;
  }

  private async lastClaimedAt(tx: Db, templateId: string): Promise<Date | null> {
    const [row] = await tx
      .select({ at: norolinkClaimLinks.claimedAt })
      .from(norolinkClaimLinks)
      .where(and(eq(norolinkClaimLinks.templateId, templateId), isNotNull(norolinkClaimLinks.claimedAt)))
      .orderBy(desc(norolinkClaimLinks.claimedAt))
      .limit(1);
    return row?.at ?? null;
  }

  // ---------- المان‌های پیش‌نویس (هم‌شکل /norolink/pages/:id/elements) ----------

  addElement(id: string, dto: AddElementDto): Promise<EditorElement> {
    return this.withRow(id, async (tx, row) => {
      const elements = this.sortedElements(row);
      if (elements.length >= TEMPLATE_LIMITS.maxElementsPerPage) throw planLimit('max_elements');
      let before: string | null = elements.at(-1)?.sortKey ?? null;
      let after: string | null = null;
      if (dto.afterId) {
        const i = elements.findIndex((e) => e.id === dto.afterId);
        if (i < 0) throw new NotFoundException('element_not_found');
        before = elements[i]!.sortKey;
        after = elements[i + 1]?.sortKey ?? null;
      }
      const element = { id: randomUUID(), kind: dto.kind, settings: defaultSettings(dto.kind), visible: true, sortKey: keyBetween(before, after) } as EditorElement;
      await this.saveElements(tx, id, [...elements, element]);
      return element;
    });
  }

  async updateElement(id: string, elementId: string, dto: UpdateElementDto): Promise<EditorElement> {
    const current = await this.ctx.run(async (tx) => this.findElement(this.sortedElements(await this.findRow(tx, id)), elementId));
    let settings: EditorElement['settings'] | undefined;
    if (dto.settings !== undefined) {
      const parsed = parseSettings(current.kind, dto.settings);
      if (!parsed.ok) throw new UnprocessableEntityException({ message: 'invalid_settings', issues: parsed.issues });
      const derived = (await deriveEmbedData({ ...current, settings: parsed.value } as AnyElement, this.fetcher)) as EditorElement['settings'];
      assertPlatformImages(elementImages({ ...current, settings: derived } as AnyElement));
      settings = derived;
    }
    // شبکه (لینک کوتاه نقشه) بیرون از قفل ردیف؛ ذخیره روی آخرین نسخه‌ی المان‌ها.
    return this.withRow(id, async (tx, row) => {
      const elements = this.sortedElements(row);
      const found = this.findElement(elements, elementId);
      const next = { ...found, ...(settings !== undefined ? { settings } : {}), ...(dto.visible !== undefined ? { visible: dto.visible } : {}) } as EditorElement;
      await this.saveElements(tx, id, elements.map((e) => (e.id === elementId ? next : e)));
      return next;
    });
  }

  /** یک خانه بالا/پایین؛ فقط sortKey همین المان عوض می‌شود. */
  moveElement(id: string, elementId: string, dto: MoveElementDto): Promise<EditorElement> {
    return this.withRow(id, async (tx, row) => {
      const elements = this.sortedElements(row);
      const i = elements.findIndex((e) => e.id === elementId);
      if (i < 0) throw new NotFoundException();
      const key = (j: number) => elements[j]?.sortKey ?? null;
      let next: string | null = null;
      if (dto.direction === 'up' && i > 0) next = keyBetween(key(i - 2), key(i - 1));
      if (dto.direction === 'down' && i < elements.length - 1) next = keyBetween(key(i + 1), key(i + 2));
      if (!next) return elements[i]!;
      const moved = { ...elements[i]!, sortKey: next } as EditorElement;
      await this.saveElements(tx, id, elements.map((e) => (e.id === elementId ? moved : e)));
      return moved;
    });
  }

  async removeElement(id: string, elementId: string): Promise<void> {
    await this.withRow(id, async (tx, row) => {
      const elements = this.sortedElements(row);
      this.findElement(elements, elementId);
      await this.saveElements(tx, id, elements.filter((e) => e.id !== elementId));
    });
  }

  /** تصویر قالب در فضای پلتفرم: از سهمیه‌ی هیچ فضای کاری کم نمی‌شود و از همه‌جا باز می‌شود. */
  async uploadImage(id: string, body: unknown): Promise<ImageRef & { url: string }> {
    if (!(body instanceof Uint8Array)) throw new UnprocessableEntityException('invalid_file');
    await this.ctx.run((tx) => this.findRow(tx, id));
    const file = await this.files.uploadPlatform(this.ctx.adminId(), { body, name: 'image', source: 'norolink_template', maxBytes: MAX_IMAGE_BYTES });
    return { file_id: platformAssetId(file.id), width: file.width!, height: file.height!, url: file.url! };
  }

  // ---------- داخلی ----------

  private builtin(key: string): LinkTemplate {
    const template = linkTemplate(key);
    if (!template) throw new NotFoundException();
    return template;
  }

  private hasChanges(row: TemplateRow): boolean {
    return !row.publishedAt || row.updatedAt.getTime() > row.publishedAt.getTime();
  }

  private sortedElements(row: TemplateRow): EditorElement[] {
    return [...(row.draftElements as EditorElement[])].sort(byKey);
  }

  private findElement(elements: EditorElement[], elementId: string): EditorElement {
    const found = elements.find((e) => e.id === elementId);
    if (!found) throw new NotFoundException();
    return found;
  }

  private async findRow(tx: Db, id: string): Promise<TemplateRow> {
    const [row] = await tx.select().from(norolinkTemplates).where(eq(norolinkTemplates.id, id)).limit(1);
    if (!row) throw new NotFoundException();
    return row;
  }

  /** کار روی قالب با قفل ردیف: ذخیره‌های هم‌زمان ادیتور (هر المان جدا) هم را بازنویسی نکنند. */
  private withRow<T>(id: string, fn: (tx: Db, row: TemplateRow) => Promise<T>): Promise<T> {
    return this.ctx.run(async (tx) => {
      const [row] = await tx.select().from(norolinkTemplates).where(eq(norolinkTemplates.id, id)).for('update');
      if (!row) throw new NotFoundException();
      return fn(tx, row);
    });
  }

  private async saveElements(tx: Db, id: string, elements: EditorElement[]): Promise<void> {
    await tx.update(norolinkTemplates).set({ draftElements: elements, updatedAt: new Date() }).where(eq(norolinkTemplates.id, id));
  }

  private async detail(tx: Db, id: string): Promise<TemplateDetail> {
    const [found] = await tx
      .select({ row: norolinkTemplates, createdByName: platformUsers.fullName })
      .from(norolinkTemplates)
      .leftJoin(platformUsers, eq(platformUsers.id, norolinkTemplates.createdBy))
      .where(eq(norolinkTemplates.id, id))
      .limit(1);
    if (!found) throw new NotFoundException();
    const { row, createdByName } = found;
    const content = row.draftContent as PageContent;
    const elements = this.sortedElements(row);
    return {
      id: row.id,
      slug: '',
      slugChanges: 0,
      title: row.title,
      description: row.description,
      category: row.category,
      status: row.status,
      publishedAt: row.publishedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      hasUnpublishedChanges: this.hasChanges(row),
      createdBy: row.createdBy,
      createdByName: createdByName || null,
      claimLink: await this.activeClaimLink(tx, id),
      claimedAt: await this.lastClaimedAt(tx, id),
      content,
      elements,
      issues: publishIssues(content, elements.filter((e) => e.visible)),
      assetBaseUrl: this.files.publicBaseUrl(),
      limits: TEMPLATE_LIMITS,
    };
  }

  /** ذخیره‌های خودکار پیش‌نویس لاگ نمی‌شوند (به کسی نمی‌رسند)؛ آنچه گالری کاربران را تغییر می‌دهد در همان تراکنش لاگ می‌شود. */
  private async audit(tx: Db, action: string, targetId: string | null, details: Record<string, unknown>): Promise<void> {
    await tx.insert(adminAuditLog).values({
      actorUserId: this.ctx.adminId(),
      action,
      targetType: AUDIT_TARGET,
      targetId,
      details,
      ip: this.ctx.ip(),
    });
  }
}
