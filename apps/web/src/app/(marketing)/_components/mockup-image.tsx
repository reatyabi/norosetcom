import Image from 'next/image';

/** صفحه‌ی داخل قاب موکاپ: دو تصویر ثابت روشن/تیره که با تم سایت جابه‌جا می‌شوند (تصویر پنهان بارگذاری نمی‌شود). */
export function MockupImage({ light, dark, sizes }: { light: string; dark: string; sizes: string }) {
  return (
    <>
      <Image src={light} alt="" fill sizes={sizes} className="object-cover object-[right_top] dark:hidden" />
      <Image src={dark} alt="" fill sizes={sizes} className="hidden object-cover object-[right_top] dark:block" />
    </>
  );
}
