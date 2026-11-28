'use client';

/**
 * خطاهای «انتشار» به زبان فارسی و قابل‌رفتن: هر موردی که مسیرش به یک صفحه/المان اشاره کند،
 * با کلیک به همان‌جا می‌رود (خطاهای سطح قالب/تم فقط خواندنی‌اند).
 */

import { Alert, AlertDescription } from '@noroset/ui';
import type { DefinitionIssue } from '@noroset/field-engine';
import { type EditorPage, fa } from './types';
import { issueTarget } from './editor-ops';

export const PUBLISH_ISSUES: Record<string, string> = {
  no_main_page: 'فرم باید دست‌کم یک صفحه‌ی اصلی داشته باشد.',
  welcome_must_be_first: 'صفحه‌ی خوش‌آمد باید اولین صفحه باشد.',
  ending_must_be_last: 'صفحه‌ی پایان باید آخرین صفحه باشد.',
  condition_only_on_main_page: 'شرط نمایش صفحه فقط برای صفحه‌ی اصلی مجاز است.',
  unknown_type: 'نوع یکی از فیلدها یا محتواها پشتیبانی نمی‌شود.',
  unknown_field_reference: 'یک شرط به پرسشی اشاره می‌کند که وجود ندارد.',
  forward_reference: 'شرط نمی‌تواند به پرسش‌های بعدی اشاره کند.',
  invalid_condition_value: 'مقدار یکی از شرط‌ها معتبر نیست.',
  value_required: 'برای شرط یک مقدار لازم است.',
  value_not_allowed: 'این شرط نباید مقدار داشته باشد.',
  op_not_supported: 'عملگر انتخاب‌شده برای نوع پرسش پشتیبانی نمی‌شود.',
  field_not_allowed_on_page_kind: 'این نوع فیلد فقط در صفحه‌ی اصلی مجاز است.',
  provider_and_video_id_together: 'ارائه‌دهنده و شناسه‌ی ویدیو باید هر دو تنظیم شوند.',
  invalid_video_id: 'شناسه‌ی ویدیوی واردشده معتبر نیست.',
  duplicate_option_value: 'مقدار گزینه‌های یک پرسش باید یکتا باشد.',
  https_only: 'نشانی‌های بیرونی باید با https شروع شوند.',
  invalid_format: 'یکی از مقدارهای واردشده قالب معتبری ندارد.',
  invalid_type: 'یکی از مقدارهای واردشده نوع درستی ندارد.',
  too_small: 'مقدار یکی از تنظیمات از حداقل مجاز کمتر است.',
  too_big: 'مقدار یکی از تنظیمات از حداکثر مجاز بیشتر است.',
  unrecognized_keys: 'تنظیمات ناشناخته در فرم وجود دارد.',
  duplicate_item_id: 'شناسه‌ی یک المان تکراری است.',
  duplicate_field_id: 'شناسه‌ی یک پرسش تکراری است.',
  duplicate_page_id: 'شناسه‌ی یک صفحه تکراری است.',
  too_many_items: 'تعداد المان‌های فرم از سقف مجاز بیشتر است.',
};

/** حداکثر موردی که در نوار خطا نشان داده می‌شود؛ بقیه شمارش می‌شوند. */
const VISIBLE_ISSUES = 8;

export function PublishIssues({
  issues,
  pages,
  onFocusIssue,
}: {
  issues: DefinitionIssue[];
  pages: EditorPage[];
  onFocusIssue: (issue: DefinitionIssue) => void;
}) {
  return (
    <Alert variant="destructive">
      <AlertDescription>
        <p className="font-semibold">فرم هنوز قابل انتشار نیست. برای اصلاح، روی هر مورد بزن:</p>
        <ul className="mt-1 list-inside list-disc">
          {issues.slice(0, VISIBLE_ISSUES).map((issue, index) => {
            const target = issueTarget(issue.path, pages);
            const text = PUBLISH_ISSUES[issue.code] ?? 'یکی از بخش‌های فرم معتبر نیست.';
            const numbers = issue.path.filter((part): part is number => typeof part === 'number');
            return (
              <li key={`${issue.path.join('.')}-${index}`}>
                {target ? (
                  <button
                    type="button"
                    title="رفتن به محل خطا"
                    onClick={() => onFocusIssue(issue)}
                    className="text-start underline decoration-dotted underline-offset-4 hover:no-underline"
                  >
                    {text}
                    {numbers.length > 1 && <span className="ms-1 text-xs opacity-70">({numbers.map((n) => fa(n + 1)).join('، ')})</span>}
                  </button>
                ) : (
                  <>
                    {text}
                    {numbers.length > 1 && <span className="ms-1 text-xs opacity-70">({numbers.map((n) => fa(n + 1)).join('، ')})</span>}
                  </>
                )}
              </li>
            );
          })}
          {issues.length > VISIBLE_ISSUES && <li>و {fa(issues.length - VISIBLE_ISSUES)} مورد دیگر…</li>}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
