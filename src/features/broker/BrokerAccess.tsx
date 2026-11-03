import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { BadgeCheck, Check, Compass, Copy, CreditCard, Hourglass, ImagePlus, LoaderCircle, Lock, Minus, Plus, Search, Ticket, X } from 'lucide-react';
import { cn } from 'src/shared/utils/utils';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import FloatingActions from 'src/shared/components/FloatingActions';
import { subscriptionError } from 'src/features/subscription/api';
import { CardSkeleton, LoadFailed, SectionTitle } from 'src/features/company-cargo/components';
import { useNotificationEvent } from 'src/features/company-cargo/notificationSocket';
import { RequestsUsedUp, useRequestsUsedUp } from 'src/features/driver-panel/components';
import { getBrokerAccess, selectBrokerCompanies, submitBrokerPackageOrder, type AccessOrder, type BrokerAccess, type BrokerPack } from './accessApi';

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

// each kind of package keeps its own colour: load requests orange, «معرفی راننده» navy
const TONES = {
  orange: {
    badge: 'tw-bg-brand-orange-soft tw-text-brand-orange-ink',
    button: 'tw-bg-brand-orange hover:tw-bg-brand-orange-dark',
  },
  navy: {
    badge: 'tw-bg-brand-sky tw-text-brand-navy',
    button: 'tw-bg-brand-navy hover:tw-bg-[#1c2f63]',
  },
} as const;

/** One kind of package in its own words: load requests, or «معرفی راننده». */
function packTerms(state: BrokerAccess, pack: BrokerPack) {
  const { policy } = state;
  return pack === 'SUGGESTION'
    ? {
        kind: 'SUGGESTION' as const,
        enabled: policy.suggestionsEnabled,
        title: 'معرفی راننده',
        about: `به ${faNumber(policy.suggestionDrivers)} راننده‌ای که مسیر بار را رفته‌اند خبر می‌دهیم؛ اولین کسی که بخواهد، درخواست به نام او می‌رود. معرفی بی‌نتیجه حساب نمی‌شود.`,
        size: policy.suggestionPackageSize,
        unitPrice: policy.suggestionPackagePrice,
        left: state.suggestions,
        unit: 'معرفی',
        icon: Compass,
        tone: TONES.navy,
      }
    : {
        kind: 'PACKAGE' as const,
        enabled: policy.packagesEnabled,
        title: 'درخواست بار',
        about: 'هر درخواست بار یکی از آن کم می‌کند؛ زمان ندارد.',
        size: policy.packageSize,
        unitPrice: policy.packagePrice,
        left: state.remaining,
        unit: 'درخواست',
        icon: Ticket,
        tone: TONES.orange,
      };
}

/**
 * What the broker has left of each kind, one row each with «خرید»; the purchase form opens under the kind chosen.
 * Load requests with packages off are free (no button); «معرفی راننده» off is not shown.
 */
function Credits({
  state,
  onChange,
}: {
  state: BrokerAccess;
  onChange: (next: BrokerAccess) => void;
}) {
  const [buying, setBuying] = useState<BrokerPack | null>(null);
  const packs = (['REQUEST', 'SUGGESTION'] as const).filter(
    (pack) => pack === 'REQUEST' || state.policy.suggestionsEnabled,
  );
  return (
    <div className="tw-overflow-hidden tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-shadow-sm">
      {packs.map((pack, index) => {
        const terms = packTerms(state, pack);
        const Icon = terms.icon;
        const free = !terms.enabled;
        const reviewing = state.orders.some(
          (order) => order.kind === terms.kind && order.status === 'RECEIPT_SUBMITTED',
        );
        return (
          <div key={pack} className={cn(index > 0 && 'tw-border-t tw-border-brand-line')}>
            <div className="tw-flex tw-items-center tw-gap-3 tw-p-4">
              <span
                className={cn(
                  'tw-flex tw-h-10 tw-w-10 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-xl',
                  terms.tone.badge,
                )}
              >
                <Icon size={20} aria-hidden />
              </span>
              <div className="tw-min-w-0 tw-flex-1">
                <p className="tw-m-0 tw-text-sm tw-text-brand-muted">{terms.title}</p>
                <p className="tw-m-0 tw-font-bold">
                  {free ? (
                    'رایگان'
                  ) : terms.left ? (
                    `${faNumber(terms.left)} ${terms.unit} مانده`
                  ) : (
                    <span className="tw-text-amber-700">تمام شده</span>
                  )}
                </p>
              </div>
              {!free &&
                (reviewing ? (
                  <span className="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-full tw-bg-brand-orange-soft tw-px-3 tw-py-1 tw-text-xs tw-font-bold tw-text-brand-orange-ink">
                    <Hourglass size={13} aria-hidden /> رسید در حال بررسی
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setBuying(pack)}
                    aria-haspopup="dialog"
                    className={cn(
                      'tw-inline-flex tw-h-9 tw-items-center tw-gap-1.5 tw-rounded-xl tw-border-0 tw-px-4 tw-text-sm tw-font-bold tw-text-white tw-transition-colors',
                      terms.tone.button,
                    )}
                  >
                    <Plus size={16} aria-hidden /> خرید
                  </button>
                ))}
            </div>
            {!free && !reviewing && (
              <RejectedNotice orders={state.orders.filter((order) => order.kind === terms.kind)} />
            )}
          </div>
        );
      })}
      {buying && (
        <BuyForm
          state={state}
          pack={buying}
          onClose={() => setBuying(null)}
          onChange={(next) => {
            onChange(next);
            setBuying(null);
          }}
        />
      )}
    </div>
  );
}

/** The last receipt of this kind was turned down: why, under its row. */
function RejectedNotice({ orders }: { orders: AccessOrder[] }) {
  const latest = orders[0];
  if (latest?.status !== 'REJECTED') return null;
  return (
    <p className="tw-m-0 tw-mx-4 tw-mb-4 tw-rounded-xl tw-bg-red-50 tw-px-3 tw-py-2 tw-text-xs tw-leading-6 tw-text-red-700">
      رسید {latest.title} تأیید نشد: {latest.rejectionReason || 'دلیلی ثبت نشده است.'} دوباره پرداخت
      کنید یا رسید درست را بفرستید.
    </p>
  );
}

function Step({ index, title, children }: { index: number; title: string; children: ReactNode }) {
  return (
    <div className="tw-space-y-2">
      <p className="tw-m-0 tw-flex tw-items-center tw-gap-2 tw-text-sm tw-font-bold">
        <span className="tw-flex tw-h-6 tw-w-6 tw-items-center tw-justify-center tw-rounded-full tw-bg-brand-orange tw-text-xs tw-text-white">
          {faNumber(index)}
        </span>
        {title}
      </p>
      {children}
    </div>
  );
}

/**
 * Buying packages of one kind, in a modal (a sheet from the bottom on a phone): how many, the card to pay to and the
 * receipt photo, sent to the admin's review.
 */
function BuyForm({
  state,
  pack,
  onChange,
  onClose,
}: {
  state: BrokerAccess;
  pack: BrokerPack;
  onChange: (next: BrokerAccess) => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const { policy } = state;
  const [count, setCount] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [sending, setSending] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const terms = packTerms(state, pack);
  const amount = (BigInt(terms.unitPrice) * BigInt(count)).toString();

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  // the page behind stays still; Escape closes (not while sending)
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && !sending && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose, sending]);

  const Icon = terms.icon;

  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!picked) return;
    if (!picked.type.startsWith('image/'))
      return toast.error('فقط عکس رسید (JPG، PNG یا WebP) را انتخاب کنید.');
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  };

  const send = async () => {
    if (!file || sending) return;
    setSending(true);
    try {
      onChange(await submitBrokerPackageOrder(count, file, pack));
      toast.success('رسید شما ثبت شد و بررسی می‌شود.');
    } catch (error) {
      toast.error(subscriptionError(error));
    } finally {
      setSending(false);
    }
  };

  return createPortal(
    <div
      className="tw-fixed tw-inset-0 tw-z-[1400] tw-flex tw-items-end tw-justify-center tw-bg-brand-navy/50 tw-backdrop-blur-[2px] sm:tw-items-center sm:tw-p-6"
      onMouseDown={(event) => event.target === event.currentTarget && !sending && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="buy-title"
        dir="rtl"
        className="tw-flex tw-max-h-[92dvh] tw-w-full tw-flex-col tw-overflow-hidden tw-rounded-t-3xl tw-bg-white tw-text-brand-navy tw-shadow-2xl sm:tw-max-w-lg sm:tw-rounded-3xl"
      >
        {/* the grab bar of a sheet, on a phone */}
        <span
          className="tw-mx-auto tw-mt-2.5 tw-h-1.5 tw-w-10 tw-rounded-full tw-bg-brand-line sm:tw-hidden"
          aria-hidden
        />
        <div className="tw-flex tw-items-center tw-gap-3 tw-border-b tw-border-brand-line tw-px-5 tw-py-4">
          <span
            className={cn(
              'tw-flex tw-h-10 tw-w-10 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-xl',
              terms.tone.badge,
            )}
          >
            <Icon size={20} aria-hidden />
          </span>
          <div className="tw-min-w-0 tw-flex-1">
            <h2 id="buy-title" className="tw-m-0 tw-text-base tw-font-bold">
              خرید بسته‌ی {terms.title}
            </h2>
            <p className="tw-m-0 tw-text-xs tw-text-brand-muted">
              هر بسته {faNumber(terms.size)} {terms.unit} ·{' '}
              {price(terms.unitPrice, policy.currency)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            aria-label="بستن"
            className="tw-flex tw-h-9 tw-w-9 tw-items-center tw-justify-center tw-rounded-full tw-border-0 tw-bg-brand-bg tw-text-brand-muted hover:tw-bg-brand-sky"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <div className="tw-flex-1 tw-space-y-5 tw-overflow-y-auto tw-px-5 tw-py-4">
          <p className="tw-m-0 tw-text-xs tw-leading-6 tw-text-brand-muted">{terms.about}</p>

          <Step index={1} title="تعداد بسته">
            <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3 tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-p-2.5">
              <div className="tw-flex tw-items-center tw-gap-2">
                <button
                  type="button"
                  aria-label="یک بسته کمتر"
                  disabled={count <= 1}
                  onClick={() => setCount(count - 1)}
                  className="tw-flex tw-h-9 tw-w-9 tw-items-center tw-justify-center tw-rounded-lg tw-border tw-border-brand-line tw-bg-white disabled:tw-opacity-40"
                >
                  <Minus size={16} aria-hidden />
                </button>
                <span className="tw-w-8 tw-text-center tw-text-lg tw-font-bold">
                  {faNumber(count)}
                </span>
                <button
                  type="button"
                  aria-label="یک بسته بیشتر"
                  disabled={count >= MAX_PACKAGES}
                  onClick={() => setCount(count + 1)}
                  className="tw-flex tw-h-9 tw-w-9 tw-items-center tw-justify-center tw-rounded-lg tw-border tw-border-brand-line tw-bg-white disabled:tw-opacity-40"
                >
                  <Plus size={16} aria-hidden />
                </button>
              </div>
              <span className="tw-text-sm">
                {faNumber(count * terms.size)} {terms.unit} ·{' '}
                <strong className="tw-whitespace-nowrap">{price(amount, policy.currency)}</strong>
              </span>
            </div>
          </Step>

          <Step index={2} title="مبلغ را به این کارت واریز کنید">
            <div className="tw-rounded-2xl tw-bg-gradient-to-br tw-from-brand-navy tw-to-[#1c2f63] tw-p-4 tw-text-white">
              <div className="tw-flex tw-items-center tw-justify-between tw-gap-3">
                <CreditCard size={22} className="tw-text-brand-orange" aria-hidden />
                {state.payment.cardNumber && <CopyCard card={state.payment.cardNumber} />}
              </div>
              <p
                dir="ltr"
                className="tw-m-0 tw-mt-4 tw-select-all tw-whitespace-nowrap tw-text-center tw-font-mono tw-text-lg tw-font-bold tw-tracking-[0.06em] min-[400px]:tw-text-xl"
              >
                {cardGroups(state.payment.cardNumber) || '—'}
              </p>
              <div className="tw-mt-3 tw-flex tw-flex-wrap tw-items-end tw-justify-between tw-gap-2 tw-text-sm">
                <span className="tw-text-white/70">
                  به نام <strong className="tw-text-white">{state.payment.cardOwner || '—'}</strong>
                </span>
                <span className="tw-font-bold">{price(amount, policy.currency)}</span>
              </div>
            </div>
          </Step>

          <Step index={3} title="عکس رسید را بفرستید">
            <input
              ref={input}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="tw-hidden"
              onChange={choose}
            />
            {preview ? (
              <div className="tw-flex tw-items-center tw-gap-3 tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-p-2.5">
                <img
                  src={preview}
                  alt="پیش‌نمایش رسید"
                  className="tw-h-14 tw-w-14 tw-rounded-lg tw-object-cover"
                />
                <div className="tw-min-w-0 tw-flex-1 tw-text-sm">
                  <p className="tw-m-0 tw-truncate tw-font-bold" dir="ltr">
                    {file?.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => input.current?.click()}
                    className="tw-mt-1 tw-bg-transparent tw-p-0 tw-text-xs tw-font-bold tw-text-brand-orange-ink tw-underline"
                  >
                    عکس دیگری انتخاب کنید
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => input.current?.click()}
                className="tw-flex tw-w-full tw-items-center tw-justify-center tw-gap-2 tw-rounded-xl tw-border-2 tw-border-dashed tw-border-brand-line tw-bg-white tw-px-4 tw-py-4 tw-text-sm tw-font-bold tw-text-brand-muted tw-transition-colors hover:tw-border-brand-orange hover:tw-text-brand-orange-ink"
              >
                <ImagePlus size={20} aria-hidden /> انتخاب عکس رسید
              </button>
            )}
          </Step>
        </div>

        <div className="tw-border-t tw-border-brand-line tw-bg-white tw-px-5 tw-py-3 tw-pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => void send()}
            disabled={!file || sending}
            className={cn(
              'tw-flex tw-h-12 tw-w-full tw-items-center tw-justify-center tw-gap-2 tw-rounded-xl tw-border-0 tw-font-bold tw-text-white tw-transition-colors disabled:tw-cursor-not-allowed disabled:tw-opacity-50',
              terms.tone.button,
            )}
          >
            {sending && <LoaderCircle size={18} className="tw-animate-spin" aria-hidden />}
            {sending
              ? 'در حال ارسال…'
              : file
                ? `فرستادن رسید · ${price(amount, policy.currency)}`
                : 'اول عکس رسید را انتخاب کنید'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
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
      <section className="tw-space-y-4">
        <SectionTitle title="اعتبار شما" />
        <Credits state={state} onChange={setState} />
      </section>
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
