import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { UnprocessableEntityException } from '@nestjs/common';
import { db, eq, platformUsers, type FileService, type PersonalUploadInput, type StoredFile } from '@noroset/core';
import { AVATAR_MAX_BYTES, ProfileService } from '../src/users/profile.service';

class FakeFiles implements Pick<FileService, 'uploadPersonal' | 'removePersonal' | 'publicBaseUrl'> {
  stored = new Set<string>();
  inputs: PersonalUploadInput[] = [];
  async uploadPersonal(_userId: string, input: PersonalUploadInput): Promise<StoredFile> {
    this.inputs.push(input);
    const id = randomUUID();
    this.stored.add(id);
    return { id, name: 'a.webp', kind: 'image', mimeType: 'image/webp', sizeBytes: 1, width: 1, height: 1, visibility: 'public', url: null, createdAt: new Date() };
  }
  async removePersonal(_userId: string, fileId: string) {
    this.stored.delete(fileId);
  }
  publicBaseUrl() {
    return 'https://noroset.test/api/norofile/public/files';
  }
}

async function setup() {
  const [u] = await db.insert(platformUsers).values({ email: `${randomUUID()}@test.local` }).returning();
  const files = new FakeFiles();
  return { userId: u!.id, files, profile: new ProfileService(files as unknown as FileService) };
}

const avatarOf = async (id: string) =>
  (await db.select({ a: platformUsers.avatarFileId }).from(platformUsers).where(eq(platformUsers.id, id)))[0]!.a;

describe('profile', () => {
  it('normalizes and validates the full name', async () => {
    const s = await setup();
    expect(await s.profile.updateName(s.userId, '  علی   رضایی ')).toEqual({ fullName: 'علی رضایی' });
    await expect(s.profile.updateName(s.userId, '   ')).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(s.profile.updateName(s.userId, 'x'.repeat(201))).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('replacing the avatar stores a new file and removes the previous one', async () => {
    const s = await setup();
    const first = await s.profile.setAvatar(s.userId, new Uint8Array([1]), 'me.png');
    const firstId = (await avatarOf(s.userId))!;
    expect(first.avatarUrl).toBe(`${s.files.publicBaseUrl()}/${firstId}`);
    expect(s.files.inputs[0]).toMatchObject({ source: 'account', maxBytes: AVATAR_MAX_BYTES, name: 'me.png' });

    await s.profile.setAvatar(s.userId, new Uint8Array([2]), undefined);
    const secondId = (await avatarOf(s.userId))!;
    expect(secondId).not.toBe(firstId);
    expect([...s.files.stored]).toEqual([secondId]);

    await s.profile.removeAvatar(s.userId);
    expect(await avatarOf(s.userId)).toBeNull();
    expect(s.files.stored.size).toBe(0);
  });

  it('rejects a non-binary body', async () => {
    const s = await setup();
    await expect(s.profile.setAvatar(s.userId, { a: 1 }, undefined)).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(s.profile.avatarUrl(null)).toBeNull();
  });
});
