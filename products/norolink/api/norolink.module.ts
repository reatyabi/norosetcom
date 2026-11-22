import { Inject, Module, type OnModuleInit } from '@nestjs/common';
import { count, norolinkPages, PLAN_USAGE, withTenant, type PlanUsageRegistry } from '@noroset/core';
import { MAP_FETCHER } from './access';
import { ClaimLinksService } from './claims/claim-links.service';
import { AdminClaimLinksController, AdminModerationController, AdminTemplatesController, PagesController, PublicLinksController, PublicSitemapController, TemplatesController } from './controllers';
import { ModerationService } from './moderation/moderation.service';
import { ElementsService } from './pages/elements.service';
import { PagesService } from './pages/pages.service';
import { PublicLinksService } from './public/public-links.service';
import { StatsService } from './stats/stats.service';
import { TemplatesService } from './templates/templates.service';
import { UploadsService } from './uploads/uploads.service';

/**
 * ماژول API نورولینک. TENANT_CONTEXT، RATE_LIMITER، IP_HASHER و PLAN_USAGE را apps/api، PLAN_RESOLVER را admin و
 * FILE_SERVICE را norofile (ماژول‌های سراسری) فراهم می‌کنند؛ norolink فقط Port core را می‌شناسد.
 */
@Module({
  controllers: [PagesController, TemplatesController, AdminTemplatesController, AdminClaimLinksController, AdminModerationController, PublicLinksController, PublicSitemapController],
  providers: [
    PagesService,
    ClaimLinksService,
    ElementsService,
    UploadsService,
    StatsService,
    TemplatesService,
    ModerationService,
    PublicLinksService,
    { provide: MAP_FETCHER, useValue: fetch },
  ],
})
export class NorolinkModule implements OnModuleInit {
  constructor(@Inject(PLAN_USAGE) private readonly usage: PlanUsageRegistry) {}

  /** مصرف سقف‌ها برای صفحه‌ی اشتراک (docs/architecture.md §9.11). */
  onModuleInit(): void {
    this.usage.register('norolink.pages', (tenantId) =>
      withTenant(tenantId, async (tx) => Number((await tx.select({ n: count() }).from(norolinkPages))[0]?.n ?? 0)),
    );
  }
}
