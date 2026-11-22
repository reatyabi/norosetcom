import { Global, Module } from '@nestjs/common';
import { PAYMENT_GATEWAY, PLAN_RESOLVER } from '@noroset/core';
import { AdminAuditService } from './audit/audit.service';
import { AdminBillingService } from './billing/admin-billing.service';
import { BillingController } from './billing/billing.controller';
import { BillingService } from './billing/billing.service';
import { gatewayFromEnv } from './billing/gateways';
import { BillingPlanResolver } from './billing/plan-resolver';
import { AnnouncementsController } from './campaigns/announcements.controller';
import { AnnouncementsService } from './campaigns/announcements.service';
import { AdminCampaignsService } from './campaigns/campaigns.service';
import {
  AdminAuditController,
  AdminBillingController,
  AdminCampaignsController,
  AdminModulesController,
  AdminOverviewController,
  AdminSupportController,
  AdminTenantsController,
  AdminUsersController,
} from './controllers';
import { AdminModulesService } from './modules/modules.service';
import { AdminSupportService } from './support/support.service';
import { AdminTenantsService } from './tenants/tenants.service';
import { AdminUsersService } from './users/users.service';

/**
 * ماژول API مدیریت پلتفرم (docs/architecture.md §9.11). PLATFORM_ADMIN_CONTEXT را apps/api و
 * FILE_SERVICE را NorofileModule (هر دو سراسری) فراهم می‌کنند؛ admin به محصولات دیگر وابسته نیست.
 * سراسری است تا PLAN_RESOLVER (Port در core) را به محصولات بدهد؛ آن‌ها فقط توکن core را می‌شناسند.
 */
@Global()
@Module({
  controllers: [
    AdminOverviewController,
    AdminUsersController,
    AdminTenantsController,
    AdminAuditController,
    AdminSupportController,
    AdminModulesController,
    AdminBillingController,
    BillingController,
    AdminCampaignsController,
    AnnouncementsController,
  ],
  providers: [
    AdminUsersService,
    AdminTenantsService,
    AdminAuditService,
    AdminSupportService,
    AdminModulesService,
    AdminBillingService,
    BillingPlanResolver,
    { provide: PLAN_RESOLVER, useExisting: BillingPlanResolver },
    BillingService,
    AdminCampaignsService,
    AnnouncementsService,
    // درگاه از env (زرین‌پال یا ساختگی؛ ساختگی در production رد می‌شود).
    { provide: PAYMENT_GATEWAY, useFactory: () => gatewayFromEnv() },
  ],
  exports: [PLAN_RESOLVER],
})
export class AdminModule {}
