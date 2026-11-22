'use client';

import { useId, useState, type KeyboardEvent } from 'react';
import { XIcon } from 'lucide-react';

const MAX_TAGS = 15;

/** برچسب‌ها به‌صورت نام؛ Enter یا «،» اضافه می‌کند، Backspace روی خالی آخری را برمی‌دارد. */
export function TagsInput({ value, onChange, suggestions }: { value: string[]; onChange: (tags: string[]) => void; suggestions: string[] }) {
  const [text, setText] = useState('');
  const listId = useId();

  function add(raw: string) {
    const name = raw.trim().replace(/\s+/g, ' ').slice(0, 80);
    setText('');
    if (!name || value.length >= MAX_TAGS || value.some((t) => t.toLowerCase() === name.toLowerCase())) return;
    onChange([...value, name]);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',' || e.key === '،') {
      e.preventDefault();
      add(text);
    } else if (e.key === 'Backspace' && !text && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background px-2 py-1.5 focus-within:border-primary">
      {value.map((t) => (
        <span key={t} className="flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs">
          {t}
          <button type="button" aria-label={`برداشتن ${t}`} onClick={() => onChange(value.filter((x) => x !== t))} className="text-muted-foreground hover:text-foreground">
            <XIcon className="size-3" />
          </button>
        </span>
      ))}
      <input
        list={listId}
        value={text}
        onChange={(e) => (e.target.value.endsWith('،') || e.target.value.endsWith(',') ? add(e.target.value.slice(0, -1)) : setText(e.target.value))}
        onKeyDown={onKeyDown}
        onBlur={() => text && add(text)}
        placeholder={value.length ? '' : 'برچسب و Enter'}
        aria-label="افزودن برچسب"
        maxLength={80}
        disabled={value.length >= MAX_TAGS}
        className="min-w-24 flex-1 bg-transparent text-sm outline-none"
      />
      <datalist id={listId}>
        {suggestions
          .filter((s) => !value.includes(s))
          .map((s) => (
            <option key={s} value={s} />
          ))}
      </datalist>
    </div>
  );
}
