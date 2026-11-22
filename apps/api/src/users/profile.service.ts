import { Inject, Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { db, eq, FILE_SERVICE, platformUsers, type FileService } from '@noroset/core';

/** سقف آواتار (کوچک‌تر از سقف فضای شخصی norofile)؛ UI پیش از آپلود به ۵۱۲px webp کوچک می‌کند. */
export const AVATAR_MAX_BYTES = 1024 * 1024;
const FULL_NAME_MAX = 200;

/**
 * پروفایل کاربر (docs/architecture.md §7): نام و آواتار. آواتار در فضای شخصی norofile (Port
 * FILE_SERVICE) ذخیره می‌شود و همیشه public است؛ platform_users فقط شناسه را نگه می‌دارد (بدون FK).
 */
@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(@Inject(FILE_SERVICE) private readonly files: FileService) {}

  avatarUrl(fileId: string | null): string | null {
    return fileId ? `${this.files.publicBaseUrl()}/${fileId}` : null;
  }

  async updateName(userId: string, raw: string): Promise<{ fullName: string }> {
    const fullName = raw.normalize('NFC').replace(/\s+/g, ' ').trim();
    if (fullName.length < 1 || fullName.length > FULL_NAME_MAX) throw new UnprocessableEntityException('invalid_full_name');
    await this.update(userId, { fullName });
    return { fullName };
  }

  /** فایل جدید ← اشاره‌ی کاربر ← حذف فایل قبلی (شناسه‌ی جدید چون آدرس عمومی immutable کش می‌شود). */
  async setAvatar(userId: string, body: unknown, name: string | undefined): Promise<{ avatarUrl: string }> {
    if (!(body instanceof Uint8Array)) throw new UnprocessableEntityException('invalid_file');
    const previous = await this.currentAvatar(userId);
    const file = await this.files.uploadPersonal(userId, { body, name, source: 'account', maxBytes: AVATAR_MAX_BYTES });
    try {
      await this.update(userId, { avatarFileId: file.id });
    } catch (err) {
      await this.files.removePersonal(userId, file.id).catch(() => undefined);
      throw err;
    }
    if (previous) await this.removeQuietly(userId, previous);
    return { avatarUrl: this.avatarUrl(file.id)! };
  }

  async removeAvatar(userId: string): Promise<void> {
    const previous = await this.currentAvatar(userId);
    await this.update(userId, { avatarFileId: null });
    if (previous) await this.removeQuietly(userId, previous);
  }

  private async currentAvatar(userId: string): Promise<string | null> {
    const [row] = await db
      .select({ avatarFileId: platformUsers.avatarFileId })
      .from(platformUsers)
      .where(eq(platformUsers.id, userId))
      .limit(1);
    if (!row) throw new NotFoundException();
    return row.avatarFileId;
  }

  private async update(userId: string, set: { fullName?: string; avatarFileId?: string | null }): Promise<void> {
    const rows = await db
      .update(platformUsers)
      .set({ ...set, updatedAt: new Date() })
      .where(eq(platformUsers.id, userId))
      .returning({ id: platformUsers.id });
    if (!rows.length) throw new NotFoundException();
  }

  private async removeQuietly(userId: string, fileId: string): Promise<void> {
    await this.files.removePersonal(userId, fileId).catch((err: Error) => this.logger.warn(`old avatar ${fileId}: ${err.message}`));
  }
}
