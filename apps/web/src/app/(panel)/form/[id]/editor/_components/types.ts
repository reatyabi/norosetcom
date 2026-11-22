import type { ReactElement } from 'react';
import { contentTypes, fieldTypes, generateId, type ConditionOp, type RichText } from '@noroset/field-engine';
import { isBasicElementType, type BasicElementType } from './settings-spec';

export interface ElementDef {
  /** نوع field-engine (short_text، image، …) یا شناسه‌ی المان آماده. */
  key: string;
  label: string;
  icon: ReactElement;
}

export interface EditorCondition {
  effect: 'show' | 'hide';
  field_id: string;
  op: ConditionOp;
  value?: string | number | boolean;
}

/** المان بدنه با همان شکل تعریف فرم (§8.3): فیلد یا محتوا. */
export interface EditorField {
  id: string;
  fieldId: string;
  type: BasicElementType;
  family: 'field' | 'content';
  typeLabel: string;
  label: string;
  /** متن ساده (فرم‌های قبلی) یا متن غنی محدود (§8.3). */
  description: string | RichText;
  required: boolean;
  settings: Record<string, unknown>;
  condition?: EditorCondition;
  conditionDirty?: boolean;
  dirtyKeys?: string[];
  source: Record<string, unknown>;
}

export interface EditorPage {
  id: string;
  title: string;
  kind: 'welcome' | 'main' | 'ending';
  fields: EditorField[];
  source: Record<string, unknown>;
}

/** چیدمان لوگو در هدر: start = راست (RTL)، center = وسط، end = چپ. */
export type HeaderAlign = 'start' | 'center' | 'end';

/** المان لوگوی هدر: chrome از نوع logo_title در defaults.header. */
export interface HeaderLogo {
  title: string;
  subtitle: string;
  logo_url: string;
  align: HeaderAlign;
  visible: boolean;
  show_logo: boolean;
  show_title: boolean;
  show_subtitle: boolean;
}

export const EMPTY_HEADER_LOGO: HeaderLogo = {
  title: '',
  subtitle: '',
  logo_url: '',
  align: 'start',
  visible: true,
  show_logo: true,
  show_title: true,
  show_subtitle: true,
};

const randomInt = (max: number) => Math.floor(Math.random() * max);
export const newId = (kind: 'page' | 'item' | 'field') => generateId(kind, randomInt);

export const DEFAULT_LABEL = 'عنوان پرسش';

export const fa = (n: number) => n.toLocaleString('fa-IR');

export function defaultSettings(type: BasicElementType): Record<string, unknown> {
  const t = fieldTypes.get(type) ?? contentTypes.get(type);
  return structuredClone((t?.defaultSettings ?? {}) as Record<string, unknown>);
}

export function makeField(def: ElementDef): EditorField {
  const type: BasicElementType = isBasicElementType(def.key) ? def.key : 'short_text';
  return {
    id: newId('item'),
    fieldId: newId('field'),
    type,
    family: fieldTypes.has(type) ? 'field' : 'content',
    typeLabel: def.label,
    label: DEFAULT_LABEL,
    description: '',
    required: false,
    settings: defaultSettings(type),
    dirtyKeys: ['all'],
    source: {},
  };
}

export function copyField(f: EditorField): EditorField {
  return {
    ...structuredClone(f),
    id: newId('item'),
    fieldId: newId('field'),
    conditionDirty: true,
    dirtyKeys: ['all'],
    source: {},
  };
}

export interface ChoiceOption {
  value: string;
  label: string;
}

export const optionsOf = (f: EditorField): ChoiceOption[] =>
  Array.isArray(f.settings.options) ? (f.settings.options as ChoiceOption[]) : [];

/** مقدار یکتای گزینه‌ی تازه (option_n)؛ مقدار پس از ساخت با تغییر عنوان عوض نمی‌شود. */
export function nextOptionValue(options: ChoiceOption[]): string {
  const used = new Set(options.map((o) => o.value));
  let n = options.length + 1;
  while (used.has(`option_${n}`)) n++;
  return `option_${n}`;
}
