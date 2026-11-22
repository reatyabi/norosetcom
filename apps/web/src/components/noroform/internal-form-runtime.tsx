'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PublicFormClient, type PublicFormSubmission, type PublicFormSubmissionResult, type PublicFormView } from '@noroset/noroform/ui';
import type { FormDefinition } from '@noroset/field-engine';
import { api, ApiError, errorMessage } from '@/lib/api';
import { routes } from '@/lib/routes';

interface InternalFormResponse {
  channel: 'internal';
  formId: string;
  status: 'published' | 'closed';
  title: string;
  versionId: string;
  versionNumber: number;
  definition: FormDefinition;
  closedMessage?: string;
}

/** اجرای فرم داخلی با نشست پنل؛ API خودش عضویت فعال همان workspace را بررسی می‌کند. */
export function InternalFormRuntime({ id }: { id: string }) {
  const router = useRouter();
  const [form, setForm] = useState<PublicFormView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api<InternalFormResponse>(`/noroform/internal/forms/${id}`)
      .then((view) => {
        if (!active) return;
        setForm(
          view.status === 'closed'
            ? { status: 'closed', slug: id, title: view.title, closedMessage: view.closedMessage ?? '' }
            : {
                status: 'published',
                slug: id,
                title: view.title,
                versionId: view.versionId,
                definition: view.definition,
                // فرم داخلی در شل پلتفرم است و نشان بیرونی ندارد.
                branding: { forceLicense: false },
              },
        );
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace(routes.auth(routes.form.internal(id)));
          return;
        }
        setError(err instanceof ApiError && err.status === 404 ? 'این فرم برای شما در دسترس نیست.' : errorMessage(err));
      });
    return () => {
      active = false;
    };
  }, [id, router]);

  const submit = async (submission: PublicFormSubmission): Promise<PublicFormSubmissionResult> => {
    try {
      await api(`/noroform/internal/forms/${id}/submissions`, { method: 'POST', body: submission });
      return { ok: true };
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { errors?: unknown } | null;
        const errors = Array.isArray(body?.errors) ? body.errors : undefined;
        return { ok: false, code: err.code, errors, message: errorMessage(err) };
      }
      return { ok: false, message: errorMessage(err) };
    }
  };

  if (error) {
    return (
      <div className="mx-auto max-w-xl rounded-xl bg-card p-8 text-center shadow-xs ring-1 ring-border">
        <h1 className="text-lg font-semibold">فرم در دسترس نیست</h1>
        <p className="mt-3 text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }
  if (!form) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-3 py-8" aria-busy="true">
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }
  return <PublicFormClient form={form} onSubmit={submit} />;
}
