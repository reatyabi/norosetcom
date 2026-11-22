'use client';

import { PublicFormClient, type PublicFormSubmission, type PublicFormSubmissionResult, type PublicFormView } from '@noroset/noroform/ui';
import { api, ApiError, errorMessage } from '@/lib/api';

export function PublicFormRuntime({ form }: { form: PublicFormView }) {
  const submit = async (submission: PublicFormSubmission): Promise<PublicFormSubmissionResult> => {
    try {
      await api(`/noroform/public/forms/${encodeURIComponent(form.slug)}/submissions`, {
        method: 'POST',
        body: submission,
      });
      return { ok: true };
    } catch (error) {
      if (error instanceof ApiError) {
        const body = error.body as { errors?: unknown } | null;
        const errors = Array.isArray(body?.errors) ? body.errors : undefined;
        return { ok: false, code: error.code, errors, message: errorMessage(error) };
      }
      return { ok: false, message: errorMessage(error) };
    }
  };

  return <PublicFormClient form={form} onSubmit={submit} />;
}
