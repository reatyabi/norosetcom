import { useId, type CSSProperties, type ReactNode, type SVGProps } from "react"

import { gearPath, sparklePath } from "@noroset/ui/lib/svg-shapes"
import { cn } from "@noroset/ui/lib/utils"

// صحنه‌های متحرک لحظه‌های پنل (نتیجه‌ی کار، حالت خالی، ورود و امنیت، دسترسی و وضعیت) به سبک
// تصویرهای ویندوز ۱۱ و سایت مایکروسافت: لایه‌های گرادیانی Fluent (هم‌زبان SystemIcon) روی دایره‌ی
// پس‌زمینه‌ی کم‌رنگ، که فقط یک‌بار هنگام ورود پشت سر هم وارد می‌شوند. حرکت‌ها کلاس‌های `ma-*` در
// globals.css‌اند؛ با prefers-reduced-motion همان قاب پایانی دیده می‌شود. برای پخش دوباره، `key` را عوض کنید.
// شبکه‌ی طراحی ۹۶×۹۶.

export type MotionArtName =
  | "done"
  | "payment-success"
  | "payment-failed"
  | "empty-forms"
  | "empty-links"
  | "empty-files"
  | "no-results"
  | "welcome-workspace"
  | "access-denied"
  | "maintenance"
  | "offline"
  | "otp"
  | "password"
  | "secure"
  | "support"

type Gradient = [from: string, to: string, dir?: "down" | "diagonal"]

interface MotionArtSpec {
  /** رنگ دایره‌ی پس‌زمینه. */
  tint: string
  gradients: Record<string, Gradient>
  draw: (f: (name: string) => string) => ReactNode
}

type Motion = "pop" | "rise" | "drop" | "fade" | "draw" | "spin" | "slide" | "shake" | "twinkle" | "ripple"

/** کلاس و تأخیر حرکت یک لایه؛ `vars` برای `--x` (جهت slide) و `--t` (مدت). */
function m(motion: Motion, delay = 0, vars?: Record<string, string>) {
  return { className: `ma ma-${motion}`, style: { "--d": `${delay}ms`, ...vars } as CSSProperties }
}

const line = { fill: "none", strokeLinecap: "round", strokeLinejoin: "round" } as const

const Sparkles = ({ points, from }: { points: [number, number, number][]; from: number }) => (
  <>
    {points.map(([x, y, r], i) => (
      <path key={i} d={sparklePath(x, y, r)} fill="#fbbf24" {...m("twinkle", from + i * 110)} />
    ))}
  </>
)

const CARD: Record<string, Gradient> = { card: ["#4ade9a", "#0e8a55", "diagonal"], chip: ["#ffe68a", "#e5a400"] }

const PaymentCard = ({ f }: { f: (n: string) => string }) => (
  <g {...m("rise", 80)}>
    <rect x="12" y="24" width="60" height="40" rx="7" fill={f("card")} />
    <rect x="12" y="33" width="60" height="7" fill="#000" fillOpacity="0.22" />
    <rect x="19" y="46" width="12" height="9" rx="2" fill={f("chip")} />
    <rect x="19" y="58" width="22" height="3" rx="1.5" fill="#fff" fillOpacity="0.6" />
  </g>
)

const SPECS: Record<MotionArtName, MotionArtSpec> = {
  // پایان موفق یک اقدام (مثلاً پس از دکمه‌ی ذخیره‌ی دیالوگ).
  done: {
    tint: "#10b981",
    gradients: { disc: ["#4ade80", "#15803d"] },
    draw: (f) => (
      <>
        <circle cx="48" cy="48" r="30" fill="none" stroke="#22c55e" strokeWidth="3" {...m("ripple", 260, { "--t": "700ms" })} />
        <circle cx="48" cy="48" r="26" fill={f("disc")} {...m("pop", 80)} />
        <path d="M36.5 48.5l8 8 15-16" {...line} stroke="#fff" strokeWidth="6" pathLength={1} {...m("draw", 340, { "--t": "450ms" })} />
        <Sparkles points={[[20, 22, 5], [80, 24, 4], [82, 74, 3.5]]} from={640} />
      </>
    ),
  },
  "payment-success": {
    tint: "#10b981",
    gradients: { ...CARD, badge: ["#34d399", "#059669"] },
    draw: (f) => (
      <>
        <PaymentCard f={f} />
        <circle cx="68" cy="62" r="16" fill={f("badge")} stroke="#fff" strokeWidth="3" {...m("pop", 380)} />
        <path d="M61 62.5l5 5 9-10" {...line} stroke="#fff" strokeWidth="4" pathLength={1} {...m("draw", 640, { "--t": "450ms" })} />
        <Sparkles points={[[22, 18, 5], [82, 30, 4], [86, 82, 3]]} from={820} />
      </>
    ),
  },
  "payment-failed": {
    tint: "#ef4444",
    gradients: { ...CARD, badge: ["#f87171", "#dc2626"] },
    draw: (f) => (
      <>
        <PaymentCard f={f} />
        <g {...m("shake", 900, { "--t": "450ms" })}>
          <circle cx="68" cy="62" r="16" fill={f("badge")} stroke="#fff" strokeWidth="3" {...m("pop", 380)} />
          <path d="M62.5 56.5l11 11" {...line} stroke="#fff" strokeWidth="4" pathLength={1} {...m("draw", 620, { "--t": "250ms" })} />
          <path d="M73.5 56.5l-11 11" {...line} stroke="#fff" strokeWidth="4" pathLength={1} {...m("draw", 760, { "--t": "250ms" })} />
        </g>
      </>
    ),
  },
  "empty-forms": {
    tint: "#9333ea",
    gradients: { board: ["#c58cff", "#7a2bd6"], paper: ["#ffffff", "#ede4fa"], clip: ["#9a5bea", "#5b1bb0"] },
    draw: (f) => (
      <>
        <g {...m("rise", 60)}>
          <rect x="24" y="16" width="48" height="68" rx="7" fill={f("board")} />
          <rect x="31" y="24" width="34" height="53" rx="3" fill={f("paper")} />
        </g>
        <rect x="37" y="11" width="22" height="10" rx="4" fill={f("clip")} {...m("drop", 260)} />
        <rect x="37" y="34" width="8" height="8" rx="2" fill="#9333ea" {...m("pop", 420)} />
        <path d="M39 38.2l1.8 1.8 3.2-3.5" {...line} stroke="#fff" strokeWidth="1.6" pathLength={1} {...m("draw", 600, { "--t": "300ms" })} />
        <rect x="37.75" y="48.75" width="6.5" height="6.5" rx="1.6" fill="none" stroke="#9333ea" strokeWidth="1.5" {...m("pop", 520)} />
        <g fill="#c9b3ee">
          <rect x="49" y="36.25" width="12" height="3.5" rx="1.75" {...m("slide", 460, { "--x": "-30%" })} />
          <rect x="49" y="50.25" width="12" height="3.5" rx="1.75" {...m("slide", 560, { "--x": "-30%" })} />
          <rect x="37" y="63" width="24" height="3.5" rx="1.75" {...m("slide", 660, { "--x": "-20%" })} />
        </g>
        <Sparkles points={[[80, 22, 5], [16, 40, 3.5]]} from={800} />
      </>
    ),
  },
  "empty-links": {
    tint: "#db2777",
    gradients: {
      phone: ["#4b5563", "#1f2937"],
      screen: ["#fdf2f8", "#fbcfe8"],
      avatar: ["#f472b6", "#db2777"],
      btn: ["#ec4899", "#be185d"],
      badge: ["#f472b6", "#be185d"],
    },
    draw: (f) => (
      <>
        <g {...m("rise", 60)}>
          <rect x="28" y="8" width="38" height="80" rx="8" fill={f("phone")} />
          <rect x="31" y="12" width="32" height="72" rx="5.5" fill={f("screen")} />
        </g>
        <circle cx="47" cy="27" r="6.5" fill={f("avatar")} {...m("pop", 300)} />
        <rect x="40" y="37" width="14" height="2.5" rx="1.25" fill="#f9a8d4" {...m("fade", 380)} />
        <rect x="35" y="45" width="24" height="7.5" rx="3.75" fill={f("btn")} {...m("slide", 460, { "--x": "30%" })} />
        <rect x="35" y="55.5" width="24" height="7.5" rx="3.75" fill={f("btn")} fillOpacity="0.75" {...m("slide", 540, { "--x": "30%" })} />
        <rect x="35" y="66" width="24" height="7.5" rx="3.75" fill={f("btn")} fillOpacity="0.5" {...m("slide", 620, { "--x": "30%" })} />
        <g {...m("pop", 780)}>
          <circle cx="70" cy="70" r="13" fill={f("badge")} stroke="#fff" strokeWidth="3" />
          <g transform="rotate(-45 70 70)" fill="none" stroke="#fff" strokeWidth="2.2">
            <rect x="60.5" y="66.5" width="11" height="7" rx="3.5" />
            <rect x="68.5" y="66.5" width="11" height="7" rx="3.5" />
          </g>
        </g>
      </>
    ),
  },
  "empty-files": {
    tint: "#f59e0b",
    gradients: { back: ["#f5b800", "#d98e00"], front: ["#ffe27a", "#ffb900"], doc: ["#ffffff", "#e5e9f0"] },
    draw: (f) => (
      <>
        <path
          d="M12 30a6 6 0 0 1 6-6h18a6 6 0 0 1 4.2 1.8L45 30h33a6 6 0 0 1 6 6v36a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6Z"
          fill={f("back")}
          {...m("rise", 60)}
        />
        <g {...m("rise", 320)}>
          <g transform="rotate(-10 38 34)">
            <rect x="27" y="16" width="22" height="30" rx="3" fill={f("doc")} />
            <rect x="27" y="16" width="22" height="6" rx="3" fill="#2b579a" />
            <rect x="31" y="27" width="14" height="2" rx="1" fill="#cbd5e1" />
            <rect x="31" y="32" width="10" height="2" rx="1" fill="#cbd5e1" />
          </g>
        </g>
        <g {...m("rise", 440)}>
          <g transform="rotate(8 58 32)">
            <rect x="47" y="14" width="22" height="30" rx="3" fill={f("doc")} />
            <rect x="47" y="14" width="22" height="6" rx="3" fill="#e2231a" />
            <rect x="51" y="25" width="14" height="2" rx="1" fill="#cbd5e1" />
            <rect x="51" y="30" width="10" height="2" rx="1" fill="#cbd5e1" />
          </g>
        </g>
        <path d="M12 43a5 5 0 0 1 5-5h62a5 5 0 0 1 5 5v29a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6Z" fill={f("front")} {...m("rise", 160)} />
      </>
    ),
  },
  "no-results": {
    tint: "#3b82f6",
    gradients: { paper: ["#f4f6f9", "#c9d1dc"], lens: ["#8adcff", "#2b8fea"] },
    draw: (f) => (
      <>
        <rect x="16" y="12" width="46" height="60" rx="6" fill={f("paper")} {...m("rise", 60)} />
        <g fill="#94a3b8" {...m("fade", 240)}>
          <rect x="23" y="22" width="30" height="3.5" rx="1.75" />
          <rect x="23" y="30" width="24" height="3.5" rx="1.75" />
          <rect x="23" y="38" width="16" height="3.5" rx="1.75" />
        </g>
        <g {...m("slide", 380, { "--x": "35%" })}>
          <path d="M69 67 80 78" stroke="#3a4452" strokeWidth="8" strokeLinecap="round" />
          <circle cx="58" cy="56" r="15" fill={f("lens")} stroke="#3a4452" strokeWidth="5" />
        </g>
        <path d="M53.5 52a4.5 4.5 0 1 1 6.3 4.1c-1.2.6-1.8 1.4-1.8 2.7" {...line} stroke="#fff" strokeWidth="2.6" pathLength={1} {...m("draw", 760, { "--t": "400ms" })} />
        <circle cx="58" cy="63.5" r="1.7" fill="#fff" {...m("pop", 1040)} />
      </>
    ),
  },
  "welcome-workspace": {
    tint: "#3b82f6",
    gradients: { main: ["#8fb8ff", "#3b66d6"], side: ["#b5d0ff", "#6b8fe6"] },
    draw: (f) => (
      <>
        <ellipse cx="48" cy="81" rx="32" ry="4" fill="#000" fillOpacity="0.08" {...m("fade", 0)} />
        <rect x="52" y="38" width="24" height="42" rx="3" fill={f("side")} {...m("rise", 220)} />
        <rect x="20" y="16" width="36" height="64" rx="4" fill={f("main")} {...m("rise", 80)} />
        <g fill="#fff" fillOpacity="0.9" {...m("fade", 420)}>
          <rect x="27" y="24" width="8" height="6" rx="1.5" />
          <rect x="41" y="24" width="8" height="6" rx="1.5" />
          <rect x="27" y="35" width="8" height="6" rx="1.5" />
          <rect x="41" y="35" width="8" height="6" rx="1.5" />
          <rect x="27" y="46" width="8" height="6" rx="1.5" />
          <rect x="41" y="46" width="8" height="6" rx="1.5" />
          <rect x="33" y="64" width="10" height="16" rx="2" />
          <rect x="59" y="46" width="10" height="6" rx="1.5" fillOpacity="0.8" />
          <rect x="59" y="57" width="10" height="6" rx="1.5" fillOpacity="0.8" />
        </g>
        <Sparkles points={[[14, 24, 5], [80, 22, 4.5], [86, 48, 3]]} from={700} />
      </>
    ),
  },
  "access-denied": {
    tint: "#64748b",
    gradients: { shield: ["#4fc8ff", "#1a5ed8"] },
    draw: (f) => (
      <>
        <g {...m("pop", 80)}>
          <path d="M48 10 76 21v22c0 19-12.4 34-28 40C32.4 77 20 62 20 43V21Z" fill={f("shield")} stroke={f("shield")} strokeWidth="3" strokeLinejoin="round" />
          <path d="M48 10 20 21v22c0 19 12.4 34 28 40Z" fill="#fff" fillOpacity="0.18" />
        </g>
        <path d="M41 47v-6a7 7 0 0 1 14 0v6" {...line} stroke="#fff" strokeWidth="4" {...m("drop", 560)} />
        <g {...m("pop", 380)}>
          <rect x="35" y="45" width="26" height="20" rx="4.5" fill="#fff" />
          <circle cx="48" cy="53.5" r="2.8" fill="#1a5ed8" />
          <rect x="46.75" y="54" width="2.5" height="5.5" rx="1.25" fill="#1a5ed8" />
        </g>
      </>
    ),
  },
  maintenance: {
    tint: "#64748b",
    gradients: { big: ["#dcdcdc", "#6e6e6e"], small: ["#7cc4ff", "#2563eb"] },
    draw: (f) => (
      <>
        <g {...m("spin", 80, { "--t": "800ms" })}>
          <path d={gearPath(40, 54, 27, 21, 9)} fill={f("big")} fillRule="evenodd" />
        </g>
        <g {...m("spin", 300, { "--t": "800ms" })}>
          <path d={gearPath(70, 28, 15, 11.5, 5, 7)} fill={f("small")} fillRule="evenodd" />
        </g>
        <Sparkles points={[[84, 58, 4]]} from={900} />
      </>
    ),
  },
  offline: {
    tint: "#94a3b8",
    gradients: { disc: ["#cbd5e1", "#64748b"] },
    draw: (f) => (
      <>
        <circle cx="48" cy="48" r="28" fill={f("disc")} {...m("pop", 80)} />
        <path d="M38.5 37.5a15 15 0 1 0 19 0" {...line} stroke="#fff" strokeWidth="5" pathLength={1} {...m("draw", 340, { "--t": "500ms" })} />
        <path d="M48 31v15" {...line} stroke="#fff" strokeWidth="5" pathLength={1} {...m("draw", 640, { "--t": "300ms" })} />
      </>
    ),
  },
  otp: {
    tint: "#0ea5e9",
    gradients: { phone: ["#4b5563", "#1f2937"], screen: ["#e0f2fe", "#bae6fd"], bubble: ["#38bdf8", "#0369a1"] },
    draw: (f) => (
      <>
        <g {...m("rise", 60)}>
          <rect x="22" y="12" width="36" height="72" rx="7" fill={f("phone")} />
          <rect x="25" y="18" width="30" height="60" rx="4" fill={f("screen")} />
          <rect x="37" y="14.5" width="6" height="1.8" rx="0.9" fill="#6b7280" />
        </g>
        <g {...m("pop", 380)}>
          <path d="M52 30h24a8 8 0 0 1 8 8v8a8 8 0 0 1-8 8H58l-7 6v-6.3A8 8 0 0 1 44 46v-8a8 8 0 0 1 8-8Z" fill={f("bubble")} stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" />
        </g>
        <g fill="#fff">
          <circle cx="54" cy="42" r="2.8" {...m("pop", 580)} />
          <circle cx="64" cy="42" r="2.8" {...m("pop", 680)} />
          <circle cx="74" cy="42" r="2.8" {...m("pop", 780)} />
        </g>
      </>
    ),
  },
  password: {
    tint: "#3b82f6",
    gradients: { field: ["#ffffff", "#e2e8f0"], key: ["#ffd966", "#f2a100"] },
    draw: (f) => (
      <>
        <rect x="10" y="33" width="64" height="28" rx="7" fill={f("field")} stroke="#cbd5e1" strokeWidth="1" {...m("rise", 60)} />
        <path d="M15 59.5h54" {...line} stroke="#0067c0" strokeWidth="2.5" pathLength={1} {...m("draw", 260, { "--t": "450ms" })} />
        <g fill="#334155">
          {[20, 29.5, 39, 48.5].map((cx, i) => (
            <circle key={cx} cx={cx} cy="46.5" r="3.3" {...m("pop", 380 + i * 90)} />
          ))}
        </g>
        <rect x="55.5" y="39.5" width="2" height="14" rx="1" fill="#0067c0" {...m("fade", 760)} />
        <g {...m("pop", 820)}>
          <circle cx="72" cy="66" r="15" fill={f("key")} stroke="#fff" strokeWidth="3" />
          <g {...line} stroke="#7a4b00" strokeWidth="2.6">
            <circle cx="67.5" cy="61.5" r="3.8" />
            <path d="M70.3 64.3 78 72M74.8 68.8l-2.4 2.4M77 71l-2 2" />
          </g>
        </g>
        <Sparkles points={[[84, 26, 4.5], [14, 24, 3.5]]} from={1000} />
      </>
    ),
  },
  secure: {
    tint: "#f59e0b",
    gradients: { shackle: ["#d4d8de", "#7d8591"], body: ["#ffd966", "#f2a100"] },
    draw: (f) => (
      <>
        <path d="M35 46V35a13 13 0 0 1 26 0v11" fill="none" stroke={f("shackle")} strokeWidth="7" {...m("drop", 380)} />
        <g {...m("rise", 80)}>
          <rect x="24" y="42" width="48" height="36" rx="8" fill={f("body")} />
          <circle cx="48" cy="56" r="4.5" fill="#7a4b00" fillOpacity="0.75" />
          <rect x="46" y="57" width="4" height="9" rx="2" fill="#7a4b00" fillOpacity="0.75" />
        </g>
        <Sparkles points={[[78, 24, 5], [18, 30, 3.5]]} from={720} />
      </>
    ),
  },
  support: {
    tint: "#ef4444",
    gradients: { ring: ["#ff6b6b", "#d62828"] },
    draw: (f) => (
      <>
        <g {...m("spin", 80, { "--t": "800ms" })}>
          <circle cx="48" cy="48" r="22" fill="none" stroke={f("ring")} strokeWidth="13" />
          <circle cx="48" cy="48" r="22" fill="none" stroke="#f4f6f8" strokeWidth="13" strokeDasharray="14.6 19.95" strokeDashoffset="-9.98" />
          <circle cx="48" cy="48" r="15.5" fill="none" stroke="#000" strokeOpacity="0.12" />
        </g>
        <Sparkles points={[[80, 20, 4.5], [16, 76, 3.5]]} from={760} />
      </>
    ),
  },
}

export interface MotionArtProps extends SVGProps<SVGSVGElement> {
  name: MotionArtName
  /** متن دسترسی‌پذیری؛ بدون آن تصویر تزئینی است. */
  title?: string
}

export function MotionArt({ name, title, className, ...props }: MotionArtProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const spec = SPECS[name]
  const id = (g: string) => `ma${uid}-${name}-${g}`
  return (
    <svg
      viewBox="0 0 96 96"
      data-slot="motion-art"
      data-name={name}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn("size-24 shrink-0 overflow-visible", className)}
      {...props}
    >
      <defs>
        {Object.entries(spec.gradients).map(([g, [from, to, dir]]) => (
          <linearGradient key={g} id={id(g)} x1="0" y1="0" x2={dir === "diagonal" ? "1" : "0"} y2="1">
            <stop offset="0" stopColor={from} />
            <stop offset="1" stopColor={to} />
          </linearGradient>
        ))}
      </defs>
      <circle cx="48" cy="48" r="44" fill={spec.tint} fillOpacity="0.12" {...m("pop", 0, { "--t": "500ms" })} />
      {spec.draw((g) => `url(#${id(g)})`)}
    </svg>
  )
}
