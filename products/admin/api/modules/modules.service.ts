import { BadRequestException, Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  eq,
  MODULE_STATE,
  PLATFORM_ADMIN_CONTEXT,
  PLATFORM_MODULE_KEYS,
  platformModules,
  platformUsers,
  sql,
  type ModuleStateService,
  type ModuleStatus,
  type PlatformAdminContext,
  type PlatformModuleKey,
} from '@noroset/core';
import { recordAudit } from '../audit/audit';
import { normalizeName } from '../users/users.service';

const STATUSES: ModuleStatus[] = ['active', 'maintenance', 'off'];
const MESSAGE_MAX = 500;

export class SetModuleStatusDto {
  @IsIn(STATUSES)
  status!: ModuleStatus;

  /** پیام به کاربران در حالت maintenance/off؛ خالی ← پیام پیش‌فرض UI. */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}

export interface AdminModuleState {
  key: PlatformModuleKey;
  status: ModuleStatus;
  message: string | null;
  updatedAt: Date | null;
  updatedBy: { id: string; fullName: string } | null;
}

/**
 * مدیریت ماژول‌ها (docs/architecture.md §9.11): وضعیت سراسری هر محصول. گارد apps/api آن را از Port
 * MODULE_STATE می‌خواند؛ بعد از تغییر کش همین نمونه پاک می‌شود (بقیه حداکثر ۱۰ ثانیه بعد).
 */
@Injectable()
export class AdminModulesService {
  constructor(
    @Inject(PLATFORM_ADMIN_CONTEXT) private readonly ctx: PlatformAdminContext,
    @Inject(MODULE_STATE) private readonly modules: ModuleStateService,
  ) {}

  list(): Promise<AdminModuleState[]> {
    return this.ctx.run(async (tx) => {
      const rows = await tx
        .select({
          key: platformModules.key,
          status: platformModules.status,
          message: platformModules.message,
          updatedAt: platformModules.updatedAt,
          adminId: platformUsers.id,
          adminName: platformUsers.fullName,
        })
        .from(platformModules)
        .leftJoin(platformUsers, eq(platformUsers.id, platformModules.updatedBy));
      return PLATFORM_MODULE_KEYS.map((key): AdminModuleState => {
        const row = rows.find((r) => r.key === key);
        return {
          key,
          status: row?.status ?? 'active',
          message: row?.message ?? null,
          updatedAt: row?.updatedAt ?? null,
          updatedBy: row?.adminId ? { id: row.adminId, fullName: row.adminName ?? '' } : null,
        };
      });
    });
  }

  async set(rawKey: string, status: ModuleStatus, rawMessage: string | undefined): Promise<AdminModuleState[]> {
    if (!(PLATFORM_MODULE_KEYS as readonly string[]).includes(rawKey)) throw new BadRequestException('unknown_module');
    const key = rawKey as PlatformModuleKey;
    const message = status === 'active' ? null : normalizeName(rawMessage ?? '') || null;
    if (message && message.length > MESSAGE_MAX) throw new UnprocessableEntityException('invalid_message');
    const adminId = this.ctx.adminId();

    await this.ctx.run(async (tx) => {
      const [before] = await tx.select().from(platformModules).where(eq(platformModules.key, key)).limit(1).for('update');
      await tx
        .insert(platformModules)
        .values({ key, status, message, updatedBy: adminId })
        .onConflictDoUpdate({ target: platformModules.key, set: { status, message, updatedBy: adminId, updatedAt: sql`now()` } });
      await recordAudit(tx, this.ctx, {
        action: 'module.status',
        targetType: 'module',
        targetId: null,
        details: { module: key, from: before?.status ?? 'active', to: status, ...(message ? { message } : {}) },
      });
    });
    this.modules.invalidate();
    return this.list();
  }
}
