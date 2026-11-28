import type { FormDefinition, HeaderDefaults, TopBarDefaults, SidebarDefaults, BottomBarDefaults, FooterDefaults } from './schema';

export interface ResolvedZones {
  header: HeaderDefaults | null;
  top_bar: TopBarDefaults | null;
  sidebar: SidebarDefaults | null;
  bottom_bar: BottomBarDefaults | null;
  footer: FooterDefaults | null;
}

/**
 * تفکیک وضعیت ۵ ناحیه‌ی قالب فرم بر اساس فلگ‌های zones در layout
 */
export function resolveZones(definition: FormDefinition): ResolvedZones {
  const { zones } = definition.layout;
  return {
    header: zones.header ? definition.defaults.header : null,
    top_bar: zones.top_bar ? definition.defaults.top_bar : null,
    sidebar: zones.sidebar ? definition.defaults.sidebar : null,
    bottom_bar: zones.bottom_bar ? definition.defaults.bottom_bar : null,
    footer: zones.footer ? definition.defaults.footer : null,
  };
}
