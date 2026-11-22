import Image, { type ImageProps } from 'next/image';
import { cn } from '@noroset/ui';

export type BrandLogoProps = Pick<ImageProps, 'className' | 'priority'>;

export function BrandLogo({ className, priority }: BrandLogoProps) {
  return (
    <Image
      src="/logo.svg"
      alt=""
      width={889}
      height={234}
      priority={priority}
      className={cn('h-7 w-auto shrink-0 select-none', className)}
    />
  );
}

export function BrandMark({ className, priority }: BrandLogoProps) {
  return (
    <Image
      src="/favicon-ns.svg"
      alt=""
      width={75}
      height={74}
      priority={priority}
      className={cn('size-7 shrink-0 select-none', className)}
    />
  );
}
