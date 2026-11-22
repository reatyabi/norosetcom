import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, Res } from '@nestjs/common';
import { MANAGE_ROLES, ProductModule, Roles, TenantScoped } from '../access';
import { CreateResponseLinkDto, ExportSubmissionsQuery, FilterValuesQuery, ListSubmissionsQuery, parseColumnIds, parseFilters } from './dto';
import { SubmissionsService } from './submissions.service';

/** حداقل چیزی که از reply لازم است (Fastify و Express هر دو `header` دارند). */
interface HeaderReply {
  header(name: string, value: string): unknown;
}

/** پاسخ‌های یک فرم؛ هر عضو فعال tenant (مثل خواندن فرم‌ها). */
@Controller('noroform/forms/:formId/submissions')
@ProductModule()
@TenantScoped()
export class SubmissionsController {
  constructor(private readonly submissions: SubmissionsService) {}

  @Get()
  list(@Param('formId', ParseUUIDPipe) formId: string, @Query() query: ListSubmissionsQuery) {
    return this.submissions.list(
      formId,
      { from: query.from, to: query.to },
      { limit: query.limit, offset: query.offset },
      {
        version: query.version,
        sort: query.sort,
        dir: query.dir,
        filterField: query.filterField,
        filterValue: query.filterValue,
        filters: parseFilters(query.filters),
      },
    );
  }

  // پیش از ':submissionId' تا با آن اشتباه نشود.
  @Get('export.csv')
  async export(
    @Param('formId', ParseUUIDPipe) formId: string,
    @Query() query: ExportSubmissionsQuery,
    @Res({ passthrough: true }) reply: HeaderReply,
  ) {
    const { filename, body } = await this.submissions.exportCsv(
      formId,
      { from: query.from, to: query.to },
      {
        version: query.version,
        sort: query.sort,
        dir: query.dir,
        filterField: query.filterField,
        filterValue: query.filterValue,
        filters: parseFilters(query.filters),
      },
      // ستون‌های شخصی‌سازی‌شده‌ی جدول: فقط همین‌ها و با همین ترتیب در فایل می‌آیند.
      parseColumnIds(query.columns),
    );
    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    reply.header('Cache-Control', 'no-store');
    return body;
  }

  // پیش از ':submissionId' تا با آن اشتباه نشود.
  @Get('export.xlsx')
  async exportXlsx(
    @Param('formId', ParseUUIDPipe) formId: string,
    @Query() query: ExportSubmissionsQuery,
    @Res({ passthrough: true }) reply: HeaderReply,
  ) {
    const { filename, body } = await this.submissions.exportXlsx(
      formId,
      { from: query.from, to: query.to },
      {
        version: query.version,
        sort: query.sort,
        dir: query.dir,
        filterField: query.filterField,
        filterValue: query.filterValue,
        filters: parseFilters(query.filters),
      },
      // همان ستون‌های جدول نمایشی (پنهان‌شده‌ها نمی‌آیند و ترتیب حفظ می‌شود).
      parseColumnIds(query.columns),
    );
    reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    reply.header('Cache-Control', 'no-store');
    return body;
  }

  // پیش از ':submissionId' تا با آن اشتباه نشود.
  @Get('filter-values')
  filterValues(@Param('formId', ParseUUIDPipe) formId: string, @Query() query: FilterValuesQuery) {
    return this.submissions.values(formId, { from: query.from, to: query.to }, query.fieldId, {
      version: query.version,
      filters: parseFilters(query.filters),
    });
  }

  @Post(':submissionId/response-link')
  @HttpCode(200)
  createResponseLink(
    @Param('formId', ParseUUIDPipe) formId: string,
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Body() dto: CreateResponseLinkDto,
  ) {
    return this.submissions.createResponseLink(formId, submissionId, dto);
  }

  @Delete(':submissionId/response-link')
  @HttpCode(204)
  @Roles(...MANAGE_ROLES)
  async revokeResponseLink(
    @Param('formId', ParseUUIDPipe) formId: string,
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
  ) {
    await this.submissions.revokeResponseLink(formId, submissionId);
  }

  @Get(':submissionId')
  get(
    @Param('formId', ParseUUIDPipe) formId: string,
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
  ) {
    return this.submissions.get(formId, submissionId);
  }
}
