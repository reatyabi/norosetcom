"use client"

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import {
  CheckIcon,
  ImageUpIcon,
  LockIcon,
  RotateCwIcon,
  SearchIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
  ZoomInIcon,
} from "lucide-react"
import * as React from "react"
import Cropper, { type Area } from "react-easy-crop"

import { Button } from "@noroset/ui/components/button"
import { FileTypeIcon } from "@noroset/ui/components/file-type-icon"
import { Input } from "@noroset/ui/components/input"
import { Segmented } from "@noroset/ui/components/segmented"
import { Spinner } from "@noroset/ui/components/spinner"
import {
  acceptFor,
  guessKind,
  isGif,
  renamedFor,
  renderImage,
  type PickerFileKind,
} from "@noroset/ui/lib/image-processing"
import { cn } from "@noroset/ui/lib/utils"

// کارت آپلود مشترک («شعبه‌ی norofile در محصولات»؛ docs/architecture.md §9.10). هیچ محصولی را
// نمی‌شناسد: فهرست و آپلود از FileSource تزریقی می‌آید و نتیجه یک PickedFile است.

export interface PickedFile {
  id: string
  name: string
  kind: PickerFileKind
  mimeType: string
  sizeBytes: number
  width: number | null
  height: number | null
  visibility: "private" | "public"
  url: string | null
}

export interface FileSource {
  /** کتابخانه‌ی فایل‌ها (بدون آن تب «فایل‌های من» نمایش داده نمی‌شود). */
  list?(query: { kind?: PickerFileKind; q?: string; offset: number; limit: number }): Promise<{ items: PickedFile[]; total: number }>
  upload(file: Blob, name: string): Promise<PickedFile>
  /** آدرس پیش‌نمایش فایل خصوصی (اختیاری). */
  previewUrl?(file: PickedFile): string | null
}

export interface ImageOptions {
  /** نسبت ثابت عرض به ارتفاع؛ بدون آن کاربر از presetها انتخاب می‌کند. */
  aspect?: number
  shape?: "round" | "rect"
  maxSize: number
  quality?: number
}

export interface FilePickerOptions {
  accept: PickerFileKind[]
  maxBytes: number
  /** فایل خصوصی کتابخانه قابل انتخاب نیست (مثلاً تصویر صفحه‌ی عمومی). */
  requirePublic?: boolean
  image?: ImageOptions
}

export interface FilePickerProps {
  open: boolean
  onOpenChange(open: boolean): void
  source: FileSource
  options: FilePickerOptions
  onPick(file: PickedFile): void
  title?: string
  /** پیام فارسی خطای سرور. */
  errorMessage?(err: unknown): string
}

const KIND_LABEL: Record<PickerFileKind, string> = { image: "تصویر", document: "سند", archive: "فایل فشرده" }
const PAGE = 30
const faNumber = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 })

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${faNumber.format(bytes)} بایت`
  if (bytes < 1024 * 1024) return `${faNumber.format(bytes / 1024)} کیلوبایت`
  return `${faNumber.format(bytes / (1024 * 1024))} مگابایت`
}

function acceptLabel(kinds: PickerFileKind[]): string {
  return kinds.map((k) => KIND_LABEL[k]).join("، ")
}

const defaultError = () => "بارگذاری انجام نشد."

type Tab = "upload" | "library"

function FilePicker({ open, onOpenChange, source, options, onPick, title, errorMessage = defaultError }: FilePickerProps) {
  const [tab, setTab] = React.useState<Tab>("upload")
  const [pending, setPending] = React.useState<{ file: File; src: string } | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [wasOpen, setWasOpen] = React.useState(open)

  const reset = () => {
    setPending(null)
    setError(null)
    setBusy(false)
  }

  // بازنشانی هنگام باز شدن (نه بستن) تا انیمیشن خروج همان محتوای فعلی را نشان دهد.
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      reset()
      setTab("upload")
    }
  }

  // آدرس موقت تصویر انتخاب‌شده پس از کنار رفتن آزاد می‌شود.
  React.useEffect(() => {
    if (!pending) return
    return () => URL.revokeObjectURL(pending.src)
  }, [pending])

  const finish = (file: PickedFile) => {
    onPick(file)
    onOpenChange(false)
  }

  async function send(blob: Blob, name: string) {
    setError(null)
    if (blob.size > options.maxBytes) {
      setError(`حجم فایل بیشتر از ${formatFileSize(options.maxBytes)} است.`)
      return
    }
    setBusy(true)
    try {
      finish(await source.upload(blob, name))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  function choose(file: File) {
    setError(null)
    const kind = guessKind(file)
    if (!kind || !options.accept.includes(kind)) {
      setError(`نوع فایل پشتیبانی نمی‌شود؛ فقط ${acceptLabel(options.accept)}.`)
      return
    }
    // GIF دست‌نخورده می‌ماند تا متحرک بماند؛ بقیه‌ی تصویرها به مرحله‌ی کراپ می‌روند.
    if (kind === "image" && options.image && !isGif(file)) {
      setPending({ file, src: URL.createObjectURL(file) })
      return
    }
    void send(file.slice(0, file.size, "application/octet-stream"), file.name)
  }

  async function confirmCrop(area: Area | null, rotation: number) {
    if (!pending || !options.image) return
    setBusy(true)
    setError(null)
    let blob: Blob
    try {
      blob = await renderImage(pending.src, area, rotation, options.image)
    } catch {
      setBusy(false)
      setError("پردازش تصویر انجام نشد؛ فایل دیگری را امتحان کنید.")
      return
    }
    await send(blob, renamedFor(pending.file.name, blob))
  }

  const tabs = source.list
    ? [
        { value: "upload" as const, label: "بارگذاری" },
        { value: "library" as const, label: "فایل‌های من" },
      ]
    : null

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogPrimitive.Portal>
        {/* رویدادهای React از portal به والد (مثلاً بوم ادیتور) bubble می‌کنند؛ اینجا قطع می‌شوند. */}
        <div
          className="contents"
          data-slot="file-picker-layer"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/30 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <DialogPrimitive.Popup
          dir="rtl"
          data-slot="file-picker"
          className="fixed top-1/2 left-1/2 z-50 flex max-h-[min(640px,calc(100dvh-2rem))] w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-popover text-sm text-popover-foreground shadow-lg ring-1 ring-border transition-[opacity,scale] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0"
        >
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <DialogPrimitive.Title className="flex-1 font-semibold">
              {pending ? "برش تصویر" : (title ?? "انتخاب فایل")}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close render={<Button variant="ghost" size="icon-sm" aria-label="بستن" disabled={busy} />}>
              <XIcon />
            </DialogPrimitive.Close>
          </div>

          {tabs && !pending ? (
            <div className="px-4 pt-3">
              <Segmented value={tab} onChange={setTab} items={tabs} />
            </div>
          ) : null}

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
            {error ? (
              <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-destructive">
                {error}
              </p>
            ) : null}
            {pending && options.image ? (
              <CropStep
                src={pending.src}
                image={options.image}
                busy={busy}
                onCancel={reset}
                onConfirm={(area, rotation) => void confirmCrop(area, rotation)}
              />
            ) : tab === "library" && source.list ? (
              <LibraryTab source={source} options={options} onPick={finish} errorMessage={errorMessage} />
            ) : (
              <UploadTab options={options} busy={busy} onChoose={choose} />
            )}
          </div>
        </DialogPrimitive.Popup>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function UploadTab({ options, busy, onChoose }: { options: FilePickerOptions; busy: boolean; onChoose(file: File): void }) {
  const input = React.useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = React.useState(false)

  // چسباندن فایل/تصویر از کلیپ‌بورد (Ctrl+V) تا وقتی این تب باز است.
  React.useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.files ?? [])][0]
      if (file && !busy) {
        e.preventDefault()
        onChoose(file)
      }
    }
    window.addEventListener("paste", onPaste)
    return () => window.removeEventListener("paste", onPaste)
  }, [busy, onChoose])

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        const file = e.dataTransfer.files[0]
        if (file && !busy) onChoose(file)
      }}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
        dragging ? "border-primary bg-primary/5" : "border-border"
      )}
    >
      {busy ? (
        <>
          <Spinner className="size-6" />
          <p className="text-muted-foreground">در حال بارگذاری…</p>
        </>
      ) : (
        <>
          <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <UploadIcon className="size-5" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="font-medium">فایل را اینجا رها کنید یا بچسبانید</p>
            <p className="text-xs text-muted-foreground">
              {acceptLabel(options.accept)} · حداکثر {formatFileSize(options.maxBytes)}
              {options.image ? " · برش و کوچک‌سازی پیش از بارگذاری" : ""}
            </p>
          </div>
          <Button variant="secondary" onClick={() => input.current?.click()}>
            انتخاب از دستگاه
          </Button>
        </>
      )}
      <input
        ref={input}
        type="file"
        hidden
        accept={acceptFor(options.accept)}
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ""
          if (file) onChoose(file)
        }}
      />
    </div>
  )
}

const ASPECT_PRESETS = [
  { value: "free", label: "اصلی" },
  { value: "1", label: "۱:۱" },
  { value: "1.3333", label: "۴:۳" },
  { value: "1.7778", label: "۱۶:۹" },
]

function CropStep({
  src,
  image,
  busy,
  onCancel,
  onConfirm,
}: {
  src: string
  image: ImageOptions
  busy: boolean
  onCancel(): void
  onConfirm(area: Area | null, rotation: number): void
}) {
  const [crop, setCrop] = React.useState({ x: 0, y: 0 })
  const [zoom, setZoom] = React.useState(1)
  const [rotation, setRotation] = React.useState(0)
  const [natural, setNatural] = React.useState<number | null>(null)
  const [preset, setPreset] = React.useState("free")
  const area = React.useRef<Area | null>(null)

  const aspect = image.aspect ?? (preset === "free" ? (natural ?? 1) : Number(preset))
  // «اصلی» بدون چرخش و زوم یعنی تصویر کامل (فقط کوچک‌سازی).
  const untouched = image.aspect === undefined && preset === "free" && zoom === 1 && rotation % 360 === 0

  return (
    <div className="flex flex-col gap-3">
      <div className="relative h-72 overflow-hidden rounded-lg bg-black/80" dir="ltr">
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={aspect}
          cropShape={image.shape === "round" ? "round" : "rect"}
          showGrid={image.shape !== "round"}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={(_, pixels) => {
            area.current = pixels
          }}
          onMediaLoaded={(m) => setNatural(m.naturalWidth / m.naturalHeight)}
        />
      </div>
      <div className="flex items-center gap-3">
        <ZoomInIcon className="size-4 shrink-0 text-muted-foreground" />
        <input
          type="range"
          aria-label="بزرگ‌نمایی"
          min={1}
          max={4}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="flex-1 accent-primary"
        />
        <Button variant="ghost" size="icon-sm" aria-label="چرخش" onClick={() => setRotation((r) => (r + 90) % 360)}>
          <RotateCwIcon />
        </Button>
      </div>
      {image.aspect === undefined ? <Segmented value={preset} onChange={setPreset} items={ASPECT_PRESETS} /> : null}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          فایل دیگر
        </Button>
        <Button loading={busy} onClick={() => onConfirm(untouched ? null : area.current, rotation)}>
          <CheckIcon />
          تأیید و بارگذاری
        </Button>
      </div>
    </div>
  )
}

function LibraryTab({
  source,
  options,
  onPick,
  errorMessage,
}: {
  source: FileSource
  options: FilePickerOptions
  onPick(file: PickedFile): void
  errorMessage(err: unknown): string
}) {
  const [items, setItems] = React.useState<PickedFile[] | null>(null)
  const [total, setTotal] = React.useState(0)
  const [query, setQuery] = React.useState("")
  const [search, setSearch] = React.useState("")
  const [selected, setSelected] = React.useState<PickedFile | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  // یک نوع مجاز ← فیلتر سرور؛ چند نوع ← همه و غیرفعال‌سازی در کارت.
  const kind = options.accept.length === 1 ? options.accept[0] : undefined

  React.useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  const fetchPage = React.useCallback(
    (offset: number) => source.list!({ kind, q: search || undefined, offset, limit: PAGE }),
    [source, kind, search]
  )

  // صفحه‌ی اول؛ نتیجه‌ی قبلی تا رسیدن نتیجه‌ی جست‌وجوی جدید می‌ماند و پاسخ کهنه نادیده گرفته می‌شود.
  React.useEffect(() => {
    let alive = true
    fetchPage(0).then(
      (r) => {
        if (!alive) return
        setError(null)
        setItems(r.items)
        setTotal(r.total)
      },
      (err: unknown) => alive && setError(errorMessage(err))
    )
    return () => {
      alive = false
    }
  }, [fetchPage, errorMessage])

  async function loadMore(offset: number) {
    try {
      const r = await fetchPage(offset)
      setItems((prev) => [...(prev ?? []), ...r.items])
      setTotal(r.total)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  function blocked(f: PickedFile): string | null {
    if (!options.accept.includes(f.kind)) return `فقط ${acceptLabel(options.accept)}`
    if (f.sizeBytes > options.maxBytes) return `بزرگ‌تر از ${formatFileSize(options.maxBytes)}`
    if (options.requirePublic && f.visibility !== "public") return "خصوصی است"
    return null
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 start-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جست‌وجوی نام فایل" className="ps-8" />
      </div>
      {error ? <p className="text-destructive">{error}</p> : null}
      {items === null ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">فایلی پیدا نشد.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {items.map((f) => {
            const reason = blocked(f)
            const preview = f.kind === "image" ? (f.url ?? source.previewUrl?.(f) ?? null) : null
            return (
              <button
                key={f.id}
                type="button"
                disabled={Boolean(reason)}
                title={reason ?? f.name}
                onClick={() => setSelected(f)}
                onDoubleClick={() => !reason && onPick(f)}
                aria-pressed={selected?.id === f.id}
                className={cn(
                  "group flex flex-col overflow-hidden rounded-lg text-start ring-1 ring-border transition-shadow",
                  selected?.id === f.id ? "ring-2 ring-primary" : "hover:ring-foreground/30",
                  reason && "cursor-not-allowed opacity-45"
                )}
              >
                <span className="relative flex aspect-square items-center justify-center bg-muted text-muted-foreground">
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element -- فایل از مسیر norofile سرو می‌شود
                    <img src={preview} alt="" loading="lazy" className="size-full object-cover" />
                  ) : (
                    <FileTypeIcon name={f.name} mimeType={f.mimeType} label className="size-14" />
                  )}
                  {f.visibility === "private" ? (
                    <LockIcon className="absolute top-1.5 start-1.5 size-3.5 rounded bg-background/80 p-0.5" />
                  ) : null}
                </span>
                <span className="flex flex-col px-2 py-1.5">
                  <span className="truncate text-xs">{f.name}</span>
                  <span className="truncate text-[0.7rem] text-muted-foreground">{reason ?? formatFileSize(f.sizeBytes)}</span>
                </span>
              </button>
            )
          })}
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        {items && items.length < total ? (
          <Button variant="ghost" size="sm" onClick={() => void loadMore(items.length)}>
            بیشتر
          </Button>
        ) : (
          <span />
        )}
        <Button disabled={!selected} onClick={() => selected && onPick(selected)}>
          انتخاب
        </Button>
      </div>
    </div>
  )
}

/** فیلد تصویر آماده: پیش‌نمایش + «انتخاب/تعویض» (کارت آپلود) + «حذف». */
function ImagePickerField({
  label,
  previewUrl,
  onPick,
  onRemove,
  source,
  options,
  round,
  disabled,
  busy,
  errorMessage,
  title,
}: {
  label?: string
  previewUrl: string | null
  onPick(file: PickedFile): void
  onRemove?(): void
  source: FileSource
  options: FilePickerOptions
  round?: boolean
  disabled?: boolean
  busy?: boolean
  errorMessage?(err: unknown): string
  title?: string
}) {
  const [open, setOpen] = React.useState(false)
  return (
    <div className="flex flex-col gap-1.5">
      {label ? <span className="text-xs text-muted-foreground">{label}</span> : null}
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          aria-label={previewUrl ? "تعویض تصویر" : "انتخاب تصویر"}
          className={cn(
            "flex size-14 shrink-0 items-center justify-center overflow-hidden bg-muted text-muted-foreground ring-1 ring-border transition-shadow hover:ring-foreground/30",
            round ? "rounded-full" : "rounded-lg"
          )}
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- فایل از مسیر عمومی norofile سرو می‌شود
            <img src={previewUrl} alt="" className="size-full object-cover" />
          ) : (
            <ImageUpIcon className="size-5" />
          )}
        </button>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" loading={busy} disabled={disabled} onClick={() => setOpen(true)}>
            {previewUrl ? "تعویض" : "انتخاب"}
          </Button>
          {previewUrl && onRemove ? (
            <Button variant="ghost" size="sm" disabled={disabled || busy} onClick={onRemove}>
              <Trash2Icon />
              حذف
            </Button>
          ) : null}
        </div>
      </div>
      <FilePicker
        open={open}
        onOpenChange={setOpen}
        source={source}
        options={options}
        onPick={onPick}
        errorMessage={errorMessage}
        title={title ?? label}
      />
    </div>
  )
}

export { FilePicker, ImagePickerField }
