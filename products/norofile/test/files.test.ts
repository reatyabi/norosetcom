import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  ConflictException,
  ForbiddenException,
  HttpException,
  NotFoundException,
  PayloadTooLargeException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { db, norofileFiles, platformUsers, tenants, withTenant, type RateLimiter, type TenantContext } from '@noroset/core';
import { contentDisposition, sanitizeName } from '../api/files/file-types';
import { FilesService, publicFilesBaseUrl } from '../api/files/files.service';
import { fixedPlan, FREE_ENTITLEMENTS } from '@noroset/core';
import { MIB } from '../api/limits';

/** سهمیه‌ی پلن رایگان (norofile.storage_mb). */
const TENANT_QUOTA_BYTES = FREE_ENTITLEMENTS['norofile.storage_mb'] * MIB;
import type { ObjectStorage, StoredObject } from '../api/storage/object-storage';

let seq = 0;
const uniq = (p: string) => `${p}-${Date.now().toString(36)}-${++seq}`;

class MemoryStorage implements ObjectStorage {
  objects = new Map<string, Uint8Array>();
  deleted: string[] = [];
  async put(key: string, body: Uint8Array) {
    this.objects.set(key, body);
  }
  async get(key: string): Promise<StoredObject | null> {
    const body = this.objects.get(key);
    return body ? { body, contentLength: body.length } : null;
  }
  async delete(key: string) {
    this.deleted.push(key);
    this.objects.delete(key);
  }
}

const allow: RateLimiter = { consume: () => true };

async function setup() {
  const [t] = await db.insert(tenants).values({ name: 'NF API', slug: uniq('nfapi') }).returning();
  const [u] = await db.insert(platformUsers).values({ email: `${uniq('nf')}@test.local` }).returning();
  const tenantId = t!.id;
  const ctx: TenantContext = {
    tenantId: () => tenantId,
    userId: () => u!.id,
    role: () => 'owner',
    run: (fn) => withTenant(tenantId, fn),
  };
  const storage = new MemoryStorage();
  return { tenantId, ctx, storage, files: new FilesService(ctx, storage, allow, fixedPlan()) };
}

const bytes = (s: string, extra: number[] = []) => new Uint8Array([...[...s].map((c) => c.charCodeAt(0)), ...extra]);
const GIF = bytes('GIF89a', [7, 0, 9, 0, 0, 0]);
const PDF = bytes('%PDF-1.7\n%%EOF');
const ZIP = bytes('PK\x03\x04 plain archive');
const DOCX = bytes('PK\x03\x04[Content_Types].xml word/document.xml');
const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

async function rejects(p: Promise<unknown>, type: new (...a: never[]) => Error, message?: string) {
  const err = await p.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(type);
  if (message) expect(JSON.stringify((err as HttpException).getResponse())).toContain(message);
}

describe('upload', () => {
  it('detects type from content and stores under the tenant key', async () => {
    const s = await setup();
    const img = await s.files.upload({ body: GIF, name: 'عکس من', source: 'norofile' });
    expect(img).toMatchObject({ kind: 'image', mimeType: 'image/gif', width: 7, height: 9, name: 'عکس من.gif', visibility: 'private', url: null });
    expect(s.storage.objects.has(`${s.tenantId}/${img.id}`)).toBe(true);

    const pdf = await s.files.upload({ body: PDF, name: 'report.pdf', source: 'norofile', visibility: 'public' });
    expect(pdf).toMatchObject({ kind: 'document', mimeType: 'application/pdf', name: 'report.pdf' });
    expect(pdf.url).toBe(`${s.files.publicBaseUrl()}/${pdf.id}`);

    expect(await s.files.upload({ body: DOCX, name: 'cv.docx', source: 'norofile' })).toMatchObject({ kind: 'document', name: 'cv.docx' });
    expect(await s.files.upload({ body: ZIP, name: 'x.zip', source: 'norofile' })).toMatchObject({ kind: 'archive', mimeType: 'application/zip' });
  });

  it('gives public links only to images and PDFs', async () => {
    const s = await setup();
    await rejects(s.files.upload({ body: ZIP, name: 'x.zip', source: 'norofile', visibility: 'public' }), UnprocessableEntityException, 'public_not_allowed');
    await rejects(s.files.upload({ body: DOCX, name: 'cv.docx', source: 'norofile', visibility: 'public' }), UnprocessableEntityException, 'public_not_allowed');
    const zip = await s.files.upload({ body: ZIP, name: 'x.zip', source: 'norofile' });
    await rejects(s.files.update(zip.id, { visibility: 'public' }), UnprocessableEntityException, 'public_not_allowed');
    const pdf = await s.files.upload({ body: PDF, name: 'a.pdf', source: 'norofile' });
    expect((await s.files.update(pdf.id, { visibility: 'public' })).visibility).toBe('public');
  });

  it('rejects unknown, broken and disguised files', async () => {
    const s = await setup();
    const bad = [bytes('<svg onload="x"/>'), bytes('<html></html>'), new Uint8Array(), bytes('PK\x03\x04 not office'), new Uint8Array(PNG_HEADER)];
    const names = ['a.svg', 'a.html', 'a.txt', 'a.docx', 'a.png'];
    for (const [i, body] of bad.entries()) {
      await rejects(s.files.upload({ body, name: names[i], source: 'norofile' }), UnprocessableEntityException, 'invalid_file');
    }
    await rejects(s.files.upload({ body: PDF, source: 'norolink', accept: 'image' }), UnprocessableEntityException, 'invalid_file');
    await rejects(s.files.upload({ body: PDF, source: 'norofile', maxBytes: 4 }), PayloadTooLargeException, 'file_too_large');
    expect(s.storage.objects.size).toBe(0);
  });

  it('enforces the tenant quota and leaves no orphan object', async () => {
    const s = await setup();
    await withTenant(s.tenantId, (tx) =>
      tx.insert(norofileFiles).values({
        tenantId: s.tenantId,
        name: 'big.zip',
        kind: 'archive',
        mimeType: 'application/zip',
        extension: 'zip',
        sizeBytes: TENANT_QUOTA_BYTES - 5,
        storageKey: `${s.tenantId}/${randomUUID()}`,
      }),
    );
    await rejects(s.files.upload({ body: PDF, source: 'norofile' }), ForbiddenException, 'storage_quota');
    expect(s.storage.objects.size).toBe(0);
    expect((await s.files.usage()).usedBytes).toBe(TENANT_QUOTA_BYTES - 5);
  });
});

describe('usage tracking', () => {
  it('syncs usages, validates ownership and requirements', async () => {
    const a = await setup();
    const b = await setup();
    const pub = await a.files.upload({ body: GIF, source: 'norolink', visibility: 'public' });
    const priv = await a.files.upload({ body: GIF, source: 'norofile' });
    const pdf = await a.files.upload({ body: PDF, source: 'norofile', visibility: 'public' });
    const foreign = await b.files.upload({ body: GIF, source: 'norofile', visibility: 'public' });
    const owner = { type: 'norolink_page', id: randomUUID() };
    const req = { kind: 'image' as const, visibility: 'public' as const };

    for (const id of [priv.id, pdf.id, foreign.id, 'nope']) {
      await rejects(a.ctx.run((tx) => a.files.syncUsage(tx, owner, [id], req)), UnprocessableEntityException, 'invalid_asset');
    }
    await a.ctx.run((tx) => a.files.syncUsage(tx, owner, [pub.id, pub.id], req));
    expect((await a.files.get(pub.id)).usages).toMatchObject([{ ownerType: 'norolink_page', ownerId: owner.id }]);

    await rejects(a.files.remove(pub.id), ConflictException, 'file_in_use');
    await rejects(a.files.update(pub.id, { visibility: 'private' }), ConflictException, 'file_in_use');
    expect((await a.files.update(pub.id, { name: 'avatar' })).name).toBe('avatar.gif');

    await a.ctx.run((tx) => a.files.syncUsage(tx, owner, [], req));
    expect((await a.files.get(pub.id)).usageCount).toBe(0);
    await a.files.remove(pub.id);
    expect(a.storage.deleted).toEqual([`${a.tenantId}/${pub.id}`]);
    await rejects(a.files.get(pub.id), NotFoundException);
  });
});

describe('panel and public reads', () => {
  it('lists with filters, search and pagination; other tenants see nothing', async () => {
    const s = await setup();
    await s.files.upload({ body: GIF, name: 'logo', source: 'norofile' });
    await s.files.upload({ body: PDF, name: 'قرارداد ۱۰۰%.pdf', source: 'norofile' });
    await s.files.upload({ body: ZIP, name: 'backup', source: 'norofile' });

    expect((await s.files.list({})).total).toBe(3);
    expect((await s.files.list({ kind: 'document' })).items.map((f) => f.name)).toEqual(['قرارداد ۱۰۰%.pdf']);
    expect((await s.files.list({ q: '100%' })).total).toBe(0);
    expect((await s.files.list({ q: '۱۰۰%' })).total).toBe(1);
    const page = await s.files.list({ limit: 2, offset: 2 });
    expect([page.items.length, page.total]).toEqual([1, 3]);
    expect(await s.files.usage()).toMatchObject({ fileCount: 3, usedBytes: GIF.length + PDF.length + ZIP.length });

    const other = await setup();
    expect((await other.files.list({})).total).toBe(0);
    await rejects(other.files.get(page.items[0]!.id), NotFoundException);
    await rejects(other.files.content(page.items[0]!.id), NotFoundException);
  });

  it('filters by uploader and sorts by name or last change', async () => {
    const s = await setup();
    const [u] = await db.insert(platformUsers).values({ email: `${uniq('nf2')}@test.local`, fullName: 'سارا' }).returning();
    const teammate = new FilesService({ ...s.ctx, userId: () => u!.id }, s.storage, allow, fixedPlan());
    const mine = await s.files.upload({ body: GIF, name: 'ب-من', source: 'norofile' });
    await teammate.upload({ body: PDF, name: 'الف-سارا.pdf', source: 'norofile' });

    expect((await s.files.list({ owner: 'me' })).items.map((f) => f.name)).toEqual(['ب-من.gif']);
    const others = await s.files.list({ owner: 'others' });
    expect(others.items.map((f) => [f.name, f.uploadedBy, f.uploadedByName])).toEqual([['الف-سارا.pdf', u!.id, 'سارا']]);
    expect((await s.files.list({ sort: 'name' })).items.map((f) => f.name)).toEqual(['الف-سارا.pdf', 'ب-من.gif']);
    await s.files.update(mine.id, { name: 'ب-من-تازه' });
    expect((await s.files.list({ sort: 'updated' })).items[0]!.id).toBe(mine.id);
  });

  it('serves only public files anonymously', async () => {
    const s = await setup();
    const pub = await s.files.upload({ body: GIF, source: 'norofile', visibility: 'public' });
    const priv = await s.files.upload({ body: GIF, source: 'norofile' });
    expect(await s.files.publicContent(pub.id, '1.1.1.1')).toMatchObject({ mimeType: 'image/gif', kind: 'image' });
    await rejects(s.files.publicContent(priv.id, '1.1.1.1'), NotFoundException);
    expect((await s.files.content(priv.id)).object.body).toEqual(GIF);
  });
});

describe('personal space', () => {
  it('stores public images under the user key, served publicly, outside any tenant', async () => {
    const s = await setup();
    const userId = s.ctx.userId();
    const f = await s.files.uploadPersonal(userId, { body: GIF, name: 'me', source: 'account' });
    expect(f).toMatchObject({ kind: 'image', visibility: 'public', name: 'me.gif', url: `${s.files.publicBaseUrl()}/${f.id}` });
    expect(s.storage.objects.has(`users/${userId}/${f.id}`)).toBe(true);
    expect(await s.files.publicContent(f.id, '1.1.1.1')).toMatchObject({ mimeType: 'image/gif' });
    // در کتابخانه و سهمیه‌ی tenant نمی‌آید.
    expect((await s.files.list({})).total).toBe(0);
    await rejects(s.files.get(f.id), NotFoundException);
  });

  it('accepts only images within the personal size limit', async () => {
    const s = await setup();
    await rejects(s.files.uploadPersonal(s.ctx.userId(), { body: PDF, source: 'account' }), UnprocessableEntityException, 'invalid_file');
    const big = new Uint8Array(3 * 1024 * 1024);
    big.set(GIF);
    await rejects(s.files.uploadPersonal(s.ctx.userId(), { body: big, source: 'account' }), PayloadTooLargeException, 'file_too_large');
  });

  it('platform files need a superadmin, stay out of tenant quota and have their own public path', async () => {
    const s = await setup();
    const [admin] = await db.insert(platformUsers).values({ email: `${randomUUID()}@test.local`, platformRole: 'superadmin' }).returning();
    const f = await s.files.uploadPlatform(admin!.id, { body: GIF, name: 'cover', source: 'norolink_template' });
    expect(f).toMatchObject({ kind: 'image', visibility: 'public', width: 7, height: 9, url: `${s.files.publicBaseUrl()}/platform/${f.id}` });
    expect(s.storage.objects.has(`platform/${f.id}`)).toBe(true);
    expect(await s.files.platformContent(f.id, '1.1.1.1')).toMatchObject({ mimeType: 'image/gif' });
    expect((await s.files.usage()).usedBytes).toBe(0);

    // مسیر پلتفرم به فایل فضای کاری نمی‌رسد
    const pub = await s.files.upload({ body: GIF, source: 'norofile', visibility: 'public' });
    await rejects(s.files.platformContent(pub.id, '1.1.1.1'), NotFoundException);

    await rejects(s.files.uploadPlatform(admin!.id, { body: PDF, source: 'norolink_template' }), UnprocessableEntityException, 'invalid_file');
    // کاربر عادی: RLS رد می‌کند و شیء یتیم نمی‌ماند
    const count = s.storage.objects.size;
    await expect(s.files.uploadPlatform(s.ctx.userId(), { body: GIF, source: 'norolink_template' })).rejects.toThrow();
    expect(s.storage.objects.size).toBe(count);
  });

  it('removes only the owner’s file', async () => {
    const s = await setup();
    const other = await setup();
    const f = await s.files.uploadPersonal(s.ctx.userId(), { body: GIF, source: 'account' });
    await other.files.removePersonal(other.ctx.userId(), f.id);
    expect(await s.files.publicContent(f.id, '1.1.1.1')).toBeTruthy();
    await s.files.removePersonal(s.ctx.userId(), f.id);
    await rejects(s.files.publicContent(f.id, '1.1.1.1'), NotFoundException);
    expect(s.storage.deleted).toContain(`users/${s.ctx.userId()}/${f.id}`);
    await s.files.removePersonal(s.ctx.userId(), 'not-a-uuid');
  });
});

describe('helpers', () => {
  it('sanitizes names and builds safe dispositions', () => {
    expect(sanitizeName('../../etc/passwd', 'pdf')).toBe('.. .. etc passwd.pdf');
    expect(sanitizeName('photo.JPEG', 'jpg')).toBe('photo.JPEG');
    expect(sanitizeName('', 'png')).toBe('file.png');
    expect(sanitizeName('a'.repeat(300), 'zip')).toHaveLength(255);
    expect(contentDisposition('attachment', 'گزارش "نهایی".pdf')).toBe(
      `attachment; filename="_____ _______.pdf"; filename*=UTF-8''${encodeURIComponent('گزارش "نهایی".pdf')}`,
    );
    expect(contentDisposition('inline', "it's.png")).toContain("filename*=UTF-8''it%27s.png");
  });

  it('builds the public base url from the web origin', () => {
    expect(publicFilesBaseUrl({ WEB_ORIGIN: 'https://noroset.com/' })).toBe('https://noroset.com/api/norofile/public/files');
    expect(publicFilesBaseUrl({ NOROFILE_PUBLIC_URL: 'https://cdn.noroset.com/f/' })).toBe('https://cdn.noroset.com/f');
  });
});
