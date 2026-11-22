/** قالب‌بندی مشترک صفحه‌ی اشتراک (اعداد/تاریخ/دوره). */
export const fa = (n: number) => n.toLocaleString('fa-IR');
const dateOnly = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Tehran' });
export const formatDate = (iso: string) => dateOnly.format(new Date(iso));
export const monthsLabel = (m: number) => {
  if (m === 12) return 'یک سال';
  if (m > 12 && m % 12 === 0) return `${fa(m / 12)} سال`;
  return `${fa(m)} ماه`;
};
