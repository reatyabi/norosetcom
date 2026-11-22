'use client';

/**
 * دیالوگ انتشار: «دسترسی پاسخ‌ها» و «روش احراز لینک پاسخ» با کارت انتخاب می‌شوند (رادیوی بومی
 * داخل کارت، تا کلیدهای جهت‌دار و «۱ از ۲» برای صفحه‌خوان درست کار کند) و «مدت اعتبار لینک»
 * فقط در حالت مرتبط (لینک بیرونی + روش احراز انتخاب‌شده) نمایش داده می‌شود، نه ویرایش.
 *
 * ساختار بر اساس الگوی دیزاین‌سیستم است (`DialogHeader` + بدنه‌ی اسکرول‌شونده + `DialogFooter`).
 */

import { useId, useState, type ReactNode } from 'react';
import {
  Building2Icon,
  CircleAlertIcon,
  CircleCheckIcon,
  ClockIcon,
  Globe2Icon,
  KeyRoundIcon,
  Link2Icon,
  ShieldAlertIcon,
  SmartphoneIcon,
} from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Button,
  cn,
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from '@noroset/ui';
import type { DefinitionIssue } from '@noroset/field-engine';
import { hoverNativeScroll } from '@/components/editor-ui';
import type { FormSummary } from '../../../forms-shared';
import { fa } from './types';

export interface PublishSettings {
  responseAccess: 'internal' | 'external';
  responseAuth: 'link' | 'key' | 'otp' | null;
  responseAccessTtlDays: number;
}

type AccessKind = PublishSettings['responseAccess'];
type AuthKind = NonNullable<PublishSettings['responseAuth']>;

interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  description: string;
  icon: ReactNode;
}

const ACCESS_OPTIONS: readonly ChoiceOption<AccessKind>[] = [
  {
    value: 'internal',
    label: 'فقط فضای کاری',
    description: 'پاسخ‌ها در پنل و برای اعضای فضای کاری.',
    icon: <Building2Icon />,
  },
  {
    value: 'external',
    label: 'اشتراک بیرونی',
    description: 'لینک پاسخ برای مخاطب بیرون سازمان.',
    icon: <Globe2Icon />,
  },
];

const AUTH_OPTIONS: readonly ChoiceOption<AuthKind>[] = [
  { value: 'link', label: 'لینک توکن', description: 'توکن یک‌بارمصرف در خود لینک', icon: <Link2Icon /> },
  { value: 'key', label: 'کلید دسترسی', description: 'کلید کوتاهی که خودتان می‌دهید', icon: <KeyRoundIcon /> },
  { value: 'otp', label: 'OTP موبایل', description: 'کد پیامکی برای هر بار ورود', icon: <SmartphoneIcon /> },
];

/** گروه کارت‌های رادیویی: رادیوی بومی + ظاهر کارتی. */
function ChoiceCards<T extends string>({
  name,
  legend,
  value,
  options,
  columns,
  describedBy,
  onChange,
}: {
  name: string;
  legend: string;
  value: T | null;
  options: readonly ChoiceOption<T>[];
  columns: 2 | 3;
  describedBy?: string;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-2 border-0 p-0">
      <legend className="mb-1.5 text-sm font-medium text-foreground">{legend}</legend>
      <div className={cn('grid gap-2', columns === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2')}>
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <label
              key={option.value}
              className={cn(
                'relative flex cursor-pointer flex-col gap-1.5 rounded-xl border p-2.5 text-start transition-colors duration-150 ease-fluent sm:p-3',
                'focus-within:ring-2 focus-within:ring-ring has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                selected
                  ? 'border-primary bg-primary/5'
                  : 'border-input bg-card hover:border-primary/40 hover:bg-muted/40',
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                aria-describedby={describedBy}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span className="flex min-w-0 items-center gap-1.5">
                <span
                  aria-hidden
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4',
                    selected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {option.icon}
                </span>
                <span className="min-w-0 flex-1 text-xs font-medium leading-5 sm:text-sm">{option.label}</span>
                {selected && <CircleCheckIcon className="size-4 shrink-0 text-primary" aria-hidden />}
              </span>
              <span className="text-[11px] leading-4 text-muted-foreground sm:text-xs sm:leading-5">
                {option.description}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function PublishDialog({
  form,
  publishing,
  error,
  issues,
  onClose,
  onPublish,
}: {
  form: FormSummary;
  publishing: boolean;
  error: string | null;
  issues: DefinitionIssue[] | null;
  onClose: () => void;
  onPublish: (settings: PublishSettings) => Promise<boolean>;
}) {
  const baseId = useId();
  const [responseAccess, setResponseAccess] = useState<AccessKind>(form.responseAccess);
  const [responseAuth, setResponseAuth] = useState<AuthKind | null>(form.responseAuth);

  const authMissing = responseAccess === 'external' && !responseAuth;
  // مدت اعتبار فقط وقتی معنا دارد که واقعاً لینکی ساخته می‌شود (بیرونی + روش احراز).
  const showTtl = responseAccess === 'external' && responseAuth !== null;

  const submit = async () => {
    const ok = await onPublish({
      responseAccess,
      responseAuth: responseAccess === 'external' ? responseAuth : null,
      // فقط نمایش است؛ مقدار ذخیره‌شده‌ی فرم دست‌نخورده می‌ماند.
      responseAccessTtlDays: form.responseAccessTtlDays,
    });
    if (ok) onClose();
  };

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        // تا پایان انتشار بسته نمی‌شود تا نتیجه‌ی درخواست از دست نرود.
        if (!next && !publishing) onClose();
      }}
    >
      <DialogPopup dir="rtl" className="sm:max-w-lg">
        <DialogHeader className="gap-1.5 pe-14">
          <DialogTitle className="text-lg">انتشار و تنظیمات پاسخ</DialogTitle>
          <DialogDescription>
            دسترسی پاسخ‌ها و روش احراز را انتخاب کنید. انتشار بدون روش احراز مجاز است، اما ساخت لینک پاسخ تا
            انتخاب آن غیرفعال می‌ماند.
          </DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            'flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-6 pt-1 pb-6',
            hoverNativeScroll,
          )}
        >
          <div className="flex flex-col gap-2">
            <ChoiceCards
              name="response-access"
              legend="دسترسی پاسخ‌ها"
              value={responseAccess}
              options={ACCESS_OPTIONS}
              columns={2}
              describedBy={`${baseId}-access-hint`}
              onChange={(next) => setResponseAccess(next)}
            />
            <p id={`${baseId}-access-hint`} className="text-xs leading-5 text-muted-foreground">
              {responseAccess === 'internal'
                ? 'پاسخ‌ها فقط در پنل و برای اعضای فضای کاری دیده می‌شوند.'
                : 'هر کسی که لینک پاسخ را داشته باشد می‌تواند پاسخ ببیند؛ با روش احراز محدود می‌شود.'}
            </p>
          </div>

          {responseAccess === 'external' && (
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-3">
              <ChoiceCards
                name="response-auth"
                legend="روش احراز لینک پاسخ"
                value={responseAuth}
                options={AUTH_OPTIONS}
                columns={3}
                describedBy={`${baseId}-auth-hint`}
                onChange={(next) => setResponseAuth(next)}
              />
              <p
                id={`${baseId}-auth-hint`}
                className={cn('text-xs leading-5', authMissing ? 'text-destructive' : 'text-muted-foreground')}
              >
                {authMissing
                  ? 'تا انتخاب روش، دکمه‌ی ساخت لینک در «پاسخ‌ها» غیرفعال است.'
                  : 'لینک پاسخ فقط با همین روش باز می‌شود.'}
              </p>

              {showTtl && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-card px-3 py-2 text-sm ring-1 ring-border">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <ClockIcon className="size-4" aria-hidden />
                    مدت اعتبار لینک پاسخ
                  </span>
                  <span className="font-medium">{fa(form.responseAccessTtlDays)} روز</span>
                </div>
              )}
            </div>
          )}

          {error ? (
            <Alert variant="destructive">
              <AlertDescription className="flex items-start gap-2">
                <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
                {error}
              </AlertDescription>
            </Alert>
          ) : null}

          {issues && issues.length > 0 ? (
            <Alert variant="destructive">
              <AlertDescription className="flex items-start gap-2">
                <ShieldAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  فرم هنوز قابل انتشار نیست؛ {fa(issues.length)} مورد باید اصلاح شود. پس از بستن این دیالوگ،
                  روی هر مورد در بالای بوم بزنید تا به همان المان بروید.
                </span>
              </AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose} disabled={publishing}>
            انصراف
          </Button>
          <Button type="button" onClick={() => void submit()} loading={publishing}>
            {form.status === 'published' ? 'انتشار تغییرات' : 'انتشار'}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

