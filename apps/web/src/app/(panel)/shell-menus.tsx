'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  AlertCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronsUpDownIcon,
  CrownIcon,
  GripIcon,
  HeadphonesIcon,
  LogOutIcon,
  MenuIcon,
  SparklesIcon,
  UserIcon,
  ZapIcon,
} from 'lucide-react';
import {
  SUPPORT_CHANNELS,
  SUPPORT_PHONE,
  SUPPORT_PHONE_FORMATTED,
} from '@/components/support-channels';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuGroupLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  SidebarMenuButton,
  SidebarMenuItem,
  SystemIcon,
  type SystemIconName,
} from '@noroset/ui';
import { ADMIN_LABEL, MODULE_LABEL, MODULE_STATUS_LABEL, type ModuleKey, type ModuleState, type ResolvedPlan } from '@noroset/admin/ui';
import { api } from '@/lib/api';
import { routes } from '@/lib/routes';
import { useSession } from './session';
import { MODULE_HOME, useModuleStates } from './modules';

// منوهای مشترک پوسته‌ی پنل: سایدبار صفحه‌های هسته‌ی پلتفرم و نوار بالای صفحه‌های محصولات.

export const ROLE_LABEL = { owner: 'مالک', admin: 'مدیر', member: 'عضو' } as const;

export interface AppNavItem {
  href: string;
  label: string;
  icon: SystemIconName;
  module?: ModuleKey;
  /** فقط برای ماژول در حال تعمیر. */
  maintenance: boolean;
  /** ماژول خاموش (به‌زودی). */
  off: boolean;
}

/** مقصدهای پنل: محصولات (ماژول خاموش با برچسب به‌زودی در ردیف آخر، در حال تعمیر با برچسب) و صفحه‌های هسته‌ی پلتفرم. */
export function useAppNav(modules: ModuleState[]): { products: AppNavItem[]; platform: AppNavItem[] } {
  const { me } = useSession();
  const status = (key: ModuleKey) => modules.find((m) => m.key === key)?.status ?? 'active';

  // ماژول‌های فعال و در حال تعمیر در ابتدا، و ماژول‌های خاموش (نوروفرم خاموش با برچسب به‌زودی) در ردیف آخر (ردیف سوم).
  const keys = (Object.keys(MODULE_HOME) as ModuleKey[]).sort((a, b) => {
    const aOff = status(a) === 'off';
    const bOff = status(b) === 'off';
    if (aOff && !bOff) return 1;
    if (!aOff && bOff) return -1;
    return 0;
  });

  const products = keys.map((key) => ({
    href: MODULE_HOME[key],
    label: MODULE_LABEL[key],
    icon: key,
    module: key,
    maintenance: status(key) === 'maintenance',
    off: status(key) === 'off',
  }));
  const platform: AppNavItem[] = [
    { href: routes.billing.home, label: 'اشتراک', icon: 'subscription', maintenance: false, off: false },
    { href: routes.account, label: 'حساب کاربری', icon: 'account', maintenance: false, off: false },
    ...(me.platformRole === 'superadmin' ? [{ href: routes.admin.home, label: ADMIN_LABEL, icon: 'admin' as const, maintenance: false, off: false }] : []),
  ];
  return { products, platform };
}

/** شبکه‌ی کاشی‌های محصول و پلتفرم؛ محتوای سوئیچ محصولات و منوی یکپارچه‌ی آواتار. */
function LauncherGrids({ products, platform }: { products: AppNavItem[]; platform: AppNavItem[] }) {
  const pathname = usePathname();
  const tile = (item: AppNavItem) => {
    const active = !item.off && (pathname === item.href || pathname.startsWith(`${item.href}/`));
    return (
      <DropdownMenuItem
        key={item.href}
        render={
          item.off ? (
            <div role="button" aria-disabled="true" tabIndex={-1} />
          ) : (
            <Link href={item.href} aria-current={active ? 'page' : undefined} />
          )
        }
        className={cn(
          'h-auto flex-col justify-center gap-1.5 rounded-xl px-1 py-3 text-center text-xs',
          active && 'bg-primary/10',
          item.off && 'cursor-default select-none text-muted-foreground hover:bg-muted/40',
        )}
      >
        <SystemIcon name={item.icon} className={cn('size-9', item.off && 'grayscale contrast-75 opacity-60')} />
        <span className="w-full truncate">{item.label}</span>
        {item.maintenance ? (
          <span className="-mt-1 text-[0.7rem] text-muted-foreground">{MODULE_STATUS_LABEL.maintenance}</span>
        ) : item.off ? (
          <span className="-mt-1 text-[0.7rem] text-muted-foreground">به زودی</span>
        ) : null}
      </DropdownMenuItem>
    );
  };
  return (
    <>
      <DropdownMenuGroup>
        <DropdownMenuGroupLabel>محصولات</DropdownMenuGroupLabel>
        <div className="grid grid-cols-3 gap-1">{products.map(tile)}</div>
      </DropdownMenuGroup>
      <DropdownMenuSeparator className="my-2" />
      <DropdownMenuGroup>
        <DropdownMenuGroupLabel>نوروست</DropdownMenuGroupLabel>
        <div className="grid grid-cols-3 gap-1">{platform.map(tile)}</div>
      </DropdownMenuGroup>
    </>
  );
}

/** سوئیچ محصولات به سبک گوگل: دکمه‌ی نُه‌نقطه و شبکه‌ی کاشی‌های محصول و پلتفرم. */
export function AppLauncher() {
  const { products, platform } = useAppNav(useModuleStates());
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-lg" className="rounded-full" aria-label="محصولات نوروست" />}>
        <GripIcon className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="start" className="w-80 max-w-[calc(100vw-1.5rem)] rounded-2xl p-2">
        <LauncherGrids products={products} platform={platform} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const MODULE_DESC: Record<ModuleKey, string> = {
  norolink: 'صفحه‌های بیو و لندینگ',
  noroform: 'فرم‌ساز و پرسشنامه آنلاین',
  norofile: 'مدیریت فایل و رسانه',
};

/** منوی همبرگری پنل: هویت (لینک به حساب کاربری)، فضاهای کاری، سوئیچ محصولات، پشتیبانی بازشو، و خروج. */
export function ProductNavMenu({
  currentProduct,
  workspace = true,
  triggerClassName,
  iconClassName,
}: {
  currentProduct?: ModuleKey;
  workspace?: boolean;
  triggerClassName?: string;
  iconClassName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { me, tenant, setTenant, logout } = useSession();
  const { products } = useAppNav(useModuleStates());
  const plan = useTenantPlan();
  const tier = useMemo(() => getSubscriptionTierDesign(plan), [plan]);
  const [supportOpen, setSupportOpen] = useState(false);

  const identity = me.mobile ?? me.email ?? '';
  const displayName = me.fullName || 'حساب من';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={cn('size-10 shrink-0 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground', triggerClassName)}
            aria-label="منوی نوروست"
          />
        }
      >
        <MenuIcon className={cn('size-5', iconClassName)} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="bottom"
        align="start"
        className="w-72 max-w-[calc(100vw-1.5rem)] max-h-[calc(100dvh-4rem)] overflow-y-auto rounded-2xl p-1.5 shadow-2xl"
      >
        {/* ۱. هویت و اشتراک کاربر (کلیک بازکننده حساب کاربری) */}
        <Link
          href={routes.account}
          title={`حساب کاربری: ${displayName}`}
          className="flex items-center gap-3 rounded-xl bg-muted/50 p-2.5 transition-colors hover:bg-muted group cursor-pointer"
        >
          <UserAvatar plan={plan} size={40} className="size-10 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                {displayName}
              </span>
              <span
                className={cn(
                  'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
                  tier.tierKey === 'pro' && 'border border-tone-violet/30 bg-tone-violet/15 text-tone-violet dark:text-tone-violet',
                  tier.tierKey === 'trial' && 'border border-cyan-500/30 bg-cyan-500/15 text-cyan-700 dark:text-cyan-400',
                  tier.tierKey === 'enterprise' && 'border border-warning/30 bg-warning/15 text-tone-amber dark:text-tone-amber',
                  tier.tierKey === 'basic' && 'border border-success/30 bg-success/15 text-success dark:text-success',
                  tier.tierKey === 'grace' && 'border border-tone-rose/30 bg-tone-rose/15 text-destructive dark:text-tone-rose',
                  tier.tierKey === 'limited' && 'border border-border/60 bg-muted text-muted-foreground',
                )}
              >
                {tier.badgeIcon ? <span className="flex size-3 items-center justify-center [&>svg]:size-2.5">{tier.badgeIcon}</span> : null}
                {tier.name}
              </span>
            </div>
            <span dir="ltr" className="truncate text-start font-mono text-xs text-muted-foreground">
              {identity}
            </span>
          </div>
        </Link>

        {/* ۲. سوئیچ فضای کاری (در صورت عضویت در بیش از یک فضا) */}
        {workspace && me.memberships.length > 1 ? (
          <>
            <DropdownMenuSeparator className="my-1.5" />
            <DropdownMenuGroup>
              <DropdownMenuGroupLabel className="px-2 pb-1 pt-0.5 text-[11px] font-semibold text-muted-foreground">
                فضاهای کاری
              </DropdownMenuGroupLabel>
              <div className="flex max-h-36 flex-col gap-0.5 overflow-y-auto overscroll-contain px-0.5">
                {me.memberships.map((m) => {
                  const isCurrent = m.tenantId === tenant?.tenantId;
                  return (
                    <DropdownMenuItem
                      key={m.tenantId}
                      onClick={() => {
                        setTenant(m.tenantId);
                        if (pathname.endsWith('/editor')) {
                          router.push(routes.link.home);
                        }
                      }}
                      className={cn(
                        'flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-xs transition-colors',
                        isCurrent && 'bg-primary/10 font-medium text-foreground',
                      )}
                    >
                      <WorkspaceBadge name={m.name} />
                      <div className="flex min-w-0 flex-1 flex-col leading-tight">
                        <span className="truncate">{m.name}</span>
                        <span className="text-[10px] text-muted-foreground">{ROLE_LABEL[m.role]}</span>
                      </div>
                      {isCurrent ? <CheckIcon className="ms-auto size-4 shrink-0 text-primary" /> : null}
                    </DropdownMenuItem>
                  );
                })}
              </div>
            </DropdownMenuGroup>
          </>
        ) : null}

        {/* ۳. سوئیچ محصولات نوروست */}
        <DropdownMenuSeparator className="my-1.5" />
        <DropdownMenuGroup>
          <DropdownMenuGroupLabel className="px-2 pb-1 pt-0.5 text-[11px] font-semibold text-muted-foreground">
            محصولات نوروست
          </DropdownMenuGroupLabel>
          <div className="flex flex-col gap-0.5">
            {products.map((item) => {
              const active = !item.off && (item.module === currentProduct || pathname === item.href || pathname.startsWith(`${item.href}/`));
              return (
                <DropdownMenuItem
                  key={item.href}
                  render={
                    item.off ? (
                      <div role="button" aria-disabled="true" tabIndex={-1} />
                    ) : (
                      <Link href={item.href} aria-current={active ? 'page' : undefined} />
                    )
                  }
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs transition-colors',
                    active && 'bg-primary/10 font-medium text-foreground',
                    item.off && 'cursor-default select-none text-muted-foreground hover:bg-muted/30',
                  )}
                >
                  <SystemIcon
                    name={item.icon}
                    className={cn('size-6 shrink-0', item.off && 'opacity-50 grayscale contrast-75')}
                  />
                  <div className="flex min-w-0 flex-1 flex-col leading-tight">
                    <div className="flex items-center justify-between gap-1">
                      <span className={cn('text-xs font-semibold', item.off ? 'text-muted-foreground' : 'text-foreground')}>
                        {item.label}
                      </span>
                      {active ? (
                        <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                          جاری
                        </span>
                      ) : item.off ? (
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          به‌زودی
                        </span>
                      ) : null}
                    </div>
                    {item.module && MODULE_DESC[item.module] ? (
                      <span className={cn('mt-0.5 truncate text-[11px]', item.off ? 'text-muted-foreground/60' : 'text-muted-foreground')}>
                        {MODULE_DESC[item.module]}
                      </span>
                    ) : null}
                  </div>
                  {item.maintenance ? (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {MODULE_STATUS_LABEL.maintenance}
                    </span>
                  ) : null}
                </DropdownMenuItem>
              );
            })}
          </div>
        </DropdownMenuGroup>

        {/* ۴. پشتیبانی (با پنل بازشو برای انتخاب راه‌های ارتباط) */}
        <DropdownMenuSeparator className="my-1.5" />
        <div className="flex flex-col">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setSupportOpen((prev) => !prev);
            }}
            className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs text-foreground transition-colors hover:bg-muted focus:bg-muted cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <HeadphonesIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className="font-medium">پشتیبانی</span>
            </div>
            <ChevronDownIcon
              className={cn('size-4 text-muted-foreground transition-transform duration-200', supportOpen && 'rotate-180')}
            />
          </button>

          {supportOpen && (
            <div className="mt-1 flex flex-col gap-0.5 rounded-xl bg-muted/40 p-1.5 transition-[color,background-color,border-color,box-shadow,opacity,transform] animate-in fade-in zoom-in-95 duration-150">
              {SUPPORT_CHANNELS.map((channel) => {
                const Icon = channel.icon;
                return (
                  <a
                    key={channel.id}
                    href={channel.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-xs text-foreground transition-colors hover:bg-background"
                  >
                    <span
                      className="flex size-6 shrink-0 items-center justify-center rounded-md"
                      style={{ backgroundColor: `${channel.themeColor}18`, color: channel.themeColor }}
                    >
                      <Icon className="size-3.5" />
                    </span>
                    <span className="font-medium">{channel.name}</span>
                  </a>
                );
              })}

              <a
                href={`tel:${SUPPORT_PHONE}`}
                title={`تماس مستقیم با پشتیبانی: ${SUPPORT_PHONE_FORMATTED}`}
                className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs text-foreground transition-colors hover:bg-background"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <HeadphonesIcon className="size-3.5" />
                  </span>
                  <span className="font-medium">تماس تلفنی</span>
                </div>
                <span className="font-medium text-xs text-muted-foreground text-start">
                  {SUPPORT_PHONE_FORMATTED}
                </span>
              </a>
            </div>
          )}
        </div>

        {/* ۵. خروج */}
        <DropdownMenuSeparator className="my-1.5" />
        <DropdownMenuItem
          onClick={logout}
          className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-destructive transition-colors focus:bg-destructive/10 focus:text-destructive cursor-pointer"
        >
          <LogOutIcon className="size-4 shrink-0" />
          <span>خروج از حساب</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function WorkspaceBadge({ name }: { name?: string }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted font-semibold">
      {name?.trim().charAt(0) || <SystemIcon name="workspace" className="size-5" />}
    </span>
  );
}

/** انتخاب فضای کاری؛ در سایدبار کامل (نام و نقش)، در نوار بالا فشرده. */
export function WorkspaceMenu({ variant }: { variant: 'sidebar' | 'bar' }) {
  const { me, tenant, setTenant } = useSession();
  if (me.memberships.length === 0) return null;
  const label = tenant ? `${tenant.name} (${ROLE_LABEL[tenant.role]})` : 'فضای کاری';
  const content = (
    <DropdownMenuContent side={variant === 'sidebar' ? 'top' : 'bottom'} align={variant === 'sidebar' ? 'start' : 'end'} className="min-w-56">
      <DropdownMenuGroup>
        <DropdownMenuGroupLabel>فضاهای کاری</DropdownMenuGroupLabel>
        {me.memberships.map((m) => (
          <DropdownMenuItem key={m.tenantId} onClick={() => setTenant(m.tenantId)}>
            <span className="grid min-w-0 flex-1 leading-tight">
              <span className="truncate">{m.name}</span>
              <span className="text-xs text-muted-foreground">{ROLE_LABEL[m.role]}</span>
            </span>
            {m.tenantId === tenant?.tenantId ? <CheckIcon className="ms-auto" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuGroup>
    </DropdownMenuContent>
  );

  if (variant === 'bar') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="lg" className="max-w-48 ps-1" aria-label={`فضای کاری: ${label}`} />}>
          <WorkspaceBadge name={tenant?.name} />
          <span className="truncate font-medium max-sm:sr-only">{tenant?.name ?? 'فضای کاری'}</span>
          <ChevronDownIcon className="size-4 text-muted-foreground" />
        </DropdownMenuTrigger>
        {content}
      </DropdownMenu>
    );
  }
  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger render={<SidebarMenuButton size="lg" aria-label="فضای کاری" tooltip={label} />}>
          <WorkspaceBadge name={tenant?.name} />
          <span className="grid min-w-0 flex-1 text-start leading-tight">
            <span className="truncate font-medium">{tenant?.name ?? 'فضای کاری'}</span>
            {tenant ? <span className="truncate text-xs text-muted-foreground">{ROLE_LABEL[tenant.role]}</span> : null}
          </span>
          <ChevronsUpDownIcon className="ms-auto size-4" />
        </DropdownMenuTrigger>
        {content}
      </DropdownMenu>
    </SidebarMenuItem>
  );
}

// ---------- وضعیت اشتراک و دیزاین خط دور آواتار بر اساس ترند روز ----------

/** دریافت وضعیت اشتراک فضای کاری جاری. */
export function useTenantPlan(): ResolvedPlan | null {
  const { tenant } = useSession();
  const [plan, setPlan] = useState<ResolvedPlan | null>(null);
  const tenantId = tenant?.tenantId;

  useEffect(() => {
    if (!tenantId) return;
    let current = true;
    api<ResolvedPlan>('/billing/status', { tenantId }).then(
      (p) => {
        if (current) setPlan(p);
      },
      () => {
        if (current) setPlan(null);
      },
    );
    return () => {
      current = false;
    };
  }, [tenantId]);

  return tenantId ? plan : null;
}

export interface TierRingDesign {
  tierKey: 'limited' | 'basic' | 'pro' | 'enterprise' | 'trial' | 'grace';
  name: string;
  badgeLabel: string;
  ringClass: string;
  glowClass: string;
  badgeBg: string;
  badgeIcon: ReactNode;
}

/**
 * تعیین دیزاین لاین دور آواتار بر اساس بنچمارک‌های ترند SaaS (مانند GitHub Pro, Raycast, Discord Nitro, Telegram Premium):
 * - ۱۴ روز رایگان (Trial): لاین الکتریک سایان / فیروزه‌ای نئونی با هاله نور ملایم و نشان صاعقه.
 * - اشتراک حرفه‌ای (Pro): گرادیان هولوگرافیک بنفش / سرخابی / نیلی با هاله نور و نشان ستاره.
 * - اشتراک سازمانی (Enterprise): لاین طلایی متالیک / شامپاینی با درخشش لوکس و نشان تاج.
 * - اشتراک پایه (Basic): گرادیان زمردی / سبز ترند با نشان تیک.
 * - مهلت تمدید (Grace): لاین ضربان‌دار صورتی / کهربایی با انیمیشن پالس برای جلب توجه بدون مزاحمت.
 * - محدود (Limited): بوردر مینیمال، تمیز و بدون شلوغی.
 */
export function getSubscriptionTierDesign(plan: ResolvedPlan | null): TierRingDesign {
  if (!plan || plan.status === 'limited') {
    return {
      tierKey: 'limited',
      name: plan?.name || 'محدود',
      badgeLabel: 'پلن محدود',
      ringClass: 'p-[2px] border-2 border-border/70 hover:border-border transition-colors',
      glowClass: 'shadow-xs',
      badgeBg: '',
      badgeIcon: null,
    };
  }

  if (plan.status === 'trial') {
    return {
      tierKey: 'trial',
      name: plan.name || 'رایگان',
      badgeLabel: 'رایگان ۱۴ روزه',
      ringClass: 'p-[2.5px] bg-gradient-to-tr from-cyan-400 via-teal-400 to-sky-500',
      glowClass: 'shadow-[0_0_12px_rgba(6,182,212,0.45)] hover:shadow-[0_0_18px_rgba(6,182,212,0.65)]',
      badgeBg: 'bg-gradient-to-tr from-cyan-400 to-teal-400 text-slate-950 ring-2 ring-background',
      badgeIcon: <ZapIcon className="size-2.5 fill-current stroke-[2.5]" />,
    };
  }

  if (plan.status === 'grace') {
    return {
      tierKey: 'grace',
      name: plan.name,
      badgeLabel: 'مهلت تمدید اشتراک',
      ringClass: 'p-[2.5px] bg-gradient-to-tr from-tone-rose/100 via-amber-500 to-orange-500 animate-pulse',
      glowClass: 'shadow-[0_0_12px_rgba(244,63,94,0.45)] hover:shadow-[0_0_16px_rgba(244,63,94,0.65)]',
      badgeBg: 'bg-tone-rose text-white ring-2 ring-background',
      badgeIcon: <AlertCircleIcon className="size-2.5 stroke-[2.5]" />,
    };
  }

  const code = plan.code?.toLowerCase();
  if (code === 'enterprise' || code === 'business') {
    return {
      tierKey: 'enterprise',
      name: plan.name,
      badgeLabel: 'اشتراک سازمانی',
      ringClass: 'p-[2.5px] bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-600',
      glowClass: 'shadow-[0_0_14px_rgba(245,158,11,0.5)] hover:shadow-[0_0_20px_rgba(245,158,11,0.7)]',
      badgeBg: 'bg-gradient-to-tr from-amber-400 to-yellow-500 text-tone-amber ring-2 ring-background',
      badgeIcon: <CrownIcon className="size-2.5 fill-current stroke-[2.5]" />,
    };
  }

  if (code === 'pro') {
    return {
      tierKey: 'pro',
      name: plan.name,
      badgeLabel: 'اشتراک حرفه‌ای',
      ringClass: 'p-[2.5px] bg-gradient-to-tr from-violet-600 via-tone-violet/100 to-indigo-400',
      glowClass: 'shadow-[0_0_14px_rgba(168,85,247,0.45)] hover:shadow-[0_0_20px_rgba(168,85,247,0.65)]',
      badgeBg: 'bg-gradient-to-tr from-violet-600 to-fuchsia-500 text-white ring-2 ring-background',
      badgeIcon: <SparklesIcon className="size-2.5 fill-current stroke-[2.5]" />,
    };
  }

  return {
    tierKey: 'basic',
    name: plan.name,
    badgeLabel: 'اشتراک پایه',
    ringClass: 'p-[2.5px] bg-gradient-to-tr from-tone-emerald/100 via-teal-400 to-sky-400',
    glowClass: 'shadow-[0_0_12px_rgba(16,185,129,0.4)] hover:shadow-[0_0_16px_rgba(16,185,129,0.6)]',
    badgeBg: 'bg-success text-white ring-2 ring-background',
    badgeIcon: <CheckIcon className="size-2.5 stroke-[3]" />,
  };
}

export function UserAvatar({
  className,
  plan,
  size = 48,
  showRing = true,
}: {
  className?: string;
  plan?: ResolvedPlan | null;
  size?: number;
  showRing?: boolean;
}) {
  const { me } = useSession();
  const tier = useMemo(() => getSubscriptionTierDesign(plan ?? null), [plan]);
  // مدل محصول‌محور (§9.11): حلقه‌ی آواتار پلن برتر را نشان می‌دهد؛ اگر چند محصول هم‌زمان اشتراک فعال دارند،
  // تعدادشان در tooltip می‌آید (اشتراک‌های دامنه‌های مختلف جایگزین هم نمی‌شوند).
  const activeScopeCount = plan?.activePlans?.length ?? 0;
  const scopeNote = activeScopeCount > 1 ? ` — ${activeScopeCount.toLocaleString('fa-IR')} محصول فعال` : '';

  const avatarElement = (
    <Avatar className="size-full">
      {me.avatarUrl ? <AvatarImage src={me.avatarUrl} alt="" /> : null}
      <AvatarFallback className="font-semibold text-sm">
        {me.fullName.trim().charAt(0) || <UserIcon className="size-4" />}
      </AvatarFallback>
    </Avatar>
  );

  const hasExplicitSize = className?.includes('size-');
  const sizeClass = hasExplicitSize ? '' : size === 48 ? 'size-12' : size === 40 ? 'size-10' : size === 36 ? 'size-9' : 'size-8';

  if (!showRing) {
    return (
      <div className={cn('relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full', sizeClass, className)}>
        {avatarElement}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-full transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-300',
        sizeClass,
        tier.ringClass,
        tier.glowClass,
        className,
      )}
      title={`${tier.name} — ${tier.badgeLabel}${scopeNote}`}
    >
      {/* فاصله تمیز درونی مطابق بنچمارک استوری/پرو برای نمایش شارپ آواتار در دو تم تاریک و روشن */}
      <div className="flex size-full items-center justify-center overflow-hidden rounded-full bg-background p-[1.5px]">
        {avatarElement}
      </div>

      {/* نشان کوچک در گوشه پایین برای تمایز سریع بصری نوع پلن */}
      {tier.badgeIcon ? (
        <span
          className={cn(
            'absolute -bottom-0.5 -end-0.5 flex size-4 items-center justify-center rounded-full shadow-xs',
            tier.badgeBg,
          )}
          aria-hidden="true"
        >
          {tier.badgeIcon}
        </span>
      ) : null}
    </div>
  );
}

/** نام و موبایل/ایمیل کاربر کنار آواتار. */
function AccountIdentity({ displayName, identity }: { displayName: string; identity: string }) {
  return (
    <span className="grid min-w-0 flex-1 text-start leading-tight">
      <span className="truncate font-medium">{displayName}</span>
      <span dir="ltr" className="truncate text-end text-xs text-muted-foreground">
        {identity}
      </span>
    </span>
  );
}



/** منوی حساب؛ در سایدبار با نام و موبایل، در نوار بالا فقط آواتار. */
export function AccountMenu({ variant, className }: { variant: 'sidebar' | 'bar'; className?: string }) {
  const { me, logout } = useSession();
  const plan = useTenantPlan();
  const identity = me.mobile ?? me.email ?? '';
  const displayName = me.fullName || 'حساب من';
  const who = <AccountIdentity displayName={displayName} identity={identity} />;
  const items = (
    <>
      <DropdownMenuItem render={<Link href={routes.account} />}>
        <SystemIcon name="account" className="-m-0.5 size-5" />
        حساب کاربری
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={logout}>
        <LogOutIcon />
        خروج
      </DropdownMenuItem>
    </>
  );

  if (variant === 'bar') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" className={cn('size-12 rounded-full p-0 shrink-0', className)} aria-label={`${displayName} — ${identity}`} />}
        >
          <UserAvatar plan={plan} size={48} />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" align="end" className="min-w-60">
          <div className="flex items-center gap-2 px-2 py-2">
            <UserAvatar plan={plan} size={36} className="size-9" />
            {who}
          </div>
          <DropdownMenuSeparator />
          {items}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger render={<SidebarMenuButton size="lg" tooltip={`${displayName} — ${identity}`} />}>
          <UserAvatar plan={plan} size={32} showRing={false} className="size-8" />
          {who}
          <ChevronsUpDownIcon className="ms-auto size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="min-w-56">
          {items}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}
