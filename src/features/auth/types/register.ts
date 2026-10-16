// Matches transport_backend/src/domain/enums/subscription.ts.
export enum AccountType {
  Driver = 'DRIVER',
  Company = 'COMPANY',
  Broker = 'BROKER',
}

/** Account types people pick for themselves at sign-up. */
export const SELF_SERVICE_ACCOUNT_TYPES = [
  { type: AccountType.Driver, label: 'راننده', hint: 'دیدن بارها، اعلام آمادگی و وضعیت مرزها' },
  { type: AccountType.Company, label: 'شرکت حمل‌ونقل', hint: 'ثبت و اعلام بار به رانندگان' },
] as const;
