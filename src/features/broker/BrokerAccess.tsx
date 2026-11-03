import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { BadgeCheck, Check, Copy, CreditCard, Hourglass, ImagePlus, LoaderCircle, Lock, Minus, Plus, Search, Ticket, X } from 'lucide-react';
import { cn } from 'src/shared/utils/utils';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import FloatingActions from 'src/shared/components/FloatingActions';
import { subscriptionError } from 'src/features/subscription/api';
import { CardSkeleton, LoadFailed, SectionTitle } from 'src/features/company-cargo/components';
import { useNotificationEvent } from 'src/features/company-cargo/notificationSocket';
import { RequestsUsedUp, useRequestsUsedUp } from 'src/features/driver-panel/components';
import { getBrokerAccess, selectBrokerCompanies, submitBrokerPackageOrder, type AccessOrder, type BrokerAccess } from './accessApi';

// a receipt under review is checked again this often, so approval shows without a refresh
const REVIEW_POLL_MS = 20_000;
// the same cap as the server's MAX_PACKAGES
const MAX_PACKAGES = 100;
const currencyNames: Record<string, string> = { IRR: 'ریال', IRT: 'تومان', GBP: 'پوند', EUR: 'یورو', SAR: 'ریال سعودی', CNY: 'یوان' };

const faNumber = (value: number | string) => Number(value).toLocaleString('fa-IR');
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

function FloatingButton({ onClick, disabled, busy, label }: { onClick: () => void; disabled: boolean; busy: boolean; label: string }) {
  return (
    <FloatingActions>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || busy}
        className="tw-flex tw-h-11 tw-items-center tw-px-5 tw-justify-center tw-gap-2 tw-rounded-xl tw-border-0 tw-bg-brand-orange tw-text-base tw-font-bold tw-text-white tw-shadow-[0_10px_24px_rgba(245,118,26,0.3)] tw-transition-colors hover:tw-bg-brand-orange-dark disabled:tw-cursor-not-allowed disabled:tw-shadow-none"
      >
        {busy && <LoaderCircle size={18} className="tw-animate-spin" aria-hidden />}
        {busy ? 'در حال ارسال…' : label}
      </button>
    </FloatingActions>
  );
}

/** Under review, or the last one rejected with its reason. */
function OrderNotice({ orders }: { orders: AccessOrder[] }) {
  const reviewing = orders.find((order) => order.status === 'RECEIPT_SUBMITTED');
  if (reviewing) {
    return (
      <div className="tw-flex tw-items-center tw-gap-2 tw-rounded-2xl tw-border tw-border-brand-orange/30 tw-bg-brand-orange-soft/40 tw-p-4 tw-text-sm tw-font-bold tw-text-brand-orange-ink">
        <Hourglass size={16} aria-hidden /> رسید {reviewing.title} ({price(reviewing.amount, reviewing.currency)}) در حال بررسی است؛ نتیجه همین‌جا اعلام می‌شود.
      </div>
    );
  }
  const latest = orders[0];
  if (latest?.status !== 'REJECTED') return null;
  return (
    <div className="tw-flex tw-items-start tw-gap-3 tw-rounded-2xl tw-border tw-border-red-200 tw-bg-red-50 tw-p-4">
      <X size={22} className="tw-mt-0.5 tw-shrink-0 tw-text-red-600" aria-hidden />
      <div>
        <p className="tw-m-0 tw-font-bold">رسید {latest.title} تأیید نشد</p>
        <p className="tw-m-0 tw-mt-1 tw-text-sm tw-leading-7 tw-text-brand-muted">{latest.rejectionReason || 'دلیلی ثبت نشده است.'} لطفاً دوباره پرداخت کنید یا رسید درست را بفرستید.</p>
      </div>
    </div>
  );
}

/** The requests left, and packages to buy: the count, the card and the receipt photo. */
function PackagesSection({ state, onChange }: { state: BrokerAccess; onChange: (next: BrokerAccess) => void }) {
  const toast = useToast();
  const { policy } = state;
  const [count, setCount] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [sending, setSending] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const orders = state.orders.filter((order) => order.kind === 'PACKAGE');
  const reviewing = orders.some((order) => order.status === 'RECEIPT_SUBMITTED');
  const amount = (BigInt(policy.packagePrice) * BigInt(count)).toString();

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!picked) return;
    if (!picked.type.startsWith('image/')) return toast.error('فقط عکس رسید (JPG، PNG یا WebP) را انتخاب کنید.');
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  };

  const send = async () => {
    if (!file || sending) return;
    setSending(true);
    try {
      onChange(await submitBrokerPackageOrder(count, file));
      setFile(null);
      setPreview('');
      setCount(1);
      toast.success('رسید شما ثبت شد و بررسی می‌شود.');
    } catch (error) {
      toast.error(subscriptionError(error));
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="tw-space-y-4">
      <SectionTitle
        title="بسته‌ی درخواست بار"
        hint={`هر بسته ${faNumber(policy.packageSize)} درخواست بار به ${price(policy.packagePrice, policy.currency)}؛ زمان ندارد و هر درخواست بار یکی از آن کم می‌کند.`}
      />
      <div className={cn('tw-flex tw-items-center tw-gap-3 tw-rounded-2xl tw-border tw-bg-white tw-p-4', state.remaining ? 'tw-border-emerald-100' : 'tw-border-red-200')}>
        <Ticket size={22} className={state.remaining ? 'tw-text-emerald-600' : 'tw-text-red-600'} aria-hidden />
        <p className={cn('tw-m-0 tw-text-sm tw-font-bold', !state.remaining && 'tw-text-red-700')}>
          {state.remaining ? `${faNumber(state.remaining)} درخواست بار باقی مانده` : 'درخواست باری ندارید؛ برای درخواست بار بسته بخرید.'}
        </p>
      </div>
      <OrderNotice orders={orders} />

      {!reviewing && (
        <>
          <div>
            <p className="tw-mb-2 tw-text-sm tw-font-bold">۱. تعداد بسته</p>
            <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-3 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-3">
              <div className="tw-flex tw-items-center tw-gap-2">
                <button type="button" aria-label="یک بسته کمتر" disabled={count <= 1} onClick={() => setCount(count - 1)} className="tw-flex tw-h-9 tw-w-9 tw-items-center tw-justify-center tw-rounded-xl tw-border tw-border-brand-line tw-bg-white disabled:tw-opacity-40">
                  <Minus size={16} aria-hidden />
                </button>
                <span className="tw-w-10 tw-text-center tw-text-lg tw-font-bold">{faNumber(count)}</span>
                <button type="button" aria-label="یک بسته بیشتر" disabled={count >= MAX_PACKAGES} onClick={() => setCount(count + 1)} className="tw-flex tw-h-9 tw-w-9 tw-items-center tw-justify-center tw-rounded-xl tw-border tw-border-brand-line tw-bg-white disabled:tw-opacity-40">
                  <Plus size={16} aria-hidden />
                </button>
              </div>
              <span className="tw-text-sm tw-font-bold">
                {faNumber(count * policy.packageSize)} درخواست بار · {price(amount, policy.currency)}
              </span>
            </div>
          </div>

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
          {file && <FloatingButton onClick={send} disabled={false} busy={sending} label={`خرید ${faNumber(count * policy.packageSize)} درخواست بار`} />}
        </>
      )}
    </section>
  );
}

/** The companies whose loads the broker sees, picked by itself up to the admin's limit; changed any time. */
function CompaniesSection({ state, onChange }: { state: BrokerAccess; onChange: (next: BrokerAccess) => void }) {
  const toast = useToast();
  const max = state.policy.maxCompanies!;
  const saved = useMemo(() => state.selected.map((company) => company.userId), [state.selected]);
  const [selected, setSelected] = useState<string[]>(saved);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => setSelected(saved), [saved]);

  const choices = useMemo(() => {
    const words = query.trim();
    return state.companies.filter((company) => !words || company.name.includes(words));
  }, [state.companies, query]);
  const changed = selected.length !== saved.length || selected.some((id) => !saved.includes(id));

  const toggle = (userId: string) => {
    if (selected.includes(userId)) return setSelected(selected.filter((id) => id !== userId));
    if (selected.length >= max) return toast.error(`بیشتر از ${faNumber(max)} شرکت نمی‌شود؛ اول یکی را بردارید.`);
    setSelected([...selected, userId]);
  };

  const save = async () => {
    if (!selected.length || saving) return;
    setSaving(true);
    try {
      onChange(await selectBrokerCompanies(selected));
      toast.success('شرکت‌ها ذخیره شد؛ از این به بعد بار همین‌ها را می‌بینید.');
    } catch (error) {
      toast.error(subscriptionError(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="tw-space-y-4">
      <SectionTitle title="شرکت‌ها" hint={`تا ${faNumber(max)} شرکت انتخاب کنید؛ فقط بار همین‌ها را می‌بینید و هر وقت خواستید عوضشان می‌کنید.`} />
      {!saved.length && (
        <div className="tw-flex tw-items-center tw-gap-2 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-4 tw-text-sm tw-font-bold tw-text-red-700">
          <Lock size={16} aria-hidden /> هنوز شرکتی انتخاب نکرده‌اید؛ تا انتخاب، باری نمی‌بینید.
        </div>
      )}
      <p className="tw-m-0 tw-text-sm tw-font-bold">
        انتخاب‌شده: {faNumber(selected.length)} از {faNumber(max)}
      </p>
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
      {changed && selected.length > 0 && <FloatingButton onClick={save} disabled={false} busy={saving} label="ذخیره‌ی شرکت‌ها" />}
    </section>
  );
}

/**
 * A broker's page: the packages of load requests it buys (card-to-card and a receipt the admin reviews) and, when the
 * admin limits the companies, the ones whose loads it sees.
 */
export function BrokerAccessContent() {
  const toast = useToast();
  const [state, setState] = useState<BrokerAccess | null>(null);
  const [failed, setFailed] = useState(false);

  const load = () => {
    setFailed(false);
    return getBrokerAccess().then(setState, () => setFailed(true));
  };
  useEffect(() => {
    void load();
  }, []);

  // the admin approved or rejected a receipt while the page is open
  useNotificationEvent<{ approved?: boolean }>('broker-access-changed', (event) => {
    if (event.approved) toast.success('خرید شما تأیید شد و درخواست‌ها اضافه شد.');
    else toast.error('رسید پرداخت تأیید نشد؛ دلیلش را در همین صفحه ببینید.');
    void load();
  });

  const reviewing = state?.orders.some((order) => order.status === 'RECEIPT_SUBMITTED');
  useEffect(() => {
    if (!reviewing) return;
    const timer = setInterval(() => void getBrokerAccess().then(setState, () => undefined), REVIEW_POLL_MS);
    return () => clearInterval(timer);
  }, [reviewing]);

  if (failed && !state) return <LoadFailed onRetry={() => void load()} />;
  if (!state) return <CardSkeleton />;

  return (
    <div className="tw-space-y-8">
      {state.policy.packagesEnabled ? <PackagesSection state={state} onChange={setState} /> : (
        <div className="tw-flex tw-items-start tw-gap-3 tw-rounded-2xl tw-border tw-border-emerald-200 tw-bg-emerald-50 tw-p-4">
          <BadgeCheck size={22} className="tw-mt-0.5 tw-shrink-0 tw-text-emerald-600" aria-hidden />
          <p className="tw-m-0 tw-text-sm tw-leading-7">درخواست بار الان رایگان است و خرید بسته لازم نیست.</p>
        </div>
      )}
      {state.policy.maxCompanies !== null ? <CompaniesSection state={state} onChange={setState} /> : (
        <div className="tw-flex tw-items-start tw-gap-3 tw-rounded-2xl tw-border tw-border-emerald-200 tw-bg-emerald-50 tw-p-4">
          <BadgeCheck size={22} className="tw-mt-0.5 tw-shrink-0 tw-text-emerald-600" aria-hidden />
          <p className="tw-m-0 tw-text-sm tw-leading-7">بار همه‌ی شرکت‌ها را می‌بینید.</p>
        </div>
      )}
    </div>
  );
}

/**
 * Whether the broker's packages of load requests are used up, for the request buttons of every list of loads: read
 * when the panel opens, after each request, and when the admin decides on a receipt.
 */
export function BrokerRequestsProvider({ children }: { children: ReactNode }) {
  const [usedUp, setUsedUp] = useState(false);
  const refresh = useCallback(() => {
    getBrokerAccess().then((state) => setUsedUp(state.policy.packagesEnabled && state.remaining <= 0), () => undefined);
  }, []);
  useEffect(refresh, [refresh]);
  useNotificationEvent('broker-access-changed', refresh);
  const value = useMemo(() => ({ usedUp, refresh }), [usedUp, refresh]);
  return <RequestsUsedUp.Provider value={value}>{children}</RequestsUsedUp.Provider>;
}

/** Above the loads: a broker without companies picked, or without requests left, sees why and where to go. */
export function BrokerAccessBanner({ onBuy }: { onBuy: () => void }) {
  const [state, setState] = useState<BrokerAccess | null>(null);
  const { usedUp } = useRequestsUsedUp();
  useEffect(() => {
    getBrokerAccess().then(setState, () => undefined);
  }, []);
  if (!state) return null;
  const noCredit = usedUp;
  if (!state.blocked && !noCredit) return null;
  return (
    <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3 tw-rounded-2xl tw-border tw-border-brand-orange/30 tw-bg-brand-orange-soft/40 tw-p-4">
      <p className="tw-m-0 tw-flex tw-items-center tw-gap-2 tw-text-sm tw-font-bold">
        <Lock size={16} aria-hidden />
        {state.blocked ? 'برای دیدن بارها، شرکت‌هایی را که بارشان را می‌خواهید انتخاب کنید.' : 'درخواست بار شما تمام شده است؛ برای درخواست بار بسته بخرید.'}
      </p>
      <button type="button" onClick={onBuy} className="tw-h-9 tw-rounded-xl tw-border-0 tw-bg-brand-orange tw-px-4 tw-text-sm tw-font-bold tw-text-white">
        {state.blocked ? 'انتخاب شرکت‌ها' : 'خرید بسته'}
      </button>
    </div>
  );
}
