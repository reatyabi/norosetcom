'use client';

import { useMemo } from 'react';
import { ImagePickerField } from '@noroset/ui';
import { assetUrlFor, type ImageRef } from '@noroset/norolink/ui';
import { errorMessage } from '@/lib/api';
import { norolinkImageSource } from '@/lib/file-sources';
import { imagePickerOptions, type ImageUse } from './fields';

/** فیلد تصویر صفحه با کارت آپلود مشترک (سرور نوع، ابعاد و متادیتا را بررسی/حذف می‌کند). */
export function ImageField({
  value,
  fallback,
  onChange,
  pageId,
  tenantId,
  assetBaseUrl,
  label,
  round,
  use = round ? 'avatar' : 'og',
  disabled,
}: {
  value: ImageRef | null;
  /** نمایش وقتی مقدار خالی است (مثلاً تصویر پروفایل برای OG)؛ حذف فقط برای مقدار خود فیلد. */
  fallback?: ImageRef | null;
  onChange: (image: ImageRef | null) => void;
  pageId: string;
  tenantId: string;
  assetBaseUrl: string;
  label: string;
  round?: boolean;
  use?: ImageUse;
  disabled?: boolean;
}) {
  const shown = value ?? fallback ?? null;
  const source = useMemo(() => norolinkImageSource(tenantId, pageId), [tenantId, pageId]);
  return (
    <ImagePickerField
      label={label}
      round={round}
      disabled={disabled}
      previewUrl={shown ? assetUrlFor(assetBaseUrl)(shown) : null}
      source={source}
      options={imagePickerOptions(use)}
      errorMessage={errorMessage}
      onPick={(f) => {
        if (f.width && f.height) onChange({ file_id: f.id, width: f.width, height: f.height });
      }}
      onRemove={value ? () => onChange(null) : undefined}
    />
  );
}
