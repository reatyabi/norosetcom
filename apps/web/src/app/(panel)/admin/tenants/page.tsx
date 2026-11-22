'use client';

import Link from 'next/link';
import { useState } from 'react';
import { SearchIcon } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Card,
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  MotionArt,
  Input,
  Segmented,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@noroset/ui';
import { ItemTableSkeleton } from '../../_components/page-skeletons';
import type { AdminTenantItem, Page, TenantStatus } from '@noroset/admin/ui';
import { formatDateTime } from '@/lib/format';
import { routes } from '@/lib/routes';
import { AdminPage, fa, Pager, query, TenantStatusBadge, useAdminResource, useDebounced } from '../_components/admin-ui';

const LIMIT = 50;
type StatusFilter = 'all' | TenantStatus;
const STATUS_ITEMS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'همه' },
  { value: 'active', label: 'فعال' },
  { value: 'suspended', label: 'معلق' },
];

export default function AdminTenantsPage() {
  const [status, setStatus] = useState<StatusFilter>('all');
  const [text, setText] = useState('');
  const [offset, setOffset] = useState(0);
  const q = useDebounced(text.trim());
  const { data, error } = useAdminResource<Page<AdminTenantItem>>(
    `/admin/tenants${query({ q, status: status === 'all' ? undefined : status, limit: LIMIT, offset })}`,
  );

  return (
    <AdminPage title="فضاهای کاری" description="همه‌ی فضاهای کاری (tenant) پلتفرم">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          value={status}
          onChange={(v) => {
            setStatus(v);
            setOffset(0);
          }}
          items={STATUS_ITEMS}
          className="w-full sm:w-auto"
        />
        <div className="relative w-full sm:w-72">
          <SearchIcon className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="جست‌وجوی فضای کاری"
            placeholder="نام یا نشانی"
            className="ps-8"
            value={text}
            maxLength={100}
            onChange={(e) => {
              setText(e.target.value);
              setOffset(0);
            }}
          />
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!data && !error ? (
        <ItemTableSkeleton count={8} />
      ) : data && data.items.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia>
              <MotionArt name="no-results" className="size-28" />
            </EmptyMedia>
            <EmptyTitle>فضای کاری پیدا نشد</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : data ? (
        <section className="flex flex-col gap-2">
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>فضای کاری</TableHead>
                  <TableHead>وضعیت</TableHead>
                  <TableHead className="hidden md:table-cell">اعضا</TableHead>
                  <TableHead className="hidden lg:table-cell">ساخت</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="max-w-0 min-w-48">
                      <Link href={routes.admin.tenant(t.id)} className="flex min-w-0 flex-col gap-0.5 hover:underline">
                        <span className="truncate font-medium">{t.name}</span>
                        <span dir="ltr" className="truncate text-end text-xs text-muted-foreground">
                          {t.slug}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <TenantStatusBadge status={t.status} />
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{fa(t.memberCount)}</TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">{formatDateTime(t.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <Pager offset={data.offset} limit={data.limit} total={data.total} shown={data.items.length} noun="فضای کاری" onChange={setOffset} />
        </section>
      ) : null}
    </AdminPage>
  );
}
