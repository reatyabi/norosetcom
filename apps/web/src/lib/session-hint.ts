import { useSyncExternalStore } from 'react';
import { api, ApiError } from './api';

// کوکی نشست httpOnly است، پس صفحه‌های عمومی با یک نشانه می‌فهمند /me را بپرسند یا نه. مهمان هیچ درخواستی به
// /me و /auth/refresh نمی‌فرستد تا سهمیه‌ی ورود و OTP (محدودیت nginx برای هر IP) مصرف نشود.

const KEY = 'noroset.signedIn';
const SESSION_EVENT = 'noroset:session';

export function setSessionHint(signedIn: boolean): void {
  try {
    if (signedIn) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(SESSION_EVENT));
    }
  } catch {
    // نشانه فقط راحتی است
  }
}

export function hasSessionHint(): boolean {
  try {
    return typeof window !== 'undefined' && localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function subscribeSessionHint(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  window.addEventListener(SESSION_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(SESSION_EVENT, callback);
  };
}

/** هوک واکنشی وضعیت نشانه ورود برای اجزای کلاینت؛ بدون آبشار رندر و سازگار با هیدراتاسیون. */
export function useSessionHint(): boolean {
  return useSyncExternalStore(subscribeSessionHint, hasSessionHint, () => false);
}

export interface SignedInUser {
  fullName: string;
  mobile: string | null;
  avatarUrl: string | null;
}

/** کاربر واردشده، یا null برای مهمان. خطای شبکه هم مهمان حساب می‌شود، چون پنل خودش دوباره بررسی می‌کند. */
export async function findSignedInUser(): Promise<SignedInUser | null> {
  if (!hasSessionHint()) return null;
  try {
    return await api<SignedInUser>('/me');
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) setSessionHint(false);
    return null;
  }
}
