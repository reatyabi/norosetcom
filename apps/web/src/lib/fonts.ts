import localFont from 'next/font/local';

// فونت‌های ایران‌یکان (IRANYekan) از C:\norosetcom\apps\web\public\webfonts
const fontYekan = localFont({
  src: [
    {
      path: '../../public/webfonts/fonts/woff2/IRANYekanWebThin.woff2',
      weight: '100',
      style: 'normal',
    },
    {
      path: '../../public/webfonts/fonts/woff2/IRANYekanWebLight.woff2',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../../public/webfonts/fonts/woff2/IRANYekanWebRegular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/webfonts/fonts/woff2/IRANYekanWebMedium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/webfonts/fonts/woff2/IRANYekanWebBold.woff2',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../../public/webfonts/fonts/woff2/IRANYekanWebExtraBold.woff2',
      weight: '800',
      style: 'normal',
    },
    {
      path: '../../public/webfonts/fonts/woff2/IRANYekanWebBlack.woff2',
      weight: '850',
      style: 'normal',
    },
    {
      path: '../../public/webfonts/fonts/woff2/IRANYekanWebExtraBlack.woff2',
      weight: '900',
      style: 'normal',
    },
  ],
  variable: '--font-fa',
  display: 'swap',
  fallback: ['Tahoma', 'sans-serif'],
  adjustFontFallback: false,
});

const fontSans = localFont({
  src: '../app/_assets/fonts/GeistVariable.woff2',
  weight: '100 900',
  variable: '--font-geist',
  display: 'swap',
  fallback: [],
  adjustFontFallback: false,
});

const fontMono = localFont({
  src: '../app/_assets/fonts/GeistMonoVariable.woff2',
  weight: '100 900',
  variable: '--font-mono-geist',
  display: 'swap',
  fallback: [],
  adjustFontFallback: false,
});

export const fontVariables = [fontYekan.variable, fontSans.variable, fontMono.variable].join(' ');
