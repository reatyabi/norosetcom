'use client';

import { useState } from 'react';
import { ImageIcon, ImageUpIcon, Trash2Icon } from 'lucide-react';
import { Button, Input, cn } from '@noroset/ui';

export type LogoTitleAlign = 'start' | 'center' | 'end';

export interface LogoTitleValue {
  title: string;
  subtitle: string;
  logo_url: string;
  align: LogoTitleAlign;
  visible: boolean;
  show_logo: boolean;
  show_title: boolean;
  show_subtitle: boolean;
}

export interface LogoTitleProps {
  value: LogoTitleValue;
  formTitle?: string;
  editing?: boolean;
  onChange?: (patch: Partial<LogoTitleValue>) => void;
}

export function LogoTitleView({
  value,
  formTitle = '',
  placeholder = false,
}: {
  value: LogoTitleValue;
  formTitle?: string;
  placeholder?: boolean;
}) {
  const title = value.title || formTitle;
  const showTitle = value.show_title && title.trim() !== '';
  const showSubtitle = value.show_subtitle && value.subtitle.trim() !== '';
  if (!value.visible || (!value.show_logo && !showTitle && !showSubtitle)) return null;

  const center = value.align === 'center';
  const end = value.align === 'end';
  return (
    <div
      className={cn(
        'flex w-full min-w-0 gap-3',
        center ? 'flex-col items-center text-center' : 'items-center',
        end ? 'flex-row-reverse text-end' : 'text-start',
      )}
      data-area="logo"
    >
      {value.show_logo ? (
        value.logo_url ? (
          <img src={value.logo_url} alt="" className="size-11 shrink-0 rounded-xl object-cover ring-1 ring-black/10" />
        ) : placeholder ? (
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground ring-1 ring-border">
            <ImageIcon className="size-5" />
          </span>
        ) : null
      ) : null}
      <div className={cn('flex min-w-0 flex-col gap-0.5', center ? 'items-center' : end ? 'items-end' : 'items-start')}>
        {showTitle ? <span className="max-w-full truncate text-base font-semibold">{title}</span> : null}
        {showSubtitle ? <span className="max-w-full truncate text-xs text-muted-foreground">{value.subtitle}</span> : null}
      </div>
    </div>
  );
}

export function LogoTitle({ value, formTitle, editing = false, onChange }: LogoTitleProps) {
  const [urlDraft, setUrlDraft] = useState(value.logo_url);
  const [urlEditing, setUrlEditing] = useState(false);
  if (!editing || !onChange) return <LogoTitleView value={value} formTitle={formTitle} />;

  const toggle = (key: 'visible' | 'show_logo' | 'show_title' | 'show_subtitle', label: string) => (
    <Button
      key={key}
      type="button"
      size="sm"
      variant={value[key] ? 'secondary' : 'ghost'}
      aria-pressed={value[key]}
      onClick={() => onChange({ [key]: !value[key] })}
    >
      {label}
    </Button>
  );

  return (
    <div className="flex w-full flex-col gap-3">
      <div className={cn('w-full rounded-xl border border-dashed border-foreground/15 bg-card/60 p-3', !value.visible && 'opacity-60')}>
        <LogoTitleView value={{ ...value, visible: true }} formTitle={formTitle} placeholder />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
          <span>عنوان</span>
          <Input
            value={value.title}
            maxLength={200}
            placeholder={formTitle || 'نام کسب‌وکار / سازمان'}
            onChange={(event) => onChange({ title: event.target.value })}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
          <span>زیرعنوان</span>
          <Input
            value={value.subtitle}
            maxLength={200}
            placeholder="نام فضای کاری"
            onChange={(event) => onChange({ subtitle: event.target.value })}
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="اجزای نمایش لوگو">
        {toggle('visible', 'المان لوگو')}
        {toggle('show_logo', 'تصویر')}
        {toggle('show_title', 'عنوان')}
        {toggle('show_subtitle', 'زیرعنوان')}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setUrlDraft(value.logo_url);
            setUrlEditing((open) => !open);
          }}
        >
          <ImageUpIcon />
          {value.logo_url ? 'تعویض تصویر' : 'افزودن تصویر'}
        </Button>
        {value.logo_url ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => onChange({ logo_url: '' })}>
            <Trash2Icon />
            حذف تصویر
          </Button>
        ) : null}
      </div>
      {urlEditing ? (
        <div className="flex items-center gap-2">
          <Input
            dir="ltr"
            value={urlDraft}
            placeholder="https://example.com/logo.png"
            onChange={(event) => setUrlDraft(event.target.value)}
          />
          <Button
            type="button"
            size="sm"
            onClick={() => {
              const url = urlDraft.trim();
              if (url && !url.startsWith('https://')) return;
              onChange({ logo_url: url });
              setUrlEditing(false);
            }}
          >
            تأیید
          </Button>
        </div>
      ) : null}
    </div>
  );
}