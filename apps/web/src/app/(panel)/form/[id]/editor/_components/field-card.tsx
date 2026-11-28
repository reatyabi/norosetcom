'use client';

import { type ReactNode } from 'react';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CopyIcon,
  GitBranchIcon,
  Settings as SettingsIcon,
  ShieldCheckIcon,
  Trash2Icon,
  TriangleAlertIcon,
  XIcon,
} from 'lucide-react';
import { Badge, Button, cn, Switch } from '@noroset/ui';
import { IconAction } from '@/components/editor-ui';
import { type EditorField, fa } from './types';
import { FieldInline } from './field-inline';
import { advancedCount, settingsIssues } from './settings-drawer';

export interface FieldCardProps {
  field: EditorField;
  active: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onChange: (patch: Partial<EditorField>) => void;
  onOpenSettings: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onCollapse: () => void;
  settingsOpen: boolean;
}

/**
 * کارت فیلد در ادیتور فرم:
 * شامل شناسه الزامی DOM، نوار اکشن‌های شناور/ردیف بالا، ویرایش درجا و نشانگرهای اعتبارسنجی.
 */
export function FieldCard({
  field,
  active,
  onSelect,
  onDuplicate,
  onRemove,
  onChange,
  onOpenSettings,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  onCollapse,
  settingsOpen,
}: FieldCardProps) {
  const rules = advancedCount(field);
  const invalid = settingsIssues(field).length > 0;
  const validationRules = rules - (field.condition ? 1 : 0);
  const isColSpan2 = (field.settings as Record<string, unknown>)?.col_span === 2;

  return (
    <div
      id={`card-${field.id}`}
      data-selected={active}
      // کارت جمع‌شده با کیبورد هم انتخاب می‌شود؛ کارت باز خودش ورودی‌ها را دارد.
      role={active ? undefined : 'button'}
      tabIndex={active ? undefined : 0}
      aria-label={active ? undefined : `ویرایش ${field.typeLabel}${field.family === 'field' ? `: ${field.label}` : ''}`}
      onClick={active ? undefined : onSelect}
      onKeyDown={
        active
          ? undefined
          : (e) => {
              if (e.target !== e.currentTarget) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect();
              }
            }
      }
      className={cn(
        'nf-field-card group/field relative scroll-mt-4 scroll-mb-[calc(50dvh+1rem)] rounded-md outline-none transition-all duration-150 ease-fluent p-3 md:scroll-mb-[22.5rem]',
        isColSpan2 && 'md:col-span-2',
        active
          ? 'is-active border border-nf-primary/60 ring-2 ring-nf-primary/15 bg-nf-muted/20 shadow-xs'
          : 'cursor-pointer border border-transparent bg-transparent hover:border-nf-border hover:bg-nf-muted/25 focus-visible:ring-1 focus-visible:ring-nf-ring',
      )}
    >
      {/* نوار اکشن فیلد (در موبایل ردیف بالای عنوان، در دسکتاپ شناور top: -1rem end: 0.75rem) */}
      <div
        role="toolbar"
        aria-label="ابزارهای المان"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'nf-field-actions flex items-center justify-between gap-1.5 md:justify-end',
          active
            ? 'opacity-100'
            : 'md:opacity-0 md:group-hover/field:opacity-100 md:group-focus-within/field:opacity-100 md:transition-opacity md:duration-150',
        )}
      >
        <div className="flex items-center gap-1.5">
          {/* دکمه تنظیمات به عنوان اکشن اصلی */}
          <Button
            id={`settings-${field.id}`}
            variant={invalid ? 'destructive' : active ? 'default' : 'secondary'}
            size="sm"
            aria-expanded={settingsOpen}
            aria-controls="advanced-settings"
            aria-invalid={invalid || undefined}
            onClick={onOpenSettings}
            className="h-7 gap-1 px-2 text-xs font-medium shadow-xs"
          >
            {invalid ? <TriangleAlertIcon className="size-3.5" /> : <SettingsIcon className="size-3.5" />}
            <span>تنظیمات</span>
            {rules > 0 && (
              <Badge
                variant={invalid ? 'destructive' : 'secondary'}
                className="ms-0.5 h-4 min-w-4 px-1 text-[10px]"
                aria-label={`${fa(rules)} قاعده‌ی فعال`}
              >
                {fa(rules)}
              </Badge>
            )}
          </Button>

          {/* سوئیچ اجباری بودن */}
          {field.family === 'field' && (
            <label className="flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground">
              <Switch
                checked={field.required}
                onCheckedChange={(required) => onChange({ required })}
                aria-label="اجباری بودن فیلد"
              />
              <span className="text-[11px] font-medium">اجباری</span>
            </label>
          )}
        </div>

        {/* دکمه‌های جابه‌جایی، کپی و حذف */}
        <div className="flex items-center gap-0.5">
          <IconAction
            label="انتقال به بالا"
            size="icon-xs"
            disabled={!canMoveUp}
            onClick={onMoveUp}
          >
            <ArrowUpIcon />
          </IconAction>
          <IconAction
            label="انتقال به پایین"
            size="icon-xs"
            disabled={!canMoveDown}
            onClick={onMoveDown}
          >
            <ArrowDownIcon />
          </IconAction>
          <IconAction
            label="کپی فیلد"
            size="icon-xs"
            onClick={onDuplicate}
          >
            <CopyIcon />
          </IconAction>
          <IconAction
            label="حذف فیلد"
            size="icon-xs"
            className="text-destructive hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2Icon />
          </IconAction>
          {active && (
            <IconAction
              label="بستن کارت"
              size="icon-xs"
              onClick={onCollapse}
            >
              <XIcon />
            </IconAction>
          )}
        </div>
      </div>

      {/* بدنه: تنظیمات درون‌خطی و ظاهر فیلد */}
      <div className="px-4 py-3.5">
        <FieldInline field={field} active={active} onChange={onChange} onOpenSettings={onOpenSettings} />

        {/* کارت جمع‌شده: نشانگرهای اعتبارسنجی و شرط */}
        {!active && (rules > 0 || invalid) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {invalid && (
              <RuleChip tone="error" icon={<TriangleAlertIcon />}>
                تنظیمات نامعتبر
              </RuleChip>
            )}
            {!invalid && validationRules > 0 && (
              <RuleChip icon={<ShieldCheckIcon />}>{fa(validationRules)} قاعده‌ی اعتبارسنجی</RuleChip>
            )}
            {field.condition && <RuleChip icon={<GitBranchIcon />}>نمایش شرطی</RuleChip>}
          </div>
        )}
      </div>
    </div>
  );
}

export function RuleChip({ children, icon, tone }: { children: ReactNode; icon: ReactNode; tone?: 'error' }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11px] [&_svg]:size-3.5',
        tone === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground',
      )}
    >
      {icon}
      {children}
    </span>
  );
}
