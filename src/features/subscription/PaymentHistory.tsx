import { useCallback, useEffect, useState } from 'react';
import { CircleCheck, CircleX, Clock, Receipt } from 'lucide-react';
import { CardSkeleton, EmptyState, LoadFailed, SectionTitle } from 'src/features/company-cargo/components';
import { useNotificationEvent } from 'src/features/company-cargo/notificationSocket';
import { cn } from 'src/shared/utils/utils';
import { getPayments, type Payment, type PaymentStatus } from './paymentsApi';

const currencyNames: Record<string, string> = { IRR: 'ریال', IRT: 'تومان', GBP: 'پوند', EUR: 'یورو', SAR: 'ریال سعودی', CNY: 'یوان' };
const fa = (value: number) => value.toLocaleString('fa-IR');
const faDateTime = (value: string) => new Date(value).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' });

const STATUS: Record<PaymentStatus, { label: string; icon: typeof Clock; className: string }> = {
  PENDING: { label: 'در حال بررسی', icon: Clock, className: 'tw-bg-amber-50 tw-text-amber-700' },
  APPROVED: { label: 'تأیید شد', icon: CircleCheck, className: 'tw-bg-emerald-50 tw-text-emerald-700' },
  REJECTED: { label: 'تأیید نشد', icon: CircleX, className: 'tw-bg-red-50 tw-text-red-700' },
};

function PaymentCard({ payment }: { payment: Payment }) {
  const status = STATUS[payment.status];
  return (
    <article className="tw-space-y-2 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-4">
      <div className="tw-flex tw-flex-wrap tw-items-start tw-justify-between tw-gap-2">
        <div className="tw-min-w-0">
          <p className="tw-m-0 tw-font-bold">{payment.title}</p>
          {payment.detail && <p className="tw-m-0 tw-text-sm tw-text-brand-muted">{payment.detail}</p>}
        </div>
        <span className={cn('tw-inline-flex tw-shrink-0 tw-items-center tw-gap-1 tw-rounded-full tw-px-2.5 tw-py-0.5 tw-text-xs tw-font-medium', status.className)}>
          <status.icon size={13} aria-hidden /> {status.label}
        </span>
      </div>
      <p className="tw-m-0 tw-text-lg tw-font-bold">
        {fa(Number(payment.amount))} <span className="tw-text-sm tw-font-medium">{currencyNames[payment.currency] ?? payment.currency}</span>
        {payment.durationDays ? <span className="tw-text-sm tw-font-normal tw-text-brand-muted"> · {fa(payment.durationDays)} روز</span> : null}
      </p>
      <p className="tw-m-0 tw-text-xs tw-leading-6 tw-text-brand-muted">
        ارسال رسید: {faDateTime(payment.createdAt)}
        {payment.decidedAt && (
          <>
            {' · '}
            {payment.status === 'APPROVED' ? 'تأیید' : 'بررسی'}: {faDateTime(payment.decidedAt)}
          </>
        )}
      </p>
      {payment.status === 'REJECTED' && payment.rejectionReason && (
        <p className="tw-m-0 tw-rounded-xl tw-bg-red-50 tw-p-2.5 tw-text-sm tw-text-red-700">دلیل: {payment.rejectionReason}</p>
      )}
    </article>
  );
}

/** «پرداخت‌ها»: the same list in every panel (driver, transport company, factory, broker), updated as receipts are decided. */
export default function PaymentHistory() {
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => {
    setFailed(false);
    getPayments().then(setPayments, () => setFailed(true));
  }, []);
  useEffect(load, [load]);
  // the admin decided on a receipt (a subscription, a company's menu, a broker's companies)
  useNotificationEvent('subscription-changed', load);
  useNotificationEvent('company-features-changed', load);
  useNotificationEvent('broker-access-changed', load);

  return (
    <div className="tw-space-y-4">
      <SectionTitle title="پرداخت‌ها" hint="رسیدهایی که فرستاده‌اید و نتیجه‌ی بررسی هر کدام، جدیدترین بالا." />
      {failed ? (
        <LoadFailed onRetry={load} />
      ) : !payments ? (
        <CardSkeleton />
      ) : !payments.length ? (
        <EmptyState icon={Receipt} title="هنوز پرداختی ندارید" hint="هر رسیدی که برای خرید بفرستید، همین‌جا با نتیجه‌ی بررسی‌اش می‌آید." />
      ) : (
        <div className="tw-grid tw-gap-3 sm:tw-grid-cols-2">
          {payments.map((payment) => (
            <PaymentCard key={`${payment.kind}:${payment.id}`} payment={payment} />
          ))}
        </div>
      )}
    </div>
  );
}
