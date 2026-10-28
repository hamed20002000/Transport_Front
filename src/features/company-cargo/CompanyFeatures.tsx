import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BadgeCheck, Check, Copy, CreditCard, Crown, Hourglass, ImagePlus, LoaderCircle, Lock, X } from 'lucide-react';
import { cn } from 'src/shared/utils/utils';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { subscriptionError } from 'src/features/subscription/api';
import { CardSkeleton, LoadFailed, SectionTitle } from './components';
import { useNotificationEvent } from './notificationSocket';
import CompanyShell from './CompanyShell';
import {
  getCompanyFeatures,
  reloadCompanyFeatures,
  setCompanyFeatures,
  submitFeatureReceipt,
  useCompanyFeatures,
  type FeatureState,
} from './featuresApi';

const DAY_MS = 86_400_000;
// a receipt under review is checked again this often, so approval shows without a refresh
const REVIEW_POLL_MS = 20_000;
const currencyNames: Record<string, string> = { IRR: 'ریال', IRT: 'تومان', GBP: 'پوند', EUR: 'یورو', SAR: 'ریال سعودی', CNY: 'یوان' };

const faNumber = (value: number | string) => Number(value).toLocaleString('fa-IR');
const faDate = (value: string) => new Date(value).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
const daysLeft = (value: string) => Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / DAY_MS));
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

function FeatureStatus({ item, reviewing }: { item: FeatureState; reviewing: boolean }) {
  if (reviewing) return <span className="tw-inline-flex tw-items-center tw-gap-1 tw-text-xs tw-font-bold tw-text-brand-orange-ink"><Hourglass size={14} aria-hidden /> رسید در حال بررسی</span>;
  if (item.expireAt) return <span className="tw-inline-flex tw-items-center tw-gap-1 tw-text-xs tw-font-bold tw-text-emerald-700"><BadgeCheck size={14} aria-hidden /> باز تا {faDate(item.expireAt)} ({faNumber(daysLeft(item.expireAt))} روز)</span>;
  if (!item.paid && !item.locked) return <span className="tw-text-xs tw-text-brand-muted">رایگان</span>;
  // an invited company: locked until bought, and this one has no price yet
  if (!item.paid) return <span className="tw-inline-flex tw-items-center tw-gap-1 tw-text-xs tw-font-bold tw-text-brand-muted"><Lock size={14} aria-hidden /> قفل · هنوز قیمت‌گذاری نشده</span>;
  return <span className="tw-inline-flex tw-items-center tw-gap-1 tw-text-xs tw-font-bold tw-text-red-700"><Lock size={14} aria-hidden /> قفل</span>;
}

/**
 * Buying the company panel's menus (a non-parent company): a plan of a menu, card-to-card payment, receipt photo.
 * The admin reviews the receipt; a bought menu opens for the plan's days, after any time already bought.
 */
function FeaturesContent() {
  const toast = useToast();
  const state = useCompanyFeatures();
  const [params] = useSearchParams();
  const [failed, setFailed] = useState(false);
  const [planId, setPlanId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [sending, setSending] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const load = () => {
    setFailed(false);
    return getCompanyFeatures().then(setCompanyFeatures, () => setFailed(true));
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // the admin approved or rejected a receipt: the page (and the menu's locks) show it at once
  useNotificationEvent<{ approved?: boolean }>('company-features-changed', (event) => {
    if (event.approved) toast.success('بخش خریداری‌شده فعال شد.');
    else toast.error('رسید پرداخت تأیید نشد؛ دلیلش را در همین صفحه ببینید.');
    void reloadCompanyFeatures();
  });

  // opened from a locked page (?feature=…): that menu's first plan is chosen
  useEffect(() => {
    if (!state || planId) return;
    const wanted = state.features.find((item) => item.feature === params.get('feature'));
    const first = (wanted?.plans.length ? wanted : state.features.find((item) => item.locked && item.plans.length))?.plans[0];
    if (first) setPlanId(first.id);
  }, [state, params, planId]);

  const reviewing = new Set(state?.orders.filter((order) => order.status === 'RECEIPT_SUBMITTED').map((order) => order.feature));
  useEffect(() => {
    if (!reviewing.size) return;
    const timer = setInterval(() => void reloadCompanyFeatures(), REVIEW_POLL_MS);
    return () => clearInterval(timer);
  }, [reviewing.size]);

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
      setCompanyFeatures(await submitFeatureReceipt(planId, file));
      setFile(null);
      setPreview('');
      setPlanId('');
      toast.success('رسید شما ثبت شد و بررسی می‌شود.');
    } catch (error) {
      toast.error(subscriptionError(error));
    } finally {
      setSending(false);
    }
  };

  if (failed && !state) return <LoadFailed onRetry={() => void load()} />;
  if (!state) return <CardSkeleton />;

  if (state.isParent) {
    return (
      <div className="tw-space-y-5">
        <SectionTitle title="امکانات شرکت حمل‌ونقل" />
        <div className="tw-flex tw-items-start tw-gap-3 tw-rounded-2xl tw-border tw-border-emerald-200 tw-bg-emerald-50 tw-p-4">
          <Crown size={22} className="tw-mt-0.5 tw-shrink-0 tw-text-emerald-600" aria-hidden />
          <div>
            <p className="tw-m-0 tw-font-bold">شرکت مادر</p>
            <p className="tw-m-0 tw-mt-1 tw-text-sm tw-leading-7 tw-text-brand-muted">همه‌ی بخش‌ها بدون خرید برای شما باز است و بارهایتان به همه‌ی رانندگان اعلام می‌شود.</p>
          </div>
        </div>
      </div>
    );
  }

  const plan = state.features.flatMap((item) => item.plans.map((p) => ({ ...p, feature: item }))).find((p) => p.id === planId);
  const rejected = state.orders.find((order) => order.status === 'REJECTED' && !reviewing.has(order.feature));

  return (
    <div className="tw-space-y-5">
      <SectionTitle title="خرید امکانات" hint="هر بخش پنل جدا خریده می‌شود؛ بعد از بررسی رسید، آن بخش برای مدت پلن باز می‌شود." />

      {state.invited && (
        <div className="tw-rounded-2xl tw-border tw-border-brand-orange/30 tw-bg-brand-orange-soft/40 tw-p-4 tw-text-sm tw-leading-7">
          شما با دعوت شرکت مادر عضو شده‌اید؛ همه‌ی بخش‌های پنل تا وقتی آن‌ها را نخرید قفل‌اند. بخشی که هنوز قیمت ندارد، به‌زودی قابل خرید می‌شود.
        </div>
      )}

      {rejected && (
        <div className="tw-flex tw-items-start tw-gap-3 tw-rounded-2xl tw-border tw-border-red-200 tw-bg-red-50 tw-p-4">
          <X size={22} className="tw-mt-0.5 tw-shrink-0 tw-text-red-600" aria-hidden />
          <div>
            <p className="tw-m-0 tw-font-bold">رسید «{rejected.title}» تأیید نشد</p>
            <p className="tw-m-0 tw-mt-1 tw-text-sm tw-leading-7 tw-text-brand-muted">{rejected.rejectionReason || 'دلیلی ثبت نشده است.'} لطفاً دوباره پرداخت کنید یا رسید درست را بفرستید.</p>
          </div>
        </div>
      )}

      <fieldset className="tw-m-0 tw-space-y-3 tw-border-0 tw-p-0">
        <legend className="tw-mb-2 tw-text-sm tw-font-bold">۱. بخش و پلن را انتخاب کنید</legend>
        {state.features.map((item) => (
          <div key={item.feature} className={cn('tw-rounded-2xl tw-border tw-bg-white tw-p-4', item.locked ? 'tw-border-brand-line' : 'tw-border-emerald-100')}>
            <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-2">
              <strong>{item.title}</strong>
              <FeatureStatus item={item} reviewing={reviewing.has(item.feature)} />
            </div>
            {item.plans.length > 0 && !reviewing.has(item.feature) && (
              <div className="tw-mt-3 tw-grid tw-grid-cols-1 tw-gap-2 sm:tw-grid-cols-2">
                {item.plans.map((option) => {
                  const selected = option.id === planId;
                  return (
                    <label
                      key={option.id}
                      className={cn(
                        'tw-flex tw-cursor-pointer tw-items-center tw-gap-3 tw-rounded-xl tw-border-2 tw-p-3 tw-transition-colors',
                        selected ? 'tw-border-brand-orange tw-bg-brand-orange-soft/40' : 'tw-border-brand-line hover:tw-border-brand-orange/40',
                      )}
                    >
                      <input type="radio" name="plan" value={option.id} checked={selected} onChange={() => setPlanId(option.id)} className="tw-sr-only" />
                      <span
                        className={cn('tw-flex tw-h-5 tw-w-5 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-border-2', selected ? 'tw-border-brand-orange tw-bg-brand-orange tw-text-white' : 'tw-border-brand-line')}
                        aria-hidden
                      >
                        {selected && <Check size={12} strokeWidth={3} />}
                      </span>
                      <span className="tw-min-w-0 tw-flex-1">
                        <span className="tw-block tw-text-sm tw-font-bold">{option.title}</span>
                        <span className="tw-block tw-text-xs tw-text-brand-muted">{faNumber(option.durationDays)} روز{item.expireAt ? ' · بعد از پایان مدت فعلی' : ''}</span>
                      </span>
                      <span className="tw-shrink-0 tw-text-sm tw-font-bold tw-text-brand-orange-ink">{price(option.price, option.currency)}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </fieldset>

      {plan && (
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
                <span className="tw-rounded-lg tw-bg-white/10 tw-px-3 tw-py-1 tw-font-bold">
                  {plan.feature.title} · {price(plan.price, plan.currency)}
                </span>
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
            disabled={!file || sending}
            className="tw-flex tw-h-12 tw-w-full tw-items-center tw-justify-center tw-gap-2 tw-rounded-xl tw-border-0 tw-bg-brand-orange tw-text-base tw-font-bold tw-text-white tw-shadow-[0_10px_24px_rgba(245,118,26,0.3)] tw-transition-colors hover:tw-bg-brand-orange-dark disabled:tw-cursor-not-allowed disabled:tw-opacity-50 disabled:tw-shadow-none"
          >
            {sending && <LoaderCircle size={18} className="tw-animate-spin" aria-hidden />}
            {sending ? 'در حال ارسال…' : `ارسال رسید و خرید «${plan.feature.title}»`}
          </button>
        </>
      )}
    </div>
  );
}

export default function CompanyFeaturesPage() {
  return (
    <CompanyShell>
      <FeaturesContent />
    </CompanyShell>
  );
}
