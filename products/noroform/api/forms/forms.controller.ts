import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { MANAGE_ROLES, ProductModule, Roles, TenantScoped } from '../access';
import { CreateFormDto, UpdateFormDto } from './dto';
import { FormsService } from './forms.service';

/** همه‌ی routeها tenant-scoped (هدر X-Tenant-Id)؛ گارد در بک‌اند، نه فقط UI. */
@Controller('noroform/forms')
@ProductModule()
@TenantScoped()
export class FormsController {
  constructor(private readonly forms: FormsService) {}

  @Get()
  list() {
    return this.forms.list();
  }

  @Post()
  create(@Body() dto: CreateFormDto) {
    return this.forms.create(dto);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.forms.get(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFormDto) {
    return this.forms.update(id, dto);
  }

  @Post(':id/publish')
  @HttpCode(200)
  @Roles(...MANAGE_ROLES)
  publish(@Param('id', ParseUUIDPipe) id: string) {
    return this.forms.publish(id);
  }

  @Post(':id/close')
  @HttpCode(200)
  @Roles(...MANAGE_ROLES)
  close(@Param('id', ParseUUIDPipe) id: string) {
    return this.forms.close(id);
  }

  @Post(':id/reopen')
  @HttpCode(200)
  @Roles(...MANAGE_ROLES)
  reopen(@Param('id', ParseUUIDPipe) id: string) {
    return this.forms.reopen(id);
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(...MANAGE_ROLES)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.forms.remove(id);
  }
}
