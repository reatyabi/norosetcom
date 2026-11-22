'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { formPreview } from '@noroset/field-engine';
import { api, errorMessage } from '@/lib/api';
import { routes } from '@/lib/routes';
import { useTenant } from '../session';
import type { FormChannel } from './forms-shared';
import { BLANK_FORM_TITLE, FORM_TEMPLATES, templateDefinition, type FormTemplate } from './templates';

/** تصویر بندانگشتی هر قالب (شناسه‌ها در پیش‌نمایش اهمیتی ندارند). */
export const TEMPLATE_PREVIEWS = new Map(FORM_TEMPLATES.map((t) => [t.id, formPreview(templateDefinition(t))]));

/** ساخت فرم خالی یا از قالب با نوع انتخاب‌شده و رفتن به ویرایشگر. */
export function useCreateForm() {
  const router = useRouter();
  const tenant = useTenant();
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function create(template: FormTemplate | undefined, channel: FormChannel) {
    setCreating(template?.id ?? 'blank');
    setError(null);
    try {
      const form = await api<{ id: string }>('/noroform/forms', {
        method: 'POST',
        tenantId: tenant.tenantId,
        body: template
          ? { title: template.title, channel, draftDefinition: templateDefinition(template) }
          : { title: BLANK_FORM_TITLE, channel },
      });
      router.push(routes.form.editor(form.id));
    } catch (err) {
      setError(errorMessage(err));
      setCreating(null);
    }
  }
  return { create, creating, error };
}
