'use client';

import { useState } from 'react';
import { AlignCenterIcon, AlignLeftIcon, AlignRightIcon, EyeIcon, PencilIcon } from 'lucide-react';
import { Button, cn, Skeleton, Switch } from '@noroset/ui';
import { LogoTitle } from '@noroset/noroform/ui';
import { FieldZone } from './canvas';
import type { HeaderAlign, HeaderLogo } from './types';

const ALIGN_ITEMS: { value: HeaderAlign; label: string; icon: typeof AlignRightIcon }[] = [
  { value: 'start', label: 'راست‌چین', icon: AlignRightIcon },
  { value: 'center', label: 'وسط‌چین', icon: AlignCenterIcon },
  { value: 'end', label: 'چپ‌چین', icon: AlignLeftIcon },
];

/** ظرف ادیت هدر در سطح ادیتور؛ المان‌های FormElement (فعلاً لوگو) داخل آن قرار می‌گیرند. */
export function HeaderEditor({
  value,
  formTitle,
  sticky,
  onStickyChange,
  onChange,
  loading,
}: {
  value: HeaderLogo;
  formTitle: string;
  sticky: boolean;
  onStickyChange: (sticky: boolean) => void;
  onChange: (patch: Partial<HeaderLogo>) => void;
  loading: boolean;
}) {
  const [editing, setEditing] = useState(true);

  return (
    <FieldZone title="هدر فرم">
      <div className="flex w-full min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/60 px-2.5 py-1.5">
          <div className="flex items-center gap-1" role="group" aria-label="چیدمان لوگو در هدر">
            {ALIGN_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = value.align === item.value;
              return (
                <Button
                  key={item.value}
                  type="button"
                  size="icon-xs"
                  variant={active ? 'secondary' : 'ghost'}
                  aria-label={item.label}
                  aria-pressed={active}
                  title={item.label}
                  onClick={() => onChange({ align: item.value })}
                >
                  <Icon />
                </Button>
              );
            })}
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={sticky} onCheckedChange={onStickyChange} aria-label="هدر چسبان" />
            هدر چسبان
          </label>
          <Button
            type="button"
            size="xs"
            variant={editing ? 'secondary' : 'ghost'}
            aria-pressed={!editing}
            onClick={() => setEditing((active) => !active)}
          >
            {editing ? <EyeIcon /> : <PencilIcon />}
            {editing ? 'پیش‌نمایش نهایی' : 'ویرایش لوگو'}
          </Button>
        </div>

        <div className={cn('rounded-xl border p-2 transition-colors', sticky ? 'border-black/10 bg-white/70 backdrop-blur' : 'border-dashed border-foreground/15 bg-transparent')}>
          {loading ? (
            <div className="flex flex-col gap-2 p-1">
              <Skeleton className="size-12 rounded-xl" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          ) : (
            <div>
              <LogoTitle value={value} formTitle={formTitle} editing={editing} onChange={onChange} />
            </div>
          )}
        </div>

        <p className="text-[11px] leading-5 text-muted-foreground">
          عنوان و زیرعنوان پیش‌فرض از فضای کاری پر می‌شوند و فقط برای همین فرم قابل ویرایش‌اند. در حالت چسبان، هدر شیشه‌ای و در حالت عادی شفاف است.
        </p>
      </div>
    </FieldZone>
  );
}