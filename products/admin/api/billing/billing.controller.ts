import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, Redirect } from '@nestjs/common';
import { BILLING_ROLES, Public, Roles, TenantScoped } from '../access';
import { BillingService, QuoteDto } from './billing.service';

/** اشتراک فضای کاری از سمت کاربر (docs/architecture.md §9.11)؛ هدر X-Tenant-Id. */
@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get()
  @TenantScoped()
  overview() {
    return this.billing.overview();
  }

  /** پلن‌های فعال با قیمت برای صفحه‌های عمومی (مثلاً «بعد از ۱۴ روز رایگان از … تومان» در صفحه‌ی تحویل نورولینک). */
  @Get('plans')
  @Public()
  publicPlans() {
    return this.billing.publicPlans();
  }

  @Get('status')
  @TenantScoped()
  status() {
    return this.billing.status();
  }

  @Post('quote')
  @HttpCode(200)
  @Roles(...BILLING_ROLES)
  quote(@Body() dto: QuoteDto) {
    return this.billing.quote(dto);
  }

  @Post('checkout')
  @HttpCode(200)
  @Roles(...BILLING_ROLES)
  checkout(@Body() dto: QuoteDto) {
    return this.billing.checkout(dto);
  }

  @Get('payments')
  @Roles(...BILLING_ROLES)
  payments() {
    return this.billing.payments();
  }

  @Get('payments/:id')
  @Roles(...BILLING_ROLES)
  receipt(@Param('id', ParseUUIDPipe) id: string) {
    return this.billing.receipt(id);
  }

  /** لغو رزرو اشتراک آتی (فقط owner یا admin). */
  @Delete('queued/:id')
  @HttpCode(200)
  @Roles(...BILLING_ROLES)
  cancelQueued(@Param('id', ParseUUIDPipe) id: string) {
    return this.billing.cancelQueued(id);
  }

  /** بازگشت مرورگر از درگاه (زرین‌پال: `?Authority=…&Status=OK|NOK`) ← صفحه‌ی نتیجه در پنل. */
  @Get('callback')
  @Public()
  @Redirect()
  async callback(@Query('Authority') authority?: string, @Query('Status') status?: string) {
    return { url: await this.billing.callback(authority, status), statusCode: 302 };
  }
}
