import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  MODULE_KEY,
  MODULE_STATE,
  PLATFORM_MODULE_KEYS,
  PUBLIC_ROUTE_KEY,
  readModuleStates,
  type ModuleState,
  type ModuleStateService,
  type PlatformModuleKey,
} from '@noroset/core';

/** هر نمونه‌ی API وضعیت را حداکثر این مدت کش می‌کند (تغییر در همان نمونه فوراً invalidate می‌شود). */
export const MODULE_STATE_TTL_MS = 10_000;

/** پیاده‌سازی Port MODULE_STATE: یک SELECT کوچک هر ۱۰ ثانیه به‌جای هر درخواست. */
@Injectable()
export class CachedModuleStateService implements ModuleStateService {
  private cached: { at: number; states: Promise<ModuleState[]> } | null = null;

  all(): Promise<ModuleState[]> {
    const now = Date.now();
    if (!this.cached || now - this.cached.at > MODULE_STATE_TTL_MS) {
      const states = readModuleStates().then((rows) =>
        PLATFORM_MODULE_KEYS.map((key): ModuleState => {
          const row = rows.find((r) => r.key === key);
          return { key, status: row?.status ?? 'active', message: row?.message ?? null };
        }),
      );
      // خطای DB کش نمی‌شود.
      states.catch(() => {
        if (this.cached?.states === states) this.cached = null;
      });
      this.cached = { at: now, states };
    }
    return this.cached.states;
  }

  async get(key: PlatformModuleKey): Promise<ModuleState> {
    return (await this.all()).find((s) => s.key === key) ?? { key, status: 'active', message: null };
  }

  invalidate(): void {
    this.cached = null;
  }
}

/**
 * گارد سراسری ماژول‌ها (docs/architecture.md §9.11)، پیش از احراز هویت: route بدون ماژول آزاد است؛
 * maintenance فقط مسیر عمومی را باز می‌گذارد؛ off همه‌چیز را می‌بندد (۵۰۳ با پیام ادمین).
 */
@Injectable()
export class ModuleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(MODULE_STATE) private readonly modules: ModuleStateService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    const key = this.reflector.getAllAndOverride<PlatformModuleKey | undefined>(MODULE_KEY, targets);
    if (!key) return true;
    const state = await this.modules.get(key);
    if (state.status === 'active') return true;
    if (state.status === 'maintenance' && this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE_KEY, targets)) return true;
    throw new ServiceUnavailableException({ statusCode: 503, message: `module_${state.status}`, module: key, notice: state.message });
  }
}
