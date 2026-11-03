import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Building2, CircleCheck, CircleX, Clock, Crown, Gem, ImageOff, Inbox, LoaderCircle, Lock, Medal, Receipt } from 'lucide-react';
import PageContainer from 'src/shared/components/container/PageContainer';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { useMessageBox } from 'src/shared/components/message-box/MessageBoxProvider';
import { cn } from 'src/shared/utils/utils';
import { CardSkeleton, EmptyState, LoadFailed, Segmented } from 'src/features/company-cargo/components';
import AdminGate from './AdminGate';
import { useNotificationEvent } from 'src/features/company-cargo/notificationSocket';
import { UnlockPanel } from './SubscriptionOrders';
import { currencies, type Currency } from './currencies';
import {
  adminError,
  approveFeatureOrder,
  companyFeatureTitles,
  createFeaturePlan,
  deleteFeaturePlan,
  featureReceiptImage,
  grantCompanyFeature,
  listCompanies,
  listFeatureOrders,
  listCompanyTiers,
  listFeaturePlans,
  rejectFeatureOrder,
  setParentCompany,
  updateCompanyTier,
  type AdminCompany,
  type CompanyFeature,
  type CompanyFeatureOrder,
  type CompanyFeaturePlan,
  type CompanyTier,
  type CompanyTierPlan,
  type TierMonths,
  type ReceiptUnlock,
} from './adminApi';
import AccountCode from 'src/shared/components/account-code/AccountCode';
import DigitGroupInput from 'src/shared/components/form-controls/DigitGroupInput';
import { groupDigits } from 'src/shared/utils/digitGroups';

type Section = 'companies' | 'tiers' | 'plans' | 'orders';
type OrderTab = 'review' | 'APPROVED' | 'REJECTED';

const sections = [
  { value: 'companies' as const, label: 'شرکت‌های حمل‌ونقل', icon: Building2 },
  { value: 'tiers' as const, label: 'طرح‌ها', icon: Medal },
  { value: 'plans' as const, label: 'قیمت بخش‌ها (غیرفعال)', icon: Gem },
  { value: 'orders' as const, label: 'رسیدها', icon: Receipt },
];
const orderTabs = [
  { value: 'review' as const, label: 'منتظر بررسی', icon: Clock },
  { value: 'APPROVED' as const, label: 'تأییدشده', icon: CircleCheck },
  { value: 'REJECTED' as const, label: 'ردشده', icon: CircleX },
];
const featureOptions = Object.entries(companyFeatureTitles) as [CompanyFeature, string][];

const faNumber = (value: number | string) => Number(value).toLocaleString('fa-IR');
const faDateTime = (value: string) => new Date(value).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' });
const digits = (value: string) =>
  value.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
const price = (amount: string, currency: string) => `${faNumber(amount)} ${currencies[currency as Currency] ?? currency}`;

const inputClass =
  'tw-h-10 tw-w-full tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-3 tw-text-sm tw-text-brand-navy tw-outline-none tw-transition-colors placeholder:tw-text-brand-muted/70 focus:tw-border-brand-orange';
const primaryButton =
  'tw-inline-flex tw-h-10 tw-items-center tw-justify-center tw-gap-1.5 tw-rounded-xl tw-border-0 tw-bg-brand-orange tw-px-4 tw-text-sm tw-font-bold tw-text-white hover:tw-bg-brand-orange-dark';
const outlineButton =
  'tw-inline-flex tw-h-9 tw-items-center tw-gap-1.5 tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-3 tw-text-xs tw-font-bold hover:tw-bg-brand-sky';

/** Companies: who is the parent company, and opening a menu for one without a purchase. */
function Companies() {
  const toast = useToast();
  const messageBox = useMessageBox();
  const [companies, setCompanies] = useState<AdminCompany[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState('');
  const [search, setSearch] = useState('');
  const [granting, setGranting] = useState<string | null>(null);
  const [grant, setGrant] = useState<{ feature: CompanyFeature; days: string }>({ feature: 'CREATE_LOAD', days: '30' });

  const load = useCallback(() => {
    setFailed(false);
    listCompanies().then(setCompanies, () => setFailed(true));
  }, []);
  useEffect(load, [load]);

  async function toggleParent(company: AdminCompany) {
    const next = !company.isParentCompany;
    const name = company.name || company.mobile || '';
    const confirmed = await messageBox.confirm({
      title: next ? 'شرکت مادر' : 'برداشتن شرکت مادر',
      message: next
        ? `«${name}» شرکت مادر شود؟ همه‌ی بخش‌ها بدون خرید برایش باز می‌شود و بارهایش به همه‌ی رانندگان اعلام می‌شود.`
        : `«${name}» دیگر شرکت مادر نباشد؟ بخش‌های پولی برایش قفل می‌شود مگر بخرد.`,
      confirmText: next ? 'شرکت مادر شود' : 'برداشتن',
      tone: next ? undefined : 'danger',
    });
    if (!confirmed) return;
    setBusy(company.userId);
    try {
      await setParentCompany(company.userId, next);
      setCompanies((current) => current?.map((item) => (item.userId === company.userId ? { ...item, isParentCompany: next } : item)) ?? null);
      toast.success(next ? 'شرکت مادر تعیین شد.' : 'شرکت حمل‌ونقل دیگر مادر نیست.');
    } catch (error) {
      toast.error(adminError(error));
    } finally {
      setBusy('');
    }
  }

  async function submitGrant(event: FormEvent, company: AdminCompany) {
    event.preventDefault();
    const days = Number(digits(grant.days));
    if (!Number.isInteger(days) || days < 1 || days > 3650) return toast.error('تعداد روز باید بین ۱ تا ۳۶۵۰ باشد.');
    setBusy(company.userId);
    try {
      const result = await grantCompanyFeature(company.userId, grant.feature, days);
      toast.success(`«${companyFeatureTitles[grant.feature]}» تا ${faDateTime(result.expireAt)} باز شد.`);
      setGranting(null);
    } catch (error) {
      toast.error(adminError(error));
    } finally {
      setBusy('');
    }
  }

  if (failed) return <LoadFailed onRetry={load} />;
  if (!companies) return <CardSkeleton />;
  const needle = search.trim().replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
  const visible = companies.filter((company) => !needle || `${company.name ?? ''} ${company.mobile ?? ''} ${company.accountCode ?? ''}`.includes(needle));

  return (
    <div className="tw-space-y-3">
      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جستجوی نام، موبایل یا کد شرکت حمل‌ونقل…" aria-label="جستجوی شرکت" className={inputClass} />
      {!visible.length ? (
        <EmptyState icon={Building2} title="شرکت حمل‌ونقلی پیدا نشد" hint="شرکت‌های حمل‌ونقل فعال اینجا فهرست می‌شوند." />
      ) : (
        visible.map((company) => (
          <article key={company.userId} className="tw-space-y-3 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-4">
            <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-2">
              <div className="tw-min-w-0">
                <p className="tw-m-0 tw-flex tw-items-center tw-gap-2 tw-font-bold">
                  {company.name || 'بدون نام'}
                  <AccountCode code={company.accountCode} />
                  {company.isParentCompany && (
                    <span className="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-full tw-bg-emerald-50 tw-px-2 tw-py-0.5 tw-text-xs tw-text-emerald-700">
                      <Crown size={12} aria-hidden /> شرکت مادر
                    </span>
                  )}
                </p>
                {company.mobile && <p dir="ltr" className="tw-m-0 tw-mt-1 tw-text-end tw-text-xs tw-text-brand-muted sm:tw-text-start">{company.mobile}</p>}
              </div>
              <div className="tw-flex tw-flex-wrap tw-gap-2">
                <button type="button" disabled={!!busy} onClick={() => toggleParent(company)} className={cn(outlineButton, company.isParentCompany && 'tw-text-red-700')}>
                  {busy === company.userId ? <LoaderCircle size={14} className="tw-animate-spin" aria-hidden /> : <Crown size={14} aria-hidden />}
                  {company.isParentCompany ? 'برداشتن مادر' : 'شرکت مادر شود'}
                </button>
                {!company.isParentCompany && (
                  <button type="button" disabled={!!busy} onClick={() => setGranting(granting === company.userId ? null : company.userId)} className={outlineButton}>
                    <Gem size={14} aria-hidden /> باز کردن بخش بدون خرید
                  </button>
                )}
              </div>
            </div>
            {granting === company.userId && (
              <form onSubmit={(event) => submitGrant(event, company)} className="tw-flex tw-flex-wrap tw-items-end tw-gap-2 tw-rounded-xl tw-bg-brand-sky tw-p-3">
                <label className="tw-min-w-[10rem] tw-flex-1 tw-space-y-1 tw-text-xs tw-font-bold">
                  بخش
                  <select value={grant.feature} onChange={(event) => setGrant({ ...grant, feature: event.target.value as CompanyFeature })} className={inputClass}>
                    {featureOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="tw-w-28 tw-space-y-1 tw-text-xs tw-font-bold">
                  چند روز
                  <input value={grant.days} onChange={(event) => setGrant({ ...grant, days: event.target.value })} inputMode="numeric" className={inputClass} />
                </label>
                <button type="submit" disabled={!!busy} className={primaryButton}>ثبت</button>
              </form>
            )}
          </article>
        ))
      )}
    </div>
  );
}

/** Prices: a menu with no active plan is free for every company; its first plan locks it for non-parent ones. */
const TIER_PERIODS: Array<[TierMonths, string]> = [[1, '۱ ماهه'], [3, '۳ ماهه'], [6, '۶ ماهه'], [12, '۱ ساله']];

const TIER_BADGE: Record<CompanyTier, string> = {
  BRONZE: 'tw-bg-[#f6e6d8] tw-text-[#8a4b1c]',
  SILVER: 'tw-bg-slate-100 tw-text-slate-700',
  GOLD: 'tw-bg-amber-50 tw-text-amber-800',
};

/** One tier's form: its menus, days, price and whether it is on sale. */
function TierForm({ tier, onSaved }: { tier: CompanyTierPlan; onSaved: (tier: CompanyTierPlan) => void }) {
  const toast = useToast();
  const [form, setForm] = useState({
    features: new Set(tier.features.map((item) => item.feature)),
    // a period left empty is not sold
    prices: Object.fromEntries(TIER_PERIODS.map(([months]) => [months, groupDigits(tier.options.find((item) => item.months === months)?.price ?? '')])) as Record<TierMonths, string>,
    currency: (tier.currency in currencies ? tier.currency : 'IRR') as Currency,
    active: tier.active,
  });
  const [saving, setSaving] = useState(false);

  const toggle = (feature: CompanyFeature) =>
    setForm((current) => {
      const features = new Set(current.features);
      if (features.has(feature)) features.delete(feature);
      else features.add(feature);
      return { ...current, features };
    });

  async function submit(event: FormEvent) {
    event.preventDefault();
    const options = TIER_PERIODS.map(([months]) => ({ months, price: digits(form.prices[months]).replace(/\D/g, '').replace(/^0+(?=\d)/, '') }))
      .filter((option) => option.price && option.price !== '0');
    if (options.some((option) => option.price.length > 18)) return toast.error('مبلغ بیش از حد بزرگ است.');
    if (form.active && (!form.features.size || !options.length)) return toast.error('طرح فعال باید دست‌کم یک بخش و قیمت دست‌کم یک مدت را داشته باشد.');
    setSaving(true);
    try {
      const saved = await updateCompanyTier(tier.tier, {
        features: featureOptions.map(([feature]) => feature).filter((feature) => form.features.has(feature)),
        options,
        currency: form.currency,
        active: form.active,
      });
      onSaved(saved);
      toast.success(`طرح ${tier.title} ذخیره شد.`);
    } catch (error) {
      toast.error(adminError(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="tw-flex tw-flex-col tw-gap-3 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-4" aria-busy={saving}>
      <div className="tw-flex tw-items-center tw-justify-between tw-gap-2">
        <span className={cn('tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-full tw-px-3 tw-py-1 tw-text-sm tw-font-bold', TIER_BADGE[tier.tier])}>
          <Medal size={16} aria-hidden /> طرح {tier.title}
        </span>
        <label className="tw-inline-flex tw-cursor-pointer tw-items-center tw-gap-2 tw-text-xs tw-font-bold">
          <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} className="tw-h-4 tw-w-4 tw-accent-brand-orange" />
          {form.active ? 'در حال فروش' : 'غیرفعال'}
        </label>
      </div>
      <fieldset className="tw-m-0 tw-border-0 tw-p-0">
        <legend className="tw-mb-2 tw-text-xs tw-font-bold">بخش‌های این طرح</legend>
        <div className="tw-grid tw-grid-cols-2 tw-gap-1.5">
          {featureOptions.map(([feature, label]) => (
            <label key={feature} className={cn('tw-flex tw-cursor-pointer tw-items-center tw-gap-2 tw-rounded-lg tw-border tw-px-2.5 tw-py-2 tw-text-sm', form.features.has(feature) ? 'tw-border-brand-orange/50 tw-bg-brand-orange-soft/40' : 'tw-border-brand-line')}>
              <input type="checkbox" checked={form.features.has(feature)} onChange={() => toggle(feature)} className="tw-h-4 tw-w-4 tw-accent-brand-orange" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="tw-m-0 tw-space-y-2 tw-border-0 tw-p-0">
        <legend className="tw-mb-2 tw-text-xs tw-font-bold">قیمت هر مدت (خالی یعنی این مدت فروخته نمی‌شود)</legend>
        {TIER_PERIODS.map(([months, label]) => {
          const value = form.prices[months];
          const amount = digits(value).replace(/\D/g, '');
          return (
            <label key={months} className="tw-grid tw-grid-cols-[4.5rem_1fr] tw-items-center tw-gap-2 tw-text-xs tw-font-bold">
              {label}
              <span>
                <DigitGroupInput
                  value={value}
                  inputMode="numeric"
                  dir="ltr"
                  placeholder="فروخته نمی‌شود"
                  onValueChange={(next) => setForm({ ...form, prices: { ...form.prices, [months]: next } })}
                  className={inputClass}
                />
                {amount && <span className="tw-mt-0.5 tw-block tw-font-normal tw-text-brand-muted">{price(amount, form.currency)}</span>}
              </span>
            </label>
          );
        })}
        <label className="tw-grid tw-grid-cols-[4.5rem_1fr] tw-items-center tw-gap-2 tw-text-xs tw-font-bold">
          واحد پول
          <select value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value as Currency })} className={inputClass}>
            {Object.entries(currencies).map(([code, title]) => <option key={code} value={code}>{title}</option>)}
          </select>
        </label>
      </fieldset>
      <button type="submit" disabled={saving} className={cn(primaryButton, 'tw-mt-auto')}>
        {saving && <LoaderCircle size={16} className="tw-animate-spin" aria-hidden />} ذخیره‌ی طرح {tier.title}
      </button>
    </form>
  );
}

/**
 * The tiers: the menus each opens and its price. A menu in an active tier is locked for the companies that did not
 * buy one with it; a menu in no active tier is free (an invited company's menus stay locked until bought).
 */
function Tiers() {
  const [tiers, setTiers] = useState<CompanyTierPlan[] | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => {
    setFailed(false);
    listCompanyTiers().then(setTiers, () => setFailed(true));
  }, []);
  useEffect(load, [load]);

  if (failed) return <LoadFailed onRetry={load} />;
  if (!tiers) return <CardSkeleton />;
  return (
    <div className="tw-space-y-3">
      <p className="tw-m-0 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-4 tw-text-sm tw-leading-7 tw-text-brand-muted">
        شرکت‌های حمل‌ونقل یکی از این طرح‌ها را می‌خرند و همه‌ی بخش‌های آن برای مدت طرح باز می‌شود. بخشی که در هیچ طرح فعالی نباشد برای
        شرکت‌های عادی رایگان است؛ شرکتی که با دعوت شرکت مادر آمده همه‌ی بخش‌ها را باید بخرد.
      </p>
      <div className="tw-grid tw-gap-3 lg:tw-grid-cols-3">
        {tiers.map((tier) => (
          <TierForm key={tier.tier} tier={tier} onSaved={(saved) => setTiers((current) => current?.map((item) => (item.tier === saved.tier ? saved : item)) ?? null)} />
        ))}
      </div>
    </div>
  );
}

function Plans() {
  const toast = useToast();
  const messageBox = useMessageBox();
  const [plans, setPlans] = useState<CompanyFeaturePlan[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ feature: 'CREATE_LOAD' as CompanyFeature, title: '', durationDays: '30', price: '', currency: 'IRR' as Currency });

  const load = useCallback(() => {
    setFailed(false);
    listFeaturePlans().then(setPlans, () => setFailed(true));
  }, []);
  useEffect(load, [load]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const durationDays = Number(digits(form.durationDays));
    const amount = digits(form.price).replace(/\D/g, '').replace(/^0+(?=\d)/, '');
    if (!form.title.trim() || !Number.isInteger(durationDays) || durationDays < 1 || durationDays > 3650 || !/^\d{1,18}$/.test(amount)) {
      return toast.error('عنوان، مدت بین ۱ تا ۳۶۵۰ روز و مبلغ صحیح را وارد کنید.');
    }
    if (!plans?.some((plan) => plan.feature === form.feature)) {
      const confirmed = await messageBox.confirm({
        title: 'قفل شدن بخش',
        message: `«${companyFeatureTitles[form.feature]}» تا الان رایگان بوده؛ با این پلن برای شرکت‌های غیرمادری که نخریده‌اند قفل می‌شود. ادامه می‌دهید؟`,
        confirmText: 'ثبت پلن',
      });
      if (!confirmed) return;
    }
    setSaving(true);
    try {
      await createFeaturePlan({ feature: form.feature, title: form.title.trim(), durationDays, price: amount, currency: form.currency, sortOrder: 0 });
      setForm({ ...form, title: '', price: '' });
      toast.success('پلن ثبت شد.');
      load();
    } catch (error) {
      toast.error(adminError(error));
    } finally {
      setSaving(false);
    }
  }

  async function remove(plan: CompanyFeaturePlan) {
    const last = plans?.filter((item) => item.feature === plan.feature).length === 1;
    const confirmed = await messageBox.confirm({
      message: `پلن «${plan.title}» حذف شود؟${last ? ` آخرین پلن «${companyFeatureTitles[plan.feature]}» است و این بخش برای همه رایگان می‌شود.` : ''}`,
      tone: 'danger',
      confirmText: 'حذف',
    });
    if (!confirmed) return;
    try {
      await deleteFeaturePlan(plan.id);
      setPlans((current) => current?.filter((item) => item.id !== plan.id) ?? null);
      toast.success('پلن حذف شد.');
    } catch (error) {
      toast.error(adminError(error));
    }
  }

  return (
    <div className="tw-space-y-4">
      <p className="tw-m-0 tw-rounded-2xl tw-border tw-border-amber-200 tw-bg-amber-50 tw-p-4 tw-text-sm tw-leading-7 tw-text-amber-900">
        خرید بخش‌به‌بخش فعلاً غیرفعال است و شرکت‌ها از «طرح‌ها» می‌خرند. پلن‌های اینجا پاک نشده‌اند ولی تا روشن شدن دوباره‌ی آن
        (COMPANY_MENU_PURCHASE=on در سرور) فروخته نمی‌شوند و چیزی را قفل نمی‌کنند.
      </p>
      <form onSubmit={submit} className="tw-grid tw-gap-3 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-4 sm:tw-grid-cols-2 lg:tw-grid-cols-5" aria-busy={saving}>
        <label className="tw-space-y-1 tw-text-xs tw-font-bold">
          بخش
          <select value={form.feature} onChange={(event) => setForm({ ...form, feature: event.target.value as CompanyFeature })} className={inputClass}>
            {featureOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="tw-space-y-1 tw-text-xs tw-font-bold">
          عنوان پلن
          <input value={form.title} maxLength={150} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="مثلاً یک‌ماهه" className={inputClass} />
        </label>
        <label className="tw-space-y-1 tw-text-xs tw-font-bold">
          مدت (روز)
          <input value={form.durationDays} inputMode="numeric" onChange={(event) => setForm({ ...form, durationDays: event.target.value })} className={inputClass} />
        </label>
        <label className="tw-space-y-1 tw-text-xs tw-font-bold">
          مبلغ
          <DigitGroupInput value={form.price} inputMode="numeric" dir="ltr" onValueChange={(price) => setForm({ ...form, price })} className={inputClass} />
        </label>
        <label className="tw-space-y-1 tw-text-xs tw-font-bold">
          واحد پول
          <select value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value as Currency })} className={inputClass}>
            {Object.entries(currencies).map(([code, title]) => <option key={code} value={code}>{title}</option>)}
          </select>
        </label>
        <button type="submit" disabled={saving} className={cn(primaryButton, 'sm:tw-col-span-2 lg:tw-col-span-5')}>
          {saving && <LoaderCircle size={16} className="tw-animate-spin" aria-hidden />} ثبت پلن
        </button>
      </form>

      {failed ? (
        <LoadFailed onRetry={load} />
      ) : !plans ? (
        <CardSkeleton />
      ) : (
        <div className="tw-grid tw-gap-3 sm:tw-grid-cols-2">
          {featureOptions.map(([feature, label]) => {
            const own = plans.filter((plan) => plan.feature === feature);
            return (
              <section key={feature} className="tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-4">
                <div className="tw-flex tw-items-center tw-justify-between tw-gap-2">
                  <strong>{label}</strong>
                  <span className={cn('tw-rounded-full tw-px-2 tw-py-0.5 tw-text-xs', own.length ? 'tw-bg-brand-orange-soft tw-text-brand-orange-ink' : 'tw-bg-emerald-50 tw-text-emerald-700')}>
                    {own.length ? 'پولی' : 'رایگان'}
                  </span>
                </div>
                {own.map((plan) => (
                  <div key={plan.id} className="tw-mt-2 tw-flex tw-items-center tw-justify-between tw-gap-2 tw-border-t tw-border-brand-line tw-pt-2 tw-text-sm">
                    <span>
                      {plan.title} · {faNumber(plan.durationDays)} روز · <strong>{price(plan.price, plan.currency)}</strong>
                    </span>
                    <button type="button" onClick={() => remove(plan)} className={cn(outlineButton, 'tw-text-red-700')} aria-label={`حذف ${plan.title}`}>
                      حذف
                    </button>
                  </div>
                ))}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OrderPhoto({ order, unlock, onLocked }: { order: CompanyFeatureOrder; unlock: ReceiptUnlock | null; onLocked: () => void }) {
  const [src, setSrc] = useState('');
  const [failed, setFailed] = useState(false);
  const token = unlock?.token;
  useEffect(() => {
    setSrc('');
    setFailed(false);
    if (!token) return;
    let url = '';
    let active = true;
    featureReceiptImage(order.id, token)
      .then((value) => {
        url = value;
        if (active) setSrc(value);
        else URL.revokeObjectURL(value);
      })
      .catch((error) => {
        if (!active) return;
        // the unlock ran out: ask for the password again
        if ((error as { response?: { status?: number } }).response?.status === 403) onLocked();
        else setFailed(true);
      });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [order.id, token, onLocked]);

  const box = 'tw-flex tw-h-48 tw-w-full tw-shrink-0 tw-items-center tw-justify-center tw-overflow-hidden tw-rounded-xl tw-bg-slate-100 sm:tw-w-40';
  if (!token) return <div className={cn(box, 'tw-flex-col tw-gap-2 tw-text-xs tw-text-slate-500')}><Lock size={22} aria-hidden />عکس قفل است</div>;
  if (failed) return <div className={cn(box, 'tw-flex-col tw-gap-2 tw-text-xs tw-text-slate-500')}><ImageOff size={22} aria-hidden />عکس پیدا نشد</div>;
  if (!src) return <div className={cn(box, 'tw-animate-pulse')} aria-hidden />;
  return (
    <a href={src} target="_blank" rel="noreferrer" className={box} title="نمایش عکس در اندازه‌ی کامل">
      <img src={src} alt={`رسید ${order.company ?? ''}`} className="tw-h-full tw-w-full tw-object-cover" />
    </a>
  );
}

function OrderCard({ order, unlock, onLocked, onDone }: { order: CompanyFeatureOrder; unlock: ReceiptUnlock | null; onLocked: () => void; onDone: () => void }) {
  const toast = useToast();
  const messageBox = useMessageBox();
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  async function approve() {
    const confirmed = await messageBox.confirm({
      title: 'تأیید پرداخت',
      message: `«${order.title}» به مدت ${faNumber(order.durationDays)} روز برای ${order.company ?? order.mobile ?? ''} باز شود؟`,
      confirmText: 'تأیید و باز کردن',
    });
    if (!confirmed) return;
    setBusy(true);
    try {
      const result = await approveFeatureOrder(order.id);
      toast.success(`«${order.title}» تا ${faDateTime(result.expireAt)} باز شد.`);
      onDone();
    } catch (error) {
      toast.error(adminError(error));
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    if (!reason.trim()) return;
    setBusy(true);
    try {
      await rejectFeatureOrder(order.id, reason.trim());
      toast.success('رسید رد شد؛ دلیلش در صفحه‌ی خرید شرکت حمل‌ونقل دیده می‌شود.');
      onDone();
    } catch (error) {
      toast.error(adminError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="tw-flex tw-flex-col tw-gap-4 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-4 sm:tw-flex-row">
      <OrderPhoto order={order} unlock={unlock} onLocked={onLocked} />
      <div className="tw-flex tw-min-w-0 tw-flex-1 tw-flex-col tw-gap-3">
        <div className="tw-flex tw-flex-wrap tw-items-start tw-justify-between tw-gap-2">
          <div>
            <h3 className="tw-m-0 tw-text-base tw-font-bold">{order.title} · {faNumber(order.durationDays)} روز</h3>
            {order.tier && order.features?.length ? (
              <p className="tw-m-0 tw-mt-1 tw-text-xs tw-text-brand-muted">بخش‌ها: {order.features.map((feature) => companyFeatureTitles[feature]).join('، ')}</p>
            ) : null}
            <p className="tw-m-0 tw-mt-1 tw-text-sm tw-text-brand-muted">
              {order.company ?? 'شرکت حمل‌ونقل'} {order.mobile && <span dir="ltr">({order.mobile})</span>} <AccountCode code={order.accountCode} /> · {faDateTime(order.createdAt)}
            </p>
          </div>
          <span className="tw-rounded-full tw-bg-brand-orange-soft tw-px-2.5 tw-py-0.5 tw-text-sm tw-font-bold tw-text-brand-orange-ink">{price(order.amount, order.currency)}</span>
        </div>
        {order.status === 'REJECTED' && order.rejectionReason && (
          <p className="tw-m-0 tw-rounded-lg tw-bg-red-50 tw-px-3 tw-py-2 tw-text-sm tw-text-red-700">دلیل رد: {order.rejectionReason}</p>
        )}
        {order.status === 'APPROVED' && order.reviewedAt && (
          <p className="tw-m-0 tw-flex tw-items-center tw-gap-1.5 tw-text-sm tw-text-emerald-700">
            <CircleCheck size={16} aria-hidden /> تأیید شد · {faDateTime(order.reviewedAt)}
          </p>
        )}
        {order.status === 'RECEIPT_SUBMITTED' && (
          <div className="tw-mt-auto tw-space-y-2">
            {rejecting && (
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={500}
                rows={2}
                autoFocus
                placeholder="دلیل رد، مثلاً: مبلغ واریزی با پلن یکی نیست."
                className="tw-w-full tw-resize-none tw-rounded-xl tw-border tw-border-brand-line tw-p-3 tw-text-sm tw-outline-none tw-transition-colors focus:tw-border-red-300"
              />
            )}
            <div className="tw-flex tw-flex-wrap tw-gap-2">
              {rejecting ? (
                <>
                  <button type="button" onClick={reject} disabled={busy || !reason.trim()} className="tw-inline-flex tw-h-10 tw-items-center tw-gap-1.5 tw-rounded-xl tw-border-0 tw-bg-red-600 tw-px-4 tw-text-sm tw-font-bold tw-text-white">
                    <CircleX size={16} aria-hidden /> ثبت رد
                  </button>
                  <button type="button" onClick={() => setRejecting(false)} disabled={busy} className={outlineButton}>انصراف</button>
                </>
              ) : (
                <>
                  <button type="button" onClick={approve} disabled={busy} className="tw-inline-flex tw-h-10 tw-items-center tw-gap-1.5 tw-rounded-xl tw-border-0 tw-bg-emerald-600 tw-px-4 tw-text-sm tw-font-bold tw-text-white">
                    {busy ? <LoaderCircle size={16} className="tw-animate-spin" aria-hidden /> : <CircleCheck size={16} aria-hidden />} تأیید پرداخت
                  </button>
                  <button type="button" onClick={() => setRejecting(true)} disabled={busy} className="tw-inline-flex tw-h-10 tw-items-center tw-gap-1.5 tw-rounded-xl tw-border tw-border-red-200 tw-bg-white tw-px-4 tw-text-sm tw-font-bold tw-text-red-700">
                    <CircleX size={16} aria-hidden /> رد رسید
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function Orders() {
  const [tab, setTab] = useState<OrderTab>('review');
  const [orders, setOrders] = useState<CompanyFeatureOrder[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [unlock, setUnlock] = useState<ReceiptUnlock | null>(null);
  const lock = useCallback(() => setUnlock(null), []);

  // the server forgets the token after 15 minutes; the page locks itself at the same moment
  useEffect(() => {
    if (!unlock) return;
    const timer = setTimeout(lock, Math.max(0, new Date(unlock.expiresAt).getTime() - Date.now()));
    return () => clearTimeout(timer);
  }, [unlock, lock]);

  const load = useCallback(() => {
    setFailed(false);
    listFeatureOrders(tab === 'review' ? undefined : tab).then(setOrders, () => setFailed(true));
  }, [tab]);
  useEffect(() => {
    setOrders(null);
    load();
  }, [load]);

  // a company sent a receipt (web, bots or WhatsApp) while the page is open
  const toast = useToast();
  useNotificationEvent('company-feature-receipt', () => {
    toast.info('رسید خرید امکانات تازه رسید.');
    if (tab === 'review') load();
  });

  return (
    <div className="tw-space-y-4">
      <Segmented value={tab} onChange={setTab} options={orderTabs} label="وضعیت رسیدها" />
      <UnlockPanel unlock={unlock} onUnlock={setUnlock} onLock={lock} />
      {failed ? (
        <LoadFailed onRetry={load} />
      ) : !orders ? (
        <CardSkeleton />
      ) : !orders.length ? (
        <EmptyState icon={Inbox} title={tab === 'review' ? 'رسیدی منتظر بررسی نیست' : 'موردی نیست'} hint="رسیدهای خرید بخش‌های پنل شرکت‌ها اینجا می‌آیند." />
      ) : (
        <div className="tw-space-y-3">
          {orders.map((order) => <OrderCard key={order.id} order={order} unlock={unlock} onLocked={lock} onDone={load} />)}
        </div>
      )}
    </div>
  );
}

function CompanyFeaturesContent() {
  const [section, setSection] = useState<Section>('companies');
  return (
    <PageContainer title="امکانات شرکت‌های حمل‌ونقل" description="شرکت مادر، قیمت بخش‌های پنل شرکت حمل‌ونقل و رسیدهای خرید آن‌ها">
      <main dir="rtl" lang="fa" className="tw-mx-auto tw-max-w-5xl tw-space-y-5 tw-p-4 tw-text-brand-navy">
        <div>
          <h1 className="tw-m-0 tw-text-2xl tw-font-bold">امکانات شرکت‌های حمل‌ونقل</h1>
          <p className="tw-m-0 tw-mt-1 tw-text-sm tw-text-brand-muted">
            شرکت مادر همه‌ی بخش‌ها را بدون خرید دارد. بقیه‌ی شرکت‌های حمل‌ونقل یکی از طرح‌های برنزی، نقره‌ای یا طلایی را می‌خرند؛ بخشی که در هیچ طرح فعالی نیست برای شرکت‌های عادی رایگان است.
          </p>
        </div>
        <Segmented value={section} onChange={setSection} options={sections} label="بخش" />
        {section === 'companies' ? <Companies /> : section === 'tiers' ? <Tiers /> : section === 'plans' ? <Plans /> : <Orders />}
      </main>
    </PageContainer>
  );
}

export default function CompanyFeaturesAdmin() {
  return (
    <AdminGate>
      <CompanyFeaturesContent />
    </AdminGate>
  );
}
