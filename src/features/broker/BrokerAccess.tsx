import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { BadgeCheck, Check, Copy, CreditCard, Hourglass, ImagePlus, LoaderCircle, Lock, Search, X } from 'lucide-react';
import { cn } from 'src/shared/utils/utils';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { subscriptionError } from 'src/features/subscription/api';
import { CardSkeleton, LoadFailed, SectionTitle } from 'src/features/company-cargo/components';
import { useNotificationEvent } from 'src/features/company-cargo/notificationSocket';
import { addCompaniesPrice, getBrokerAccess, newPeriodPrice, submitBrokerOrder, type BrokerAccess } from './accessApi';

// a receipt under review is checked again this often, so approval shows without a refresh
const REVIEW_POLL_MS = 20_000;
const currencyNames: Record<string, string> = { IRR: 'ریال', IRT: 'تومان', GBP: 'پوند', EUR: 'یورو', SAR: 'ریال سعودی', CNY: 'یوان' };

const faNumber = (value: number | string) => Number(value).toLocaleString('fa-IR');
const faDate = (value: string) => new Date(value).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
const price = (amount: string, currency: string) => `${faNumber(amount)} ${currencyNames[currency] ?? currency}`;
const cardGroups = (card: string) => card.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ');

function CopyCard({ card }: { card: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(card.replace(/\D/g, ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked: the number stays selectable on screen
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="tw-flex tw-items-center tw-gap-1.5 tw-rounded-lg tw-border tw-border-white/20 tw-bg-white/10 tw-px-2.5 tw-py-1.5 tw-text-xs tw-font-bold tw-text-white hover:tw-bg-white/20"
    >
      {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
      {copied ? 'کپی شد' : 'کپی شماره'}
    </button>
  );
}

/**
 * A broker buys the companies whose loads it sees: up to n companies for the base price, each one more for the extra
 * price, for the admin's days. With an open period it can add companies until the end of it (free while the base has
 * room). Card-to-card payment and a receipt photo; the admin reviews it.
 */
export function BrokerAccessContent() {
  const toast = useToast();
  const [state, setState] = useState<BrokerAccess | null>(null);
  const [failed, setFailed] = useState(false);
  const [kind, setKind] = useState<'NEW' | 'ADD'>('NEW');
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [sending, setSending] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const load = () => {
    setFailed(false);
    return getBrokerAccess().then(setState, () => setFailed(true));
  };
  useEffect(() => {
    void load();
  }, []);

  // the admin approved or rejected a receipt while the page is open
  useNotificationEvent<{ approved?: boolean }>('broker-access-changed', (event) => {
    if (event.approved) toast.success('شرکت‌های خریداری‌شده باز شد.');
    else toast.error('رسید پرداخت تأیید نشد؛ دلیلش را در همین صفحه ببینید.');
    void load();
  });

  const reviewing = state?.orders.find((order) => order.status === 'RECEIPT_SUBMITTED');
  useEffect(() => {
    if (!reviewing) return;
    const timer = setInterval(() => void getBrokerAccess().then(setState, () => undefined), REVIEW_POLL_MS);
    return () => clearInterval(timer);
  }, [reviewing]);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const owned = useMemo(() => new Set(kind === 'ADD' ? state?.period?.companies.map((company) => company.userId) ?? [] : []), [kind, state]);
  const choices = useMemo(() => {
    const words = query.trim();
    return (state?.companies ?? []).filter((company) => !owned.has(company.userId) && (!words || company.name.includes(words)));
  }, [state, owned, query]);

  if (failed && !state) return <LoadFailed onRetry={() => void load()} />;
  if (!state) return <CardSkeleton />;

  const { policy } = state;
  if (!policy.enabled) {
    return (
      <div className="tw-space-y-5">
        <SectionTitle title="خرید بار شرکت‌ها" />
        <div className="tw-flex tw-items-start tw-gap-3 tw-rounded-2xl tw-border tw-border-emerald-200 tw-bg-emerald-50 tw-p-4">
          <BadgeCheck size={22} className="tw-mt-0.5 tw-shrink-0 tw-text-emerald-600" aria-hidden />
          <p className="tw-m-0 tw-text-sm tw-leading-7">دیدن بار همه‌ی شرکت‌ها الان رایگان است و خرید لازم نیست.</p>
        </div>
      </div>
    );
  }

  const amount = kind === 'NEW' ? newPeriodPrice(policy, selected.length) : addCompaniesPrice(policy, owned.size, selected.length);
  const free = kind === 'ADD' && selected.length > 0 && amount === '0';
  const rejected = !reviewing ? state.orders.find((order) => order.status === 'REJECTED') : undefined;
  const latestRejected = rejected && rejected === state.orders[0] ? rejected : undefined;

  const switchKind = (next: 'NEW' | 'ADD') => {
    setKind(next);
    setSelected([]);
  };
  const toggle = (userId: string) => setSelected((current) => (current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]));

  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!picked) return;
    if (!picked.type.startsWith('image/')) return toast.error('فقط عکس رسید (JPG، PNG یا WebP) را انتخاب کنید.');
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  };

  const send = async () => {
    if (!selected.length || (!free && !file) || sending) return;
    setSending(true);
    try {
      const next = await submitBrokerOrder(kind, selected, free ? null : file);
      setState(next);
      setSelected([]);
      setFile(null);
      setPreview('');
      toast.success(next.added ? `${faNumber(next.added)} شرکت به دوره‌ی شما اضافه شد.` : 'رسید شما ثبت شد و بررسی می‌شود.');
    } catch (error) {
      toast.error(subscriptionError(error));
    } finally {
      setSending(false);
    }
  };

  const periodCard = (title: string, period: NonNullable<BrokerAccess['period']>, date: string) => (
    <div className="tw-rounded-2xl tw-border tw-border-emerald-100 tw-bg-white tw-p-4">
      <p className="tw-m-0 tw-flex tw-items-center tw-gap-1.5 tw-text-sm tw-font-bold tw-text-emerald-700">
        <BadgeCheck size={16} aria-hidden /> {title} {date}
      </p>
      <div className="tw-mt-3 tw-flex tw-flex-wrap tw-gap-2">
        {period.companies.map((company) => (
          <span key={company.userId} className="tw-rounded-full tw-bg-brand-sky tw-px-3 tw-py-1 tw-text-xs tw-font-bold">{company.name}</span>
        ))}
      </div>
    </div>
  );

  return (
    <div className="tw-space-y-5">
      <SectionTitle
        title="خرید بار شرکت‌ها"
        hint={`تا ${faNumber(policy.includedCompanies)} شرکت ${price(policy.basePrice, policy.currency)} و هر شرکت بیشتر ${price(policy.extraCompanyPrice, policy.currency)}، برای ${faNumber(policy.durationDays)} روز. فقط بار شرکت‌هایی را که خریده‌اید می‌بینید و روی آن‌ها درخواست می‌دهید.`}
      />

      {state.period ? periodCard('دوره‌ی شما باز است تا', state.period, faDate(state.period.expireAt)) : (
        <div className="tw-flex tw-items-center tw-gap-2 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-4 tw-text-sm tw-font-bold tw-text-red-700">
          <Lock size={16} aria-hidden /> هنوز شرکتی نخریده‌اید؛ تا خرید، باری نمی‌بینید.
        </div>
      )}
      {state.next && periodCard('دوره‌ی بعدی شروع می‌شود از', state.next, faDate(state.next.startAt))}

      {reviewing && (
        <div className="tw-flex tw-items-center tw-gap-2 tw-rounded-2xl tw-border tw-border-brand-orange/30 tw-bg-brand-orange-soft/40 tw-p-4 tw-text-sm tw-font-bold tw-text-brand-orange-ink">
          <Hourglass size={16} aria-hidden /> رسید {price(reviewing.amount, reviewing.currency)} در حال بررسی است؛ نتیجه همین‌جا اعلام می‌شود.
        </div>
      )}

      {latestRejected && (
        <div className="tw-flex tw-items-start tw-gap-3 tw-rounded-2xl tw-border tw-border-red-200 tw-bg-red-50 tw-p-4">
          <X size={22} className="tw-mt-0.5 tw-shrink-0 tw-text-red-600" aria-hidden />
          <div>
            <p className="tw-m-0 tw-font-bold">رسید آخر تأیید نشد</p>
            <p className="tw-m-0 tw-mt-1 tw-text-sm tw-leading-7 tw-text-brand-muted">{latestRejected.rejectionReason || 'دلیلی ثبت نشده است.'} لطفاً دوباره پرداخت کنید یا رسید درست را بفرستید.</p>
          </div>
        </div>
      )}

      {!reviewing && (
        <>
          {state.period && (
            <div className="tw-grid tw-grid-cols-2 tw-gap-2">
              {(
                [
                  ['ADD', 'افزودن به دوره‌ی فعلی'],
                  ['NEW', 'تمدید (دوره‌ی بعد)'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => switchKind(value)}
                  className={cn('tw-h-10 tw-rounded-xl tw-border-2 tw-text-sm tw-font-bold', kind === value ? 'tw-border-brand-orange tw-bg-brand-orange-soft/40' : 'tw-border-brand-line tw-bg-white')}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <fieldset className="tw-m-0 tw-space-y-3 tw-border-0 tw-p-0">
            <legend className="tw-mb-2 tw-text-sm tw-font-bold">
              ۱. شرکت‌ها را انتخاب کنید
              {kind === 'ADD' && ` (الان ${faNumber(owned.size)} شرکت دارید؛ تا ${faNumber(policy.includedCompanies)} شرکت بدون هزینه‌ی اضافه)`}
            </legend>
            <label className="tw-flex tw-h-10 tw-items-center tw-gap-2 tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-3">
              <Search size={16} className="tw-text-brand-muted" aria-hidden />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جستجوی نام شرکت" className="tw-h-full tw-min-w-0 tw-flex-1 tw-border-0 tw-bg-transparent tw-text-sm tw-outline-none" />
            </label>
            <div className="tw-grid tw-max-h-80 tw-grid-cols-1 tw-gap-2 tw-overflow-y-auto sm:tw-grid-cols-2">
              {choices.map((company) => {
                const on = selected.includes(company.userId);
                return (
                  <button
                    key={company.userId}
                    type="button"
                    onClick={() => toggle(company.userId)}
                    aria-pressed={on}
                    className={cn(
                      'tw-flex tw-items-center tw-gap-3 tw-rounded-xl tw-border-2 tw-bg-white tw-p-3 tw-text-start tw-transition-colors',
                      on ? 'tw-border-brand-orange tw-bg-brand-orange-soft/40' : 'tw-border-brand-line hover:tw-border-brand-orange/40',
                    )}
                  >
                    <span className={cn('tw-flex tw-h-5 tw-w-5 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-md tw-border-2', on ? 'tw-border-brand-orange tw-bg-brand-orange tw-text-white' : 'tw-border-brand-line')} aria-hidden>
                      {on && <Check size={12} strokeWidth={3} />}
                    </span>
                    <span className="tw-min-w-0 tw-flex-1 tw-truncate tw-text-sm tw-font-bold">{company.name}</span>
                  </button>
                );
              })}
              {!choices.length && <p className="tw-m-0 tw-text-sm tw-text-brand-muted">شرکتی پیدا نشد.</p>}
            </div>
            {selected.length > 0 && (
              <p className="tw-m-0 tw-rounded-xl tw-bg-brand-sky tw-px-4 tw-py-3 tw-text-sm tw-font-bold">
                {faNumber(selected.length)} شرکت · {free ? 'بدون هزینه' : price(amount, policy.currency)}
                {kind === 'NEW' && ` · ${faNumber(policy.durationDays)} روز${state.period ? ' بعد از پایان دوره‌ی فعلی' : ''}`}
                {kind === 'ADD' && state.period && ` · تا ${faDate(state.period.expireAt)}`}
              </p>
            )}
          </fieldset>

          {selected.length > 0 && !free && (
            <>
              <div>
                <p className="tw-mb-2 tw-text-sm tw-font-bold">۲. مبلغ را به این کارت واریز کنید</p>
                <div className="tw-relative tw-overflow-hidden tw-rounded-2xl tw-bg-gradient-to-br tw-from-brand-navy tw-to-[#1c2f63] tw-p-5 tw-text-white tw-shadow-lg">
                  <div className="tw-relative tw-flex tw-items-center tw-justify-between tw-gap-3">
                    <CreditCard size={26} className="tw-text-brand-orange" aria-hidden />
                    {state.payment.cardNumber && <CopyCard card={state.payment.cardNumber} />}
                  </div>
                  <p dir="ltr" className="tw-relative tw-m-0 tw-mt-5 tw-select-all tw-text-center tw-font-mono tw-text-xl tw-font-bold tw-tracking-[0.12em] sm:tw-text-2xl">
                    {cardGroups(state.payment.cardNumber) || '—'}
                  </p>
                  <div className="tw-relative tw-mt-4 tw-flex tw-flex-wrap tw-items-end tw-justify-between tw-gap-2 tw-text-sm">
                    <span className="tw-text-white/70">
                      به نام <strong className="tw-text-white">{state.payment.cardOwner || '—'}</strong>
                    </span>
                    <span className="tw-rounded-lg tw-bg-white/10 tw-px-3 tw-py-1 tw-font-bold">{price(amount, policy.currency)}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="tw-mb-2 tw-text-sm tw-font-bold">۳. عکس رسید پرداخت را بفرستید</p>
                <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="tw-hidden" onChange={choose} />
                {preview ? (
                  <div className="tw-flex tw-items-center tw-gap-3 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-3">
                    <img src={preview} alt="پیش‌نمایش رسید" className="tw-h-20 tw-w-20 tw-rounded-xl tw-object-cover" />
                    <div className="tw-min-w-0 tw-flex-1 tw-text-sm">
                      <p className="tw-m-0 tw-truncate tw-font-bold" dir="ltr">{file?.name}</p>
                      <button type="button" onClick={() => input.current?.click()} className="tw-mt-1 tw-bg-transparent tw-p-0 tw-text-xs tw-font-bold tw-text-brand-orange-ink tw-underline">
                        عکس دیگری انتخاب کنید
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => input.current?.click()}
                    className="tw-flex tw-w-full tw-flex-col tw-items-center tw-gap-2 tw-rounded-2xl tw-border-2 tw-border-dashed tw-border-brand-line tw-bg-white tw-px-4 tw-py-8 tw-text-brand-muted tw-transition-colors hover:tw-border-brand-orange hover:tw-text-brand-orange-ink"
                  >
                    <ImagePlus size={30} aria-hidden />
                    <span className="tw-text-sm tw-font-bold">انتخاب عکس رسید</span>
                    <span className="tw-text-xs">عکس صفحه یا اسکرین‌شات رسید بانکی</span>
                  </button>
                )}
              </div>
            </>
          )}

          {selected.length > 0 && (
            <button
              type="button"
              onClick={send}
              disabled={(!free && !file) || sending}
              className="tw-flex tw-h-12 tw-w-full tw-items-center tw-justify-center tw-gap-2 tw-rounded-xl tw-border-0 tw-bg-brand-orange tw-text-base tw-font-bold tw-text-white tw-shadow-[0_10px_24px_rgba(245,118,26,0.3)] tw-transition-colors hover:tw-bg-brand-orange-dark disabled:tw-cursor-not-allowed disabled:tw-opacity-50 disabled:tw-shadow-none"
            >
              {sending && <LoaderCircle size={18} className="tw-animate-spin" aria-hidden />}
              {sending ? 'در حال ارسال…' : free ? `افزودن ${faNumber(selected.length)} شرکت` : 'ارسال رسید و خرید'}
            </button>
          )}
        </>
      )}
    </div>
  );
}

/** Above the loads: a broker that bought nothing yet sees why the list is empty and where to buy. */
export function BrokerAccessBanner({ onBuy }: { onBuy: () => void }) {
  const [state, setState] = useState<BrokerAccess | null>(null);
  useEffect(() => {
    getBrokerAccess().then(setState, () => undefined);
  }, []);
  if (!state?.policy.enabled || state.period) return null;
  return (
    <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3 tw-rounded-2xl tw-border tw-border-brand-orange/30 tw-bg-brand-orange-soft/40 tw-p-4">
      <p className="tw-m-0 tw-flex tw-items-center tw-gap-2 tw-text-sm tw-font-bold">
        <Lock size={16} aria-hidden /> برای دیدن بارها، شرکت‌هایی را که بارشان را می‌خواهید بخرید.
      </p>
      <button type="button" onClick={onBuy} className="tw-h-9 tw-rounded-xl tw-border-0 tw-bg-brand-orange tw-px-4 tw-text-sm tw-font-bold tw-text-white">
        خرید شرکت‌ها
      </button>
    </div>
  );
}
