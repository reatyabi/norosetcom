// @noroset/admin — سمت API مدیریت پلتفرم. فقط از همین index مصرف شود (فقط apps/api).
export { AdminModule } from './admin.module';
export { PlatformRoles, SuperAdmin } from './access';
export { AdminUsersService, type AdminUserDetail, type AdminUserItem, type AdminUserMembership } from './users/users.service';
export { AdminTenantsService, type AdminTenantDetail, type AdminTenantItem, type AdminTenantMember } from './tenants/tenants.service';
export { AdminAuditService, type AuditItem } from './audit/audit.service';
export {
  AdminSupportService,
  SUPPORT_MAX_MINUTES,
  SUPPORT_MIN_MINUTES,
  type AdminSupportGrant,
} from './support/support.service';
export { AdminModulesService, type AdminModuleState } from './modules/modules.service';
export { AdminBillingService } from './billing/admin-billing.service';
export { BillingPlanResolver } from './billing/plan-resolver';
export { activatePayment, cancelQueuedSubscription, findPlanPrice, quote, resolvePlan, startTrial, tenantState, MONTH_MS, GRACE_MS, TRIAL_MS } from './billing/billing.core';
export { BillingService } from './billing/billing.service';
export { FakeGateway, ZarinpalGateway, gatewayFromEnv } from './billing/gateways';
export { AdminCampaignsService } from './campaigns/campaigns.service';
export { AnnouncementsService } from './campaigns/announcements.service';
export { couponDiscount, findCoupon } from './billing/billing.core';
