// پردازش تصویر در مرورگر برای کارت آپلود (کراپ، چرخش، کوچک‌سازی، webp). فقط برای UX و صرفه‌جویی در
// سهمیه است؛ سرور (norofile) همیشه نوع را از محتوا دوباره تشخیص می‌دهد و متادیتا را حذف می‌کند.

export type PickerFileKind = "image" | "document" | "archive"

export interface PixelArea {
  x: number
  y: number
  width: number
  height: number
}

export interface ImageOutput {
  /** بزرگ‌ترین ضلع خروجی (px). */
  maxSize: number
  /** کیفیت webp بین ۰ و ۱. */
  quality?: number
}

const EXTENSIONS: Record<string, PickerFileKind> = {
  png: "image",
  jpg: "image",
  jpeg: "image",
  webp: "image",
  gif: "image",
  pdf: "document",
  docx: "document",
  xlsx: "document",
  pptx: "document",
  zip: "archive",
}

/** پسوندهای قابل انتخاب برای هر نوع (ورودی فایل مرورگر). */
export function acceptFor(kinds: PickerFileKind[]): string {
  return Object.entries(EXTENSIONS)
    .filter(([, kind]) => kinds.includes(kind))
    .map(([ext]) => `.${ext}`)
    .join(",")
}

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".")
  return dot < 0 ? "" : name.slice(dot + 1).toLowerCase()
}

/** حدس نوع از MIME/پسوند (فقط برای نمایش و انتخاب پردازش؛ تصمیم نهایی با سرور). */
export function guessKind(file: { name: string; type: string }): PickerFileKind | null {
  if (/^image\/(png|jpeg|webp|gif)$/.test(file.type)) return "image"
  return EXTENSIONS[extensionOf(file.name)] ?? null
}

export function isGif(file: { name: string; type: string }): boolean {
  return file.type === "image/gif" || extensionOf(file.name) === "gif"
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("image_decode_failed"))
    img.src = src
  })
}

/**
 * ناحیه‌ی کراپ (مختصات تصویر چرخیده، مثل خروجی react-easy-crop) را با چرخش اعمال و تا `maxSize`
 * کوچک می‌کند؛ خروجی webp (اگر مرورگر پشتیبانی نکند PNG).
 */
export async function renderImage(
  src: string,
  area: PixelArea | null,
  rotation: number,
  output: ImageOutput
): Promise<Blob> {
  const img = await loadImage(src)
  const rad = (rotation * Math.PI) / 180
  const sin = Math.abs(Math.sin(rad))
  const cos = Math.abs(Math.cos(rad))
  const boundW = Math.round(img.naturalWidth * cos + img.naturalHeight * sin)
  const boundH = Math.round(img.naturalWidth * sin + img.naturalHeight * cos)

  const rotated = document.createElement("canvas")
  rotated.width = boundW
  rotated.height = boundH
  const rctx = rotated.getContext("2d")
  if (!rctx) throw new Error("canvas_unavailable")
  rctx.translate(boundW / 2, boundH / 2)
  rctx.rotate(rad)
  rctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)

  const crop = area ?? { x: 0, y: 0, width: boundW, height: boundH }
  const scale = Math.min(1, output.maxSize / Math.max(crop.width, crop.height))
  const out = document.createElement("canvas")
  out.width = Math.max(1, Math.round(crop.width * scale))
  out.height = Math.max(1, Math.round(crop.height * scale))
  const octx = out.getContext("2d")
  if (!octx) throw new Error("canvas_unavailable")
  octx.imageSmoothingQuality = "high"
  octx.drawImage(rotated, crop.x, crop.y, crop.width, crop.height, 0, 0, out.width, out.height)

  return new Promise((resolve, reject) =>
    out.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("encode_failed"))),
      "image/webp",
      output.quality ?? 0.88
    )
  )
}

/** نام فایل خروجی با پسوند متناسب با نوع واقعی blob. */
export function renamedFor(name: string, blob: Blob): string {
  const base = name.replace(/\.[^.]*$/, "") || "image"
  const ext = blob.type === "image/webp" ? "webp" : blob.type === "image/png" ? "png" : extensionOf(name)
  return ext ? `${base}.${ext}` : base
}
