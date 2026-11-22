import { Global, Inject, Module, type OnModuleInit } from '@nestjs/common';
import { FILE_SERVICE, norofileFiles, PLAN_USAGE, sql, withTenant, type PlanUsageRegistry } from '@noroset/core';
import { MIB } from './limits';
import { FilesController, PublicFilesController } from './controllers';
import { FilesService } from './files/files.service';
import { OBJECT_STORAGE, S3ObjectStorage } from './storage/object-storage';

/**
 * ماژول API نوروفایل. FILE_SERVICE (Port در @noroset/core) را برای محصولات دیگر فراهم می‌کند؛ آن‌ها
 * فقط توکن core را inject می‌کنند و به این پکیج وابسته نیستند. TENANT_CONTEXT و RATE_LIMITER را
 * apps/api (ماژول‌های سراسری) فراهم می‌کند.
 */
@Global()
@Module({
  controllers: [FilesController, PublicFilesController],
  providers: [
    S3ObjectStorage,
    { provide: OBJECT_STORAGE, useExisting: S3ObjectStorage },
    FilesService,
    { provide: FILE_SERVICE, useExisting: FilesService },
  ],
  exports: [FILE_SERVICE],
})
export class NorofileModule implements OnModuleInit {
  constructor(@Inject(PLAN_USAGE) private readonly usage: PlanUsageRegistry) {}

  /** مصرف فضا (مگابایت، یک رقم اعشار) برای صفحه‌ی اشتراک (docs/architecture.md §9.11). */
  onModuleInit(): void {
    this.usage.register('norofile.storage_mb', (tenantId) =>
      withTenant(tenantId, async (tx) => {
        const [row] = await tx.select({ used: sql<number>`coalesce(sum(${norofileFiles.sizeBytes}), 0)::bigint` }).from(norofileFiles);
        return Math.round((Number(row?.used ?? 0) / MIB) * 10) / 10;
      }),
    );
  }
}
