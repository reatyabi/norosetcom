'use client';

import { useState } from 'react';
import { Alert, AlertDescription, Segmented } from '@noroset/ui';
import type { AuditItem, Page } from '@noroset/admin/ui';
import { AdminPage, Pager, query, useAdminResource } from '../_components/admin-ui';
import { AuditList } from '../_components/audit-list';
import { ItemTableSkeleton } from '../../_components/page-skeletons';

const LIMIT = 50;
type TargetFilter = 'all' | 'user' | 'tenant' | 'module';
const TARGET_ITEMS: { value: TargetFilter; label: string }[] = [
  { value: 'all', label: 'همه' },
  { value: 'user', label: 'کاربران' },
  { value: 'tenant', label: 'فضاهای کاری' },
  { value: 'module', label: 'ماژول‌ها' },
];

export default function AdminAuditPage() {
  const [target, setTarget] = useState<TargetFilter>('all');
  const [offset, setOffset] = useState(0);
  const { data, error } = useAdminResource<Page<AuditItem>>(
    `/admin/audit${query({ targetType: target === 'all' ? undefined : target, limit: LIMIT, offset })}`,
  );

  return (
    <AdminPage title="لاگ ممیزی" description="همه‌ی کارهای تغییردهنده‌ی مدیران پلتفرم؛ قابل ویرایش یا حذف نیست.">
      <Segmented
        value={target}
        onChange={(v) => {
          setTarget(v);
          setOffset(0);
        }}
        items={TARGET_ITEMS}
        className="w-full sm:w-fit"
      />
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {data ? (
        <section className="flex flex-col gap-2">
          <AuditList items={data.items} />
          <Pager offset={data.offset} limit={data.limit} total={data.total} shown={data.items.length} noun="مورد" onChange={setOffset} />
        </section>
      ) : error ? null : (
        <ItemTableSkeleton count={8} />
      )}
    </AdminPage>
  );
}
