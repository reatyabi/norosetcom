'use client';

import { useMemo, useState } from 'react';
import { CheckIcon, CopyIcon, ExternalLinkIcon, QrCodeIcon, XIcon } from 'lucide-react';
import { generateQrMatrix } from './qr-generator';

interface QrModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  slug: string;
  url: string;
}

export function QrModal({ isOpen, onClose, title, slug, url }: QrModalProps) {
  const [copied, setCopied] = useState(false);

  const matrix = useMemo(() => {
    if (!isOpen) return [];
    try {
      return generateQrMatrix(url);
    } catch {
      return [];
    }
  }, [isOpen, url]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const matrixSize = matrix.length || 29;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-border/70 bg-card p-6 shadow-2xl transition-[color,background-color,border-color,box-shadow,opacity,transform]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute left-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="بستن پنجره"
        >
          <XIcon className="size-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3">
            <QrCodeIcon className="size-6" />
          </div>

          <h3 id="qr-modal-title" className="text-base font-bold text-foreground">
            کد QR صفحه اختصاصی
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{title}</p>
          <span className="inline-flex items-center px-2 py-0.5 mt-1.5 rounded-full text-[11px] font-mono text-primary bg-primary/10" dir="ltr">
            {slug}.n8l.ir
          </span>

          {/* QR Code Container */}
          <div className="relative my-5 rounded-xl border border-border/80 bg-white p-3 shadow-inner">
            <svg
              viewBox={`0 0 ${matrixSize} ${matrixSize}`}
              className="size-48 w-48 h-48 block"
              shapeRendering="crispEdges"
              aria-label={`کد QR برای نشانی ${url}`}
            >
              {matrix.map((row, r) =>
                row.map((cell, c) =>
                  cell ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#0a0a0a" /> : null,
                ),
              )}
            </svg>
            {/* Center Logo Badge */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="size-7 rounded-md bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                <span className="text-[11px] font-bold text-primary">ن</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mb-4">
            با دوربین گوشی یا برنامه‌های اسکنر، کد را اسکن کنید.
          </p>

          <div className="flex w-full gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-border/80 bg-muted/50 py-2.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              {copied ? (
                <>
                  <CheckIcon className="size-4 text-success" />
                  <span className="text-success font-bold">کپی شد!</span>
                </>
              ) : (
                <>
                  <CopyIcon className="size-3.5" />
                  <span>کپی نشانی</span>
                </>
              )}
            </button>

            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
            >
              <span>مشاهده صفحه</span>
              <ExternalLinkIcon className="size-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
