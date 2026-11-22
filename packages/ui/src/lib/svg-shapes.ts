// شکل‌های مسیر SVG مشترک آیکون‌های سیستمی و صحنه‌های متحرک.

/** چرخ‌دنده با سوراخ وسط (با fill-rule: evenodd). */
export function gearPath(cx: number, cy: number, outer: number, root: number, hole: number, teeth = 8): string {
  const pt = (r: number, a: number) => `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`
  const step = (Math.PI * 2) / teeth
  const parts: string[] = []
  for (let i = 0; i < teeth; i++) {
    const a = i * step - Math.PI / 2
    parts.push(pt(root, a - step * 0.3), pt(outer, a - step * 0.17), pt(outer, a + step * 0.17), pt(root, a + step * 0.3))
  }
  return `M${parts.join("L")}Z M${cx + hole} ${cy}a${hole} ${hole} 0 1 0 ${-2 * hole} 0a${hole} ${hole} 0 1 0 ${2 * hole} 0Z`
}

/** ستاره‌ی چهارپر (درخشش). */
export function sparklePath(cx: number, cy: number, r: number): string {
  return `M${cx} ${cy - r}Q${cx} ${cy} ${cx + r} ${cy}Q${cx} ${cy} ${cx} ${cy + r}Q${cx} ${cy} ${cx - r} ${cy}Q${cx} ${cy} ${cx} ${cy - r}Z`
}
