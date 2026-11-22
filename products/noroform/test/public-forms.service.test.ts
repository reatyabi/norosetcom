import { beforeAll, describe, expect, it } from 'vitest';
import {
  ConflictException,
  HttpException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  db,
  platformUsers,
  eq,
  noroformSubmissions,
  tenants,
  withTenant,
  type IpHasher,
  type RateLimiter,
  type TenantContext,
} from '@noroset/core';
import { FormsService } from '../api/forms/forms.service';
import { PUBLIC_RATE_LIMITS, PublicFormsService } from '../api/public/public-forms.service';
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
const key = () => uniq('idem').replace(/-/g, '_');

class StubLimiter implements RateLimiter {
  calls: Array<{ key: string; limit: number; windowMs: number }> = [];
  constructor(private allow = true) {}
  consume(key: string, limit: number, windowMs: number): boolean {
    this.calls.push({ key, limit, windowMs });
    return this.allow;
  }
}

const hasher: IpHasher = { hash: (ip) => `h:${ip}`.padEnd(64, '0') };

async function setup() {
  const [t] = await db.insert(tenants).values({ name: 'pub', slug: uniq('pub') }).returning();
  const tenantId = t!.id;
  const ctx: TenantContext = {
    tenantId: () => tenantId,
    userId: () => testUserId,
    role: () => 'owner',
    run: (fn) => withTenant(tenantId, fn),
  };
  const limiter = new StubLimiter();
  return { tenantId, forms: new FormsService(ctx, PLANS), limiter, pub: new PublicFormsService(limiter, hasher, PLANS) };
}

const NAME = 'f_name0001';
const KIND = 'f_kind0001';
const AGE = 'f_age00001';

/** نام (اجباری) + نوع + سن (فقط برای person، اجباری). */
function definition(extraField?: Record<string, unknown>) {
  return {
    version_schema: 1,
    settings: { closed_message: 'فرم بسته است' },
    pages: [
      {
        page_id: 'p_page0001',
        kind: 'main',
        body: {
          items: [
            { kind: 'field', item_id: 'i_item0001', field_id: NAME, type: 'short_text', label: 'نام', required: true },
            {
              kind: 'field',
              item_id: 'i_item0002',
              field_id: KIND,
              type: 'single_choice',
              label: 'نوع',
              settings: { options: [{ value: 'person', label: 'شخص' }, { value: 'company', label: 'شرکت' }] },
            },
            {
              kind: 'field',
              item_id: 'i_item0003',
              field_id: AGE,
              type: 'number',
              label: 'سن',
              required: true,
              condition: { effect: 'show', field_id: KIND, op: 'eq', value: 'person' },
            },
            ...(extraField ? [extraField] : []),
          ],
        },
      },
    ],
  };
}

async function publishedForm(s: Awaited<ReturnType<typeof setup>>, def = definition()) {
  const form = await s.forms.create({ title: 'فرم عمومی' });
  await s.forms.update(form.id, { draftDefinition: def });
  await s.forms.publish(form.id);
  const view = await s.pub.read(form.slug, '1.1.1.1');
  if (view.status !== 'published') throw new Error('expected published');
  return { form, versionId: view.versionId };
}

async function submissions(tenantId: string, formId: string) {
  return withTenant(tenantId, (tx) => tx.select().from(noroformSubmissions).where(eq(noroformSubmissions.formId, formId)));
}

describe('PublicFormsService.read', () => {
  it('returns the published, normalized definition with forced branding', async () => {
    const s = await setup();
    const { form } = await publishedForm(s);
    const view = await s.pub.read(form.slug, '1.1.1.1');
    expect(view).toMatchObject({ status: 'published', slug: form.slug, title: 'فرم عمومی', branding: { forceLicense: true } });
    expect(view.status === 'published' && view.definition.theme.font).toBe('vazirmatn');
    expect(s.limiter.calls.at(-1)).toEqual({ key: 'noroform_public_read:ip:1.1.1.1', ...PUBLIC_RATE_LIMITS.read });
  });

  it('drops the branding when the tenant plan removes it', async () => {
    const s = await setup();
    const { form } = await publishedForm(s);
    const paid = new PublicFormsService(s.limiter, hasher, fixedPlan({ 'branding.remove': true }, 'basic'));
    expect(await paid.read(form.slug, '1.1.1.1')).toMatchObject({ branding: { forceLicense: false } });
  });

  it('closed form returns only the closed message (no definition)', async () => {
    const s = await setup();
    const { form } = await publishedForm(s);
    await s.forms.close(form.id);
    expect(await s.pub.read(form.slug, '1.1.1.1')).toEqual({
      status: 'closed',
      slug: form.slug,
      title: 'فرم عمومی',
      closedMessage: 'فرم بسته است',
    });
  });

  it('404 for drafts and unknown slugs', async () => {
    const s = await setup();
    const draft = await s.forms.create({ title: 'draft' });
    await expect(s.pub.read(draft.slug, '1.1.1.1')).rejects.toThrow(NotFoundException);
    await expect(s.pub.read('no-such-form', '1.1.1.1')).rejects.toThrow(NotFoundException);
  });

  it('429 when rate limited', async () => {
    const pub = new PublicFormsService(new StubLimiter(false), hasher, PLANS);
    const err = await pub.read('anything', '1.1.1.1').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpException);
    expect((err as HttpException).getStatus()).toBe(429);
  });
});

describe('PublicFormsService.submit', () => {
  it('stores validated, normalized answers with a hashed IP; drops hidden fields', async () => {
    const s = await setup();
    const { form, versionId } = await publishedForm(s);
    const res = await s.pub.submit(
      form.slug,
      { versionId, idempotencyKey: key(), answers: { [NAME]: '  علی  ', [KIND]: 'company', [AGE]: 40 } },
      '2.2.2.2',
    );
    expect(res).toEqual({ ok: true });
    const rows = await submissions(s.tenantId, form.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ answers: { [NAME]: 'علی', [KIND]: 'company' }, ipHash: hasher.hash('2.2.2.2'), versionId });
    expect(s.limiter.calls.at(-1)).toEqual({ key: 'noroform_submit:ip:2.2.2.2', ...PUBLIC_RATE_LIMITS.submit });
  });

  it('is idempotent per key', async () => {
    const s = await setup();
    const { form, versionId } = await publishedForm(s);
    const dto = { versionId, idempotencyKey: key(), answers: { [NAME]: 'x' } };
    await s.pub.submit(form.slug, dto, '2.2.2.2');
    await s.pub.submit(form.slug, { ...dto, answers: { [NAME]: 'y' } }, '2.2.2.2');
    const rows = await submissions(s.tenantId, form.id);
    expect(rows.map((r) => r.answers)).toEqual([{ [NAME]: 'x' }]);
  });

  it('honeypot: answers ok but stores nothing', async () => {
    const s = await setup();
    const { form, versionId } = await publishedForm(s);
    const res = await s.pub.submit(
      form.slug,
      { versionId, idempotencyKey: key(), answers: { [NAME]: 'bot' }, website: 'http://spam.example' },
      '3.3.3.3',
    );
    expect(res).toEqual({ ok: true });
    expect(await submissions(s.tenantId, form.id)).toHaveLength(0);
  });

  it('422 with field errors (required by condition, unknown keys)', async () => {
    const s = await setup();
    const { form, versionId } = await publishedForm(s);
    const err = await s.pub
      .submit(form.slug, { versionId, idempotencyKey: key(), answers: { [KIND]: 'person', f_unknown1: 1 } }, '4.4.4.4')
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(UnprocessableEntityException);
    const body = (err as UnprocessableEntityException).getResponse() as { errors: Array<{ field_id: string; code: string }> };
    expect(body.errors).toEqual(
      expect.arrayContaining([
        { field_id: 'f_unknown1', code: 'unknown_field' },
        { field_id: NAME, code: 'required' },
        { field_id: AGE, code: 'required' },
      ]),
    );
    expect(await submissions(s.tenantId, form.id)).toHaveLength(0);
  });

  it('accepts answers for the version the respondent loaded, after a republish', async () => {
    const s = await setup();
    const { form, versionId: v1 } = await publishedForm(s);
    // نسخه‌ی ۲ فیلد «سن» را ندارد؛ پاسخ پرشده با نسخه‌ی ۱ هنوز معتبر است.
    const v2def = definition();
    v2def.pages[0]!.body.items = v2def.pages[0]!.body.items.slice(0, 2);
    await s.forms.update(form.id, { draftDefinition: v2def });
    await s.forms.publish(form.id);

    await s.pub.submit(form.slug, { versionId: v1, idempotencyKey: key(), answers: { [NAME]: 'a', [KIND]: 'person', [AGE]: 30 } }, '5.5.5.5');
    const rows = await submissions(s.tenantId, form.id);
    expect(rows[0]).toMatchObject({ versionId: v1, answers: { [AGE]: 30 } });
  });

  it('409 for closed forms and versions of other forms; 404 for unknown forms', async () => {
    const s = await setup();
    const a = await publishedForm(s);
    const b = await publishedForm(s);
    const dto = (versionId: string) => ({ versionId, idempotencyKey: key(), answers: { [NAME]: 'x' } });

    await expect(s.pub.submit(a.form.slug, dto(b.versionId), '6.6.6.6')).rejects.toThrow(ConflictException);
    await s.forms.close(a.form.id);
    await expect(s.pub.submit(a.form.slug, dto(a.versionId), '6.6.6.6')).rejects.toThrow(ConflictException);
    await expect(s.pub.submit('no-such-form', dto(a.versionId), '6.6.6.6')).rejects.toThrow(NotFoundException);
  });

  it('429 before touching the database; no IP ⇒ no hash', async () => {
    const s = await setup();
    const { form, versionId } = await publishedForm(s);
    const blocked = new PublicFormsService(new StubLimiter(false), hasher, PLANS);
    await expect(blocked.submit(form.slug, { versionId, idempotencyKey: key(), answers: { [NAME]: 'x' } }, '7.7.7.7')).rejects.toThrow(
      HttpException,
    );
    expect(await submissions(s.tenantId, form.id)).toHaveLength(0);

    await s.pub.submit(form.slug, { versionId, idempotencyKey: key(), answers: { [NAME]: 'x' } }, undefined);
    expect((await submissions(s.tenantId, form.id))[0]?.ipHash).toBeNull();
  });
});
