'use client';

import { useState } from 'react';
import { CheckIcon, CopyIcon } from 'lucide-react';

export function CopyPhoneButton({ phone }: { phone: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      title="کپی شماره"
    >
      {copied ? (
        <>
          <CheckIcon className="size-4 text-success dark:text-success" />
          <span className="text-success dark:text-success">کپی شد</span>
        </>
      ) : (
        <>
          <CopyIcon className="size-4" />
          <span>کپی</span>
        </>
      )}
    </button>
  );
}
