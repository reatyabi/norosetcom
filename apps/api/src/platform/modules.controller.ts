import { Controller, Get, Inject } from '@nestjs/common';
import { MODULE_STATE, type ModuleStateService } from '@noroset/core';
import { Public } from '../auth/decorators/public.decorator';

/** وضعیت سراسری ماژول‌ها برای منوی پنل و صفحه‌های عمومی (docs/architecture.md §9.11). */
@Controller('modules')
export class ModulesController {
  constructor(@Inject(MODULE_STATE) private readonly modules: ModuleStateService) {}

  @Public()
  @Get()
  list() {
    return this.modules.all();
  }
}
