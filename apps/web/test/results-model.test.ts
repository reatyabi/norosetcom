import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatJalali } from '@noroset/field-engine';
import {
  cellText,
  fa,
  RANGES,
  rangeDays,
  summaryOf,
  tehranToday,
  type FieldColumn,
  type SubmissionItem,
} from '../src/app/(panel)/form/[id]/results/_components/results-model';

// منطق خالص صفحه‌ی پاسخ‌ها پس از استخراج به results-model.ts باید همان رفتار قبلی را بدهد
// (docs/frontend-architecture.md §۱۰). این تست‌ها نگهبان همان قراردادند.

const columns: FieldColumn[] = [
  { fieldId: 'f_name', label: 'نام', type: 'short_text', removed: false },
  { fieldId: 'f_city', label: 'شهر', type: 'single_choice', removed: false },
  { fieldId: 'f_note', label: 'یادداشت', type: 'long_text', removed: false },
];

function submission(answers: SubmissionItem['answers']): SubmissionItem {
  return {
    id: 's1',
    createdAt: '2026-11-19T10:00:00.000Z',
    versionId: 'v1',
    versionNumber: 1,
    answers,
    locked: false,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('cellText', () => {
  it('مقدار خالی را رشته‌ی خالی می‌کند', () => {
    expect(cellText(undefined, 'short_text')).toBe('');
    expect(cellText(null, 'short_text')).toBe('');
  });

  it('آرایه را با ویرگول فارسی به هم می‌چسباند', () => {
    expect(cellText(['الف', 'ب'], 'multi_choice')).toBe('الف، ب');
  });

  it('عدد را با ارقام فارسی نمایش می‌دهد', () => {
    expect(cellText(1234, 'number')).toBe(fa(1234));
    expect(cellText(1234, 'number')).not.toMatch(/[0-9]/);
  });

  it('بولی را بله/خیر می‌کند', () => {
    expect(cellText(true, 'checkbox')).toBe('بله');
    expect(cellText(false, 'checkbox')).toBe('خیر');
  });

  it('تاریخ ISO را فقط برای نوع date شمسی می‌کند', () => {
    expect(cellText('2026-03-21', 'date')).toBe(formatJalali('2026-03-21'));
    expect(cellText('2026-03-21', 'short_text')).toBe('2026-03-21');
  });
});

describe('summaryOf', () => {
  it('حداکثر دو مقدار پرشده را با برچسب و جداکننده‌ی «·» برمی‌گرداند', () => {
    const item = submission({ f_name: 'علی', f_city: 'تهران', f_note: 'توضیح' });
    expect(summaryOf(item, columns)).toBe('نام: علی · شهر: تهران');
  });

  it('ستون‌های خالی را رد می‌کند و ترتیب ستون‌ها را حفظ می‌کند', () => {
    const item = submission({ f_city: 'شیراز' });
    expect(summaryOf(item, columns)).toBe('شهر: شیراز');
  });

  it('پاسخ بدون مقدار، خلاصه‌ی خالی می‌دهد', () => {
    expect(summaryOf(submission({}), columns)).toBe('');
  });
});

describe('fa', () => {
  it('هیچ رقم لاتینی باقی نمی‌گذارد', () => {
    const text = fa(1405);
    expect(text).not.toMatch(/[0-9]/);
    expect(text).toContain('۱');
    expect(text).toContain('۵');
  });
});

describe('rangeDays / tehranToday', () => {
  it('بازه‌ی همه شامل from/to نیست', () => {
    expect(rangeDays('all')).toEqual({});
  });

  it('امروز و ۷ روز اخیر را با وقت تهران حساب می‌کند', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-19T10:00:00Z')); // ۱۳:۳۰ تهران
    expect(tehranToday()).toBe('2026-11-19');
    expect(rangeDays('today')).toEqual({ from: '2026-11-19', to: '2026-11-19' });
    expect(rangeDays('7')).toEqual({ from: '2026-11-13', to: '2026-11-19' });
    expect(rangeDays('90')).toEqual({ from: '2026-08-22', to: '2026-11-19' });
  });

  it('عبور از نیمه‌شب تهران را درست می‌بیند (UTC هنوز روز قبل است)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-19T21:00:00Z')); // ۰۰:۳۰ تهران، ۲۰ نوامبر
    expect(tehranToday()).toBe('2026-11-20');
    expect(rangeDays('today')).toEqual({ from: '2026-11-20', to: '2026-11-20' });
  });
});

describe('RANGES', () => {
  it('پنج گزینه‌ی یکتا دارد و «همه» اول است', () => {
    expect(RANGES).toHaveLength(5);
    expect(RANGES[0]?.value).toBe('all');
    expect(new Set(RANGES.map((r) => r.value)).size).toBe(5);
  });
});
