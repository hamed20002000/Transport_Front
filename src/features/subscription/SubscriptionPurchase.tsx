import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { BadgeCheck, Check, Copy, CreditCard, Hourglass, ImagePlus, LoaderCircle, Sparkles, TriangleAlert, X } from 'lucide-react';
import { cn } from 'src/shared/utils/utils';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { CardSkeleton, LoadFailed, SectionTitle } from 'src/features/company-cargo/components';
import { getSubscription, isUnderReview, submitReceipt, subscriptionError, type SubscriptionState } from './api';
import { useNotificationEvent } from 'src/features/company-cargo/notificationSocket';

const DAY_MS = 86_400_000;
// a receipt under review is checked again this often, so approval shows without a refresh
const REVIEW_POLL_MS = 20_000;
const currencyNames: Record<string, string> = { IRR: 'ریال', IRT: 'تومان', GBP: 'پوند', EUR: 'یورو', SAR: 'ریال سعودی', CNY: 'یوان' };

const faNumber = (value: number | string) => Number(value).toLocaleString('fa-IR');
const faDate = (value: string) => new Date(value).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
const daysLeft = (value: string) => Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / DAY_MS));
const price = (amount: string, currency: string) => `${faNumber(amount)} ${currencyNames[currency] ?? currency}`;
// 6037991234567890 → 6037 9912 3456 7890 (left to right, as printed on the card)
const cardGroups = (card: string) => card.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ');

/** Where the user stands: free days left, subscribed until, or nothing left but buying. */
function StatusCard({ state }: { state: SubscriptionState }) {
  const { access } = state;
  if (access.reason === 'subscribed' && access.expireAt) {
    return (
      <Banner tone="ok" icon={BadgeCheck} title="اشتراک شما فعال است">
        تا {faDate(access.expireAt)} ({faNumber(daysLeft(access.expireAt))} روز دیگر). برای تمدید می‌توانید همین حالا طرح جدید بخرید.
      </Banner>
    );
  }
  if (access.reason === 'trial' && access.trialEndsAt) {
    return (
      <Banner tone="info" icon={Sparkles} title={`${faNumber(daysLeft(access.trialEndsAt))} روز از استفاده‌ی رایگان باقی مانده`}>
        دوره‌ی رایگان شما {faDate(access.trialEndsAt)} تمام می‌شود. برای اینکه کارتان قطع نشود، از همین حالا اشتراک بخرید.
      </Banner>
    );
  }
  if (!access.allowed) {
    return (
      <Banner tone="warn" icon={TriangleAlert} title={access.isDriver ? 'دوره‌ی رایگان شما تمام شده است' : 'اشتراک لازم است'}>
        برای دیدن بارها، درخواست بار و بقیه‌ی امکانات، یکی از طرح‌ها را بخرید. بعد از تأیید پرداخت، همه‌چیز دوباره باز می‌شود.
      </Banner>
    );
  }
  return null;
}

function Banner({ tone, icon: Icon, title, children }: { tone: 'ok' | 'info' | 'warn'; icon: typeof Sparkles; title: string; children: React.ReactNode }) {
  const tones = {
    ok: 'tw-border-emerald-200 tw-bg-emerald-50 [&_svg]:tw-text-emerald-600',
    info: 'tw-border-brand-orange/30 tw-bg-brand-orange-soft [&_svg]:tw-text-brand-orange-ink',
    warn: 'tw-border-red-200 tw-bg-red-50 [&_svg]:tw-text-red-600',
  };
  return (
    <div className={cn('tw-flex tw-items-start tw-gap-3 tw-rounded-2xl tw-border tw-p-4', tones[tone])}>
      <Icon size={22} className="tw-mt-0.5 tw-shrink-0" aria-hidden />
      <div>
        <p className="tw-m-0 tw-font-bold">{title}</p>
        <p className="tw-m-0 tw-mt-1 tw-text-sm tw-leading-7 tw-text-brand-muted">{children}</p>
      </div>
    </div>
  );
}

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
 * Buying a subscription in the app: plan, card-to-card payment, receipt photo. The receipt joins the bots'
 * receipts in the admin's review queue; while it waits, this page shows its state and checks back by itself.
 */
export default function SubscriptionPurchase({ onActivated }: { onActivated?: () => void }) {
  const toast = useToast();
  const [state, setState] = useState<SubscriptionState | null>(null);
  const [failed, setFailed] = useState(false);
  const [planId, setPlanId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [sending, setSending] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const wasAllowed = useRef<boolean | null>(null);

  const load = () =>
    getSubscription()
      .then((next) => {
        setState(next);
        setFailed(false);
        setPlanId((current) => current || next.plans[0]?.id || '');
        // the admin approved while the page was open
        if (wasAllowed.current === false && next.access.allowed) onActivated?.();
        wasAllowed.current = next.access.allowed;
      })
      .catch(() => setFailed(true));

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // the admin decided: the page shows it at once (the 20 s check below is only a fallback)
  useNotificationEvent('subscription-changed', () => void load());

  const reviewing = !!state && isUnderReview(state);
  useEffect(() => {
    if (!reviewing) return;
    const timer = setInterval(() => void load(), REVIEW_POLL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewing]);

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
    if (!planId || !file || sending) return;
    setSending(true);
    try {
      setState(await submitReceipt(planId, file));
      setFile(null);
      setPreview('');
      toast.success('رسید شما ثبت شد و بررسی می‌شود.');
    } catch (error) {
      toast.error(subscriptionError(error));
    } finally {
      setSending(false);
    }
  };

  if (failed) return <LoadFailed onRetry={() => void load()} />;
  if (!state) return <CardSkeleton />;

  const plan = state.plans.find((item) => item.id === planId);
  const order = state.latestOrder;

  return (
    <div className="tw-space-y-5">
      <SectionTitle title="اشتراک" hint="خرید با کارت‌به‌کارت؛ بعد از بررسی رسید، اشتراک فعال می‌شود." />
      <StatusCard state={state} />

      {reviewing && order ? (
        <div className="tw-flex tw-items-start tw-gap-3 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-5">
          <span className="tw-flex tw-h-11 tw-w-11 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-xl tw-bg-brand-orange-soft tw-text-brand-orange-ink">
            <Hourglass size={22} aria-hidden />
          </span>
          <div className="tw-min-w-0">
            <p className="tw-m-0 tw-font-bold">رسید شما در حال بررسی است</p>
            <p className="tw-m-0 tw-mt-1 tw-text-sm tw-leading-7 tw-text-brand-muted">
              {order.planTitle ?? 'طرح اشتراک'} · {price(order.amount, order.currency)} · {faDate(order.createdAt)}
              <br />
              نتیجه همین‌جا و در ربات‌هایی که وصل کرده‌اید اعلام می‌شود.
            </p>
          </div>
        </div>
      ) : (
        <>
          {order?.status === 'REJECTED' && (
            <Banner tone="warn" icon={X} title="رسید قبلی شما تأیید نشد">
              {order.rejectionReason || 'دلیلی ثبت نشده است.'} لطفاً دوباره پرداخت کنید یا رسید درست را بفرستید.
            </Banner>
          )}

          {state.plans.length === 0 ? (
            <div className="tw-rounded-2xl tw-border tw-border-dashed tw-border-brand-line tw-bg-white tw-p-6 tw-text-center tw-text-sm tw-text-brand-muted">
              در حال حاضر طرح اشتراکی برای حساب شما تعریف نشده است. لطفاً با پشتیبانی تماس بگیرید.
            </div>
          ) : (
            <>
              <fieldset className="tw-m-0 tw-grid tw-gap-3 tw-border-0 tw-p-0 sm:tw-grid-cols-2">
                <legend className="tw-mb-2 tw-text-sm tw-font-bold">۱. طرح را انتخاب کنید</legend>
                {state.plans.map((item) => {
                  const selected = item.id === planId;
                  return (
                    <label
                      key={item.id}
                      className={cn(
                        'tw-flex tw-cursor-pointer tw-items-center tw-gap-3 tw-rounded-2xl tw-border-2 tw-bg-white tw-p-4 tw-transition-colors',
                        selected ? 'tw-border-brand-orange tw-shadow-[0_8px_24px_rgba(245,118,26,0.15)]' : 'tw-border-brand-line hover:tw-border-brand-orange/40',
                      )}
                    >
                      <input type="radio" name="plan" value={item.id} checked={selected} onChange={() => setPlanId(item.id)} className="tw-sr-only" />
                      <span
                        className={cn(
                          'tw-flex tw-h-5 tw-w-5 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-border-2',
                          selected ? 'tw-border-brand-orange tw-bg-brand-orange tw-text-white' : 'tw-border-brand-line',
                        )}
                        aria-hidden
                      >
                        {selected && <Check size={12} strokeWidth={3} />}
                      </span>
                      <span className="tw-min-w-0 tw-flex-1">
                        <span className="tw-block tw-font-bold">{item.title}</span>
                        <span className="tw-block tw-text-xs tw-text-brand-muted">{faNumber(item.durationDays)} روز</span>
                      </span>
                      <span className="tw-shrink-0 tw-text-sm tw-font-bold tw-text-brand-orange-ink">{price(item.price, item.currency)}</span>
                    </label>
                  );
                })}
              </fieldset>

              <div>
                <p className="tw-mb-2 tw-text-sm tw-font-bold">۲. مبلغ را به این کارت واریز کنید</p>
                <div className="tw-relative tw-overflow-hidden tw-rounded-2xl tw-bg-gradient-to-br tw-from-brand-navy tw-to-[#1c2f63] tw-p-5 tw-text-white tw-shadow-lg">
                  <div className="tw-absolute -tw-left-10 -tw-top-10 tw-h-40 tw-w-40 tw-rounded-full tw-bg-brand-orange/20 tw-blur-2xl" aria-hidden />
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
                    {plan && (
                      <span className="tw-rounded-lg tw-bg-white/10 tw-px-3 tw-py-1 tw-font-bold">
                        مبلغ: {price(plan.price, plan.currency)}
                      </span>
                    )}
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

              <button
                type="button"
                onClick={send}
                disabled={!plan || !file || sending}
                className="tw-flex tw-h-12 tw-w-full tw-items-center tw-justify-center tw-gap-2 tw-rounded-xl tw-border-0 tw-bg-brand-orange tw-text-base tw-font-bold tw-text-white tw-shadow-[0_10px_24px_rgba(245,118,26,0.3)] tw-transition-colors hover:tw-bg-brand-orange-dark disabled:tw-cursor-not-allowed disabled:tw-opacity-50 disabled:tw-shadow-none"
              >
                {sending && <LoaderCircle size={18} className="tw-animate-spin" aria-hidden />}
                {sending ? 'در حال ارسال…' : 'ارسال رسید و خرید اشتراک'}
              </button>
              <p className="tw-m-0 tw-text-center tw-text-xs tw-text-brand-muted">از ربات تلگرام یا بله هم می‌توانید اشتراک بخرید.</p>
            </>
          )}
        </>
      )}
    </div>
  );
}
