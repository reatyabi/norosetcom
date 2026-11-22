import { Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { FILE_SERVICE, TENANT_CONTEXT, type FileService, type TenantContext } from '@noroset/core';
import type { ImageRef } from '../../shared';
import { MAX_IMAGE_BYTES } from '../access';
import { touchPage } from '../pages/pages.service';

export interface UploadResult extends ImageRef {
  url: string;
}

/** تصویر نورولینک در norofile (تنها سرویس فایل) به‌صورت public ذخیره می‌شود؛ norolink فقط شناسه را نگه می‌دارد. */
@Injectable()
export class UploadsService {
  constructor(
    @Inject(TENANT_CONTEXT) private readonly ctx: TenantContext,
    @Inject(FILE_SERVICE) private readonly files: FileService,
  ) {}

  async uploadImage(pageId: string, body: unknown): Promise<UploadResult> {
    if (!(body instanceof Uint8Array)) throw new UnprocessableEntityException('invalid_file');
    // صفحه باید متعلق به همین tenant باشد (وگرنه ۴۰۴).
    await this.ctx.run((tx) => touchPage(tx, pageId));
    // سقف آپلود و بررسی نوع/متادیتا/سهمیه در norofile.
    const file = await this.files.upload({
      body,
      name: 'image',
      source: 'norolink',
      accept: 'image',
      maxBytes: MAX_IMAGE_BYTES,
      visibility: 'public',
    });
    return { file_id: file.id, width: file.width!, height: file.height!, url: file.url! };
  }
}
