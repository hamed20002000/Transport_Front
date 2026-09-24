export const currencies = {
  IRR: 'ریال ایران',
  GBP: 'پوند بریتانیا',
  EUR: 'یورو',
  SAR: 'ریال سعودی',
  CNY: 'یوان چین',
} as const;

export type Currency = keyof typeof currencies;
