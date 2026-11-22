import { describe, expect, it } from 'vitest';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MODULE_KEY, PUBLIC_ROUTE_KEY, type ModuleState, type ModuleStateService, type PlatformModuleKey } from '@noroset/core';
import { CachedModuleStateService, ModuleGuard } from '../src/platform/module-state.service';

// خاموش/تعمیر ماژول‌ها (docs/architecture.md §9.11).

class FakeModules implements ModuleStateService {
  constructor(private readonly state: Partial<Record<PlatformModuleKey, Omit<ModuleState, 'key'>>>) {}
  async all() {
    return [];
  }
  async get(key: PlatformModuleKey): Promise<ModuleState> {
    return { key, status: 'active', message: null, ...this.state[key] };
  }
  invalidate() {}
}

const ctx = {
  switchToHttp: () => ({ getRequest: () => ({}) }),
  getHandler: () => () => undefined,
  getClass: () => ({}),
} as unknown as ExecutionContext;

const route = (module?: PlatformModuleKey, isPublic = false) =>
  ({ getAllAndOverride: (k: string) => (k === MODULE_KEY ? module : k === PUBLIC_ROUTE_KEY ? isPublic : undefined) }) as unknown as Reflector;

describe('ModuleGuard', () => {
  it('ignores routes without a module and passes active modules', async () => {
    const modules = new FakeModules({ norolink: { status: 'off', message: null } });
    await expect(new ModuleGuard(route(), modules).canActivate(ctx)).resolves.toBe(true);
    await expect(new ModuleGuard(route('noroform'), modules).canActivate(ctx)).resolves.toBe(true);
  });

  it('maintenance closes the panel API with the admin message but keeps public routes open', async () => {
    const modules = new FakeModules({ norolink: { status: 'maintenance', message: 'تا ساعت ۱۸' } });
    await expect(new ModuleGuard(route('norolink'), modules).canActivate(ctx)).rejects.toMatchObject({
      status: 503,
      response: { message: 'module_maintenance', module: 'norolink', notice: 'تا ساعت ۱۸' },
    });
    await expect(new ModuleGuard(route('norolink', true), modules).canActivate(ctx)).resolves.toBe(true);
  });

  it('off closes public routes too', async () => {
    const modules = new FakeModules({ norofile: { status: 'off', message: null } });
    await expect(new ModuleGuard(route('norofile', true), modules).canActivate(ctx)).rejects.toMatchObject({
      status: 503,
      response: { message: 'module_off' },
    });
  });
});

describe('CachedModuleStateService', () => {
  it('lists every registered module, defaulting to active', async () => {
    const svc = new CachedModuleStateService();
    const all = await svc.all();
    expect(all.map((m) => m.key)).toEqual(['noroform', 'norolink', 'norofile']);
    expect(await svc.all()).toBe(all); // از کش
    svc.invalidate();
    expect(await svc.all()).not.toBe(all);
  });
});
