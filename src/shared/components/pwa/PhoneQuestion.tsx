// Asked before turning notifications on: whoever makes an account for someone else on their own phone sees that the
// number is not theirs, and leaves that account's notifications to its owner's phone.

import { persianDigits } from './pushApi';

export default function PhoneQuestion({ phone }: { phone: string | null }) {
  if (!phone) return null;
  return (
    <p className="tw-m-0 tw-rounded-xl tw-bg-brand-sky tw-p-3 tw-text-sm tw-leading-6 tw-text-brand-navy">
      اعلان‌های حساب <bdi dir="ltr" className="tw-font-bold">{persianDigits(phone)}</bdi> روی همین گوشی بیاید؟ اگر این گوشی مال صاحب این شماره
      نیست (مثلاً برای کس دیگری حساب ساخته‌اید)، اعلان را روشن نکنید تا اعلان‌های او به گوشی خودش برسد.
    </p>
  );
}
