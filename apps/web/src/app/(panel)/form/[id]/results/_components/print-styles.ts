/**
 * استایل چاپ/پیش‌نمایش دراور پاسخ‌ها.
 * از `results/page.tsx` جدا شد تا صفحه فقط منطق و چیدمان داشته باشد (فاز ۵ ساختار).
 * رنگ‌های مطلق چاپ عمدی‌اند: خروجی کاغذ مستقل از تم است.
 */
export const PRINT_STYLES = `
          @media (max-width: 639px) {
            .submission-detail-content [data-detail-section-index="0"] > .grid-cols-2 {
              column-gap: 4px;
              row-gap: 4px;
            }
            .submission-detail-content [data-detail-section-index="0"] > .grid-cols-2 > [data-detail-card-index="0"],
            .submission-detail-content [data-detail-section-index="0"] > .grid-cols-2 > [data-detail-card-index="1"] {
              padding-top: 5px;
              padding-bottom: 5px;
            }
            .submission-detail-content [data-detail-section-index="0"] > .grid-cols-2 > [data-detail-card-index="1"] {
              row-gap: 5px;
            }
            .submission-detail-content [data-detail-section-index="0"] > .grid-cols-2 > [data-detail-card-index="2"] {
              padding-top: 4px;
              padding-bottom: 4px;
            }
            .submission-detail-content [data-detail-section-index="1"] > .grid-cols-2 > article {
              row-gap: 4px;
            }
            [data-slot="sheet-content"].submission-detail-drawer {
              inset: auto 0 0 !important;
              width: 100% !important;
              max-width: none !important;
              height: 80dvh !important;
              max-height: 80dvh !important;
              border: 1px solid var(--border) !important;
              border-bottom: 0 !important;
              border-radius: 12px 12px 0 0 !important;
            }
            [data-slot="sheet-content"].submission-detail-drawer[data-starting-style],
            [data-slot="sheet-content"].submission-detail-drawer[data-ending-style] {
              translate: 0 100% !important;
            }
            [data-slot="sheet-content"].submission-detail-drawer {
              transform: translate3d(0, var(--submission-drawer-drag-y, 0px), 0) !important;
              transition: var(--submission-drawer-drag-transition) !important;
            }
          }
          /* پیش‌نمایش چاپ: کلون محتوا مثل خروجی چاپ و روی کاغذ سفید دیده شود. */
          .submission-print-host .submission-detail-print {
            display: block;
            width: 100%;
            height: auto;
            min-height: 0;
            max-height: none;
            overflow: visible;
            padding: 16px;
            font-size: 10.5pt;
          }
          .submission-print-host .submission-detail-print,
          .submission-print-host .submission-detail-print * {
            color: black !important;
            border-color: lightgray !important;
          }
          .submission-print-host .submission-detail-print [class*='bg-'] { background: #fff !important; }
          .submission-print-host .submission-detail-print [data-print-hide],
          .submission-print-host .submission-detail-print > :first-child { display: none !important; }
          .submission-print-host .submission-detail-print .submission-detail-content {
            display: block;
            height: auto;
            min-height: 0;
            max-height: none;
            overflow: visible;
            padding: 0;
          }
          .submission-print-host .submission-detail-print .detail-summary {
            max-height: none;
            overflow: visible;
          }
          @media print {
            @page { size: A4 portrait; margin: 12mm; }
            body * { visibility: hidden !important; }
            .submission-detail-print, .submission-detail-print * { visibility: visible !important; }
            [data-slot="sheet-content"].submission-detail-drawer { display: block !important; position: static !important; inset: auto !important; width: 100% !important; height: auto !important; max-width: none !important; max-height: none !important; overflow: visible !important; transform: none !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
            .submission-detail-print { display: block !important; position: static !important; inset: auto !important; width: 100% !important; height: auto !important; min-height: 0 !important; max-height: none !important; overflow: visible !important; background: white !important; color: black !important; font-size: 10pt !important; }
            .submission-detail-print * { font-size: 10pt !important; line-height: 1.4 !important; }
            .submission-detail-print > :first-child { display: none !important; }
            .submission-detail-print .submission-detail-content { display: block !important; min-height: 0 !important; height: auto !important; max-height: none !important; overflow: visible !important; padding: 0 !important; }
            .submission-detail-print section { break-inside: auto; page-break-inside: auto; }
            .submission-detail-print .detail-summary { max-height: none !important; overflow: visible !important; }
            .submission-detail-print article { break-inside: avoid; page-break-inside: avoid; border-color: lightgray !important; background: white !important; color: black !important; box-shadow: none !important; }
            .submission-detail-print footer { display: flex !important; break-inside: avoid; page-break-inside: avoid; }
            .submission-detail-print [data-print-hide], [data-slot="sheet-overlay"], [data-slot="sheet-close"] { display: none !important; }
            .submission-detail-print a { color: black !important; }
            .submission-detail-print [class~="grid-cols-2"] { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
            .submission-detail-print [class*="border-border"] { border-color: lightgray !important; }
            .submission-detail-print[data-print-size="A5"] { font-size: 9pt !important; }
            .submission-detail-print[data-print-size="A5"] * { font-size: 9pt !important; line-height: 1.3 !important; }
            .submission-detail-print[data-print-size="A5"] [class~="grid-cols-2"] { grid-template-columns: minmax(0, 1fr) !important; }
            .submission-detail-print[data-print-size="A5"] article { padding: 5pt !important; }
            /* وقتی پنل پیش‌نمایش باز است فقط محتوای همان پنل چاپ می‌شود. */
            body[data-print-preview='on'] .submission-detail-drawer .submission-detail-print { visibility: hidden !important; }
            body[data-print-preview='on'] .submission-print-preview,
            body[data-print-preview='on'] .submission-print-preview .submission-print-host,
            body[data-print-preview='on'] .submission-print-preview .submission-detail-print,
            body[data-print-preview='on'] .submission-print-preview .submission-detail-print * { visibility: visible !important; }
            body[data-print-preview='on'] .submission-print-preview { display: block !important; position: static !important; inset: auto !important; height: auto !important; overflow: visible !important; background: #fff !important; }
            body[data-print-preview='on'] .submission-print-preview > header { display: none !important; }
            body[data-print-preview='on'] .submission-print-preview > div { display: block !important; overflow: visible !important; padding: 0 !important; background: #fff !important; }
            body[data-print-preview='on'] .submission-print-host { max-width: none !important; border-radius: 0 !important; box-shadow: none !important; }
            body[data-print-preview='on'] .submission-print-host .submission-detail-print { padding: 0 !important; }
          }
`;
