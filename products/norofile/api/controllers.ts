import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Headers,
  HttpCode,
  Ip,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { MANAGE_ROLES, ProductModule, Public, Roles, TenantScoped } from './access';
import { contentDisposition } from './files/file-types';
import { ContentQuery, ListFilesQuery, UpdateFileDto, UploadQuery } from './files/dto';
import { FilesService, type FileContent } from './files/files.service';

// محتوای فایل کاربر هرگز به‌عنوان سند اجرا نمی‌شود: CSP بسته + sandbox؛ غیرتصویر همیشه attachment.
const FILE_CSP = "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox";

function decodeName(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    return decodeURIComponent(raw);
  } catch {
    return undefined;
  }
}

function toStream(file: FileContent, forceDownload: boolean): StreamableFile {
  const inline = file.kind === 'image' && !forceDownload;
  const options = {
    type: file.mimeType,
    length: file.object.contentLength ?? file.sizeBytes,
    disposition: contentDisposition(inline ? 'inline' : 'attachment', file.name),
  };
  const body = file.object.body;
  return body instanceof Uint8Array ? new StreamableFile(body, options) : new StreamableFile(body, options);
}

/** پنل: همه tenant-scoped (هدر X-Tenant-Id)؛ گارد در بک‌اند، نه فقط UI. */
@Controller('norofile/files')
@ProductModule()
@TenantScoped()
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Get()
  list(@Query() query: ListFilesQuery) {
    return this.files.list(query);
  }

  @Get('usage')
  usage() {
    return this.files.usage();
  }

  /**
   * بدنه‌ی خام فایل (Content-Type: application/octet-stream یا نوع فایل؛ parser در apps/api)؛
   * نام فایل در هدر `X-File-Name` (URI-encoded). نوع واقعی از محتوا تشخیص داده می‌شود.
   */
  @Post()
  upload(@Body() body: unknown, @Headers('x-file-name') name: string | undefined, @Query() query: UploadQuery) {
    return this.files.upload({
      body: body as Uint8Array,
      name: decodeName(name),
      source: 'norofile',
      visibility: query.visibility ?? 'private',
    });
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.files.get(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFileDto) {
    return this.files.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(...MANAGE_ROLES)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.files.remove(id);
  }

  @Get(':id/content')
  @Header('Cache-Control', 'private, no-store')
  @Header('Content-Security-Policy', FILE_CSP)
  async content(@Param('id', ParseUUIDPipe) id: string, @Query() query: ContentQuery) {
    return toStream(await this.files.content(id), query.download === '1');
  }
}

/** فایل عمومی (بدون نشست و بدون tenant؛ فقط فایل‌های public). شناسه uuid تصادفی و تغییرناپذیر است. */
@Controller('norofile/public/files')
@ProductModule()
@Public()
export class PublicFilesController {
  constructor(private readonly files: FilesService) {}

  /** فایل پلتفرم (تصویر قالب‌های نورولینک). */
  @Get('platform/:id')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  @Header('Content-Security-Policy', FILE_CSP)
  @Header('Cross-Origin-Resource-Policy', 'cross-origin')
  async readPlatform(@Param('id', ParseUUIDPipe) id: string, @Ip() ip: string | undefined) {
    return toStream(await this.files.platformContent(id, ip), false);
  }

  @Get(':id')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  @Header('Content-Security-Policy', FILE_CSP)
  // صفحه‌های عمومی روی دامنه‌ی دیگر (n8l.ir) تصویر را بارگذاری می‌کنند.
  @Header('Cross-Origin-Resource-Policy', 'cross-origin')
  async read(@Param('id', ParseUUIDPipe) id: string, @Ip() ip: string | undefined, @Query() query: ContentQuery) {
    return toStream(await this.files.publicContent(id, ip), query.download === '1');
  }
}
