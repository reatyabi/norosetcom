'use client';

import type { CSSProperties } from 'react';
import type { FormTheme } from '@noroset/field-engine';
import { radiusCss } from './theme';

export function PublicMessage({ title, message }: { title: string; message: string }) {
  return <main dir="rtl" className="grid min-h-dvh place-items-center bg-background p-4"><section className="w-full max-w-xl rounded-2xl bg-card p-8 text-center text-card-foreground shadow-sm ring-1 ring-border"><h1 className="text-xl font-bold">{title}</h1><p className="mt-3 text-muted-foreground">{message}</p></section></main>;
}

export function buttonStyle(theme: FormTheme): CSSProperties {
  const radius = radiusCss(theme.radius);
  const color = theme.primary_color;
  if (theme.button_style === 'outline') return { borderRadius: radius, background: 'transparent', color, border: `1px solid ${color}` };
  if (theme.button_style === 'soft' || theme.button_style === 'tonal') return { borderRadius: radius, background: `${color}24`, color, border: `1px solid ${color}33` };
  if (theme.button_style === 'glass') return { borderRadius: radius, background: 'rgba(255,255,255,.82)', color: 'black', border: '1px solid rgba(255,255,255,.9)' };
  return { borderRadius: radius, background: color, color: readableInk(color), border: `1px solid ${color}`, boxShadow: theme.button_style === 'shadow' ? '3px 3px 0 #111' : undefined };
}

export function readableInk(color: string): string {
  const rgb = color.slice(1).match(/.{2}/g)?.map((part) => parseInt(part, 16)) ?? [0, 0, 0];
  const luminance = (0.2126 * rgb[0]! + 0.7152 * rgb[1]! + 0.0722 * rgb[2]!) / 255;
  return luminance > 0.56 ? 'black' : 'white';
}
