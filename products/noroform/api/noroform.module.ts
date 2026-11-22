import { Inject, Module, type OnModuleInit } from '@nestjs/common';
import { count, noroformForms, PLAN_USAGE, withTenant, type PlanUsageRegistry } from '@noroset/core';
import { FormsController } from './forms/forms.controller';
import { FormsService } from './forms/forms.service';
import { InternalFormsController } from './internal/internal-forms.controller';
import { InternalFormsService } from './internal/internal-forms.service';
import { PublicFormsController } from './public/public-forms.controller';
import { PublicFormsService } from './public/public-forms.service';
import { PublicResponsesController } from './public/public-responses.controller';
import { PublicResponsesService } from './public/public-responses.service';
import { SubmissionsController } from './submissions/submissions.controller';
import { SubmissionsService, submissionsThisMonth } from './submissions/submissions.service';

/**
 * ماژول API نوروفرم. TENANT_CONTEXT، RATE_LIMITER، IP_HASHER و PLAN_USAGE را apps/api و PLAN_RESOLVER را admin
 * (ماژول‌های سراسری) فراهم می‌کنند.
 */
@Module({
  controllers: [FormsController, InternalFormsController, SubmissionsController, PublicFormsController, PublicResponsesController],
  providers: [FormsService, InternalFormsService, SubmissionsService, PublicFormsService, PublicResponsesService],
})
export class NoroformModule implements OnModuleInit {
  constructor(@Inject(PLAN_USAGE) private readonly usage: PlanUsageRegistry) {}

  /** مصرف سقف‌ها برای صفحه‌ی اشتراک (docs/architecture.md §9.11). */
  onModuleInit(): void {
    this.usage.register('noroform.forms', (tenantId) =>
      withTenant(tenantId, async (tx) => Number((await tx.select({ n: count() }).from(noroformForms))[0]?.n ?? 0)),
    );
    this.usage.register('noroform.submissions_monthly', (tenantId) => withTenant(tenantId, (tx) => submissionsThisMonth(tx)));
  }
}
