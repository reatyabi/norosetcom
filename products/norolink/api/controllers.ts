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
  Put,
  Query,
} from '@nestjs/common';
import { MANAGE_ROLES, ProductModule, Public, Roles, SuperAdmin, TenantScoped } from './access';
import {
  AddElementDto,
  ClaimPageDto,
  CreatePageDto,
  MoveElementDto,
  StatsQueryDto,
  UpdateElementDto,
  UpdatePageDto,
} from './pages/dto';
import { CLAIM_LINKS_FILENAME, ClaimLinksService } from './claims/claim-links.service';
import { ListModerationPagesQuery, ListReportsQuery, ResolveReportDto, SetModerationDto } from './moderation/dto';
import { ModerationService } from './moderation/moderation.service';
import { ElementsService } from './pages/elements.service';
import { PagesService, slugAvailability } from './pages/pages.service';
import { PublicEventDto, PublicReportDto } from './public/dto';
import { PublicLinksService } from './public/public-links.service';
import { StatsService } from './stats/stats.service';
import { CreateClaimLinkDto, CreateTemplateDto, PublishTemplateDto, UpdateTemplateDto } from './templates/dto';
import { TemplatesService } from './templates/templates.service';
import { UploadsService } from './uploads/uploads.service';

/** پنل: همه tenant-scoped (هدر X-Tenant-Id)؛ گارد در بک‌اند، نه فقط UI. */
@Controller('norolink/pages')
@ProductModule()
@TenantScoped()
export class PagesController {
  constructor(
    private readonly pages: PagesService,
    private readonly elements: ElementsService,
    private readonly uploads: UploadsService,
    private readonly stats: StatsService,
  ) {}

  @Get()
  list() {
    return this.pages.list();
  }

  @Post()
  create(@Body() dto: CreatePageDto) {
    return this.pages.create(dto);
  }

  @Get('check-slug')
  checkSlug(@Query('slug') slug: string) {
    return this.pages.checkSlug(slug);
  }

  @Get('by-slug/:slug')
  getBySlug(@Param('slug') slug: string) {
    return this.pages.getBySlug(slug.toLowerCase());
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.pages.get(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePageDto) {
    return this.pages.update(id, dto);
  }

  @Post(':id/publish')
  @HttpCode(200)
  @Roles(...MANAGE_ROLES)
  publish(@Param('id', ParseUUIDPipe) id: string) {
    return this.pages.publish(id);
  }

  @Post(':id/unpublish')
  @HttpCode(200)
  @Roles(...MANAGE_ROLES)
  unpublish(@Param('id', ParseUUIDPipe) id: string) {
    return this.pages.unpublish(id);
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(...MANAGE_ROLES)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.pages.remove(id);
  }

  @Post(':id/elements')
  addElement(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AddElementDto) {
    return this.elements.add(id, dto);
  }

  @Patch(':id/elements/:elementId')
  updateElement(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('elementId', ParseUUIDPipe) elementId: string,
    @Body() dto: UpdateElementDto,
  ) {
    return this.elements.update(id, elementId, dto);
  }

  @Post(':id/elements/:elementId/move')
  @HttpCode(200)
  moveElement(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('elementId', ParseUUIDPipe) elementId: string,
    @Body() dto: MoveElementDto,
  ) {
    return this.elements.move(id, elementId, dto);
  }

  @Delete(':id/elements/:elementId')
  @HttpCode(204)
  async removeElement(@Param('id', ParseUUIDPipe) id: string, @Param('elementId', ParseUUIDPipe) elementId: string) {
    await this.elements.remove(id, elementId);
  }

  /** بدنه‌ی خام تصویر (Content-Type: image/*)؛ parser آن در apps/api ثبت شده است. */
  @Post(':id/uploads')
  upload(@Param('id', ParseUUIDPipe) id: string, @Body() body: Buffer) {
    return this.uploads.uploadImage(id, body);
  }

  @Post('claim/:token')
  @HttpCode(200)
  claim(@Param('token') token: string, @Body() dto: ClaimPageDto) {
    return this.pages.claim(token, dto.slug);
  }

  @Get(':id/stats')
  getStats(@Param('id', ParseUUIDPipe) id: string, @Query() query: StatsQueryDto) {
    return this.stats.get(id, query);
  }
}

/** گالری قالب‌های آماده برای هر کاربر واردشده (بدون tenant). */
@Controller('norolink/templates')
@ProductModule()
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Get()
  gallery() {
    return this.templates.gallery();
  }
}

/** مدیریت قالب‌های آماده (فقط superadmin). مسیرهای پیش‌نویس هم‌شکل /norolink/pages تا همان ادیتور روی آن‌ها کار کند. */
@Controller('norolink/admin/templates')
@ProductModule()
@SuperAdmin()
export class AdminTemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Get()
  list() {
    return this.templates.list();
  }

  @Post()
  create(@Body() dto: CreateTemplateDto) {
    return this.templates.create(dto);
  }

  /** برداشتن قالب کدی از گالری (داده در کد می‌ماند). */
  @Delete('builtin/:key')
  @HttpCode(204)
  async removeBuiltin(@Param('key') key: string) {
    await this.templates.removeBuiltin(key);
  }

  @Post('builtin/:key/restore')
  @HttpCode(204)
  async restoreBuiltin(@Param('key') key: string) {
    await this.templates.restoreBuiltin(key);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.templates.get(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTemplateDto) {
    return this.templates.update(id, dto);
  }

  @Post(':id/publish')
  @HttpCode(200)
  publish(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PublishTemplateDto) {
    return this.templates.publish(id, dto.thumb);
  }

  @Post(':id/unpublish')
  @HttpCode(200)
  unpublish(@Param('id', ParseUUIDPipe) id: string) {
    return this.templates.unpublish(id);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.templates.remove(id);
  }

  @Post(':id/elements')
  addElement(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AddElementDto) {
    return this.templates.addElement(id, dto);
  }

  @Patch(':id/elements/:elementId')
  updateElement(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('elementId', ParseUUIDPipe) elementId: string,
    @Body() dto: UpdateElementDto,
  ) {
    return this.templates.updateElement(id, elementId, dto);
  }

  @Post(':id/elements/:elementId/move')
  @HttpCode(200)
  moveElement(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('elementId', ParseUUIDPipe) elementId: string,
    @Body() dto: MoveElementDto,
  ) {
    return this.templates.moveElement(id, elementId, dto);
  }

  @Delete(':id/elements/:elementId')
  @HttpCode(204)
  async removeElement(@Param('id', ParseUUIDPipe) id: string, @Param('elementId', ParseUUIDPipe) elementId: string) {
    await this.templates.removeElement(id, elementId);
  }

  /** لینک واگذاری به مشتری (§9.8). */
  @Post(':id/claim-token')
  createClaimToken(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateClaimLinkDto) {
    return this.templates.createClaimToken(id, dto);
  }

  @Delete(':id/claim-token')
  @HttpCode(204)
  async revokeClaimToken(@Param('id', ParseUUIDPipe) id: string) {
    await this.templates.revokeClaimToken(id);
  }

  /** بدنه‌ی خام تصویر؛ فایل در فضای پلتفرم norofile ذخیره می‌شود. */
  @Post(':id/uploads')
  upload(@Param('id', ParseUUIDPipe) id: string, @Body() body: Buffer) {
    return this.templates.uploadImage(id, body);
  }
}

/** لینک‌های واگذاری فعال قالب‌ها برای ارسال به کسب‌وکارها (فقط superadmin). */
@Controller('norolink/admin/claim-links')
@ProductModule()
@SuperAdmin()
export class AdminClaimLinksController {
  constructor(private readonly claimLinks: ClaimLinksService) {}

  @Get()
  summary() {
    return this.claimLinks.summary();
  }

  /** نشانی پیشنهادی هنگام ساخت لینک (رزرو لینک‌های فعال دیگر هم گرفته‌شده حساب می‌شود). */
  @Get('check-slug')
  checkSlug(@Query('slug') slug: string) {
    return slugAvailability(slug);
  }

  @Get('export.txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @Header('Content-Disposition', `attachment; filename="${CLAIM_LINKS_FILENAME}"`)
  @Header('Cache-Control', 'no-store')
  export() {
    return this.claimLinks.exportText();
  }
}

/**
 * کنترل صفحه‌های منتشرشده و گزارش‌های تخلف (docs/architecture.md §9.13؛ فقط superadmin). عمداً بدون `@ProductModule()`:
 * ابزار اضطراری است و باید در حالت «در حال تعمیر» نورولینک هم کار کند.
 */
@Controller('norolink/admin')
@SuperAdmin()
export class AdminModerationController {
  constructor(private readonly moderation: ModerationService) {}

  @Get('pages')
  list(@Query() query: ListModerationPagesQuery) {
    return this.moderation.list(query);
  }

  @Get('pages/:id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.moderation.get(id);
  }

  @Put('pages/:id/moderation')
  setModeration(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetModerationDto) {
    return this.moderation.setModeration(id, dto);
  }

  @Get('reports')
  reports(@Query() query: ListReportsQuery) {
    return this.moderation.reports(query);
  }

  @Post('reports/:id/resolve')
  @HttpCode(200)
  resolveReport(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ResolveReportDto) {
    return this.moderation.resolveReport(id, dto);
  }
}

/**
 * sitemap صفحه‌های لینک برای n8l.ir/sitemap.xml (docs/architecture.md §9.1). مسیر جدا از `public/pages/:slug` است
 * تا slug صفحه‌ای به نام «sitemap» با آن تداخل نکند.
 */
@Controller('norolink/public/sitemap')
@ProductModule()
@Public()
export class PublicSitemapController {
  constructor(private readonly publicLinks: PublicLinksService) {}

  @Get()
  sitemap(@Ip() ip?: string) {
    return this.publicLinks.sitemap(ip);
  }
}

/** صفحه‌ی عمومی (بدون نشست و بدون tenant در هدر؛ tenant از slug پیدا می‌شود). */
@Controller('norolink/public/pages')
@ProductModule()
@Public()
export class PublicLinksController {
  constructor(private readonly publicLinks: PublicLinksService) {}

  @Get()
  directory(@Query('q') query?: string, @Query('category') category?: string, @Ip() ip?: string) {
    return this.publicLinks.directory({ query, category }, ip);
  }

  @Get('claim/:token')
  readClaim(
    @Param('token') token: string,
    @Ip() ip: string | undefined,
    @Headers('user-agent') userAgent?: string,
    @Query('preview') preview?: string,
  ) {
    return this.publicLinks.readClaim(token, ip, preview === '1' ? undefined : userAgent);
  }

  /** نشانی دلخواه مشتری پیش از تحویل؛ نشانی رزروشده‌ی همین لینک آزاد حساب می‌شود. */
  @Get('claim/:token/check-slug')
  checkClaimSlug(@Param('token') token: string, @Query('slug') slug: string, @Ip() ip: string | undefined) {
    return this.publicLinks.checkClaimSlug(token, slug, ip);
  }

  @Get(':slug')
  read(@Param('slug') slug: string, @Ip() ip: string | undefined) {
    return this.publicLinks.read(slug, ip);
  }

  @Post(':slug/events')
  @HttpCode(204)
  async event(
    @Param('slug') slug: string,
    @Body() dto: PublicEventDto,
    @Ip() ip: string | undefined,
    @Headers('user-agent') userAgent: string | undefined,
  ) {
    await this.publicLinks.event(slug, dto, ip, userAgent);
  }

  /** گزارش تخلف (§9.13). */
  @Post(':slug/reports')
  @HttpCode(201)
  report(@Param('slug') slug: string, @Body() dto: PublicReportDto, @Ip() ip: string | undefined) {
    return this.publicLinks.report(slug, dto, ip);
  }
}
