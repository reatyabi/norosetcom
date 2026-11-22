import { useId, type ReactNode, type SVGProps } from "react"

import { gearPath } from "@noroset/ui/lib/svg-shapes"
import { cn } from "@noroset/ui/lib/utils"

// آیکون‌های رنگی صفحه‌ها و بخش‌های پلتفرم به سبک آیکون‌های سیستمی ویندوز ۱۱ (Fluent 2 color):
// چند لایه‌ی ساده، هر لایه با گرادیان روشن به تیره‌ی خودش. محصولات با رنگ برند (نوروفرم بنفش،
// نورولینک صورتی، نوروفایل کهربایی). رنگ‌ها جزء آیکون‌اند، نه توکن تم. شبکه‌ی طراحی ۴۸×۴۸.

export type SystemIconName =
  | "dashboard"
  | "account"
  | "users"
  | "workspace"
  | "subscription"
  | "admin"
  | "overview"
  | "campaigns"
  | "modules"
  | "audit"
  | "security"
  | "support"
  | "settings"
  | "noroform"
  | "norolink"
  | "norofile"

/** [رنگ روشن، رنگ تیره، جهت] — پیش‌فرض بالا به پایین. */
type Gradient = [from: string, to: string, dir?: "down" | "diagonal"]

interface SystemIconSpec {
  gradients: Record<string, Gradient>
  /** `f(name)` آدرس گرادیان همان آیکون را برمی‌گرداند. */
  draw: (f: (name: string) => string) => ReactNode
}

const SETTINGS_GEAR = gearPath(24, 24, 21, 16.5, 7)
const BADGE_GEAR = gearPath(36, 36, 10.5, 8, 3.4)

// گوشه‌های نرم Fluent: مسیر با خط هم‌رنگ خودش و اتصال گرد.
const soft = (fill: string) => ({ fill, stroke: fill, strokeWidth: 2, strokeLinejoin: "round" as const })

const PERSON_HEAD: Gradient = ["#7cd8ff", "#2c9bee"]
const PERSON_BODY: Gradient = ["#3a9bf0", "#1a56c5"]

const SPECS: Record<SystemIconName, SystemIconSpec> = {
  dashboard: {
    gradients: { a: ["#5bd0ff", "#1a8cf0"], b: ["#3db8ff", "#0f6cd9"], c: ["#2d8bff", "#1849c6"], d: ["#7fdbff", "#2ca6f5"] },
    draw: (f) => (
      <>
        <rect x="5" y="5" width="17" height="22" rx="4" fill={f("a")} />
        <rect x="26" y="5" width="17" height="13" rx="4" fill={f("d")} />
        <rect x="5" y="31" width="17" height="12" rx="4" fill={f("b")} />
        <rect x="26" y="22" width="17" height="21" rx="4" fill={f("c")} />
      </>
    ),
  },
  account: {
    gradients: { head: PERSON_HEAD, body: PERSON_BODY },
    draw: (f) => (
      <>
        <path d="M24 27c-9.9 0-17 5.4-17 11.5V40a4 4 0 0 0 4 4h26a4 4 0 0 0 4-4v-1.5C41 32.4 33.9 27 24 27Z" fill={f("body")} />
        <circle cx="24" cy="14.5" r="9.5" fill={f("head")} />
      </>
    ),
  },
  users: {
    gradients: { head2: ["#8ee3f5", "#2fb3d9"], body2: ["#4cc4e6", "#1f86b8"], head: PERSON_HEAD, body: PERSON_BODY },
    draw: (f) => (
      <>
        <path d="M32 25c-3 0-5.7.6-8 1.6 4.6 2.4 7.5 6.5 7.5 11.4V42H41a3 3 0 0 0 3-3v-1.5C44 30.4 38.6 25 32 25Z" fill={f("body2")} />
        <circle cx="32" cy="14" r="7" fill={f("head2")} />
        <path d="M18 28c-8.3 0-14 4.8-14 10v3a3 3 0 0 0 3 3h22a3 3 0 0 0 3-3v-3c0-5.2-5.7-10-14-10Z" fill={f("body")} />
        <circle cx="18" cy="16" r="8" fill={f("head")} />
      </>
    ),
  },
  workspace: {
    gradients: { main: ["#8fb8ff", "#3b66d6"], side: ["#b5d0ff", "#6b8fe6"] },
    draw: (f) => (
      <>
        <rect x="27" y="17" width="16" height="27" rx="3" fill={f("side")} />
        <rect x="5" y="4" width="27" height="40" rx="3.5" fill={f("main")} />
        <g fill="#fff" fillOpacity="0.9">
          <rect x="10" y="10" width="6" height="4.5" rx="1.2" />
          <rect x="21" y="10" width="6" height="4.5" rx="1.2" />
          <rect x="10" y="18" width="6" height="4.5" rx="1.2" />
          <rect x="21" y="18" width="6" height="4.5" rx="1.2" />
          <rect x="10" y="26" width="6" height="4.5" rx="1.2" />
          <rect x="21" y="26" width="6" height="4.5" rx="1.2" />
          <rect x="14.5" y="35" width="8" height="9" rx="1.5" />
        </g>
        <g fill="#fff" fillOpacity="0.75">
          <rect x="33" y="23" width="5" height="4" rx="1" />
          <rect x="33" y="31" width="5" height="4" rx="1" />
        </g>
      </>
    ),
  },
  subscription: {
    gradients: { card: ["#4ade9a", "#0e8a55", "diagonal"], chip: ["#ffe68a", "#e5a400"], badge: ["#4fc3ff", "#1767d6"] },
    draw: (f) => (
      <>
        <rect x="3" y="8" width="38" height="27" rx="4.5" fill={f("card")} />
        <rect x="3" y="14" width="38" height="5" fill="#000" fillOpacity="0.22" />
        <rect x="8" y="23" width="9" height="6.5" rx="1.6" fill={f("chip")} />
        <rect x="8" y="31" width="14" height="2" rx="1" fill="#fff" fillOpacity="0.6" />
        <circle cx="36" cy="35" r="10" fill={f("badge")} />
        <g fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round">
          <path d="M31.68 36.57A4.6 4.6 0 0 1 39.52 32.04" />
          <path d="M40.32 33.43A4.6 4.6 0 0 1 32.48 37.96" />
        </g>
        <g fill="#fff">
          <path d="M40.93 33.73 40.68 30.3 37.6 32.86Z" />
          <path d="M31.07 36.27 31.32 39.7 34.4 37.14Z" />
        </g>
      </>
    ),
  },
  admin: {
    gradients: { shield: ["#4fc8ff", "#1a5ed8"], gear: ["#e0e0e0", "#7a7a7a"] },
    draw: (f) => (
      <>
        <path d="M24 3.5 40 9.5v12c0 10.8-6.9 19.2-16 22.7C14.9 40.7 8 32.3 8 21.5v-12Z" {...soft(f("shield"))} />
        <path d="M24 3.5 8 9.5v12C8 32.3 14.9 40.7 24 44.2Z" fill="#fff" fillOpacity="0.18" />
        <path d={BADGE_GEAR} fill={f("gear")} fillRule="evenodd" />
      </>
    ),
  },
  overview: {
    gradients: { a: ["#7fdbff", "#2ca6f5"], b: ["#4fb4ff", "#1a73e8"], c: ["#3d8bff", "#1849c6"] },
    draw: (f) => (
      <>
        <rect x="6" y="24" width="9.5" height="17" rx="2.5" fill={f("a")} />
        <rect x="19.25" y="14" width="9.5" height="27" rx="2.5" fill={f("b")} />
        <rect x="32.5" y="5" width="9.5" height="36" rx="2.5" fill={f("c")} />
        <rect x="3" y="42" width="42" height="3" rx="1.5" fill="#94a3b8" />
      </>
    ),
  },
  campaigns: {
    gradients: { cone: ["#ffb46b", "#f2600c"], rim: ["#ff8a4c", "#d9480f"], back: ["#ffd3a1", "#f7883a"], handle: ["#9aa4b2", "#5b6573"] },
    draw: (f) => (
      <>
        <path d="M12 28 15 39.5a2.5 2.5 0 0 0 2.4 1.9h1.4a2 2 0 0 0 1.9-2.6L18 29Z" fill={f("handle")} />
        <rect x="4" y="17" width="9" height="12" rx="3" fill={f("back")} />
        <path d="M11 18 33 8v30L11 28Z" {...soft(f("cone"))} />
        <rect x="31" y="5" width="6" height="36" rx="3" fill={f("rim")} />
        <path d="M41 17.5c2.2 2.6 2.2 8.4 0 11" fill="none" stroke="#f2600c" strokeWidth="2.5" strokeLinecap="round" />
      </>
    ),
  },
  modules: {
    gradients: { top: ["#a4f4e6", "#3ccfb8"], left: ["#2bb59e", "#13806e"], right: ["#1e9c88", "#0b5f52"] },
    draw: (f) => (
      <>
        <path d="M24 4 42 13.5 24 23 6 13.5Z" {...soft(f("top"))} />
        <path d="M6 13.5 24 23v21L6 34.5Z" {...soft(f("left"))} />
        <path d="M42 13.5 24 23v21l18-9.5Z" {...soft(f("right"))} />
      </>
    ),
  },
  audit: {
    gradients: { paper: ["#f4f6f9", "#c9d1dc"], lens: ["#8adcff", "#2b8fea"] },
    draw: (f) => (
      <>
        <rect x="6" y="3" width="29" height="37" rx="4" fill={f("paper")} />
        <g fill="#2f7fea">
          <rect x="11" y="10" width="19" height="3" rx="1.5" />
          <rect x="11" y="16.5" width="15" height="3" rx="1.5" />
          <rect x="11" y="23" width="9" height="3" rx="1.5" />
        </g>
        <path d="M36.5 36.5 43 43" stroke="#3a4452" strokeWidth="5" strokeLinecap="round" />
        <circle cx="30" cy="30" r="8.5" fill={f("lens")} stroke="#3a4452" strokeWidth="3" />
        <path d="M26 28.5a4.5 4.5 0 0 1 3-3.4" fill="none" stroke="#fff" strokeOpacity="0.75" strokeWidth="1.8" strokeLinecap="round" />
      </>
    ),
  },
  security: {
    gradients: { shackle: ["#d4d8de", "#7d8591"], body: ["#ffd966", "#f2a100"] },
    draw: (f) => (
      <>
        <path d="M15 21v-5a9 9 0 0 1 18 0v5" fill="none" stroke={f("shackle")} strokeWidth="5" />
        <rect x="7" y="20" width="34" height="24" rx="5" fill={f("body")} />
        <g fill="#7a4b00" fillOpacity="0.75">
          <circle cx="24" cy="30" r="3.4" />
          <rect x="22.5" y="31" width="3" height="6.5" rx="1.5" />
        </g>
      </>
    ),
  },
  support: {
    gradients: { ring: ["#ff6b6b", "#d62828"] },
    draw: (f) => (
      <>
        <circle cx="24" cy="24" r="14.5" fill="none" stroke={f("ring")} strokeWidth="10" />
        <circle cx="24" cy="24" r="14.5" fill="none" stroke="#f4f6f8" strokeWidth="10" strokeDasharray="9.6 13.18" strokeDashoffset="-6.6" />
        <circle cx="24" cy="24" r="9.5" fill="none" stroke="#000" strokeOpacity="0.12" />
      </>
    ),
  },
  settings: {
    gradients: { gear: ["#dcdcdc", "#6e6e6e"] },
    draw: (f) => (
      <>
        <path d={SETTINGS_GEAR} fill={f("gear")} fillRule="evenodd" />
        <circle cx="24" cy="24" r="11" fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="1.5" />
      </>
    ),
  },
  noroform: {
    gradients: { board: ["#c58cff", "#7a2bd6"], paper: ["#ffffff", "#ede4fa"], clip: ["#9a5bea", "#5b1bb0"] },
    draw: (f) => (
      <>
        <rect x="7" y="6" width="34" height="39" rx="4.5" fill={f("board")} />
        <rect x="12" y="11" width="24" height="29" rx="2" fill={f("paper")} />
        <rect x="17" y="3" width="14" height="7" rx="3" fill={f("clip")} />
        <rect x="16" y="16.5" width="5.5" height="5.5" rx="1.3" fill="#9333ea" />
        <path d="M17.4 19.3l1.3 1.3 2.2-2.4" fill="none" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="16.6" y="26.6" width="4.3" height="4.3" rx="1" fill="none" stroke="#9333ea" strokeWidth="1.2" />
        <g fill="#c9b3ee">
          <rect x="24" y="18" width="8" height="2.6" rx="1.3" />
          <rect x="24" y="27.5" width="8" height="2.6" rx="1.3" />
          <rect x="16" y="34" width="16" height="2.6" rx="1.3" />
        </g>
      </>
    ),
  },
  norolink: {
    gradients: { a: ["#ff8cc6", "#e0317f"], b: ["#f25fa5", "#b0125a"] },
    draw: (f) => (
      <g transform="rotate(-45 24 24)" fill="none" strokeWidth="5">
        <rect x="4.5" y="17" width="22" height="14" rx="7" stroke={f("a")} />
        <rect x="21.5" y="17" width="22" height="14" rx="7" stroke={f("b")} />
      </g>
    ),
  },
  norofile: {
    gradients: { back: ["#f5b800", "#d98e00"], front: ["#ffe27a", "#ffb900"] },
    draw: (f) => (
      <>
        <path d="M4 11a4 4 0 0 1 4-4h10.3a4 4 0 0 1 2.8 1.2L24 11h16a4 4 0 0 1 4 4v23a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z" fill={f("back")} />
        <path d="M4 19a3 3 0 0 1 3-3h34a3 3 0 0 1 3 3v19a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z" fill={f("front")} />
      </>
    ),
  },
}

export interface SystemIconProps extends SVGProps<SVGSVGElement> {
  name: SystemIconName
  /** متن دسترسی‌پذیری؛ بدون آن آیکون تزئینی است. */
  title?: string
}

export function SystemIcon({ name, title, className, ...props }: SystemIconProps) {
  // شناسه‌ی یکتا تا گرادیان‌های چند آیکون هم‌نام در یک صفحه با هم تداخل نکنند.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const spec = SPECS[name]
  const id = (g: string) => `si${uid}-${name}-${g}`
  return (
    <svg
      viewBox="0 0 48 48"
      data-slot="system-icon"
      data-name={name}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn("size-6 shrink-0", className)}
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
      {spec.draw((g) => `url(#${id(g)})`)}
    </svg>
  )
}
