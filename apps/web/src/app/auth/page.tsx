'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { TimerIcon, XIcon } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  FieldDescription,
  FieldLabel,
  Input,
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  MotionArt,
  PasswordInput,
} from '@noroset/ui';
import { AuthCardSkeleton } from './loading';
import { BrandLogo } from '@/components/brand';
import { api, ApiError, errorMessage } from '@/lib/api';
import { toAsciiDigits } from '@/lib/format';
import { routes, safeNext } from '@/lib/routes';
import { findSignedInUser, setSessionHint } from '@/lib/session-hint';

const RESEND_SECONDS = 120;
const RATE_LIMIT_SECONDS = 60;
const PASSWORD_MIN = 8;
const CODE_LENGTH = 6;

/** otp: ورود با کد پیامکی — password: ورود با رمز — reset: فراموشی رمز (کد پیامکی + رمز جدید). */
type Mode = 'otp' | 'password' | 'reset';

function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  // ورود از صفحه‌ای که زمینه دارد (مثلاً تحویل صفحه‌ی آماده): عنوان کارت همان کار را می‌گوید تا مسیر گم نشود.
  const purpose = params.get('for')?.trim().slice(0, 80) || null;
  const [mode, setMode] = useState<Mode>('otp');
  const [step, setStep] = useState<'mobile' | 'code'>('mobile');
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const [rateLimitWait, setRateLimitWait] = useState(0);
  const [showRateLimitToast, setShowRateLimitToast] = useState(false);
  const [checking, setChecking] = useState(true);

  // کاربر واردشده فرم ورود را نمی‌بیند.
  useEffect(() => {
    let current = true;
    void findSignedInUser().then((user) => {
      if (!current) return;
      if (user) router.replace(next);
      else setChecking(false);
    });
    return () => {
      current = false;
    };
  }, [next, router]);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  useEffect(() => {
    if (rateLimitWait <= 0) {
      if (showRateLimitToast) {
        const timer = setTimeout(() => setShowRateLimitToast(false), 2500);
        return () => clearTimeout(timer);
      }
      return;
    }
    const t = setTimeout(() => setRateLimitWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [rateLimitWait, showRateLimitToast]);

  function switchMode(m: Mode) {
    setMode(m);
    setStep('mobile');
    setCode('');
    setPassword('');
    setError(null);
  }

  async function run(fn: () => Promise<void>) {
    setError(null);
    setBusy(true);
    try {
      await fn();
      setBusy(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setRateLimitWait(RATE_LIMIT_SECONDS);
        setShowRateLimitToast(true);
        setError('تعداد درخواست‌ها بیش از حد مجاز است. لطفاً تا پایان زمان انتظار شکیبا باشید.');
      } else {
        setError(errorMessage(err));
      }
      setBusy(false);
    }
  }

  function requestCode(e?: FormEvent) {
    e?.preventDefault();
    return run(async () => {
      await api('/auth/otp/request', { method: 'POST', body: { mobile: toAsciiDigits(mobile) } });
      setStep('code');
      setCode('');
      setWait(RESEND_SECONDS);
    });
  }

  function verify(e?: FormEvent, value = code) {
    e?.preventDefault();
    return run(async () => {
      await api('/auth/otp/verify', { method: 'POST', body: { mobile: toAsciiDigits(mobile), code: toAsciiDigits(value) } });
      setSessionHint(true);
      router.replace(next);
    });
  }

  function passwordLogin(e: FormEvent) {
    e.preventDefault();
    return run(async () => {
      await api('/auth/password/login', { method: 'POST', body: { mobile: toAsciiDigits(mobile), password } });
      setSessionHint(true);
      router.replace(next);
    });
  }

  function reset(e: FormEvent) {
    e.preventDefault();
    return run(async () => {
      await api('/auth/password/reset', {
        method: 'POST',
        body: { mobile: toAsciiDigits(mobile), code: toAsciiDigits(code), newPassword: password },
      });
      setSessionHint(true);
      router.replace(next);
    });
  }

  if (checking) {
    return <AuthCardSkeleton />;
  }

  const subtitle =
    mode === 'password'
      ? 'شماره موبایل و رمز عبور خود را وارد کنید.'
      : step === 'mobile'
        ? mode === 'reset'
          ? 'برای تعیین رمز جدید، شماره موبایل خود را وارد کنید.'
          : 'شماره موبایل خود را وارد کنید.'
        : `کد ${CODE_LENGTH.toLocaleString('fa-IR')} رقمی ارسال‌شده به ${mobile} را وارد کنید.`;

  const mobileField = (
    <Field>
      <FieldLabel>شماره موبایل</FieldLabel>
      <Input
        dir="ltr"
        inputMode="tel"
        autoComplete="tel"
        placeholder="09xxxxxxxxx"
        value={mobile}
        onChange={(e) => setMobile(e.target.value)}
        required
        autoFocus
      />
    </Field>
  );

  const codeField = (
    <Field>
      <FieldLabel>کد تأیید</FieldLabel>
      <InputOTP
        maxLength={CODE_LENGTH}
        value={code}
        onChange={(value: string) => {
          setCode(value);
          // ورود با کد پیامکی با کامل شدن کد خودکار ارسال می‌شود (بازیابی رمز هنوز رمز جدید لازم دارد).
          if (mode === 'otp' && value.length === CODE_LENGTH && !busy) void verify(undefined, value);
        }}
        autoComplete="one-time-code"
        autoFocus
        containerClassName="justify-center"
      >
        <InputOTPGroup>
          {Array.from({ length: CODE_LENGTH }, (_, i) => (
            <InputOTPSlot key={i} index={i} />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </Field>
  );

  const textButton = 'h-auto p-0';

  return (
    <>
      {showRateLimitToast ? (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed top-6 inset-x-0 z-50 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-3 rounded-2xl border border-warning/30 bg-popover/95 px-4 py-3 text-popover-foreground shadow-2xl backdrop-blur-xl animate-in fade-in-0 slide-in-from-top-4"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning dark:text-tone-amber">
            <TimerIcon className="size-5" />
          </span>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-xs font-bold sm:text-sm">محدودیت تعداد درخواست</span>
            <span className="text-xs text-muted-foreground">
              {rateLimitWait > 0
                ? `لطفاً ${rateLimitWait.toLocaleString('fa-IR')} ثانیه صبر کنید و سپس دوباره تلاش نمایید.`
                : 'زمان انتظار به پایان رسید؛ اکنون می‌توانید درخواست خود را ارسال کنید.'}
            </span>
          </div>
          {rateLimitWait > 0 ? (
            <span className="shrink-0 font-mono text-xs font-bold text-warning dark:text-tone-amber rounded-lg bg-warning/10 px-2.5 py-1">
              {rateLimitWait.toLocaleString('fa-IR')} ثانیه
            </span>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
            onClick={() => setShowRateLimitToast(false)}
            aria-label="بستن"
          >
            <XIcon className="size-4" />
          </Button>
        </div>
      ) : null}

      {/* پنل احراز هویت: لوگوی خارج از پنل در بالا وسط + سطح جامد دیالوگ */}
      <div className="flex w-full max-w-sm flex-col items-center">
        <Link
          href={routes.home}
          className="mb-6 inline-flex items-center justify-center transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
          aria-label="بازگشت به صفحه اصلی نوروست"
        >
          <BrandLogo className="h-8 w-auto" priority />
        </Link>

        <Card className="w-full bg-popover shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-xl sm:text-2xl font-bold">
              {mode === 'reset' ? 'بازیابی رمز عبور' : purpose ? `ورود برای ${purpose}` : 'ورود به نوروست'}
            </CardTitle>
            {/* صحنه‌ی متحرک وسط‌چین: ارسال کد (OTP)، ورود با رمز و بازیابی رمز */}
            <div className="my-2 flex justify-center">
              {mode === 'reset' ? (
                <MotionArt key="secure" name="secure" className="size-20" />
              ) : mode === 'password' ? (
                <MotionArt key="password" name="password" className="size-20" />
              ) : (
                <MotionArt key={`otp-${step}`} name="otp" className="size-20" />
              )}
            </div>
            <CardDescription className="text-xs sm:text-sm">{subtitle}</CardDescription>
          </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {mode === 'password' ? (
            <form onSubmit={passwordLogin} className="flex flex-col gap-4">
              {mobileField}
              <Field>
                <FieldLabel>رمز عبور</FieldLabel>
                <PasswordInput autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </Field>
              <Button type="submit" size="lg" loading={busy} disabled={busy || rateLimitWait > 0}>
                {rateLimitWait > 0 ? `شکیبا باشید (${rateLimitWait.toLocaleString('fa-IR')} ثانیه)` : 'ورود'}
              </Button>
              <div className="flex items-center justify-between">
                <Button type="button" variant="link" className={textButton} onClick={() => switchMode('otp')}>
                  ورود با کد پیامکی
                </Button>
                <Button type="button" variant="link" className={textButton} onClick={() => switchMode('reset')}>
                  فراموشی رمز
                </Button>
              </div>
            </form>
          ) : step === 'mobile' ? (
            <form onSubmit={requestCode} className="flex flex-col gap-4">
              {mobileField}
              <Button type="submit" size="lg" loading={busy} disabled={busy || rateLimitWait > 0}>
                {rateLimitWait > 0 ? `شکیبا باشید (${rateLimitWait.toLocaleString('fa-IR')} ثانیه)` : 'دریافت کد'}
              </Button>
              <div>
                <Button type="button" variant="link" className={textButton} onClick={() => switchMode('password')}>
                  {mode === 'reset' ? 'بازگشت به ورود با رمز' : 'ورود با رمز عبور'}
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={mode === 'reset' ? reset : verify} className="flex flex-col gap-4">
              {codeField}
              {mode === 'reset' ? (
                <Field>
                  <FieldLabel>رمز عبور جدید</FieldLabel>
                  <PasswordInput
                    autoComplete="new-password"
                    minLength={PASSWORD_MIN}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <FieldDescription>دست‌کم {PASSWORD_MIN.toLocaleString('fa-IR')} کاراکتر.</FieldDescription>
                </Field>
              ) : null}
              <Button type="submit" size="lg" loading={busy} disabled={code.length < CODE_LENGTH || busy || rateLimitWait > 0}>
                {rateLimitWait > 0
                  ? `شکیبا باشید (${rateLimitWait.toLocaleString('fa-IR')} ثانیه)`
                  : mode === 'reset'
                    ? 'ثبت رمز و ورود'
                    : 'ورود'}
              </Button>
              <div className="flex items-center justify-between">
                <Button type="button" variant="link" className={textButton} onClick={() => setStep('mobile')}>
                  تغییر شماره
                </Button>
                <Button type="button" variant="link" className={textButton} disabled={wait > 0 || busy || rateLimitWait > 0} onClick={() => requestCode()}>
                  {wait > 0 ? `ارسال دوباره (${wait.toLocaleString('fa-IR')} ثانیه)` : 'ارسال دوباره'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthCardSkeleton />}>
      <AuthForm />
    </Suspense>
  );
}
