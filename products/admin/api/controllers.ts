import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { SuperAdmin } from './access';
import { AdminAuditService, ListAuditQuery } from './audit/audit.service';
import {
  AdminBillingService,
  CancelSubscriptionDto,
  GrantSubscriptionDto,
  ListPaymentsQuery,
  OfflinePaymentDto,
  BillingSettingsDto,
  UpsertPlanDto,
} from './billing/admin-billing.service';
import { AdminCampaignsService, AnnouncementDto, CouponDto, UtmQuery } from './campaigns/campaigns.service';
import { AdminModulesService, SetModuleStatusDto } from './modules/modules.service';
import { AdminSupportService, CreateSupportGrantDto } from './support/support.service';
import { AdminTenantsService, ListTenantsQuery, SetTenantStatusDto } from './tenants/tenants.service';
import { CreateUserDto, ListUsersQuery, SetPasswordDto, SetRoleDto, SetStatusDto, UpdateUserDto } from './users/dto';
import { AdminUsersService } from './users/users.service';

// همه‌ی routeهای مدیریت پلتفرم فقط superadmin (گارد بک‌اند، نه فقط UI؛ docs/architecture.md §9.11).

@Controller('admin')
@SuperAdmin()
export class AdminOverviewController {
  constructor(private readonly users: AdminUsersService) {}

  @Get('overview')
  overview() {
    return this.users.overview();
  }
}

@Controller('admin/users')
@SuperAdmin()
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  list(@Query() query: ListUsersQuery) {
    return this.users.list(query);
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.get(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.users.updateName(id, dto.fullName);
  }

  @Post(':id/status')
  @HttpCode(200)
  setStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetStatusDto) {
    return this.users.setStatus(id, dto.status, dto.reason);
  }

  @Post(':id/role')
  @HttpCode(200)
  setRole(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetRoleDto) {
    return this.users.setRole(id, dto.platformRole);
  }

  @Post(':id/password')
  @HttpCode(200)
  setPassword(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetPasswordDto) {
    return this.users.setPassword(id, dto.newPassword);
  }

  @Post(':id/sessions/revoke')
  @HttpCode(200)
  revokeSessions(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.revokeAllSessions(id);
  }
}

@Controller('admin/tenants')
@SuperAdmin()
export class AdminTenantsController {
  constructor(private readonly tenants: AdminTenantsService) {}

  @Get()
  list(@Query() query: ListTenantsQuery) {
    return this.tenants.list(query);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenants.get(id);
  }

  @Post(':id/status')
  @HttpCode(200)
  setStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetTenantStatusDto) {
    return this.tenants.setStatus(id, dto.status, dto.reason);
  }
}

@Controller('admin/audit')
@SuperAdmin()
export class AdminAuditController {
  constructor(private readonly audit: AdminAuditService) {}

  @Get()
  list(@Query() query: ListAuditQuery) {
    return this.audit.list(query);
  }
}

/** دسترسی پشتیبانی به حساب کاربر (docs/architecture.md §9.11). مصرف لینک در apps/api است. */
@Controller('admin')
@SuperAdmin()
export class AdminSupportController {
  constructor(private readonly support: AdminSupportService) {}

  /** توکن فقط در همین پاسخ برمی‌گردد. */
  @Post('users/:id/support-grants')
  create(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateSupportGrantDto) {
    return this.support.create(id, dto);
  }

  @Get('users/:id/support-grants')
  list(@Param('id', ParseUUIDPipe) id: string) {
    return this.support.listForUser(id);
  }

  @Post('support-grants/:id/revoke')
  @HttpCode(200)
  revoke(@Param('id', ParseUUIDPipe) id: string) {
    return this.support.revoke(id);
  }
}

/** وضعیت سراسری ماژول‌ها (docs/architecture.md §9.11). */
@Controller('admin/modules')
@SuperAdmin()
export class AdminModulesController {
  constructor(private readonly modules: AdminModulesService) {}

  @Get()
  list() {
    return this.modules.list();
  }

  @Put(':key')
  set(@Param('key') key: string, @Body() dto: SetModuleStatusDto) {
    return this.modules.set(key, dto.status, dto.message);
  }
}

/** billing از سمت ادمین (docs/architecture.md §9.11، ۱۱.۶). */
@Controller('admin/billing')
@SuperAdmin()
export class AdminBillingController {
  constructor(private readonly billing: AdminBillingService) {}

  @Get()
  overview() {
    return this.billing.overview();
  }

  @Post('plans')
  createPlan(@Body() dto: UpsertPlanDto) {
    return this.billing.createPlan(dto);
  }

  @Patch('plans/:id')
  updatePlan(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpsertPlanDto) {
    return this.billing.updatePlan(id, dto);
  }

  @Put('settings')
  updateSettings(@Body() dto: BillingSettingsDto) {
    return this.billing.updateSettings(dto);
  }

  @Get('payments')
  payments(@Query() query: ListPaymentsQuery) {
    return this.billing.listPayments(query);
  }

  @Get('tenants/:id')
  tenant(@Param('id', ParseUUIDPipe) id: string) {
    return this.billing.tenantBilling(id);
  }

  @Post('tenants/:id/subscriptions')
  grant(@Param('id', ParseUUIDPipe) id: string, @Body() dto: GrantSubscriptionDto) {
    return this.billing.grant(id, dto);
  }

  @Post('tenants/:id/payments')
  offline(@Param('id', ParseUUIDPipe) id: string, @Body() dto: OfflinePaymentDto) {
    return this.billing.recordOfflinePayment(id, dto);
  }

  @Post('subscriptions/:id/cancel')
  @HttpCode(200)
  cancel(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CancelSubscriptionDto) {
    return this.billing.cancelSubscription(id, dto.reason);
  }
}

/** کمپین‌ها (docs/architecture.md §9.11، ۱۱.۷): کد تخفیف، اعلان درون پنل، گزارش UTM. */
@Controller('admin/campaigns')
@SuperAdmin()
export class AdminCampaignsController {
  constructor(private readonly campaigns: AdminCampaignsService) {}

  @Get('coupons')
  coupons() {
    return this.campaigns.coupons();
  }

  @Post('coupons')
  createCoupon(@Body() dto: CouponDto) {
    return this.campaigns.createCoupon(dto);
  }

  @Patch('coupons/:id')
  updateCoupon(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CouponDto) {
    return this.campaigns.updateCoupon(id, dto);
  }

  @Get('announcements')
  announcements() {
    return this.campaigns.announcements();
  }

  @Post('announcements')
  createAnnouncement(@Body() dto: AnnouncementDto) {
    return this.campaigns.createAnnouncement(dto);
  }

  @Patch('announcements/:id')
  updateAnnouncement(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AnnouncementDto) {
    return this.campaigns.updateAnnouncement(id, dto);
  }

  @Get('utm')
  utm(@Query() query: UtmQuery) {
    return this.campaigns.utmReport(query);
  }
}
