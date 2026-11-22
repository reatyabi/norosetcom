'use client';

import { use } from 'react';
import { LinkEditor } from '../../../../link/[slug]/editor/_components/link-editor';
import { UndoProvider } from '../../../../link/[slug]/editor/_components/undo';

/** ساخت و ویرایش قالب آماده با همان ادیتور صفحه‌ی لینک (فقط superadmin؛ گارد در API، بدون فضای کاری). */
export default function AdminTemplateEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <UndoProvider>
      <LinkEditor key={id} target={{ kind: 'template', id: decodeURIComponent(id) }} />
    </UndoProvider>
  );
}
