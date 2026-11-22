import { db } from './connection';
import { platformModules } from './admin.schema';

// خواندن وضعیت ماژول‌ها برای گارد سراسری API (docs/architecture.md §9.11). فقط ردیف‌های ثبت‌شده؛
// ماژولی که ردیف ندارد active است.

type ModuleStatus = 'active' | 'maintenance' | 'off';

export interface ModuleStateRow {
  key: string;
  status: ModuleStatus;
  message: string | null;
  updatedAt: Date;
}

export async function readModuleStates(): Promise<ModuleStateRow[]> {
  return db
    .select({ key: platformModules.key, status: platformModules.status, message: platformModules.message, updatedAt: platformModules.updatedAt })
    .from(platformModules);
}
