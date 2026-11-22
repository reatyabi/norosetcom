'use client';

import { useState } from 'react';
import { Alert, AlertDescription } from '@noroset/ui';
import { routes } from '@/lib/routes';
import { PageHeader } from '@/components/settings-ui';
import { BlankThumb, StartCard } from '../../product-home';
import { FormThumb } from '../form-thumb';
import { TEMPLATE_PREVIEWS, useCreateForm } from '../create-form';
import { ChannelDialog } from '../channel-dialog';
import { FORM_TEMPLATE_CATEGORIES, FORM_TEMPLATE_CATEGORY_LABELS, FORM_TEMPLATES, type FormTemplate } from '../templates';
import type { FormChannel } from '../forms-shared';

/** گالری قالب‌های فرم (مثل گوگل فرم): فرم خالی و قالب‌ها به تفکیک دسته؛ انتخاب ← فرم تازه در ویرایشگر. */
export default function FormTemplatesPage() {
  const { create, creating, error } = useCreateForm();
  const [channelOpen, setChannelOpen] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<FormTemplate | undefined>(undefined);
  const startCreate = (template?: FormTemplate) => {
    setPendingTemplate(template);
    setChannelOpen(true);
  };
  const chooseChannel = (channel: FormChannel) => {
    const template = pendingTemplate;
    setChannelOpen(false);
    setPendingTemplate(undefined);
    void create(template, channel);
  };
  const card = 'w-auto sm:w-auto';
  return (
    <div className="flex flex-col gap-8">
      <PageHeader back={{ href: routes.form.home, label: 'فرم‌ها' }} title="گالری قالب‌ها" description="با یک قالب آماده شروع کنید؛ همه‌چیز در ویرایشگر قابل تغییر است." />
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-medium">شروع از صفر</h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-4">
          <StartCard className={card} label="فرم خالی" onClick={() => startCreate()} busy={creating === 'blank'} disabled={Boolean(creating)}>
            <BlankThumb />
          </StartCard>
        </div>
      </section>
      {FORM_TEMPLATE_CATEGORIES.map((category) => (
        <section key={category} className="flex flex-col gap-3">
          <h2 className="text-base font-medium">{FORM_TEMPLATE_CATEGORY_LABELS[category]}</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-4">
            {FORM_TEMPLATES.filter((t) => t.category === category).map((t) => (
              <StartCard
                key={t.id}
                className={card}
                label={t.title}
                description={t.description}
                onClick={() => startCreate(t)}
                busy={creating === t.id}
                disabled={Boolean(creating)}
              >
                <FormThumb preview={TEMPLATE_PREVIEWS.get(t.id)!} title={t.title} />
              </StartCard>
            ))}
          </div>
        </section>
      ))}
      <ChannelDialog open={channelOpen} onOpenChange={setChannelOpen} onChoose={chooseChannel} />
    </div>
  );
}
