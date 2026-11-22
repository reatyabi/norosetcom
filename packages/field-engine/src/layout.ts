import { licenseBadgeChrome } from './chrome/simple';
import { navButtonsChrome } from './chrome/nav-buttons';
import { chromeTypes } from './registry';
import type { ChromeElement, FormDefinition, FormPage } from './schema';

// ترکیب هدر/فوتر هر صفحه. همه خالص؛ ورودی را تغییر نمی‌دهند.

/** شناسه‌ی المان‌های مصنوعی (در تعریف ذخیره نمی‌شوند و با الگوی item_id تداخل ندارند). */
export const SYNTHETIC_IDS = { nav: '__nav', license: '__license_badge' } as const;

type PageArea = FormPage['header'];

function resolveArea(defaults: ChromeElement[], area: PageArea, page: FormPage): ChromeElement[] {
  const elements = area.mode === 'hidden' ? [] : area.mode === 'custom' ? (area.elements ?? []) : defaults;
  // پیش‌فرض‌های سطح فرم روی همه‌ی صفحات اعمال می‌شوند؛ آنچه برای این نوع صفحه مجاز نیست کنار می‌رود.
  return elements.filter((e) => chromeTypes.get(e.type)?.allowedPageKinds.includes(page.kind) ?? false);
}

export function resolveHeader(definition: FormDefinition, page: FormPage): ChromeElement[] {
  return resolveArea(definition.defaults.header.elements, page.header, page);
}

export function resolveTopBar(definition: FormDefinition, page: FormPage): ChromeElement[] {
  return resolveArea(definition.defaults.topBar.elements, page.topBar, page);
}

export function resolveSidebar(definition: FormDefinition, page: FormPage): ChromeElement[] {
  return resolveArea(definition.defaults.sidebar.elements, page.sidebar, page);
}

export function resolveBottomBar(definition: FormDefinition, page: FormPage): ChromeElement[] {
  return resolveArea(definition.defaults.bottomBar.elements, page.bottomBar, page);
}

export function resolveFooter(definition: FormDefinition, page: FormPage): ChromeElement[] {
  return resolveArea(definition.defaults.footer.elements, page.footer, page);
}

/** اگر هیچ nav_buttons در هدر/فوتر نیست (حتی با hidden)، نوار ناوبری پیش‌فرض به فوتر اضافه می‌شود. */
export function ensureNavigation(
  page: FormPage,
  resolved: {
    header: ChromeElement[];
    topBar?: ChromeElement[];
    sidebar?: ChromeElement[];
    bottomBar?: ChromeElement[];
    footer: ChromeElement[];
  },
): {
  header: ChromeElement[];
  topBar?: ChromeElement[];
  sidebar?: ChromeElement[];
  bottomBar?: ChromeElement[];
  footer: ChromeElement[];
} {
  if (!navButtonsChrome.allowedPageKinds.includes(page.kind)) return resolved;
  const hasNav = [
    ...resolved.header,
    ...(resolved.topBar ?? []),
    ...(resolved.sidebar ?? []),
    ...(resolved.bottomBar ?? []),
    ...resolved.footer,
  ].some((e) => e.type === navButtonsChrome.type);
  if (hasNav) return resolved;
  const nav: ChromeElement = {
    kind: 'chrome',
    item_id: SYNTHETIC_IDS.nav,
    type: navButtonsChrome.type,
    settings: { ...navButtonsChrome.defaultSettings },
  };
  return { ...resolved, footer: [...resolved.footer, nav] };
}

/**
 * branding: در پلن رایگان license_badge در رندر اجباری است، حتی اگر در تعریف نباشد یا فوتر hidden باشد
 * (اجبار در رندر، نه ذخیره‌سازی).
 */
export function applyBranding(
  resolvedFooter: ChromeElement[],
  options: { forceLicense: boolean },
): ChromeElement[] {
  if (!options.forceLicense) return resolvedFooter;
  if (resolvedFooter.some((e) => e.type === licenseBadgeChrome.type)) return resolvedFooter;
  const badge: ChromeElement = {
    kind: 'chrome',
    item_id: SYNTHETIC_IDS.license,
    type: licenseBadgeChrome.type,
    settings: {},
  };
  return [...resolvedFooter, badge];
}

/** ترکیب کامل برای رندر: resolve ← ensureNavigation ← applyBranding. */
export function resolvePageChrome(
  definition: FormDefinition,
  page: FormPage,
  options: { forceLicense: boolean },
): {
  header: ChromeElement[];
  topBar: ChromeElement[];
  sidebar: ChromeElement[];
  bottomBar: ChromeElement[];
  footer: ChromeElement[];
} {
  const resolvedFooter = resolveFooter(definition, page);
  const withNav = ensureNavigation(page, {
    header: resolveHeader(definition, page),
    topBar: resolveTopBar(definition, page),
    sidebar: resolveSidebar(definition, page),
    bottomBar: resolveBottomBar(definition, page),
    footer: resolvedFooter,
  });
  return {
    header: withNav.header,
    topBar: withNav.topBar ?? [],
    sidebar: withNav.sidebar ?? [],
    bottomBar: withNav.bottomBar ?? [],
    footer: applyBranding(withNav.footer, options),
  };
}
