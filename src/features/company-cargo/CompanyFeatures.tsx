import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Award, BadgeCheck, CalendarDays, Check, Clock, Copy, CreditCard, Crown, Hourglass, ImagePlus, LoaderCircle, Lock, Medal, Minus, Sparkles, X } from 'lucide-react';
import { cn } from 'src/shared/utils/utils';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { subscriptionError } from 'src/features/subscription/api';
import { CardSkeleton, LoadFailed, SectionTitle, Segmented } from './components';
import { useNotificationEvent } from './notificationSocket';
import CompanyShell from './CompanyShell';
import {
  getCompanyFeatures,
  reloadCompanyFeatures,
  setCompanyFeatures,
  submitFeatureReceipt,
  submitTierReceipt,
  useCompanyFeatures,
  TIER_MONTHS,
  tierMonthsTitle,
  type CompanyTier,
  type FeatureState,
  type TierMonths,
  type TierPlan,
} from './featuresApi';

const DAY_MS = 86_400_000;
// as the server's reminder (COMPANY_PLAN_REMIND_DAYS)
const CLOSING_SOON_DAYS = 7;
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

type Choice = { kind: 'plan'; id: string } | { kind: 'tier'; tier: CompanyTier; months: TierMonths };

// each tier its metal: the header's gradient, the selected ring and the button
const TIER_STYLE: Record<CompanyTier, { header: string; ring: string; button: string; icon: typeof Medal; tagline: string }> = {
  BRONZE: {
    header: 'tw-from-[#e3a46f] tw-via-[#c27a43] tw-to-[#8f4e22]',
    ring: 'tw-ring-[#c27a43]',
    button: 'tw-bg-[#b5672f] hover:tw-bg-[#9c5626]',
    icon: Medal,
    tagline: 'شروع کار با بارها',
  },
  SILVER: {
    header: 'tw-from-slate-300 tw-via-slate-400 tw-to-slate-600',
    ring: 'tw-ring-slate-500',
    button: 'tw-bg-slate-600 hover:tw-bg-slate-700',
    icon: Award,
    tagline: 'بار، راننده و سفر در یک‌جا',
  },
  GOLD: {
    header: 'tw-from-amber-300 tw-via-amber-400 tw-to-amber-600',
    ring: 'tw-ring-amber-500',
    button: 'tw-bg-amber-500 hover:tw-bg-amber-600',
    icon: Crown,
    tagline: 'همه‌ی امکانات ترابوت',
  },
};

function TierCard({
  tier,
  months,
  allFeatures,
  selected,
  current,
  fullest,
  disabled,
  onSelect,
}: {
  tier: TierPlan;
  /** the period chosen above the cards */
  months: TierMonths;
  allFeatures: FeatureState[];
  selected: boolean;
  current: boolean;
  /** the tier with the most menus */
  fullest: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const style = TIER_STYLE[tier.tier];
  const Icon = style.icon;
  const included = new Set(tier.features.map((item) => item.feature));
  const option = tier.options.find((item) => item.months === months);
  const monthly = tier.options.find((item) => item.months === 1);
  // a longer period against buying it month by month
  const saving = option && monthly && months > 1 ? Math.round((1 - Number(option.price) / (Number(monthly.price) * months)) * 100) : 0;
  const perDay = option ? Math.round(Number(option.price) / Math.max(1, option.durationDays)) : 0;
  const unavailable = !option;
  disabled ||= unavailable;
  return (
    <label
      className={cn(
        'tw-relative tw-flex tw-flex-col tw-overflow-hidden tw-rounded-3xl tw-border tw-border-brand-line tw-bg-white tw-shadow-sm tw-transition-all tw-duration-200',
        disabled ? 'tw-cursor-not-allowed tw-opacity-70' : 'tw-cursor-pointer hover:-tw-translate-y-1 hover:tw-shadow-[0_18px_40px_rgba(15,23,42,0.12)]',
        selected && cn('tw-ring-4 tw-ring-offset-2', style.ring, 'tw-shadow-[0_18px_40px_rgba(15,23,42,0.14)]'),
      )}
    >
      <input type="radio" name="tier" checked={selected} disabled={disabled} onChange={onSelect} className="tw-sr-only" />

      <div className={cn('tw-relative tw-bg-gradient-to-br tw-px-5 tw-pb-5 tw-pt-4 tw-text-white', style.header)}>
        {/* a soft shine across the metal */}
        <span className="tw-pointer-events-none tw-absolute -tw-left-10 -tw-top-10 tw-h-32 tw-w-32 tw-rounded-full tw-bg-white/25 tw-blur-2xl" aria-hidden />
        <div className="tw-relative tw-flex tw-items-start tw-justify-between tw-gap-2">
          <span className="tw-flex tw-h-12 tw-w-12 tw-items-center tw-justify-center tw-rounded-2xl tw-bg-white/25 tw-shadow-inner tw-backdrop-blur">
            <Icon size={26} aria-hidden />
          </span>
          <div className="tw-flex tw-flex-col tw-items-end tw-gap-1">
            {current && <span className="tw-rounded-full tw-bg-white tw-px-2.5 tw-py-0.5 tw-text-xs tw-font-bold tw-text-emerald-700">طرح فعلی شما</span>}
            {fullest && !current && (
              <span className="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-full tw-bg-white tw-px-2.5 tw-py-0.5 tw-text-xs tw-font-bold tw-text-amber-700">
                <Sparkles size={12} aria-hidden /> کامل‌ترین
              </span>
            )}
          </div>
        </div>
        <p className="tw-relative tw-m-0 tw-mt-3 tw-text-xl tw-font-bold">طرح {tier.title}</p>
        <p className="tw-relative tw-m-0 tw-text-sm tw-text-white/85">{style.tagline}</p>
      </div>

      <div className="tw-flex tw-flex-1 tw-flex-col tw-gap-4 tw-p-5">
        {option ? (
          <div>
            <p className="tw-m-0 tw-flex tw-flex-wrap tw-items-baseline tw-gap-1.5">
              <span className="tw-text-3xl tw-font-black tw-tracking-tight">{faNumber(option.price)}</span>
              <span className="tw-text-sm tw-font-medium tw-text-brand-muted">{currencyNames[tier.currency] ?? tier.currency}</span>
              {saving > 0 && (
                <span className="tw-rounded-full tw-bg-emerald-50 tw-px-2 tw-py-0.5 tw-text-xs tw-font-bold tw-text-emerald-700">{faNumber(saving)}٪ صرفه‌جویی</span>
              )}
            </p>
            <p className="tw-m-0 tw-mt-1 tw-text-xs tw-text-brand-muted">
              {option.title} · روزی حدود {faNumber(perDay)} {currencyNames[tier.currency] ?? tier.currency}
            </p>
          </div>
        ) : (
          <p className="tw-m-0 tw-rounded-xl tw-bg-slate-50 tw-p-3 tw-text-sm tw-text-brand-muted">این طرح {tierMonthsTitle(months)} ندارد.</p>
        )}

        <div>
          <p className="tw-m-0 tw-mb-2 tw-text-xs tw-font-bold tw-text-brand-muted">
            {faNumber(included.size)} بخش از {faNumber(allFeatures.length)} بخش پنل
          </p>
          <ul className="tw-m-0 tw-list-none tw-space-y-2 tw-p-0 tw-text-sm">
            {allFeatures.map((item) =>
              included.has(item.feature) ? (
                <li key={item.feature} className="tw-flex tw-items-center tw-gap-2">
                  <span className="tw-flex tw-h-5 tw-w-5 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-bg-emerald-100 tw-text-emerald-700">
                    <Check size={13} strokeWidth={3} aria-hidden />
                  </span>
                  {item.title}
                </li>
              ) : (
                <li key={item.feature} className="tw-flex tw-items-center tw-gap-2 tw-text-brand-muted/50">
                  <span className="tw-flex tw-h-5 tw-w-5 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-bg-slate-100">
                    <Minus size={12} aria-hidden />
                  </span>
                  <span className="tw-line-through">{item.title}</span>
                </li>
              ),
            )}
          </ul>
        </div>

        <span
          className={cn(
            'tw-mt-auto tw-flex tw-h-11 tw-items-center tw-justify-center tw-gap-2 tw-rounded-xl tw-text-sm tw-font-bold tw-transition-colors',
            unavailable ? 'tw-bg-slate-100 tw-text-brand-muted' : selected ? 'tw-bg-emerald-600 tw-text-white' : cn(style.button, 'tw-text-white'),
          )}
        >
          {selected ? <Check size={18} strokeWidth={3} aria-hidden /> : null}
          {unavailable ? `${tierMonthsTitle(months)} ندارد` : selected ? 'انتخاب شد' : current ? `تمدید طرح ${tier.title}` : `انتخاب طرح ${tier.title}`}
        </span>
      </div>
    </label>
  );
}

/**
 * Buying the company panel's menus (a non-parent company): a tier (برنزی، نقره‌ای، طلایی) — or, while menus are sold one
 * by one, a menu's plan — then card-to-card payment and the receipt photo. The admin reviews the receipt; what was bought
 * opens for its days, after any time already bought.
 */
function FeaturesContent() {
  const toast = useToast();
  const state = useCompanyFeatures();
  const [params] = useSearchParams();
  const [failed, setFailed] = useState(false);
  const [choice, setChoice] = useState<Choice | null>(null);
  // the period the tier cards show: one month until the company picks another
  const [months, setMonths] = useState<TierMonths>(1);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [sending, setSending] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const payment = useRef<HTMLDivElement>(null);

  const load = () => {
    setFailed(false);
    return getCompanyFeatures().then(setCompanyFeatures, () => setFailed(true));
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // the admin approved or rejected a receipt: the page (and the menu's locks) show it at once
  useNotificationEvent<{ approved?: boolean; tier?: CompanyTier | null }>('company-features-changed', (event) => {
    if (event.approved) toast.success(event.tier ? 'طرح خریداری‌شده فعال شد.' : 'بخش خریداری‌شده فعال شد.');
    else toast.error('رسید پرداخت تأیید نشد؛ دلیلش را در همین صفحه ببینید.');
    void reloadCompanyFeatures();
  });

  // opened from a locked page (?feature=…): the cheapest tier with that menu, or that menu's first plan
  useEffect(() => {
    if (!state || choice) return;
    const wanted = state.features.find((item) => item.feature === params.get('feature'));
    if (!state.menuPurchase) {
      const tier = wanted && state.tiers.find((item) => wanted.tiers.includes(item.tier) && item.options.length);
      if (tier) {
        setMonths(tier.options[0].months);
        setChoice({ kind: 'tier', tier: tier.tier, months: tier.options[0].months });
      }
      return;
    }
    const first = (wanted?.plans.length ? wanted : state.features.find((item) => item.locked && item.plans.length))?.plans[0];
    if (first) setChoice({ kind: 'plan', id: first.id });
  }, [state, params, choice]);

  const reviewing = new Set(state?.orders.filter((order) => order.status === 'RECEIPT_SUBMITTED' && order.feature).map((order) => order.feature));
  const reviewingTier = state?.orders.find((order) => order.status === 'RECEIPT_SUBMITTED' && order.tier);
  const underReview = reviewing.size > 0 || !!reviewingTier;
  useEffect(() => {
    if (!underReview) return;
    const timer = setInterval(() => void reloadCompanyFeatures(), REVIEW_POLL_MS);
    return () => clearInterval(timer);
  }, [underReview]);

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

  // what is being bought: a tier, or a menu's plan
  const selected = (() => {
    if (choice?.kind === 'tier') {
      const tier = state.tiers.find((item) => item.tier === choice.tier);
      const option = tier?.options.find((item) => item.months === choice.months);
      return tier && option && { label: `طرح ${tier.title} ${option.title}`, price: option.price, currency: tier.currency };
    }
    if (choice?.kind === 'plan') {
      const item = state.features.find((feature) => feature.plans.some((plan) => plan.id === choice.id));
      const plan = item?.plans.find((option) => option.id === choice.id);
      return item && plan && { label: item.title, price: plan.price, currency: plan.currency };
    }
    return undefined;
  })();
  // menus bought that close within a week (as CompanyPlanExpiryWorker tells the company): the first day and those menus
  const closingSoon = (() => {
    const open = state.features.filter((item) => item.expireAt).sort((a, b) => +new Date(a.expireAt!) - +new Date(b.expireAt!));
    const first = open[0]?.expireAt;
    if (!first || daysLeft(first) > CLOSING_SOON_DAYS) return null;
    const titles = open.filter((item) => +new Date(item.expireAt!) - +new Date(first) < DAY_MS).map((item) => item.title);
    return { at: first, days: Math.max(1, daysLeft(first)), titles };
  })();
  // the latest receipt was rejected (and nothing newer waits): its reason
  const rejected = state.orders[0]?.status === 'REJECTED' ? state.orders[0] : undefined;

  const send = async () => {
    if (!choice || !file || sending) return;
    setSending(true);
    try {
      setCompanyFeatures(choice.kind === 'tier' ? await submitTierReceipt(choice.tier, choice.months, file) : await submitFeatureReceipt(choice.id, file));
      setFile(null);
      setPreview('');
      setChoice(null);
      toast.success('رسید شما ثبت شد و بررسی می‌شود.');
    } catch (error) {
      toast.error(subscriptionError(error));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="tw-space-y-5">
      <SectionTitle
        title="خرید امکانات"
        hint={state.menuPurchase
          ? 'هر بخش پنل جدا خریده می‌شود؛ بعد از بررسی رسید، آن بخش برای مدت پلن باز می‌شود.'
          : 'یکی از طرح‌ها را انتخاب کنید؛ بعد از بررسی رسید، همه‌ی بخش‌های آن طرح برای مدتش باز می‌شود.'}
      />

      {state.invited && (
        <div className="tw-rounded-2xl tw-border tw-border-brand-orange/30 tw-bg-brand-orange-soft/40 tw-p-4 tw-text-sm tw-leading-7">
          شما با دعوت شرکت مادر عضو شده‌اید؛ همه‌ی بخش‌های پنل تا وقتی آن‌ها را نخرید قفل‌اند.
        </div>
      )}

      {state.currentTier && (
        <div className="tw-flex tw-items-start tw-gap-3 tw-rounded-2xl tw-border tw-border-emerald-200 tw-bg-emerald-50 tw-p-4">
          <BadgeCheck size={22} className="tw-mt-0.5 tw-shrink-0 tw-text-emerald-600" aria-hidden />
          <p className="tw-m-0 tw-text-sm tw-leading-7">
            طرح فعلی شما: <strong>{state.currentTier.title}</strong> تا {faDate(state.currentTier.expireAt)} ({faNumber(daysLeft(state.currentTier.expireAt))} روز). خرید دوباره بعد از پایان مدت فعلی هر بخش شروع می‌شود.
          </p>
        </div>
      )}

      {closingSoon && (
        <div className="tw-flex tw-items-start tw-gap-3 tw-rounded-2xl tw-border tw-border-amber-300 tw-bg-amber-50 tw-p-4">
          <Clock size={22} className="tw-mt-0.5 tw-shrink-0 tw-text-amber-600" aria-hidden />
          <p className="tw-m-0 tw-text-sm tw-leading-7 tw-text-amber-900">
            <strong>{faNumber(closingSoon.days)} روز دیگر</strong> ({faDate(closingSoon.at)}) این بخش‌ها بسته می‌شوند: {closingSoon.titles.join('، ')}. با تمدید یا خرید طرح دیگر، مدت تازه بعد از پایان مدت فعلی شروع می‌شود و روزی از دست نمی‌رود.
          </p>
        </div>
      )}

      {reviewingTier && (
        <div className="tw-flex tw-items-start tw-gap-3 tw-rounded-2xl tw-border tw-border-brand-orange/30 tw-bg-brand-orange-soft/40 tw-p-4">
          <Hourglass size={22} className="tw-mt-0.5 tw-shrink-0 tw-text-brand-orange-ink" aria-hidden />
          <p className="tw-m-0 tw-text-sm tw-leading-7">رسید «{reviewingTier.title}» در حال بررسی است؛ نتیجه همین‌جا و با اعلان خبر داده می‌شود.</p>
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

      {!state.menuPurchase ? (
        <fieldset className="tw-m-0 tw-space-y-3 tw-border-0 tw-p-0">
          <legend className="tw-mb-2 tw-text-sm tw-font-bold">۱. طرح را انتخاب کنید</legend>
          {state.tiers.length > 0 && (
            <Segmented
              label="مدت طرح"
              value={String(months) as `${TierMonths}`}
              onChange={(value) => {
                const next = Number(value) as TierMonths;
                setMonths(next);
                // the tier chosen follows the period, when it is sold for it
                if (choice?.kind === 'tier') {
                  const tier = state.tiers.find((item) => item.tier === choice.tier);
                  setChoice(tier?.options.some((item) => item.months === next) ? { ...choice, months: next } : null);
                }
              }}
              options={TIER_MONTHS.filter((value) => state.tiers.some((tier) => tier.options.some((item) => item.months === value))).map((value) => ({
                value: String(value) as `${TierMonths}`,
                label: tierMonthsTitle(value),
                icon: CalendarDays,
              }))}
            />
          )}
          {state.tiers.length ? (
            <div className="tw-grid tw-items-stretch tw-gap-4 md:tw-grid-cols-3">
              {state.tiers.map((tier) => (
                <TierCard
                  key={tier.tier}
                  tier={tier}
                  months={months}
                  allFeatures={state.features}
                  selected={choice?.kind === 'tier' && choice.tier === tier.tier}
                  current={state.currentTier?.tier === tier.tier}
                  fullest={state.tiers.length > 1 && tier.features.length === Math.max(...state.tiers.map((item) => item.features.length))}
                  disabled={!!reviewingTier}
                  onSelect={() => {
                    setChoice({ kind: 'tier', tier: tier.tier, months });
                    // the next step (the card to pay to) right after choosing
                    setTimeout(() => payment.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                  }}
                />
              ))}
            </div>
          ) : (
            <p className="tw-m-0 tw-rounded-2xl tw-border tw-border-dashed tw-border-brand-line tw-bg-white tw-p-6 tw-text-center tw-text-sm tw-text-brand-muted">هنوز طرحی برای فروش تعریف نشده است.</p>
          )}
        </fieldset>
      ) : (
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
                    const isSelected = choice?.kind === 'plan' && choice.id === option.id;
                    return (
                      <label
                        key={option.id}
                        className={cn(
                          'tw-flex tw-cursor-pointer tw-items-center tw-gap-3 tw-rounded-xl tw-border-2 tw-p-3 tw-transition-colors',
                          isSelected ? 'tw-border-brand-orange tw-bg-brand-orange-soft/40' : 'tw-border-brand-line hover:tw-border-brand-orange/40',
                        )}
                      >
                        <input type="radio" name="plan" value={option.id} checked={isSelected} onChange={() => setChoice({ kind: 'plan', id: option.id })} className="tw-sr-only" />
                        <span
                          className={cn('tw-flex tw-h-5 tw-w-5 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-border-2', isSelected ? 'tw-border-brand-orange tw-bg-brand-orange tw-text-white' : 'tw-border-brand-line')}
                          aria-hidden
                        >
                          {isSelected && <Check size={12} strokeWidth={3} />}
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
      )}

      {selected && (
        <>
          <div ref={payment} className="tw-scroll-mt-24">
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
                  {selected.label} · {price(selected.price, selected.currency)}
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
            className="tw-flex tw-h-12 tw-w-full tw-items-center tw-justify-center tw-gap-2 tw-rounded-xl tw-border-0 tw-bg-brand-orange tw-text-base tw-font-bold tw-text-white tw-shadow-[0_10px_24px_rgba(245,118,26,0.3)] tw-transition-colors hover:tw-bg-brand-orange-dark disabled:tw-cursor-not-allowed disabled:tw-shadow-none"
          >
            {sending && <LoaderCircle size={18} className="tw-animate-spin" aria-hidden />}
            {sending ? 'در حال ارسال…' : `ارسال رسید و خرید «${selected.label}»`}
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
