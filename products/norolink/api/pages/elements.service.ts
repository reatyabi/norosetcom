import { Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import {
  and,
  count,
  eq,
  FILE_SERVICE,
  norolinkElements,
  PLAN_RESOLVER,
  TENANT_CONTEXT,
  type Db,
  type FileService,
  type PlanResolver,
  type TenantContext,
} from '@noroset/core';
import {
  defaultSettings,
  keyBetween,
  parseSettings,
  type AnyElement,
  type ElementKind,
  type ElementSettings,
} from '../../shared';
import { limitsFor, MAP_FETCHER, planLimit } from '../access';
import { deriveEmbedData } from '../embeds/derive';
import type { Fetcher } from '../embeds/map-resolver';
import type { AddElementDto, MoveElementDto, UpdateElementDto } from './dto';
import { loadElements, syncPageFiles, touchPage, type EditorElement } from './pages.service';

@Injectable()
export class ElementsService {
  constructor(
    @Inject(TENANT_CONTEXT) private readonly ctx: TenantContext,
    @Inject(PLAN_RESOLVER) private readonly plans: PlanResolver,
    @Inject(MAP_FETCHER) private readonly fetcher: Fetcher,
    @Inject(FILE_SERVICE) private readonly files: FileService,
  ) {}

  async add(pageId: string, dto: AddElementDto): Promise<EditorElement> {
    const tenantId = this.ctx.tenantId();
    const limits = await limitsFor(this.plans, tenantId);
    if (!limits.allowedKinds.includes(dto.kind)) throw planLimit('element_kind');
    return this.ctx.run(async (tx) => {
      await touchPage(tx, pageId);
      const [{ n } = { n: 0 }] = await tx.select({ n: count() }).from(norolinkElements).where(eq(norolinkElements.pageId, pageId));
      if (n >= limits.maxElementsPerPage) throw planLimit('max_elements');

      const keys = (await loadElements(tx, pageId)).map((e) => ({ id: e.id, key: e.sortKey }));
      let before: string | null = keys.at(-1)?.key ?? null;
      let after: string | null = null;
      if (dto.afterId) {
        const i = keys.findIndex((k) => k.id === dto.afterId);
        if (i < 0) throw new NotFoundException('element_not_found');
        before = keys[i]!.key;
        after = keys[i + 1]?.key ?? null;
      }
      const [row] = await tx
        .insert(norolinkElements)
        .values({ tenantId, pageId, kind: dto.kind, sortKey: keyBetween(before, after), settings: defaultSettings(dto.kind) })
        .returning();
      return toEditor(row!);
    });
  }

  async update(pageId: string, elementId: string, dto: UpdateElementDto): Promise<EditorElement> {
    const current = await this.ctx.run((tx) => this.find(tx, pageId, elementId));
    let settings: ElementSettings[ElementKind] | undefined;
    if (dto.settings !== undefined) {
      const parsed = parseSettings(current.kind, dto.settings);
      if (!parsed.ok) throw new UnprocessableEntityException({ message: 'invalid_settings', issues: parsed.issues });
      settings = await deriveEmbedData({ ...current, settings: parsed.value } as AnyElement, this.fetcher);
    }
    return this.ctx.run(async (tx) => {
      const patch: Partial<typeof norolinkElements.$inferInsert> = { updatedAt: new Date() };
      if (settings !== undefined) patch.settings = settings;
      if (dto.visible !== undefined) patch.visible = dto.visible;
      const [row] = await tx
        .update(norolinkElements)
        .set(patch)
        .where(and(eq(norolinkElements.id, elementId), eq(norolinkElements.pageId, pageId)))
        .returning();
      if (!row) throw new NotFoundException();
      await touchPage(tx, pageId);
      if (settings !== undefined) await syncPageFiles(tx, this.files, pageId);
      return toEditor(row);
    });
  }

  /** یک خانه بالا/پایین؛ فقط sort_key همین المان عوض می‌شود. */
  move(pageId: string, elementId: string, dto: MoveElementDto): Promise<EditorElement> {
    return this.ctx.run(async (tx) => {
      const keys = (await loadElements(tx, pageId)).map((e) => ({ id: e.id, key: e.sortKey }));
      const i = keys.findIndex((k) => k.id === elementId);
      if (i < 0) throw new NotFoundException();
      const key = (j: number) => keys[j]?.key ?? null;
      let next: string | null = null;
      if (dto.direction === 'up' && i > 0) next = keyBetween(key(i - 2), key(i - 1));
      if (dto.direction === 'down' && i < keys.length - 1) next = keyBetween(key(i + 1), key(i + 2));
      if (next) {
        await tx.update(norolinkElements).set({ sortKey: next, updatedAt: new Date() }).where(eq(norolinkElements.id, elementId));
        await touchPage(tx, pageId);
      }
      return this.find(tx, pageId, elementId);
    });
  }

  remove(pageId: string, elementId: string): Promise<void> {
    return this.ctx.run(async (tx) => {
      const deleted = await tx
        .delete(norolinkElements)
        .where(and(eq(norolinkElements.id, elementId), eq(norolinkElements.pageId, pageId)))
        .returning({ id: norolinkElements.id });
      if (!deleted[0]) throw new NotFoundException();
      await touchPage(tx, pageId);
      await syncPageFiles(tx, this.files, pageId);
    });
  }

  private async find(tx: Db, pageId: string, elementId: string): Promise<EditorElement> {
    const [row] = await tx
      .select()
      .from(norolinkElements)
      .where(and(eq(norolinkElements.id, elementId), eq(norolinkElements.pageId, pageId)))
      .limit(1);
    if (!row) throw new NotFoundException();
    return toEditor(row);
  }
}

function toEditor(row: typeof norolinkElements.$inferSelect): EditorElement {
  return { id: row.id, kind: row.kind, settings: row.settings, visible: row.visible, sortKey: row.sortKey } as EditorElement;
}
