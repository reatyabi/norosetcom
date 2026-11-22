import { Global, Module } from '@nestjs/common';
import { MODULE_STATE, PLAN_USAGE } from '@noroset/core';
import { CachedModuleStateService, ModuleGuard } from './module-state.service';
import { ModulesController } from './modules.controller';
import { PlanUsageService } from './plan-usage.service';

/**
 * Portهای زیرساختی محصولات: وضعیت ماژول‌ها و ثبت مصرف سقف‌ها. (FILE_SERVICE را NorofileModule و
 * PLAN_RESOLVER را AdminModule فراهم می‌کنند.) ModuleGuard را AuthModule به‌عنوان اولین گارد سراسری ثبت می‌کند.
 */
@Global()
@Module({
  controllers: [ModulesController],
  providers: [
    CachedModuleStateService,
    { provide: MODULE_STATE, useExisting: CachedModuleStateService },
    ModuleGuard,
    PlanUsageService,
    { provide: PLAN_USAGE, useExisting: PlanUsageService },
  ],
  exports: [MODULE_STATE, ModuleGuard, PLAN_USAGE],
})
export class PlatformModule {}
