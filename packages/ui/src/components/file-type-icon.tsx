import type { ReactNode, SVGProps } from "react"

import { cn } from "@noroset/ui/lib/utils"
import { extensionOf } from "@noroset/ui/lib/image-processing"

// آیکون سالید نوع فایل: برگه‌ی رنگی با گوشه‌ی تاشده، نماد سفید و برچسب پسوند (اختیاری).
// رنگ فایل‌های معروف از رنگ مرسوم همان قالب و رنگ نوع‌های محصول از رنگ برند همان محصول است؛
// رنگ‌ها جزء خود آیکون‌اند (مثل SOCIAL_COLORS نورولینک) و به تم/توکن وابسته نیستند.

export type FileIconType =
  | "pdf"
  | "word"
  | "excel"
  | "powerpoint"
  | "csv"
  | "text"
  | "image"
  | "archive"
  | "audio"
  | "video"
  | "code"
  | "generic"
  | "form"
  | "form-response"
  | "link-page"

type Glyph = (color: string) => ReactNode

interface FileIconSpec {
  color: string
  /** برچسب پیش‌فرض وقتی پسوند معلوم نیست. */
  label?: string
  glyph?: Glyph
  /** کلمه‌ی بزرگ وسط برگه به‌جای نماد و برچسب (نوع‌های محصول). */
  word?: string
}

// نمادها در جعبه‌ی ۱۰×۱۰ کشیده می‌شوند و در برگه جا می‌گیرند.
const stroke = { fill: "none", stroke: "#fff", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const

const SPECS: Record<FileIconType, FileIconSpec> = {
  pdf: {
    color: "#e2231a",
    label: "PDF",
    glyph: () => (
      <path
        {...stroke}
        strokeWidth={1.3}
        d="M1.5 8.6C3.8 6.6 5.8 3.4 5 1.6 4.3.4 3 2.4 4.6 5.2c1.4 2.4 3.7 3.4 4 2.4.3-1-3.4-1-7.1 1Z"
      />
    ),
  },
  word: { color: "#2b579a", label: "DOC", glyph: () => <path {...stroke} d="M1 2l2 6.5L5 4l2 4.5L9 2" /> },
  excel: { color: "#217346", label: "XLS", glyph: () => <path {...stroke} d="M2.2 1.8l5.6 6.4M7.8 1.8L2.2 8.2" /> },
  powerpoint: {
    color: "#c43e1c",
    label: "PPT",
    glyph: () => <path {...stroke} d="M3 8.8V1.5h2.8a2.4 2.4 0 0 1 0 4.8H3" />,
  },
  csv: {
    color: "#0f9d58",
    label: "CSV",
    glyph: (c) => (
      <>
        <rect x="1" y="1" width="8" height="8" rx="1.2" fill="#fff" />
        <path d="M1 3.8h8M1 6.3h8M4 3.8V9" stroke={c} strokeWidth="0.9" />
      </>
    ),
  },
  text: { color: "#64748b", label: "TXT", glyph: () => <path {...stroke} d="M1.5 1.8h7M1.5 4.2h7M1.5 6.6h7M1.5 9h4" /> },
  image: {
    color: "#0891b2",
    label: "IMG",
    glyph: () => (
      <>
        <circle cx="7" cy="2.6" r="1.5" fill="#fff" />
        <path d="M.5 9.2 3.6 4.4l2.2 2.9L7.2 5.7l2.3 3.5Z" fill="#fff" stroke="#fff" strokeWidth="0.6" strokeLinejoin="round" />
      </>
    ),
  },
  archive: {
    color: "#7c5a3a",
    label: "ZIP",
    glyph: (c) => (
      <>
        <path d="M4 0h1.2v1.2H4zM5.2 1.2h1.2v1.2H5.2zM4 2.4h1.2v1.2H4zM5.2 3.6h1.2v1.2H5.2z" fill="#fff" />
        <rect x="3.5" y="5.2" width="3.4" height="4.3" rx="0.8" fill="#fff" />
        <rect x="4.5" y="7.2" width="1.4" height="1.2" rx="0.3" fill={c} />
      </>
    ),
  },
  audio: {
    color: "#ef6c00",
    label: "MP3",
    glyph: () => (
      <>
        <circle cx="3" cy="7.9" r="1.9" fill="#fff" />
        <path d="M4.2 7.9V1.3l4.6-1v2.3l-3.4.8" {...stroke} strokeWidth={1.3} />
      </>
    ),
  },
  video: {
    color: "#4f46e5",
    label: "MP4",
    glyph: () => <path d="M3 1.6 8.6 5 3 8.4Z" fill="#fff" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" />,
  },
  code: { color: "#334155", label: "CODE", glyph: () => <path {...stroke} d="M3 2 .6 5 3 8M7 2l2.4 3L7 8M6 1.4 4 8.6" /> },
  generic: { color: "#8a94a6" },
  // رنگ برند محصولات (همان رنگ‌های سایت: نوروفرم بنفش، نورولینک صورتی)؛ به‌جای نماد، کلمه‌ی بزرگ
  // فضای آیکون را می‌گیرد (مثل W آیکون Word).
  form: { color: "#9333ea", word: "FORM" },
  "form-response": { color: "#9333ea", word: "RESP" },
  "link-page": { color: "#db2777", word: "LINK" },
}

const EXTENSION_TYPES: Record<string, FileIconType> = {
  pdf: "pdf",
  ...fromList("word", ["doc", "docx", "odt", "rtf"]),
  ...fromList("excel", ["xls", "xlsx", "xlsm", "ods"]),
  ...fromList("powerpoint", ["ppt", "pptx", "odp", "key"]),
  ...fromList("csv", ["csv", "tsv"]),
  ...fromList("text", ["txt", "md", "log"]),
  ...fromList("image", ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "heic", "avif", "tif", "tiff", "ico"]),
  ...fromList("archive", ["zip", "rar", "7z", "tar", "gz", "tgz", "bz2", "xz"]),
  ...fromList("audio", ["mp3", "wav", "ogg", "oga", "m4a", "flac", "aac", "opus"]),
  ...fromList("video", ["mp4", "mov", "mkv", "webm", "avi", "m4v"]),
  ...fromList("code", ["json", "xml", "html", "css", "js", "ts", "tsx", "jsx", "py", "sql", "yml", "yaml", "sh"]),
}

function fromList(type: FileIconType, exts: string[]): Record<string, FileIconType> {
  return Object.fromEntries(exts.map((e) => [e, type]))
}

const MIME_TYPES: Record<string, FileIconType> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "word",
  "application/msword": "word",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "excel",
  "application/vnd.ms-excel": "excel",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "powerpoint",
  "application/vnd.ms-powerpoint": "powerpoint",
  "text/csv": "csv",
  "text/plain": "text",
  "application/json": "code",
  "application/zip": "archive",
  "application/x-7z-compressed": "archive",
  "application/vnd.rar": "archive",
}

/** نوع آیکون از پسوند نام فایل و سپس MIME؛ ناشناخته ← generic. */
export function fileIconTypeOf(file: { name?: string; mimeType?: string }): FileIconType {
  const byExt = file.name ? EXTENSION_TYPES[extensionOf(file.name)] : undefined
  if (byExt) return byExt
  const mime = file.mimeType?.toLowerCase() ?? ""
  if (MIME_TYPES[mime]) return MIME_TYPES[mime]
  const group = mime.split("/")[0]
  if (group === "image" || group === "audio" || group === "video") return group
  return "generic"
}

export interface FileTypeIconProps extends Omit<SVGProps<SVGSVGElement>, "type"> {
  /** نوع صریح؛ اگر نباشد از `name`/`mimeType` تشخیص داده می‌شود. */
  type?: FileIconType
  name?: string
  mimeType?: string
  /**
   * برچسب پسوند زیر نماد (برای اندازه‌های ≥ ۴۰px): `true` ← پسوند نام فایل یا برچسب پیش‌فرض نوع،
   * رشته ← همان متن. نوع‌های محصول همیشه کلمه‌ی بزرگ خودشان را دارند (FORM، RESP، LINK) و برچسب نمی‌گیرند.
   */
  label?: boolean | string
  /** متن دسترسی‌پذیری؛ بدون آن آیکون تزئینی است. */
  title?: string
}

export function FileTypeIcon({ type, name, mimeType, label, title, className, ...props }: FileTypeIconProps) {
  const resolved = type ?? fileIconTypeOf({ name, mimeType })
  const spec = SPECS[resolved]
  const text = label && !spec.word
    ? (typeof label === "string" ? label : (name && extensionOf(name)) || spec.label || "").toUpperCase().slice(0, 4) || null
    : null
  // با برچسب، نماد کوچک‌تر و بالاتر می‌نشیند.
  const glyphTransform = text ? "translate(8.25 6.6) scale(0.75)" : "translate(7 8.6)"
  return (
    <svg
      viewBox="0 0 24 24"
      data-slot="file-type-icon"
      data-type={resolved}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn("size-6 shrink-0", className)}
      {...props}
    >
      <path d="M6 1.5h9.2L20 6.3V20.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-17a2 2 0 0 1 2-2Z" fill={spec.color} />
      <path d="M15.2 1.5v3.3a1.5 1.5 0 0 0 1.5 1.5H20Z" fill="#fff" fillOpacity="0.4" />
      {spec.glyph ? <g transform={glyphTransform}>{spec.glyph(spec.color)}</g> : null}
      {spec.word ? (
        <text
          x="12"
          y="15.4"
          textAnchor="middle"
          fill="#fff"
          fontSize="6"
          fontWeight="800"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          textLength="13"
          lengthAdjust="spacingAndGlyphs"
          direction="ltr"
        >
          {spec.word}
        </text>
      ) : null}
      {text ? (
        <text
          x="12"
          y="19.6"
          textAnchor="middle"
          fill="#fff"
          fontSize={text.length > 3 ? 3.6 : 4.2}
          fontWeight="700"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          direction="ltr"
        >
          {text}
        </text>
      ) : null}
    </svg>
  )
}
