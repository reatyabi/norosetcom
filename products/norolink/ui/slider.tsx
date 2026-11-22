'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

// اسلایدر المان تصویر (docs/architecture.md §9.2): کشیدن بومی با scroll-snap (بدون کتابخانه و بدون JS برای خود
// حرکت)، نقطه‌ها و شمارنده، فلش‌ها فقط روی دستگاه اشاره‌گر، کلیدهای جهت، بدون چرخش خودکار. تنها بخش کلاینتی
// صفحه‌ی لینک؛ اسلایدها (تصویر/لینک) در سرور ساخته و فرزند داده می‌شوند.

const faNumber = new Intl.NumberFormat('fa-IR');

export function ImageSlider({ slides, label = 'تصاویر' }: { slides: ReactNode[]; label?: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const count = slides.length;

  // اسلاید فعال = اسلایدی که بیشترش در کادر است (در RTL هم درست، بدون حساب scrollLeft)
  useEffect(() => {
    const root = track.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index));
      },
      { root, threshold: 0.6 },
    );
    root.querySelectorAll<HTMLElement>('.nl-slide').forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [count]);

  const goTo = (i: number) => {
    const root = track.current;
    const slide = root?.querySelectorAll<HTMLElement>('.nl-slide')[Math.max(0, Math.min(count - 1, i))];
    if (!root || !slide) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // فاصله‌ی اسلاید تا لبه‌ی track (مستقل از جهت) به اسکرول افقی همان track
    root.scrollBy({ left: slide.getBoundingClientRect().left - root.getBoundingClientRect().left, behavior: reduce ? 'auto' : 'smooth' });
  };

  // در RTL «چپ» یعنی بعدی
  const onKey = (e: KeyboardEvent) => {
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      goTo(active + ((e.key === 'ArrowLeft') === rtl ? 1 : -1));
    }
  };

  return (
    <div className="nl-slider" role="group" aria-roledescription="carousel" aria-label={label}>
      <div ref={track} className="nl-slider-track" tabIndex={0} onKeyDown={onKey}>
        {slides.map((node, i) => (
          <div
            key={i}
            className="nl-slide"
            data-index={i}
            role="group"
            aria-roledescription="slide"
            aria-label={`${faNumber.format(i + 1)} از ${faNumber.format(count)}`}
          >
            {node}
          </div>
        ))}
      </div>
      <span className="nl-slider-count" aria-hidden>
        {faNumber.format(active + 1)}/{faNumber.format(count)}
      </span>
      <button type="button" className="nl-slider-arrow nl-slider-arrow--prev" aria-label="تصویر قبلی" disabled={active === 0} onClick={() => goTo(active - 1)}>
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="m9 6 6 6-6 6" />
        </svg>
      </button>
      <button
        type="button"
        className="nl-slider-arrow nl-slider-arrow--next"
        aria-label="تصویر بعدی"
        disabled={active === count - 1}
        onClick={() => goTo(active + 1)}
      >
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="m15 6-6 6 6 6" />
        </svg>
      </button>
      <div className="nl-slider-dots">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            className="nl-slider-dot"
            aria-label={`تصویر ${faNumber.format(i + 1)}`}
            aria-current={i === active ? 'true' : undefined}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </div>
  );
}
