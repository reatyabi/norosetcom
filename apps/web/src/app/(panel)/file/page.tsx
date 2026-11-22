'use client';

import { useCallback, useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { CheckIcon, CopyIcon, DownloadIcon, ExternalLinkIcon, GlobeIcon, LockIcon, PencilIcon, Trash2Icon, UploadIcon, XIcon } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  cn,
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
  DropdownMenuSeparator,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Field,
  FieldLabel,
  FileTypeIcon,
  Input,
  Label,
  MotionArt,
  Segmented,
  Skeleton,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@noroset/ui';
import {
  ACCEPT,
  formatBytes,
  canBePublic,
  KIND_LABELS,
  OWNER_LABELS,
  SOURCE_LABELS,
  type FileDetail,
  type FileItem,
  type FileKind,
  type FileList,
  type StorageUsage,
} from '@noroset/norofile/ui';
import { PageHead } from '@/components/page-head';
import { FormDialog } from '@/components/settings-ui';
import { api, errorMessage, rawApi } from '@/lib/api';
import { formatShort } from '@/lib/format';
import { canManage, useSession, useTenant } from '../session';
import { useProductSearch } from '../product-bar';
import { ItemCard, ItemGrid, ItemMenu, ItemMenuItem, NewFab, ownerLabel, RecentHeader, useHomePrefs, useInView, type HomeSort } from '../product-home';
import { FileGridSkeleton, ItemTableSkeleton } from '../_components/page-skeletons';

const PAGE_SIZE = 50;
type KindFilter = FileKind | 'all';

const KIND_ITEMS: { value: KindFilter; label: string }[] = [
  { value: 'all', label: 'همه' },
  { value: 'image', label: KIND_LABELS.image },
  { value: 'document', label: KIND_LABELS.document },
  { value: 'archive', label: KIND_LABELS.archive },
];

/** مرتب‌سازی نوار فهرست ← پارامتر API norofile. */
const SORT_PARAM: Record<HomeSort, string> = { updated: 'updated', title: 'name', created: 'created' };

export default function FilesPage() {
  const tenant = useTenant();
  return <FileManager key={tenant.tenantId} />;
}

function FileManager() {
  const tenant = useTenant();
  const { me } = useSession();
  const manage = canManage(tenant.role);
  const prefs = useHomePrefs('norofile');
  const query = useProductSearch();
  const [files, setFiles] = useState<FileItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [kind, setKind] = useState<KindFilter>('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'نوروفایل';
  }, []);
  const [uploading, setUploading] = useState(0);
  const [makePublic, setMakePublic] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [toDelete, setToDelete] = useState<FileDetail | null>(null);
  const [renaming, setRenaming] = useState<FileItem | null>(null);
  const [uploadToast, setUploadToast] = useState<{ id: string; file: FileItem; copied: boolean; count: number } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const menuActionAt = useRef(0);
  const [bandRef, bandInView] = useInView();

  const listPath = useCallback(
    (offset: number) => {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset), sort: SORT_PARAM[prefs.sort] });
      if (kind !== 'all') params.set('kind', kind);
      if (search) params.set('q', search);
      if (prefs.owner !== 'all') params.set('owner', prefs.owner);
      return `/norofile/files?${params}`;
    },
    [kind, search, prefs.sort, prefs.owner],
  );

  const refreshUsage = useCallback(() => {
    api<StorageUsage>('/norofile/files/usage', { tenantId: tenant.tenantId })
      .then(setUsage)
      .catch(() => undefined);
  }, [tenant.tenantId]);

  const reload = useCallback(() => {
    api<FileList>(listPath(0), { tenantId: tenant.tenantId })
      .then((r) => {
        setFiles(r.items);
        setTotal(r.total);
      })
      .catch((err: unknown) => setError(errorMessage(err)));
    refreshUsage();
  }, [listPath, refreshUsage, tenant.tenantId]);

  useEffect(reload, [reload]);

  // جست‌وجوی نوار بالا با تأخیر کوتاه تا هر حرف یک درخواست نسازد.
  useEffect(() => {
    const t = setTimeout(() => setSearch(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  async function loadMore() {
    if (!files) return;
    try {
      const r = await api<FileList>(listPath(files.length), { tenantId: tenant.tenantId });
      setFiles([...files, ...r.items]);
      setTotal(r.total);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  /** فقط فایلی که خود کاربر عمومی کرده لینک دارد؛ فایل خصوصی از این توست عمومی نمی‌شود. */
  async function copyToastPublicLink(url: string) {
    const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
    await navigator.clipboard.writeText(fullUrl);
    setUploadToast((prev) => (prev ? { ...prev, copied: true } : null));
  }

  async function uploadAll(list: File[]) {
    if (!list.length) return;
    setError(null);
    const max = usage?.maxUploadBytes;
    let lastUploaded: FileItem | null = null;
    let successCount = 0;
    for (const file of list) {
      if (max && file.size > max) {
        setError(`«${file.name}» بزرگ‌تر از ${formatBytes(max)} است.`);
        continue;
      }
      setUploading((n) => n + 1);
      try {
        // Office و ZIP با کلید «عمومی» هم خصوصی بارگذاری می‌شوند؛ بررسی اصلی در سرور است.
        const asPublic = makePublic && canBePublic(file.type);
        const created = await api<FileItem>(`/norofile/files${asPublic ? '?visibility=public' : ''}`, {
          method: 'POST',
          tenantId: tenant.tenantId,
          // نوع واقعی را سرور از محتوا تشخیص می‌دهد.
          rawBody: file.slice(0, file.size, 'application/octet-stream'),
          headers: { 'x-file-name': encodeURIComponent(file.name) },
        });
        lastUploaded = created;
        successCount++;
      } catch (err) {
        setError(`«${file.name}»: ${errorMessage(err)}`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (lastUploaded) {
      setUploadToast({ id: lastUploaded.id, file: lastUploaded, copied: false, count: successCount });
    }
    reload();
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    void uploadAll([...e.dataTransfer.files]);
  }

  async function update(file: FileItem, patch: { name?: string; visibility?: 'public' | 'private' }) {
    setError(null);
    try {
      const updated = await api<FileDetail>(`/norofile/files/${file.id}`, { method: 'PATCH', tenantId: tenant.tenantId, body: patch });
      setFiles((list) => list?.map((f) => (f.id === file.id ? updated : f)) ?? null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function askDelete(file: FileItem) {
    setError(null);
    try {
      setToDelete(await api<FileDetail>(`/norofile/files/${file.id}`, { tenantId: tenant.tenantId }));
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function remove(file: FileDetail) {
    try {
      await api(`/norofile/files/${file.id}`, { method: 'DELETE', tenantId: tenant.tenantId });
      setToDelete(null);
      reload();
    } catch (err) {
      setToDelete(null);
      setError(errorMessage(err));
    }
  }

  async function blobUrl(file: FileItem, download: boolean): Promise<string> {
    const res = await rawApi(`/norofile/files/${file.id}/content${download ? '?download=1' : ''}`, { tenantId: tenant.tenantId });
    const url = URL.createObjectURL(await res.blob());
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return url;
  }

  async function download(file: FileItem) {
    try {
      const a = document.createElement('a');
      a.href = await blobUrl(file, true);
      a.download = file.name;
      a.click();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  /** باز کردن در زبانه‌ی تازه: فایل public از لینک عمومی، خصوصی با درخواست نشست‌دار. */
  async function open(file: FileItem) {
    // پنجره پیش از درخواست باز می‌شود تا مرورگر آن را popup ناخواسته حساب نکند.
    const win = window.open('', '_blank');
    try {
      const url = file.url ?? (await blobUrl(file, false));
      if (win) win.location.href = url;
    } catch (err) {
      win?.close();
      setError(errorMessage(err));
    }
  }

  const usedPercent = usage ? Math.min(100, (usage.usedBytes / usage.quotaBytes) * 100) : 0;
  const filtered = Boolean(search) || kind !== 'all' || prefs.owner !== 'all';

  const menu = (f: FileItem) => (
    <ItemMenu label={f.name}>
      <ItemMenuItem
        onClick={(e) => {
          menuActionAt.current = Date.now();
          e.stopPropagation();
          void open(f);
        }}
      >
        <ExternalLinkIcon />
        باز کردن
      </ItemMenuItem>
      <ItemMenuItem
        onClick={(e) => {
          menuActionAt.current = Date.now();
          e.stopPropagation();
          void download(f);
        }}
      >
        <DownloadIcon />
        دانلود
      </ItemMenuItem>
      {f.url ? (
        <ItemMenuItem
          onClick={(e) => {
            menuActionAt.current = Date.now();
            e.stopPropagation();
            void navigator.clipboard.writeText(f.url!);
          }}
        >
          <CopyIcon />
          کپی لینک عمومی
        </ItemMenuItem>
      ) : null}
      <ItemMenuItem
        onClick={(e) => {
          menuActionAt.current = Date.now();
          e.stopPropagation();
          setRenaming(f);
        }}
      >
        <PencilIcon />
        تغییر نام
      </ItemMenuItem>
      <ItemMenuItem
        onClick={(e) => {
          menuActionAt.current = Date.now();
          e.stopPropagation();
          void update(f, { visibility: f.visibility === 'public' ? 'private' : 'public' });
        }}
        disabled={f.usageCount > 0 || (f.visibility === 'private' && !canBePublic(f.mimeType))}
      >
        {f.visibility === 'public' ? <LockIcon /> : <GlobeIcon />}
        {f.visibility === 'public' ? 'خصوصی کردن' : 'عمومی کردن'}
      </ItemMenuItem>
      {manage ? (
        <>
          <DropdownMenuSeparator />
          <ItemMenuItem
            variant="destructive"
            onClick={(e) => {
              menuActionAt.current = Date.now();
              e.stopPropagation();
              void askDelete(f);
            }}
          >
            <Trash2Icon />
            حذف
          </ItemMenuItem>
        </>
      ) : null}
    </ItemMenu>
  );

  const access = (f: FileItem) => (
    <>
      {f.visibility === 'public' ? (
        <Badge variant="secondary">
          <GlobeIcon />
          عمومی
        </Badge>
      ) : (
        <Badge variant="outline">
          <LockIcon />
          خصوصی
        </Badge>
      )}
      {f.usageCount > 0 ? <Badge variant="outline">در حال استفاده</Badge> : null}
    </>
  );

  return (
    <div className="flex flex-col gap-2">
      <PageHead>
        <section ref={bandRef} aria-label="بارگذاری فایل" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-base font-medium">بارگذاری فایل</h1>
            {usage ? (
              <div className="flex w-64 max-w-full flex-col gap-1.5" aria-label="فضای مصرف‌شده">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>فضای مصرف‌شده</span>
                  <span>
                    {formatBytes(usage.usedBytes)} از {formatBytes(usage.quotaBytes)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn('h-full rounded-full transition-[width]', usedPercent > 90 ? 'bg-destructive' : 'bg-primary')}
                    style={{ width: `${usedPercent}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>
          <div
            className={cn(
              'flex flex-col items-center gap-4 rounded-xl border border-dashed border-input bg-card px-5 py-5 text-center shadow-xs transition-colors sm:flex-row sm:text-start',
              dragging && 'border-primary bg-primary/5',
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UploadIcon className="size-6" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium">فایل‌ها را اینجا رها کنید یا انتخاب کنید</p>
              <p className="text-xs text-muted-foreground">
                تصویر، PDF، Word/Excel/PowerPoint و ZIP{usage ? ` — هر فایل تا ${formatBytes(usage.maxUploadBytes)}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <Switch id="nf-public" checked={makePublic} onCheckedChange={setMakePublic} />
                <Label htmlFor="nf-public" className="text-xs">
                  عمومی (فقط تصویر و PDF)
                </Label>
              </div>
              <Button loading={uploading > 0} onClick={() => input.current?.click()}>
                <UploadIcon />
                انتخاب فایل
              </Button>
            </div>
            <input
              ref={input}
              type="file"
              multiple
              accept={ACCEPT}
              hidden
              onChange={(e) => {
                const list = [...(e.target.files ?? [])];
                e.target.value = '';
                void uploadAll(list);
              }}
            />
          </div>
        </section>
      </PageHead>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="flex flex-col">
        <RecentHeader
          title={search ? `نتیجه‌ی جست‌وجوی «${search}»` : 'فایل‌های اخیر'}
          prefs={prefs}
          extra={<Segmented value={kind} onChange={setKind} items={KIND_ITEMS} className="max-sm:order-last max-sm:w-full" />}
        />
        {files === null && !error ? (
          prefs.view === 'grid' ? (
            <FileGridSkeleton count={10} />
          ) : (
            <ItemTableSkeleton count={10} />
          )
        ) : files && files.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia>
                <MotionArt key={filtered ? 'filtered' : 'empty'} name={filtered ? 'no-results' : 'empty-files'} className="size-28" />
              </EmptyMedia>
              <EmptyTitle>{filtered ? 'فایلی پیدا نشد' : 'هنوز فایلی ندارید'}</EmptyTitle>
              <EmptyDescription>
                {filtered ? 'فیلتر یا جست‌وجو را تغییر دهید.' : 'فایل‌های این فضای کاری و تصاویر محصولات (مثل نورولینک) اینجا می‌آیند.'}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : files && prefs.view === 'grid' ? (
          <ItemGrid>
            {files.map((f) => (
              <ItemCard
                key={f.id}
                onOpen={() => {
                  if (Date.now() - menuActionAt.current < 500) return;
                  void open(f);
                }}
                title={f.name}
                thumb={<Thumb file={f} tenantId={tenant.tenantId} large />}
                icon={<FileTypeIcon name={f.name} mimeType={f.mimeType} className="size-5 shrink-0" />}
                meta={`${formatBytes(f.sizeBytes)} · ${formatShort(f.createdAt)}`}
                badges={access(f)}
                menu={menu(f)}
              />
            ))}
          </ItemGrid>
        ) : files ? (
          <div className="pt-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>نام</TableHead>
                  <TableHead className="hidden md:table-cell">مالک</TableHead>
                  <TableHead className="hidden md:table-cell">حجم</TableHead>
                  <TableHead>دسترسی</TableHead>
                  <TableHead className="hidden lg:table-cell">منبع</TableHead>
                  <TableHead className="hidden sm:table-cell">تاریخ</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="max-w-0 min-w-48">
                      <button type="button" className="flex w-full items-center gap-3 text-start" onClick={() => void open(f)}>
                        <Thumb file={f} tenantId={tenant.tenantId} />
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="truncate font-medium" title={f.name} dir="auto">
                            {f.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {KIND_LABELS[f.kind]}
                            {f.width && f.height ? ` · ${f.width}×${f.height}` : ''}
                            <span className="md:hidden"> · {formatBytes(f.sizeBytes)}</span>
                          </span>
                        </span>
                      </button>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{ownerLabel(f.uploadedBy, f.uploadedByName, me.id)}</TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{formatBytes(f.sizeBytes)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">{access(f)}</div>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">{SOURCE_LABELS[f.source] ?? f.source}</TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">{formatShort(f.createdAt)}</TableCell>
                    <TableCell className="text-end">{menu(f)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
        {files && files.length > 0 ? (
          <div className="flex items-center justify-between pt-4 text-xs text-muted-foreground">
            <span>
              {files.length.toLocaleString('fa-IR')} از {total.toLocaleString('fa-IR')} فایل
            </span>
            {files.length < total ? (
              <Button variant="secondary" size="sm" onClick={() => void loadMore()}>
                بیشتر
              </Button>
            ) : null}
          </div>
        ) : null}
      </section>

      <NewFab show={!bandInView} label="بارگذاری فایل" onClick={() => input.current?.click()} busy={uploading > 0} />

      <RenameDialog
        file={renaming}
        onClose={() => setRenaming(null)}
        onSave={async (file, name) => {
          await update(file, { name });
          setRenaming(null);
        }}
      />

      {toDelete ? (
        toDelete.usages.length ? (
          <Dialog open onOpenChange={(open) => !open && setToDelete(null)}>
            <DialogPopup dir="rtl" className="sm:max-w-md">
              <DialogHeader className="gap-1.5 pe-14">
                <DialogTitle className="text-lg">«{toDelete.name}» در حال استفاده است</DialogTitle>
                <DialogDescription>تا وقتی این فایل در جایی استفاده می‌شود حذف نمی‌شود:</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2 px-6 py-1 pb-4">
                <ul className="list-inside list-disc text-sm text-muted-foreground">
                  {toDelete.usages.map((u) => (
                    <li key={`${u.ownerType}:${u.ownerId}`}>{OWNER_LABELS[u.ownerType] ?? u.ownerType}</li>
                  ))}
                </ul>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setToDelete(null)}>
                  باشه
                </Button>
              </DialogFooter>
            </DialogPopup>
          </Dialog>
        ) : (
          <FormDialog
            open
            onOpenChange={(open) => !open && setToDelete(null)}
            title={`حذف «${toDelete.name}»؟`}
            description="فایل برای همیشه حذف می‌شود و لینک عمومی آن دیگر کار نمی‌کند."
            submitLabel="حذف"
            doneLabel="فایل حذف شد"
            onSubmit={(e) => {
              e.preventDefault();
              void remove(toDelete);
            }}
            busy={false}
            error={null}
          >
            {null}
          </FormDialog>
        )
      ) : null}

      {uploadToast ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <aside
            role="status"
            aria-live="polite"
            className="pointer-events-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl border border-border bg-popover/95 px-4 py-3 text-sm text-popover-foreground shadow-lg backdrop-blur-md animate-in fade-in-0 zoom-in-95 duration-200"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
              <CheckIcon className="size-4" />
            </span>
            <div className="flex min-w-0 items-center gap-1.5 text-xs sm:text-sm">
              <span className="max-w-[160px] truncate font-medium sm:max-w-xs" title={uploadToast.file.name} dir="auto">
                «{uploadToast.file.name}»
              </span>
              <span className="shrink-0 text-muted-foreground">
                {uploadToast.count > 1
                  ? `و ${uploadToast.count - 1} فایل دیگر با موفقیت بارگذاری شدند`
                  : 'با موفقیت بارگذاری شد'}
              </span>
            </div>
            {uploadToast.file.url ? (
              <>
                <div className="h-4 w-px shrink-0 bg-border" />
                <Button
                  type="button"
                  size="sm"
                  variant={uploadToast.copied ? 'secondary' : 'outline'}
                  className={cn(
                    'h-8 shrink-0 gap-1.5 rounded-xl px-3 text-xs font-medium transition-[color,background-color,border-color,box-shadow,opacity,transform]',
                    uploadToast.copied && 'border-success/30 bg-success/10 text-success hover:bg-success/15',
                  )}
                  onClick={() => void copyToastPublicLink(uploadToast.file.url!)}
                >
                  {uploadToast.copied ? <CheckIcon className="size-3.5 text-success" /> : <CopyIcon className="size-3.5" />}
                  <span>{uploadToast.copied ? 'لینک کپی شد' : 'کپی لینک عمومی'}</span>
                </Button>
              </>
            ) : null}
            <button
              type="button"
              className="shrink-0 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => setUploadToast(null)}
              aria-label="بستن"
            >
              <XIcon className="size-4" />
            </button>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function RenameDialog({ file, onClose, onSave }: { file: FileItem | null; onClose: () => void; onSave: (file: FileItem, name: string) => Promise<void> }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [prevId, setPrevId] = useState<string | null>(null);
  if ((file?.id ?? null) !== prevId) {
    setPrevId(file?.id ?? null);
    if (file) setName(file.name);
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    try {
      await onSave(file, name.trim());
    } finally {
      setBusy(false);
    }
  }
  return (
    <FormDialog
      open={file !== null}
      onOpenChange={(open) => !open && onClose()}
      title="تغییر نام"
      description="پسوند واقعی فایل حفظ می‌شود."
      onSubmit={(e) => void submit(e)}
      busy={busy}
      canSubmit={Boolean(name.trim()) && name.trim() !== file?.name}
      error={null}
      doneLabel="نام تغییر کرد"
    >
      <Field>
        <FieldLabel>نام فایل</FieldLabel>
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={255} autoFocus dir="auto" />
      </Field>
    </FormDialog>
  );
}

/** پیش‌نمایش: فایل public از لینک عمومی؛ تصویر خصوصی با درخواست نشست‌دار (blob). `large`: تصویر کارت شبکه. */
function Thumb({ file, tenantId, large = false }: { file: FileItem; tenantId: string; large?: boolean }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const privateImage = file.kind === 'image' && !file.url;

  useEffect(() => {
    if (!privateImage) return;
    let url: string | null = null;
    let cancelled = false;
    rawApi(`/norofile/files/${file.id}/content`, { tenantId })
      .then((r) => r.blob())
      .then((b) => {
        if (cancelled) return;
        url = URL.createObjectURL(b);
        setBlobUrl(url);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [file.id, privateImage, tenantId]);

  const isImage = file.kind === 'image';
  const src = isImage ? (file.url ?? blobUrl) : null;
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden bg-muted text-muted-foreground',
        large ? 'size-full' : 'size-10 rounded-md ring-1 ring-border',
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- فایل کاربر از مسیر API norofile
        <img src={src} alt="" className="size-full object-cover" loading="lazy" />
      ) : !isImage ? (
        <FileTypeIcon name={file.name} mimeType={file.mimeType} className={large ? 'size-16' : 'size-8'} />
      ) : (
        <Skeleton className="size-full rounded" />
      )}
    </div>
  );
}
