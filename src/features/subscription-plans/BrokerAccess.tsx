import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { CircleCheck, CircleX, Clock, Gift, Handshake, ImageOff, Inbox, LoaderCircle, Lock, Receipt, Search, Settings } from 'lucide-react';
import PageContainer from 'src/shared/components/container/PageContainer';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { useMessageBox } from 'src/shared/components/message-box/MessageBoxProvider';
import { cn } from 'src/shared/utils/utils';
import { CardSkeleton, EmptyState, LoadFailed, Segmented } from 'src/features/company-cargo/components';
import { useNotificationEvent } from 'src/features/company-cargo/notificationSocket';
import AccountCode from 'src/shared/components/account-code/AccountCode';
import AdminGate from './AdminGate';
import { UnlockPanel } from './SubscriptionOrders';
import { currencies, type Currency } from './currencies';
import {
  adminError,
  approveBrokerOrder,
  brokerReceiptImage,
  getBrokerPolicy,
  grantBrokerRequests,
  listBrokerOrders,
  listBrokers,
  rejectBrokerOrder,
  saveBrokerPolicy,
  type AdminBroker,
  type BrokerAccessOrder,
  type BrokerAccessPolicy,
  type ReceiptUnlock,
} from './adminApi';

type Section = 'settings' | 'brokers' | 'orders';
type OrderTab = 'review' | 'APPROVED' | 'REJECTED';

const sections = [
  { value: 'settings' as const, label: 'تنظیمات', icon: Settings },
  { value: 'brokers' as const, label: 'واسط‌ها', icon: Handshake },
  { value: 'orders' as const, label: 'رسیدها', icon: Receipt },
];
const orderTabs = [
  { value: 'review' as const, label: 'منتظر بررسی', icon: Clock },
  { value: 'APPROVED' as const, label: 'تأییدشده', icon: CircleCheck },
  { value: 'REJECTED' as const, label: 'ردشده', icon: CircleX },
];

const faNumber = (value: number | string) => Number(value).toLocaleString('fa-IR');
const faDateTime = (value: string) => new Date(value).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' });
const latin = (value: string) =>
  value.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
// «100,000» or «۱۰۰٬۰۰۰» → «100000»
const onlyDigits = (value: string) => latin(value).replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '');
const grouped = (value: string) => (value ? Number(value).toLocaleString('fa-IR') : '');
const price = (amount: string, currency: string) => `${faNumber(amount)} ${currencies[currency as Currency] ?? currency}`;

const inputClass =
  'tw-h-10 tw-w-full tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-3 tw-text-sm tw-text-brand-navy tw-outline-none tw-transition-colors placeholder:tw-text-brand-muted/70 focus:tw-border-brand-orange';
const primaryButton =
  'tw-inline-flex tw-h-10 tw-items-center tw-justify-center tw-gap-1.5 tw-rounded-xl tw-border-0 tw-bg-brand-orange tw-px-4 tw-text-sm tw-font-bold tw-text-white hover:tw-bg-brand-orange-dark';
const outlineButton =
  'tw-inline-flex tw-h-9 tw-items-center tw-gap-1.5 tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-3 tw-text-xs tw-font-bold hover:tw-bg-brand-sky';

interface Form {
  /** empty: every company */
  maxCompanies: string;
  packagesEnabled: boolean;
  packageSize: string;
  packagePrice: string;
  currency: string;
}

const toForm = (policy: BrokerAccessPolicy): Form => ({
  maxCompanies: policy.maxCompanies === null ? '' : String(policy.maxCompanies),
  packagesEnabled: policy.packagesEnabled,
  packageSize: String(policy.packageSize),
  packagePrice: policy.packagePrice,
  currency: policy.currency,
});

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn('tw-relative tw-mt-1 tw-h-7 tw-w-12 tw-shrink-0 tw-rounded-full tw-border-0 tw-transition-colors', checked ? 'tw-bg-brand-orange' : 'tw-bg-slate-300')}
    >
      <span className={cn('tw-absolute tw-top-1 tw-h-5 tw-w-5 tw-rounded-full tw-bg-white tw-shadow tw-transition-all', checked ? 'tw-right-1' : 'tw-right-6')} />
    </button>
  );
}

/** The broker's rules: how many companies it may pick (empty: all), and the packages of load requests it buys. */
function PolicyForm() {
  const toast = useToast();
  const [form, setForm] = useState<Form | null>(null);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    getBrokerPolicy().then((policy) => setForm(toForm(policy)), () => setFailed(true));
  }, []);
  useEffect(load, [load]);

  if (failed) return <LoadFailed onRetry={load} />;
  if (!form) return <CardSkeleton />;

  const maxCompanies = form.maxCompanies ? Number(form.maxCompanies) : null;
  const size = Number(form.packageSize);
  const valid =
    (maxCompanies === null || (maxCompanies >= 1 && maxCompanies <= 1000)) &&
    Number.isInteger(size) && size >= 1 && size <= 100_000 &&
    (!form.packagesEnabled || (!!form.packagePrice && form.packagePrice !== '0'));
  const set = (patch: Partial<Form>) => setForm({ ...form, ...patch });

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form || !valid || saving) return;
    setSaving(true);
    try {
      const saved = await saveBrokerPolicy({
        maxCompanies,
        packagesEnabled: form.packagesEnabled,
        packageSize: size,
        packagePrice: form.packagePrice || '0',
        currency: form.currency,
      });
      setForm(toForm(saved));
      toast.success('تنظیمات واسط ذخیره شد.');
    } catch (error) {
      toast.error(adminError(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="tw-space-y-6 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-5">
      <section className="tw-space-y-3">
        <h3 className="tw-m-0 tw-text-base tw-font-bold">شرکت‌ها</h3>
        <label className="tw-block tw-max-w-xs tw-space-y-1.5 tw-text-sm tw-font-bold">
          <span>سقف شرکت‌هایی که واسط انتخاب می‌کند</span>
          <input className={inputClass} inputMode="numeric" dir="ltr" placeholder="خالی: همه‌ی شرکت‌ها" value={form.maxCompanies} onChange={(event) => set({ maxCompanies: onlyDigits(event.target.value).slice(0, 4) })} />
        </label>
        <p className="tw-m-0 tw-text-sm tw-leading-7 tw-text-brand-muted">
          {maxCompanies === null
            ? 'خالی است: هر واسط بار همه‌ی شرکت‌ها را می‌بیند.'
            : `هر واسط خودش تا ${faNumber(maxCompanies)} شرکت انتخاب می‌کند و فقط بار همان‌ها را می‌بیند؛ هر وقت بخواهد عوضشان می‌کند.`}
        </p>
      </section>

      <section className="tw-space-y-3 tw-border-t tw-border-brand-line tw-pt-5">
        <label className="tw-flex tw-cursor-pointer tw-items-start tw-justify-between tw-gap-4">
          <span>
            <span className="tw-block tw-text-base tw-font-bold">خرید بسته‌ی درخواست بار</span>
            <span className="tw-mt-1 tw-block tw-text-sm tw-leading-6 tw-text-brand-muted">
              روشن: واسط برای درخواست بار بسته می‌خرد و هر درخواست یکی از آن کم می‌کند. خاموش: درخواست بار رایگان است.
            </span>
          </span>
          <Switch checked={form.packagesEnabled} onChange={(value) => set({ packagesEnabled: value })} label="خرید بسته‌ی درخواست بار" />
        </label>
        <div className="tw-grid tw-gap-4 sm:tw-grid-cols-3">
          <label className="tw-space-y-1.5 tw-text-sm tw-font-bold">
            <span>درخواست در هر بسته</span>
            <input className={inputClass} inputMode="numeric" dir="ltr" value={form.packageSize} onChange={(event) => set({ packageSize: onlyDigits(event.target.value).slice(0, 6) })} />
          </label>
          <label className="tw-space-y-1.5 tw-text-sm tw-font-bold">
            <span>قیمت هر بسته</span>
            <input className={inputClass} inputMode="numeric" dir="ltr" value={grouped(form.packagePrice)} onChange={(event) => set({ packagePrice: onlyDigits(event.target.value).slice(0, 18) })} />
          </label>
          <label className="tw-space-y-1.5 tw-text-sm tw-font-bold">
            <span>واحد پول</span>
            <select className={inputClass} value={form.currency} onChange={(event) => set({ currency: event.target.value })}>
              {Object.entries(currencies).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        {form.packagesEnabled && valid && (
          <p className="tw-m-0 tw-rounded-xl tw-bg-brand-sky tw-px-4 tw-py-3 tw-text-sm tw-leading-7">
            هر بسته {faNumber(size)} درخواست بار به {price(form.packagePrice, form.currency)}؛ مثلاً ۳ بسته {faNumber(size * 3)} درخواست به{' '}
            {price((BigInt(form.packagePrice) * 3n).toString(), form.currency)}. بسته زمان ندارد.
          </p>
        )}
      </section>

      <button type="submit" disabled={!valid || saving} className={primaryButton}>
        {saving && <LoaderCircle size={16} className="tw-animate-spin" aria-hidden />} ذخیره
      </button>
    </form>
  );
}

/** Load requests given to one broker without a purchase. */
function GrantForm({ broker, onDone, onCancel }: { broker: AdminBroker; onDone: () => void; onCancel: () => void }) {
  const toast = useToast();
  const [requests, setRequests] = useState('50');
  const [busy, setBusy] = useState(false);
  const count = Number(requests);
  const valid = Number.isInteger(count) && count >= 1 && count <= 100_000;

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    try {
      const result = await grantBrokerRequests(broker.userId, count);
      toast.success(`${faNumber(count)} درخواست به ${broker.name ?? broker.mobile ?? 'واسط'} داده شد؛ الان ${faNumber(result.remaining)} درخواست دارد.`);
      onDone();
    } catch (error) {
      toast.error(adminError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tw-mt-3 tw-flex tw-flex-wrap tw-items-end tw-gap-2 tw-rounded-xl tw-bg-brand-sky/50 tw-p-3">
      <label className="tw-w-32 tw-space-y-1 tw-text-xs tw-font-bold">
        <span>تعداد</span>
        <input className={inputClass} inputMode="numeric" dir="ltr" value={requests} onChange={(event) => setRequests(onlyDigits(event.target.value).slice(0, 6))} />
      </label>
      <button type="button" onClick={submit} disabled={!valid || busy} className={primaryButton}>
        {busy ? <LoaderCircle size={16} className="tw-animate-spin" aria-hidden /> : <Gift size={16} aria-hidden />} دادن بدون خرید
      </button>
      <button type="button" onClick={onCancel} disabled={busy} className={outlineButton}>انصراف</button>
    </div>
  );
}

/** The brokers, with their companies picked and requests left; the admin can give one requests without a purchase. */
function Brokers() {
  const [brokers, setBrokers] = useState<AdminBroker[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState('');
  const [granting, setGranting] = useState<string | null>(null);

  const load = useCallback(() => {
    setFailed(false);
    listBrokers().then(setBrokers, () => setFailed(true));
  }, []);
  useEffect(load, [load]);

  if (failed) return <LoadFailed onRetry={load} />;
  if (!brokers) return <CardSkeleton />;
  const words = latin(search.trim());
  const shown = brokers.filter((broker) => !words || [broker.name, broker.mobile, broker.accountCode].some((value) => value?.includes(words)));

  return (
    <div className="tw-space-y-3">
      <label className="tw-flex tw-h-10 tw-items-center tw-gap-2 tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-3">
        <Search size={16} className="tw-text-brand-muted" aria-hidden />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جستجوی نام، موبایل یا کد حساب" className="tw-h-full tw-min-w-0 tw-flex-1 tw-border-0 tw-bg-transparent tw-text-sm tw-outline-none" />
      </label>
      {!shown.length ? (
        <EmptyState icon={Handshake} title="واسطی پیدا نشد" hint="واسط‌هایی که ثبت‌نام کرده‌اند اینجا می‌آیند." />
      ) : (
        shown.map((broker) => (
          <article key={broker.userId} className="tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-4">
            <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-2">
              <div className="tw-min-w-0">
                <p className="tw-m-0 tw-font-bold">
                  {broker.name || 'واسط'} {broker.mobile && <span dir="ltr" className="tw-text-sm tw-font-normal tw-text-brand-muted">({broker.mobile})</span>} <AccountCode code={broker.accountCode} />
                </p>
                <p className="tw-m-0 tw-mt-1 tw-text-xs tw-font-bold tw-text-brand-muted">
                  <span className={broker.remaining ? 'tw-text-emerald-700' : undefined}>{faNumber(broker.remaining)} درخواست مانده</span>
                  {' · '}
                  {broker.companies ? `${faNumber(broker.companies)} شرکت انتخاب‌شده` : 'شرکتی انتخاب نکرده'}
                </p>
              </div>
              {granting !== broker.userId && (
                <button type="button" onClick={() => setGranting(broker.userId)} className={outlineButton}>
                  <Gift size={14} aria-hidden /> درخواست بدون خرید
                </button>
              )}
            </div>
            {granting === broker.userId && (
              <GrantForm
                broker={broker}
                onCancel={() => setGranting(null)}
                onDone={() => {
                  setGranting(null);
                  load();
                }}
              />
            )}
          </article>
        ))
      )}
    </div>
  );
}

function OrderPhoto({ order, unlock, onLocked }: { order: BrokerAccessOrder; unlock: ReceiptUnlock | null; onLocked: () => void }) {
  const [src, setSrc] = useState('');
  const [failed, setFailed] = useState(false);
  const token = unlock?.token;
  useEffect(() => {
    setSrc('');
    setFailed(false);
    if (!token) return;
    let url = '';
    let active = true;
    brokerReceiptImage(order.id, token)
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
      <img src={src} alt={`رسید ${order.broker ?? ''}`} className="tw-h-full tw-w-full tw-object-cover" />
    </a>
  );
}

function OrderCard({ order, unlock, onLocked, onDone }: { order: BrokerAccessOrder; unlock: ReceiptUnlock | null; onLocked: () => void; onDone: () => void }) {
  const toast = useToast();
  const messageBox = useMessageBox();
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const what = order.title;

  async function approve() {
    const confirmed = await messageBox.confirm({
      title: 'تأیید پرداخت',
      message: order.kind === 'PACKAGE' ? `${faNumber(order.requests ?? 0)} درخواست بار به ${order.broker ?? order.mobile ?? ''} اضافه شود؟` : `بار ${faNumber(order.companies.length)} شرکت برای ${order.broker ?? order.mobile ?? ''} باز شود؟`,
      confirmText: 'تأیید و باز کردن',
    });
    if (!confirmed) return;
    setBusy(true);
    try {
      const result = await approveBrokerOrder(order.id);
      toast.success(`تأیید شد؛ واسط الان ${faNumber(result.remaining)} درخواست دارد.`);
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
      await rejectBrokerOrder(order.id, reason.trim());
      toast.success('رسید رد شد؛ دلیلش به واسط اعلام می‌شود.');
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
            <h3 className="tw-m-0 tw-text-base tw-font-bold">{what}</h3>
            <p className="tw-m-0 tw-mt-1 tw-text-sm tw-text-brand-muted">
              {order.broker ?? 'واسط'} {order.mobile && <span dir="ltr">({order.mobile})</span>} <AccountCode code={order.accountCode} /> · {faDateTime(order.createdAt)}
            </p>
          </div>
          <span className="tw-rounded-full tw-bg-brand-orange-soft tw-px-2.5 tw-py-0.5 tw-text-sm tw-font-bold tw-text-brand-orange-ink">{price(order.amount, order.currency)}</span>
        </div>
        {order.companies.length > 0 && <p className="tw-m-0 tw-text-sm tw-leading-7">{order.companies.map((company) => company.name).join('، ')}</p>}
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
                placeholder="دلیل رد، مثلاً: مبلغ واریزی با مبلغ خرید یکی نیست."
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
  const [orders, setOrders] = useState<BrokerAccessOrder[] | null>(null);
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
    listBrokerOrders(tab === 'review' ? undefined : tab).then(setOrders, () => setFailed(true));
  }, [tab]);
  useEffect(() => {
    setOrders(null);
    load();
  }, [load]);

  // a broker sent a receipt (web, bots or WhatsApp) while the page is open
  const toast = useToast();
  useNotificationEvent('broker-access-receipt', () => {
    toast.info('رسید تازه‌ی واسط رسید.');
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
        <EmptyState icon={Inbox} title={tab === 'review' ? 'رسیدی منتظر بررسی نیست' : 'موردی نیست'} hint="رسیدهای خرید بسته‌ی درخواست توسط واسط‌ها اینجا می‌آیند." />
      ) : (
        <div className="tw-space-y-3">
          {orders.map((order) => <OrderCard key={order.id} order={order} unlock={unlock} onLocked={lock} onDone={load} />)}
        </div>
      )}
    </div>
  );
}

function BrokerAccessContent() {
  const [section, setSection] = useState<Section>('settings');
  return (
    <PageContainer title="واسط" description="سقف شرکت و بسته‌ی درخواست بار واسط و رسیدهای آن">
      <main dir="rtl" lang="fa" className="tw-mx-auto tw-max-w-5xl tw-space-y-5 tw-p-4 tw-text-brand-navy">
        <div>
          <h1 className="tw-m-0 tw-text-2xl tw-font-bold">واسط</h1>
          <p className="tw-m-0 tw-mt-1 tw-text-sm tw-text-brand-muted">
            واسط برای درخواست بار بسته می‌خرد و (اگر سقف شرکت تعیین شده باشد) شرکت‌هایش را خودش انتخاب می‌کند؛ رسیدها اینجا بررسی می‌شوند.
          </p>
        </div>
        <Segmented value={section} onChange={setSection} options={sections} label="بخش" />
        {section === 'settings' ? <PolicyForm /> : section === 'brokers' ? <Brokers /> : <Orders />}
      </main>
    </PageContainer>
  );
}

export default function BrokerAccessAdmin() {
  return (
    <AdminGate>
      <BrokerAccessContent />
    </AdminGate>
  );
}
