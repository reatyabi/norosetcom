'use client';

import { use } from 'react';
import { canManage, useTenant } from '../../../session';
import { LinkEditor } from './_components/link-editor';
import { UndoProvider } from './_components/undo';

export default function LinkEditorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const tenant = useTenant();
  return (
    <UndoProvider>
      <LinkEditor
        key={`${tenant.tenantId}:${slug}`}
        target={{ kind: 'page', slug: decodeURIComponent(slug), tenantId: tenant.tenantId, manage: canManage(tenant.role) }}
      />
    </UndoProvider>
  );
}
