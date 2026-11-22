import { Global, Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { IP_HASHER, PLATFORM_ADMIN_CONTEXT, SMS_PROVIDER, smsProviderFromEnv, TENANT_CONTEXT } from '@noroset/core';
import { getJwtSecret } from '../config/secrets';
import { ModuleGuard } from '../platform/module-state.service';
import { IpHashService } from '../context/ip-hash.service';
import { PlatformAdminContextService } from '../context/platform-admin-context.service';
import { TenantContextService } from '../context/tenant-context.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { TenantGuard } from './guards/tenant.guard';
import { SessionService } from './session.service';
import { SupportAuditInterceptor } from './support-audit.interceptor';
import { SupportSessionService } from './support-session.service';

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: getJwtSecret(),
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionService,
    SupportSessionService,
    TenantContextService,
    { provide: TENANT_CONTEXT, useExisting: TenantContextService },
    PlatformAdminContextService,
    { provide: PLATFORM_ADMIN_CONTEXT, useExisting: PlatformAdminContextService },
    IpHashService,
    { provide: IP_HASHER, useExisting: IpHashService },
    { provide: SMS_PROVIDER, useFactory: () => smsProviderFromEnv() },
    AuthGuard,
    TenantGuard,
    RolesGuard,
    // گاردهای سراسری به همین ترتیب: ماژول (خاموش/تعمیر؛ §9.11) ← احراز هویت ← tenant (فقط routeهای scoped) ← نقش.
    { provide: APP_GUARD, useExisting: ModuleGuard },
    { provide: APP_GUARD, useExisting: AuthGuard },
    { provide: APP_GUARD, useExisting: TenantGuard },
    { provide: APP_GUARD, useExisting: RolesGuard },
    // درخواست‌های تغییردهنده‌ی نشست پشتیبانی پیش از اجرا در لاگ ممیزی (§9.11).
    { provide: APP_INTERCEPTOR, useClass: SupportAuditInterceptor },
  ],
  exports: [
    JwtModule,
    AuthService,
    SessionService,
    SupportSessionService,
    TenantContextService,
    TENANT_CONTEXT,
    PLATFORM_ADMIN_CONTEXT,
    IP_HASHER,
    SMS_PROVIDER,
    AuthGuard,
    TenantGuard,
    RolesGuard,
  ],
})
export class AuthModule {}
