import { cn } from 'src/shared/utils/utils';

// An account's own code (transport_backend User.accountCode), like a phone-taxi subscriber code: the first digit is
// the kind (1 driver, 2 transport company, 3 company/factory, 4 broker), then its number. Said on the phone and
// searched in the lists, so always shown the same way.

const persianDigits = (value: string) => value.replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);

export default function AccountCode({ code, className }: { code: string | null | undefined; className?: string }) {
  if (!code) return null;
  return (
    <span
      title="کد اختصاصی حساب"
      className={cn('tw-inline-flex tw-shrink-0 tw-items-center tw-gap-1 tw-rounded-full tw-bg-brand-sky tw-px-2.5 tw-py-0.5 tw-text-xs tw-font-medium tw-text-brand-navy', className)}
    >
      کد <bdi dir="ltr" className="tw-font-bold tw-tabular-nums">{persianDigits(code)}</bdi>
    </span>
  );
}
