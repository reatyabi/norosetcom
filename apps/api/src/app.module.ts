import { Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { AdminModule } from '@noroset/admin';
import { BlogModule } from '@noroset/blog';
import { NorofileModule } from '@noroset/norofile';
import { NoroformModule } from '@noroset/noroform';
import { NorolinkModule } from '@noroset/norolink';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { PlatformModule } from './platform/platform.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ClsModule.forRoot({ global: true, middleware: { mount: true } }),
    RateLimitModule,
    PlatformModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    // محصولات (NorofileModule سراسری است و Port FILE_SERVICE را به بقیه می‌دهد)
    NorofileModule,
    NoroformModule,
    NorolinkModule,
    // بلاگ noroset.com/blog (نوشتن فقط superadmin؛ docs/architecture.md §9.12)
    BlogModule,
    // مدیریت پلتفرم (فقط superadmin؛ docs/architecture.md §9.11)
    AdminModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

