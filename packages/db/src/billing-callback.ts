import { eq } from 'drizzle-orm';
import { withSetting } from './connection';
import { billingPayments } from './billing.schema';

// بازگشت مرورگر از درگاه پرداخت (docs/architecture.md §9.11): مخاطب ممکن است نشست نداشته باشد؛ تراکنش فقط
// app.billing_authority را ست می‌کند و policy «billing_payments_callback_select» همان یک پرداخت را نشان
// می‌دهد. بقیه‌ی کار (تأیید، اشتراک) با withTenant همان tenant انجام می‌شود.

export interface CallbackPayment {
  id: string;
  tenantId: string;
}

export async function findPaymentByAuthority(authority: string): Promise<CallbackPayment | null> {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(authority)) return null;
  return withSetting('app.billing_authority', authority, async (tx) => {
    const [row] = await tx
      .select({ id: billingPayments.id, tenantId: billingPayments.tenantId })
      .from(billingPayments)
      .where(eq(billingPayments.authority, authority))
      .limit(1);
    return row ?? null;
  });
}
