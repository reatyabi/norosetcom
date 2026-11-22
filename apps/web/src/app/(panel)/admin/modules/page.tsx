'use client';

import { useState, type ReactNode } from 'react';
import { FileTextIcon, FolderIcon, LinkIcon } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  FieldDescription,
  FieldLabel,
  Segmented,
  Skeleton,
  Textarea,
} from '@noroset/ui';
import {
  MODULE_DEFAULT_MESSAGE,
  MODULE_LABEL,
  MODULE_STATUS_LABEL,
  type AdminModuleState,
  type ModuleKey,
  type ModuleStatus,
} from '@noroset/admin/ui';
import { api, errorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { Notice } from '@/components/settings-ui';
import { AdminPage, useAdminResource } from '../_components/admin-ui';

const ICON: Record<ModuleKey, ReactNode> = {
  noroform: <FileTextIcon className="size-5" />,
  norolink: <LinkIcon className="size-5" />,
  norofile: <FolderIcon className="size-5" />,
};

const STATUS_ITEMS: { value: ModuleStatus; label: string }[] = [
  { value: 'active', label: MODULE_STATUS_LABEL.active },
  { value: 'maintenance', label: MODULE_STATUS_LABEL.maintenance },
  { value: 'off', label: MODULE_STATUS_LABEL.off },
];

/** اثر هر حالت، همان قاعده‌ی گارد بک‌اند (docs/architecture.md §9.11). */
const EFFECT: Record<ModuleStatus, string> = {
  active: 'همه‌چیز در دسترس است.',
  maintenance: 'پنل و ادیتور این محصول برای همه بسته می‌شود؛ صفحه‌ها، فرم‌ها و فایل‌های عمومی منتشرشده در دسترس می‌مانند.',
  off: 'همه‌چیز این محصول، از جمله صفحه‌ها، فرم‌ها و فایل‌های عمومی، از دسترس خارج می‌شود (داده‌ای پاک نمی‌شود).',
};

/** وابستگی‌هایی که باید پیش از خاموشی دیده شوند. */
const WARNING: Partial<Record<ModuleKey, string>> = {
  norofile: 'تصاویر نورولینک و تصویر پروفایل کاربران هم از نوروفایل سرو می‌شوند؛ با خاموشی، همه‌ی آن‌ها نمایش داده نمی‌شوند.',
};

export default function AdminModulesPage() {
  const modules = useAdminResource<AdminModuleState[]>('/admin/modules');
  return (
    <AdminPage title="ماژول‌ها" description="روشن، خاموش یا در حال تعمیر کردن هر محصول برای کل پلتفرم">
      {modules.error ? (
        <Alert variant="destructive">
          <AlertDescription>{modules.error}</AlertDescription>
        </Alert>
      ) : null}
      {modules.data ? (
        <div className="flex flex-col gap-4">
          {modules.data.map((m) => (
            <ModuleCard key={m.key} module={m} onSaved={(next) => modules.setData(next)} />
          ))}
        </div>
      ) : modules.error ? null : (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-8 rounded-lg" />
                  <Skeleton className="h-5 w-32 rounded" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-9 w-48 rounded-lg" />
            </div>
          ))}
        </div>
      )}
    </AdminPage>
  );
}

function ModuleCard({ module, onSaved }: { module: AdminModuleState; onSaved: (next: AdminModuleState[]) => void }) {
  const [status, setStatus] = useState<ModuleStatus>(module.status);
  const [message, setMessage] = useState(module.message ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const dirty = status !== module.status || (status !== 'active' && message.trim() !== (module.message ?? ''));

  async function save() {
    setError(null);
    setDone(null);
    setBusy(true);
    try {
      const next = await api<AdminModuleState[]>(`/admin/modules/${module.key}`, {
        method: 'PUT',
        body: { status, ...(status !== 'active' && message.trim() ? { message } : {}) },
      });
      onSaved(next);
      setDone('ذخیره شد. نمونه‌های دیگر سرور حداکثر تا ۱۰ ثانیه بعد اعمال می‌کنند.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-muted">{ICON[module.key]}</span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <CardTitle className="flex items-center gap-2">
            {MODULE_LABEL[module.key]}
            <Badge variant={module.status === 'active' ? 'secondary' : module.status === 'off' ? 'destructive' : 'info'}>
              {MODULE_STATUS_LABEL[module.status]}
            </Badge>
          </CardTitle>
          {module.updatedAt ? (
            <span className="text-xs text-muted-foreground">
              آخرین تغییر {formatDateTime(module.updatedAt)}
              {module.updatedBy?.fullName ? ` · ${module.updatedBy.fullName}` : ''}
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Notice error={error} done={done} />
        <Segmented value={status} onChange={setStatus} items={STATUS_ITEMS} className="w-full sm:w-fit" />
        <p className="text-sm text-muted-foreground">{EFFECT[status]}</p>
        {status === 'off' && WARNING[module.key] ? (
          <Alert variant="destructive">
            <AlertDescription>{WARNING[module.key]}</AlertDescription>
          </Alert>
        ) : null}
        {status !== 'active' ? (
          <Field>
            <FieldLabel>پیام به کاربران (اختیاری)</FieldLabel>
            <Textarea maxLength={500} rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={MODULE_DEFAULT_MESSAGE[status]} />
            <FieldDescription>بدون پیام، متن پیش‌فرض نشان داده می‌شود.</FieldDescription>
          </Field>
        ) : null}
        <div>
          <Button onClick={() => void save()} loading={busy} disabled={!dirty}>
            ذخیره
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
