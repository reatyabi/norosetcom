import type { FormPreview, FormPreviewItem } from '@noroset/field-engine';

// تصویر بندانگشتی فرم (فهرست و گالری قالب‌ها) از خلاصه‌ی `formPreview`: رنگ‌های خود فرم، کارت سفید عنوان با
// نوار رنگ اصلی و چند فیلد اول؛ مثل پیش‌نمایش سند در گوگل، مستقل از تم روشن/تیره‌ی پنل.

const CHOICE = new Set(['single_choice', 'multi_choice']);

function Control({ item, color }: { item: FormPreviewItem; color: string }) {
  if (CHOICE.has(item.type) && item.options) {
    return (
      <span className="mt-1 flex flex-col gap-0.5">
        {item.options.map((o, i) => (
          <span key={i} className="flex items-center gap-1 text-[6px] text-neutral-600">
            <span className={item.type === 'multi_choice' ? 'size-1.5 rounded-[1px] border border-neutral-400' : 'size-1.5 rounded-full border border-neutral-400'} />
            <span className="truncate">{o}</span>
          </span>
        ))}
      </span>
    );
  }
  if (item.type === 'rating') {
    return (
      <span className="mt-0.5 flex gap-0.5 text-[7px] leading-none" style={{ color }}>
        {'★'.repeat(Math.min(item.max ?? 5, 7))}
      </span>
    );
  }
  if (item.type === 'text') return null;
  return <span className={item.type === 'long_text' ? 'mt-1.5 block h-px w-full bg-neutral-300' : 'mt-1.5 block h-px w-2/3 bg-neutral-300'} />;
}

export function FormThumb({ preview, title }: { preview: FormPreview; title: string }) {
  const radius = { none: '0px', md: '3px', lg: '7px', full: '12px' }[preview.radius];
  const background =
    preview.backgroundStyle === 'gradient'
      ? `linear-gradient(${preview.backgroundAngle}deg, ${preview.backgroundColor}, ${preview.backgroundSecondaryColor})`
      : preview.backgroundStyle === 'mesh'
        ? `radial-gradient(at 15% 20%, ${preview.backgroundSecondaryColor} 0, transparent 55%), radial-gradient(at 85% 75%, ${preview.primaryColor}33 0, transparent 55%), ${preview.backgroundColor}`
        : preview.backgroundColor;
  const fontFamily = preview.font === 'system' ? 'system-ui, sans-serif' : 'var(--font-sans)';
  const scale = { sm: 0.9, md: 1, lg: 1.15 }[preview.textSize];

  return (
    <div
      dir="rtl"
      className="flex size-full flex-col gap-1 overflow-hidden px-[12%] pt-2.5"
      style={{ background, fontFamily, fontSize: `${scale * 100}%` }}
    >
      <div className="bg-white px-2 py-1.5 shadow-[0_0_0_0.5px_rgb(0_0_0/0.12)]" style={{ borderTop: `3px solid ${preview.primaryColor}`, borderRadius: radius }}>
        <span className="block truncate text-[8px] font-bold text-neutral-800">{title}</span>
        <span className="mt-1 block h-px w-1/2 bg-neutral-200" />
      </div>
      {preview.items.map((item, i) => (
        <div key={i} className="bg-white px-2 py-1.5 shadow-[0_0_0_0.5px_rgb(0_0_0/0.12)]" style={{ borderRadius: radius }}>
          <span className={item.type === 'text' ? 'block truncate text-[6.5px] text-neutral-600' : 'block truncate text-[7px] font-medium text-neutral-800'}>{item.label}</span>
          <Control item={item} color={preview.primaryColor} />
        </div>
      ))}
      <span
        className="mt-auto block w-1/3 truncate px-2 py-1 text-center text-[6px] font-semibold"
        style={{
          borderRadius: radius,
          color: preview.buttonStyle === 'outline' || preview.buttonStyle === 'soft' || preview.buttonStyle === 'tonal' ? preview.primaryColor : '#fff',
          background:
            preview.buttonStyle === 'outline'
              ? 'transparent'
              : preview.buttonStyle === 'soft' || preview.buttonStyle === 'tonal'
                ? `${preview.primaryColor}24`
                : preview.primaryColor,
          boxShadow: preview.buttonStyle === 'shadow' ? '2px 2px 0 #111' : undefined,
          outline: preview.buttonStyle === 'outline' ? `1px solid ${preview.primaryColor}` : undefined,
        }}
      >
        ادامه
      </span>
    </div>
  );
}
