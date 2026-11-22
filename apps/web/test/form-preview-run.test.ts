import { describe, expect, it } from 'vitest';
import { answerErrorText, pageErrors, runPreview } from '../src/app/(panel)/form/[id]/editor/_components/preview-run';
import { makeField, type EditorField, type EditorPage } from '../src/app/(panel)/form/[id]/editor/_components/types';

// پیش‌نمایش ادیتور فرم همان قواعد field-engine را اجرا می‌کند (docs/architecture.md §8.8).

const field = (key: string, patch: Partial<EditorField> = {}): EditorField => ({
  ...makeField({ key, label: key, icon: null as never }),
  ...patch,
});

describe('form editor preview run', () => {
  const choice = field('single_choice', { fieldId: 'f_choice00' });
  const follow = field('short_text', {
    fieldId: 'f_follow00',
    required: true,
    condition: { effect: 'show', field_id: 'f_choice00', op: 'eq', value: 'option_2' },
  });
  const phone = field('phone', { fieldId: 'f_phone000', required: true });
  const pages: EditorPage[] = [
    { id: 'p1', title: '۱', kind: 'main', fields: [choice, follow], source: {} },
    { id: 'p2', title: '۲', kind: 'main', fields: [phone], source: {} },
  ];

  it('shows a conditional question only when its condition holds', () => {
    expect(runPreview(pages, {}).visible.has(follow.id)).toBe(false);
    expect(runPreview(pages, { f_choice00: 'option_1' }).visible.has(follow.id)).toBe(false);
    expect(runPreview(pages, { f_choice00: 'option_2' }).visible.has(follow.id)).toBe(true);
  });

  it('keeps only visible, valid answers in their stored form', () => {
    const { answers } = runPreview(pages, { f_choice00: 'option_1', f_follow00: 'پنهان', f_phone000: '۰۹۱۲ ۳۴۵ ۶۷۸۹' });
    expect(answers).toEqual({ f_choice00: 'option_1', f_phone000: '+989123456789' });
  });

  it('blocks the page on a required or invalid answer, with Persian messages', () => {
    const errs = pageErrors([phone], {});
    expect(errs).toEqual({ f_phone000: { code: 'required' } });
    expect(answerErrorText(errs.f_phone000!)).toBe('پاسخ به این پرسش لازم است.');
    expect(pageErrors([phone], { f_phone000: '123' })).toEqual({ f_phone000: { code: 'invalid_phone' } });
    expect(pageErrors([phone], { f_phone000: '09123456789' })).toEqual({});
  });
});
