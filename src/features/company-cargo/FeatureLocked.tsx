import { Link } from 'react-router-dom';
import { Lock, LockOpen } from 'lucide-react';
import { COMPANY_FEATURES_PATH, type CompanyFeature } from './featuresApi';

/** Shown instead of a page whose menu the company has not bought. */
export default function FeatureLocked({ title, feature }: { title: string; feature: CompanyFeature }) {
  return (
    <div className="tw-flex tw-flex-col tw-items-center tw-gap-3 tw-rounded-2xl tw-border tw-border-dashed tw-border-brand-line tw-bg-white tw-px-6 tw-py-14 tw-text-center">
      <span className="tw-flex tw-h-14 tw-w-14 tw-items-center tw-justify-center tw-rounded-2xl tw-bg-brand-orange-soft tw-text-brand-orange-ink">
        <Lock size={26} aria-hidden />
      </span>
      <p className="tw-m-0 tw-text-lg tw-font-bold">بخش «{title}» برای شرکت شما فعال نیست</p>
      <p className="tw-m-0 tw-max-w-sm tw-text-sm tw-leading-7 tw-text-brand-muted">برای استفاده از این بخش، آن را بخرید. بعد از تأیید رسید پرداخت، همین‌جا باز می‌شود.</p>
      <Link
        to={`${COMPANY_FEATURES_PATH}?feature=${feature}`}
        className="tw-mt-2 tw-inline-flex tw-h-11 tw-items-center tw-gap-2 tw-rounded-xl tw-bg-brand-orange tw-px-5 tw-font-bold tw-text-white hover:tw-bg-brand-orange-dark"
      >
        <LockOpen size={18} aria-hidden /> خرید این بخش
      </Link>
    </div>
  );
}
