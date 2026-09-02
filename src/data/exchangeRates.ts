import type { BillingLocale } from './voicePricing';

export type BillingCurrencyCode = 'KRW' | 'USD' | 'JPY' | 'TWD' | 'CNY' | 'EUR' | 'VND';

export interface BillingCurrencyConfig {
  code: BillingCurrencyCode;
  unitsPerUsd: number;
  inputStep: number;
  maxRate: number;
  fixedToUsd?: boolean;
}

// Reference values captured on 2026-09-01. They intentionally remain editable
// because card-network rates, taxes, and settlement dates differ.
export const FX_RATE_LAST_VERIFIED = '2026-09-01';

export const BILLING_CURRENCY_BY_LOCALE: Record<BillingLocale, BillingCurrencyConfig> = {
  ko: { code: 'KRW', unitsPerUsd: 1_369.63, inputStep: 1, maxRate: 100_000 },
  en: { code: 'USD', unitsPerUsd: 1, inputStep: 1, maxRate: 1, fixedToUsd: true },
  ja: { code: 'JPY', unitsPerUsd: 160.16, inputStep: 0.1, maxRate: 100_000 },
  'zh-TW': { code: 'TWD', unitsPerUsd: 31.69, inputStep: 0.01, maxRate: 100_000 },
  zh: { code: 'CNY', unitsPerUsd: 6.72, inputStep: 0.01, maxRate: 100_000 },
  es: { code: 'EUR', unitsPerUsd: 0.8628, inputStep: 0.0001, maxRate: 100_000 },
  fr: { code: 'EUR', unitsPerUsd: 0.8628, inputStep: 0.0001, maxRate: 100_000 },
  de: { code: 'EUR', unitsPerUsd: 0.8628, inputStep: 0.0001, maxRate: 100_000 },
  vi: { code: 'VND', unitsPerUsd: 25_561, inputStep: 1, maxRate: 1_000_000 },
};
