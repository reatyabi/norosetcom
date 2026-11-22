import { describe, expect, it } from 'vitest';
import {
  SUPPORT_CHANNELS_DATA,
  SUPPORT_PHONE,
  SUPPORT_PHONE_INTL,
} from '../src/lib/support';

describe('Support Widget & Channels Configuration', () => {
  it('has the correct support phone number', () => {
    expect(SUPPORT_PHONE).toBe('09396655322');
    expect(SUPPORT_PHONE_INTL).toBe('+989396655322');
  });

  it('includes exactly Bale, WhatsApp, and Telegram in channels list', () => {
    const ids = SUPPORT_CHANNELS_DATA.map((c) => c.id);
    expect(ids).toEqual(['bale', 'whatsapp', 'telegram']);
  });

  it('generates valid direct message links for each social channel', () => {
    const bale = SUPPORT_CHANNELS_DATA.find((c) => c.id === 'bale');
    const whatsapp = SUPPORT_CHANNELS_DATA.find((c) => c.id === 'whatsapp');
    const telegram = SUPPORT_CHANNELS_DATA.find((c) => c.id === 'telegram');

    expect(bale).toBeDefined();
    expect(bale?.href).toBe('https://ble.ir/+989396655322');

    expect(whatsapp).toBeDefined();
    expect(whatsapp?.href).toBe('https://wa.me/989396655322');

    expect(telegram).toBeDefined();
    expect(telegram?.href).toBe('https://t.me/+989396655322');
  });
});
