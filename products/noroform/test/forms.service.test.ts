import { beforeAll, describe, expect, it } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  db,
  platformUsers,
  eq,
  findPublicForm,
  noroformFormVersions,
  tenants,
  withTenant,
  type MembershipRole,
  type TenantContext,
} from '@noroset/core';
import { LIMITS } from '@noroset/field-engine';
import { FormsService } from '../api/forms/forms.service';
import { fixedPlan } from '@noroset/core';

/** پلن بدون سقف عملی برای تست‌های رفتار (سقف‌ها جدا تست می‌شوند). */
const PLANS = fixedPlan({ 'noroform.forms': 1000, 'noroform.submissions_monthly': 100000 });

let seq = 0;
const uniq = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}-${++seq}`;

/** کاربر واقعی برای ستون created_by (FK به platform_users). */
let testUserId = '';
beforeAll(async () => {
  const [u] = await db.insert(platformUsers).values({ email: `${uniq('creator')}@test.local` }).returning();
  testUserId = u!.id;
});

async function newTenant(): Promise<string> {
  const [t] = await db.insert(tenants).values({ name: 'NF API', slug: uniq('nfapi') }).returning();
  return t!.id;
}

function ctxFor(tenantId: string, role: MembershipRole = 'owner'): TenantContext {
  return {
    tenantId: () => tenantId,
    userId: () => testUserId,
    role: () => role,
    run: (fn) => withTenant(tenantId, fn),
  };
}

async function serviceForNewTenant() {
  const tenantId = await newTenant();
  return { tenantId, forms: new FormsService(ctxFor(tenantId), PLANS) };
}

/** تعریف خام معتبر با یک فیلد اجباری. */
function validDraft(label = 'نام') {
  return {
    version_schema: 1,
    pages: [
      {
        page_id: 'p_aaaaaaaa',
        kind: 'main',
        body: {
          items: [{ kind: 'field', item_id: 'i_aaaaaaaa', field_id: 'f_aaaaaaaa', type: 'short_text', label, required: true }],
        },
      },
    ],
  };
}

describe('FormsService — create / read', () => {
  it('creates a draft with an empty valid definition and a random slug', async () => {
    const { forms } = await serviceForNewTenant();
    const form = await forms.create({ title: 'نظرسنجی' });
    expect(form).toMatchObject({ title: 'نظرسنجی', status: 'draft', currentVersionNumber: null, publishedAt: null, issues: [] });
    expect(form.slug).toMatch(/^[a-z0-9]{10}$/);
    expect(form.draftDefinition).toMatchObject({ version_schema: 1, pages: [{ kind: 'main' }] });
    expect(await forms.get(form.id)).toEqual(form);
    expect((await forms.list()).map((f) => f.id)).toEqual([form.id]);
  });

  it('accepts an explicit slug; rejects reserved and taken slugs with 409', async () => {
    const { forms } = await serviceForNewTenant();
    const slug = uniq('my-form');
    expect((await forms.create({ title: 'a', slug })).slug).toBe(slug);
    await expect(forms.create({ title: 'b', slug })).rejects.toThrow(ConflictException);
    await expect(forms.create({ title: 'c', slug: 'form' })).rejects.toThrow(ConflictException);
    // slug در کل پلتفرم یکتاست، نه فقط در tenant.
    const other = await serviceForNewTenant();
    await expect(other.forms.create({ title: 'd', slug })).rejects.toThrow(ConflictException);
  });

  it('isolates tenants: another tenant gets 404', async () => {
    const a = await serviceForNewTenant();
    const b = await serviceForNewTenant();
    const form = await a.forms.create({ title: 'a' });
    await expect(b.forms.get(form.id)).rejects.toThrow(NotFoundException);
    await expect(b.forms.update(form.id, { title: 'x' })).rejects.toThrow(NotFoundException);
    await expect(b.forms.publish(form.id)).rejects.toThrow(NotFoundException);
    await expect(b.forms.remove(form.id)).rejects.toThrow(NotFoundException);
    expect(await b.forms.list()).toEqual([]);
  });
});

describe('FormsService — draft updates', () => {
  it('saves incomplete drafts and reports their issues', async () => {
    const { forms } = await serviceForNewTenant();
    const form = await forms.create({ title: 'a' });
    const updated = await forms.update(form.id, { title: 'b', draftDefinition: { version_schema: 1, pages: [] } });
    expect(updated.title).toBe('b');
    expect(updated.draftDefinition).toEqual({ version_schema: 1, pages: [] });
    expect(updated.issues.length).toBeGreaterThan(0);
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(form.updatedAt.getTime());
  });

  it('rejects oversized drafts and taken/reserved slugs', async () => {
    const { forms } = await serviceForNewTenant();
    const form = await forms.create({ title: 'a' });
    const huge = { version_schema: 1, blob: 'x'.repeat(LIMITS.maxDefinitionBytes) };
    await expect(forms.update(form.id, { draftDefinition: huge })).rejects.toThrow(BadRequestException);
    const other = await forms.create({ title: 'b' });
    await expect(forms.update(form.id, { slug: other.slug })).rejects.toThrow(ConflictException);
    await expect(forms.update(form.id, { slug: 'api' })).rejects.toThrow(ConflictException);
  });
});

describe('FormsService — publish lifecycle', () => {
  it('refuses to publish an invalid draft (422 with issues)', async () => {
    const { forms } = await serviceForNewTenant();
    const form = await forms.create({ title: 'a' });
    await forms.update(form.id, { draftDefinition: { version_schema: 1, pages: [{ page_id: 'bad', kind: 'main' }] } });
    const err = await forms.publish(form.id).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(UnprocessableEntityException);
    const body = (err as UnprocessableEntityException).getResponse() as { message: string; issues: unknown[] };
    expect(body.message).toBe('invalid_definition');
    expect(body.issues.length).toBeGreaterThan(0);
    expect((await forms.get(form.id)).status).toBe('draft');
  });

  it('publishes immutable numbered versions with the normalized definition', async () => {
    const { tenantId, forms } = await serviceForNewTenant();
    const form = await forms.create({ title: 'a' });
    await forms.update(form.id, { draftDefinition: validDraft('نام') });

    const v1 = await forms.publish(form.id);
    expect(v1).toMatchObject({ status: 'published', currentVersionNumber: 1 });
    expect(v1.publishedAt).toBeInstanceOf(Date);

    // ویرایش پیش‌نویس روی نسخه‌ی منتشرشده اثر ندارد تا انتشار بعدی.
    await forms.update(form.id, { draftDefinition: validDraft('نام کامل') });
    const pub = await findPublicForm(form.slug);
    expect(pub?.versionNumber).toBe(1);
    expect(pub?.definition).toMatchObject({
      theme: { font: 'vazirmatn' }, // پیش‌فرض‌ها اعمال شده (نرمال‌شده)
      pages: [{ body: { items: [{ label: 'نام', settings: { max_length: 255 } }] } }],
    });

    const v2 = await forms.publish(form.id);
    expect(v2.currentVersionNumber).toBe(2);
    const versions = await withTenant(tenantId, (tx) =>
      tx.select().from(noroformFormVersions).where(eq(noroformFormVersions.formId, form.id)),
    );
    expect(versions.map((v) => v.versionNumber).sort()).toEqual([1, 2]);
    expect((await findPublicForm(form.slug))?.definition).toMatchObject({
      pages: [{ body: { items: [{ label: 'نام کامل' }] } }],
    });
  });

  it('close / reopen transitions with conflicts for wrong states', async () => {
    const { forms } = await serviceForNewTenant();
    const form = await forms.create({ title: 'a' });
    await expect(forms.close(form.id)).rejects.toThrow(ConflictException);
    await forms.update(form.id, { draftDefinition: validDraft() });
    await forms.publish(form.id);

    expect((await forms.close(form.id)).status).toBe('closed');
    expect((await findPublicForm(form.slug))?.status).toBe('closed');
    await expect(forms.close(form.id)).rejects.toThrow(ConflictException);

    const reopened = await forms.reopen(form.id);
    expect(reopened).toMatchObject({ status: 'published', currentVersionNumber: 1 });
    await expect(forms.reopen(form.id)).rejects.toThrow(ConflictException);
  });

  it('publishing a closed form opens it with a new version', async () => {
    const { forms } = await serviceForNewTenant();
    const form = await forms.create({ title: 'a' });
    await forms.update(form.id, { draftDefinition: validDraft() });
    await forms.publish(form.id);
    await forms.close(form.id);
    expect(await forms.publish(form.id)).toMatchObject({ status: 'published', currentVersionNumber: 2 });
  });

  it('concurrent publishes get distinct version numbers', async () => {
    const { forms } = await serviceForNewTenant();
    const form = await forms.create({ title: 'a' });
    await forms.update(form.id, { draftDefinition: validDraft() });
    const results = await Promise.all([forms.publish(form.id), forms.publish(form.id), forms.publish(form.id)]);
    expect(results.map((r) => r.currentVersionNumber).sort()).toEqual([1, 2, 3]);
  });

  it('remove deletes the form; public lookup disappears', async () => {
    const { forms } = await serviceForNewTenant();
    const form = await forms.create({ title: 'a' });
    await forms.update(form.id, { draftDefinition: validDraft() });
    await forms.publish(form.id);
    await forms.remove(form.id);
    await expect(forms.get(form.id)).rejects.toThrow(NotFoundException);
    expect(await findPublicForm(form.slug)).toBeNull();
    await expect(forms.remove(form.id)).rejects.toThrow(NotFoundException);
  });
});

describe('plan limit (docs/architecture.md §9.11)', () => {
  it('the free plan allows 3 forms; the 4th is 403 plan_limit', async () => {
    const [t] = await db.insert(tenants).values({ name: 'limit', slug: `limit-${Date.now().toString(36)}` }).returning();
    const forms = new FormsService(ctxFor(t!.id), fixedPlan());
    for (let i = 0; i < 3; i++) await forms.create({ title: `f${i}` });
    await expect(forms.create({ title: 'f4' })).rejects.toMatchObject({ status: 403, response: { message: 'plan_limit', limit: 'noroform.forms' } });
  });
});

describe('creator, starting draft and list preview', () => {
  it('records the creator and returns a thumbnail preview of the draft in the list', async () => {
    const { forms } = await serviceForNewTenant();
    const draft = { ...validDraft('نام و نام خانوادگی'), theme: { primary_color: '#0f7b0f' } };
    const form = await forms.create({ title: 'از قالب', draftDefinition: draft });
    expect(form.createdBy).toBe(testUserId);
    expect(form.draftDefinition).toEqual(draft);
    const [item] = await forms.list();
    expect(item).toMatchObject({ id: form.id, createdBy: testUserId, createdByName: null });
    expect(item!.preview).toEqual({
      primaryColor: '#0f7b0f',
      backgroundColor: '#ffffff',
      backgroundStyle: 'solid',
      backgroundSecondaryColor: '#e8edf5',
      backgroundAngle: 135,
      buttonStyle: 'filled',
      radius: 'md',
      textSize: 'md',
      font: 'vazirmatn',
      items: [{ type: 'short_text', label: 'نام و نام خانوادگی' }],
    });
    expect(item).not.toHaveProperty('draftDefinition');
  });

  it('rejects an oversized starting draft like PATCH does', async () => {
    const { forms } = await serviceForNewTenant();
    const huge = { version_schema: 1, pages: [], pad: 'x'.repeat(LIMITS.maxDefinitionBytes) };
    await expect(forms.create({ title: 'a', draftDefinition: huge })).rejects.toThrow(BadRequestException);
  });
});
