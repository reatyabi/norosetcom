'use client';

/** لوگوهای تکنولوژی و شرکت‌های همکار منطبق بر نوار بالای تصویر مرجع */
export function PartnerLogos() {
  return (
    <div className="flex items-center justify-end gap-6 sm:gap-9 text-muted-foreground/60 transition-colors hover:text-muted-foreground/90 max-lg:justify-center flex-wrap">
      {/* Perplexity style logo */}
      <div className="flex items-center gap-1.5 font-bold tracking-tight text-sm sm:text-base">
        <svg viewBox="0 0 24 24" fill="currentColor" className="size-4.5 sm:size-5">
          <path d="M12 2L4 7v10l8 5 8-5V7l-8-5zm0 2.2l6 3.75v3.1l-6-3.75-6 3.75v-3.1l6-3.75zm-6 8.7l5 3.12v4.88L6 17.65V12.9zm7 8V16l5-3.1v4.75l-5 3.25z" />
        </svg>
        <span>perplexity</span>
      </div>

      {/* Astro style logo */}
      <div className="flex items-center gap-1.5 font-extrabold tracking-tight text-sm sm:text-base">
        <svg viewBox="0 0 24 24" fill="currentColor" className="size-4.5 sm:size-5">
          <path d="M12 2.5l2.2 6.8h7.1l-5.8 4.2 2.2 6.8-5.7-4.2-5.8 4.2 2.2-6.8-5.8-4.2h7.2L12 2.5z" />
        </svg>
        <span>astro</span>
      </div>

      {/* Arc style logo */}
      <div className="flex items-center gap-1.5 font-bold tracking-wider text-sm sm:text-base">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="size-4.5 sm:size-5">
          <circle cx="12" cy="12" r="9" />
          <path d="M7 12c0-2.8 2.2-5 5-5s5 2.2 5 5" />
        </svg>
        <span>ARC</span>
      </div>

      {/* Descript style logo */}
      <div className="flex items-center gap-1.5 font-bold tracking-tight text-sm sm:text-base">
        <svg viewBox="0 0 24 24" fill="currentColor" className="size-4.5 sm:size-5">
          <path d="M4 6h4v12H4zM10 6h4v12h-4zM16 6h4v12h-4z" />
        </svg>
        <span>descript</span>
      </div>

      {/* Mercury style logo */}
      <div className="flex items-center gap-1.5 font-semibold tracking-widest text-xs sm:text-sm uppercase">
        <svg viewBox="0 0 24 24" fill="currentColor" className="size-4 sm:size-4.5">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="12" r="4" />
        </svg>
        <span>MERCURY</span>
      </div>
    </div>
  );
}
