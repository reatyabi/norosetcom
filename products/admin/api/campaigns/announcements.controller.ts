import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { TenantScoped } from '../access';
import { AnnouncementsService } from './announcements.service';

/** اعلان‌های درون پنل برای فضای کاری جاری (هدر X-Tenant-Id؛ docs/architecture.md §9.11). */
@Controller('announcements')
@TenantScoped()
export class AnnouncementsController {
  constructor(private readonly announcements: AnnouncementsService) {}

  @Get()
  list() {
    return this.announcements.list();
  }

  @Post(':id/dismiss')
  @HttpCode(204)
  async dismiss(@Param('id', ParseUUIDPipe) id: string) {
    await this.announcements.dismiss(id);
  }
}
