'use client';

import { useCallback, useEffect, useState } from 'react';

interface PublicResponse {
  formTitle: string;
  submittedAt: string;
  versionNumber: number;
  fields: Array<{ fieldId: string; label: string; type: string; value: string }>;
}

const submittedAt = (iso: string) =>
  new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));

export function PublicResponseRuntime({ token }: { token: string }) {
  const [data, setData] = useState<PublicResponse | null>(null);
  const [authMode, setAuthMode] = useState<'key' | 'otp' | null>(null);
  const [key, setKey] = useState('');
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/noroform/public/responses/${encodeURIComponent(token)}`, {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      if (res.status === 401) {
        const body = (await res.json().catch(() => null)) as { authMode?: unknown } | null;
        setAuthMode(body?.authMode === 'otp' ? 'otp' : 'key');
        setLoading(false);
        return;
      }
      if (res.status === 410) {
        setError('لینک مشاهده‌ی این پاسخ منقضی یا باطل شده است.');
        setLoading(false);
        return;
      }
      if (res.status === 404) {
        setError('این نشانی وجود ندارد یا دیگر در دسترس نیست.');
        setLoading(false);
        return;
      }
      if (res.status === 429) {
        setError('درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کنید.');
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError('نمایش این پاسخ ممکن نشد. کمی بعد دوباره تلاش کنید.');
        setLoading(false);
        return;
      }
      setAuthMode(null);
      setData((await res.json()) as PublicResponse);
    } catch {
      setError('ارتباط با سرویس برقرار نشد. کمی بعد دوباره تلاش کنید.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void load();
    });
    return () => {
      active = false;
    };
  }, [load]);

  const unlock = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/noroform/public/responses/${encodeURIComponent(token)}/unlock`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      if (!res.ok) {
        setError(res.status === 401 ? 'کلید دسترسی درست نیست.' : 'بازکردن پاسخ ممکن نشد.');
        setLoading(false);
        return;
      }
      await load();
    } catch {
      setError('ارتباط با سرویس برقرار نشد. کمی بعد دوباره تلاش کنید.');
      setLoading(false);
    }
  };

  const requestOtp = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/noroform/public/responses/${encodeURIComponent(token)}/otp/request`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mobile }),
      });
      if (!res.ok) {
        setError(res.status === 429 ? 'درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کنید.' : 'ارسال کد ممکن نشد. شماره را بررسی کنید.');
        return;
      }
      setOtpSent(true);
    } catch {
      setError('ارتباط با سرویس برقرار نشد. کمی بعد دوباره تلاش کنید.');
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/noroform/public/responses/${encodeURIComponent(token)}/otp/verify`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mobile, code }),
      });
      if (!res.ok) {
        setError(res.status === 401 ? 'کد واردشده درست نیست.' : 'تأیید کد ممکن نشد.');
        setBusy(false);
        return;
      }
      await load();
      setBusy(false);
    } catch {
      setError('ارتباط با سرویس برقرار نشد. کمی بعد دوباره تلاش کنید.');
      setBusy(false);
    }
  };

  if (loading && !data) {
    return (
      <main className="n8f-shell">
        <div className="n8f-card n8f-loading" aria-busy="true">
          <div className="n8f-skeleton n8f-skeleton-title" />
          <div className="n8f-skeleton" />
          <div className="n8f-skeleton" />
        </div>
      </main>
    );
  }

  if (authMode) {
    return (
      <main className="n8f-message">
        <section className="n8f-message-card">
          <p className="n8f-eyebrow">پاسخ محافظت‌شده</p>
          <h1 className="n8f-message-title">برای مشاهده، هویت خود را تأیید کنید</h1>
          {authMode === 'key' ? (
            <>
              <p className="n8f-message-text">کلید دسترسی این پاسخ را وارد کنید.</p>
              <form
                className="n8f-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void unlock();
                }}
              >
                <input
                  className="n8f-input"
                  value={key}
                  onChange={(event) => setKey(event.target.value)}
                  placeholder="کلید دسترسی"
                  autoComplete="one-time-code"
                  minLength={6}
                  required
                />
                <button className="n8f-button" type="submit" disabled={loading}>
                  {loading ? 'در حال بررسی…' : 'مشاهده‌ی پاسخ'}
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="n8f-message-text">
                {otpSent ? 'کد ۶ رقمی ارسال‌شده را وارد کنید.' : 'شماره‌ی موبایل خود را وارد کنید تا کد تأیید برایتان ارسال شود.'}
              </p>
              <form
                className="n8f-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void (otpSent ? verifyOtp() : requestOtp());
                }}
              >
                <input
                  className="n8f-input"
                  value={mobile}
                  onChange={(event) => setMobile(event.target.value)}
                  placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                  inputMode="tel"
                  dir="ltr"
                  required
                  disabled={otpSent || busy}
                />
                {otpSent ? (
                  <input
                    className="n8f-input"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder="کد ۶ رقمی"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    disabled={busy}
                  />
                ) : null}
                <button className="n8f-button" type="submit" disabled={busy}>
                  {busy ? 'در حال ارسال…' : otpSent ? 'تأیید و مشاهده' : 'ارسال کد'}
                </button>
              </form>
            </>
          )}
          {error ? <p className="n8f-error" role="alert">{error}</p> : null}
        </section>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="n8f-message">
        <section className="n8f-message-card" role="alert">
          <h1 className="n8f-message-title">پاسخ در دسترس نیست</h1>
          <p className="n8f-message-text">{error ?? 'این نشانی وجود ندارد یا دیگر در دسترس نیست.'}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="n8f-shell">
      <article className="n8f-card">
        <header className="n8f-head">
          <p className="n8f-eyebrow">پاسخ ثبت‌شده در نوروفرم</p>
          <h1 className="n8f-title">{data.formTitle}</h1>
          <p className="n8f-meta">
            <span>زمان ثبت: {submittedAt(data.submittedAt)}</span>
            <span>نسخه‌ی {data.versionNumber.toLocaleString('fa-IR')}</span>
          </p>
        </header>
        <ul className="n8f-fields">
          {data.fields.map((field) => (
            <li key={field.fieldId} className="n8f-field">
              <span className="n8f-label">{field.label}</span>
              <p className="n8f-value" data-empty={field.value ? undefined : 'true'}>
                {field.value}
              </p>
            </li>
          ))}
        </ul>
        <footer className="n8f-foot">این لینک مخصوص همین پاسخ است؛ آن را در اختیار دیگران قرار ندهید.</footer>
      </article>
    </main>
  );
}
