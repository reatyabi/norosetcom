'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, ApiError } from '@/lib/api';
import { routes } from '@/lib/routes';
import { setSessionHint } from '@/lib/session-hint';

export type MembershipRole = 'owner' | 'admin' | 'member';

export interface Membership {
  tenantId: string;
  role: MembershipRole;
  slug: string;
  name: string;
}

export interface Me {
  id: string;
  mobile: string | null;
  email: string | null;
  fullName: string;
  avatarUrl: string | null;
  hasPassword: boolean;
  platformRole: 'user' | 'superadmin';
  /** نشست پشتیبانی: ادمین داخل این حساب است (docs/architecture.md §9.11). */
  support: { grantId: string; expiresAt: string } | null;
  memberships: Membership[];
}

/** صفحه‌هایی که بدون فضای کاری جاری هم معنا دارند (مدیریت پلتفرم سطح پلتفرم است). */
export function isTenantFree(pathname: string): boolean {
  return pathname === routes.workspace || pathname === routes.account || pathname === routes.admin.home || pathname.startsWith(`${routes.admin.home}/`);
}

interface Session {
  me: Me;
  /** فضای کاری جاری (null فقط وقتی کاربر هنوز هیچ فضای کاری ندارد). */
  tenant: Membership | null;
  /** ساخت خودکار فضای کاری شکست خورد. */
  tenantSetupFailed: boolean;
  setTenant(tenantId: string): void;
  reload(): Promise<Me>;
  logout(): Promise<void>;
}

const SessionContext = createContext<Session | null>(null);
const TENANT_KEY = 'noroset.tenantId';

function readStoredTenant(): string | null {
  try {
    return localStorage.getItem(TENANT_KEY);
  } catch {
    return null;
  }
}

function storeTenant(id: string): void {
  try {
    localStorage.setItem(TENANT_KEY, id);
  } catch {
    // ذخیره‌ی انتخاب فقط راحتی است
  }
}

/** /me را بار می‌کند؛ بدون نشست ← /auth. فضای کاری پرسیده نمی‌شود و نبودش خودکار ساخته می‌شود. */
export function SessionProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantSetupFailed, setTenantSetupFailed] = useState(false);

  const apply = useCallback((next: Me) => {
    setSessionHint(true);
    setMe(next);
    setTenantId((current) => {
      const ids = next.memberships.map((m) => m.tenantId);
      const preferred = current ?? readStoredTenant();
      return preferred && ids.includes(preferred) ? preferred : (ids[0] ?? null);
    });
    return next;
  }, []);

  const reload = useCallback(() => api<Me>('/me').then(apply), [apply]);

  useEffect(() => {
    api<Me>('/me')
      .then(apply)
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          setSessionHint(false);
          router.replace(routes.auth(pathname));
        }
      });
    // فقط بار اول
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // کاربر تازه: فضای کاری بدون پرسش ساخته می‌شود. نشست پشتیبانی و صفحه‌های حساب و مدیریت چیزی نمی‌سازند.
  useEffect(() => {
    if (!me || me.memberships.length > 0 || me.support) return;
    if (pathname === routes.account || pathname.startsWith(routes.admin.home)) return;
    api('/tenants/default', { method: 'POST' })
      .then(() => reload())
      .catch(() => setTenantSetupFailed(true));
  }, [me, pathname, reload]);

  const value = useMemo<Session | null>(() => {
    if (!me) return null;
    return {
      me,
      tenant: me.memberships.find((m) => m.tenantId === tenantId) ?? null,
      tenantSetupFailed,
      setTenant: (id) => {
        storeTenant(id);
        setTenantId(id);
      },
      reload,
      logout: async () => {
        await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
        setSessionHint(false);
        router.replace(routes.auth());
      },
    };
  }, [me, tenantId, tenantSetupFailed, reload, router]);

  if (!value) return <>{fallback}</>;
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const s = useContext(SessionContext);
  if (!s) throw new Error('useSession outside SessionProvider');
  return s;
}

/** فضای کاری جاری (صفحه‌هایی که بدون آن معنا ندارند). */
export function useTenant(): Membership {
  const { tenant } = useSession();
  if (!tenant) throw new Error('no tenant selected');
  return tenant;
}

export const canManage = (role: MembershipRole) => role === 'owner' || role === 'admin';
