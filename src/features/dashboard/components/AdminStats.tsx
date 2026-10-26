import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownToLine, ArrowUpFromLine, Building2, CalendarClock, Crown, MapPin, Medal, Package, Receipt, RefreshCw, Truck, Wallet } from 'lucide-react';
import { cn } from 'src/shared/utils/utils';
import { Segmented } from 'src/features/company-cargo/components';
import { useNotificationEvent } from 'src/features/company-cargo/notificationSocket';
import { getAdminStats, type AdminStats as Stats, type LoadTotals, type TripTypeKey } from 'src/features/subscription-plans/adminApi';

const PERIODS = [
  { value: '30', label: '۱ ماه', icon: CalendarClock },
  { value: '90', label: '۳ ماه', icon: CalendarClock },
  { value: '180', label: '۶ ماه', icon: CalendarClock },
  { value: '365', label: '۱ سال', icon: CalendarClock },
] as const;
type Period = (typeof PERIODS)[number]['value'];

const fa = (value: number | string) => Number(value).toLocaleString('fa-IR');
const faDate = (iso: string) => new Date(iso).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
// big amounts read better in tomans («۱۲٫۵ میلیون تومان»); the exact rial figure stays in the title
function toman(rials: string): string {
  const value = Number(rials) / 10;
  if (value >= 1e9) return `${(value / 1e9).toLocaleString('fa-IR', { maximumFractionDigits: 2 })} میلیارد تومان`;
  if (value >= 1e6) return `${(value / 1e6).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} میلیون تومان`;
  return `${fa(value)} تومان`;
}

function Tile({ icon: Icon, label, value, hint, accent, children }: { icon: typeof Truck; label: string; value: string; hint?: ReactNode; accent?: boolean; children?: ReactNode }) {
  return (
    <div className={cn('tw-flex tw-flex-col tw-gap-3 tw-rounded-2xl tw-border tw-p-5', accent ? 'tw-border-transparent tw-bg-brand-navy tw-text-white' : 'tw-border-brand-line tw-bg-white')}>
      <div className="tw-flex tw-items-center tw-justify-between tw-gap-2">
        <span className={cn('tw-text-sm', accent ? 'tw-text-white/70' : 'tw-text-brand-muted')}>{label}</span>
        <span className={cn('tw-flex tw-h-9 tw-w-9 tw-items-center tw-justify-center tw-rounded-xl', accent ? 'tw-bg-white/10 tw-text-brand-orange' : 'tw-bg-brand-orange-soft tw-text-brand-orange-ink')}>
          <Icon size={18} aria-hidden />
        </span>
      </div>
      <strong className="tw-text-2xl tw-font-bold tw-leading-tight">{value}</strong>
      {hint && <span className={cn('tw-text-xs', accent ? 'tw-text-white/60' : 'tw-text-brand-muted')}>{hint}</span>}
      {children}
    </div>
  );
}

const TRIP_TYPES: { key: TripTypeKey; label: string; icon: typeof Truck }[] = [
  { key: 'DOMESTIC', label: 'داخلی', icon: MapPin },
  { key: 'EXPORT', label: 'صادراتی', icon: ArrowUpFromLine },
  { key: 'IMPORT', label: 'وارداتی', icon: ArrowDownToLine },
  { key: 'UNKNOWN', label: 'نوع نامشخص', icon: Package },
];
const currencyNames: Record<string, string> = { USD: 'دلار', EUR: 'یورو', AED: 'درهم', TRY: 'لیر' };
const tomans = (value: number) => toman(String(value * 10));

/** One trip type over the chosen window: loads, taken loads and the freight of the taken ones. */
function TripTypeCard({ label, icon: Icon, totals }: { label: string; icon: typeof Truck; totals: LoadTotals }) {
  const other = Object.entries(totals.freightOther);
  return (
    <div className="tw-flex tw-flex-col tw-gap-3 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-5">
      <div className="tw-flex tw-items-center tw-justify-between tw-gap-2">
        <span className="tw-text-sm tw-font-bold">بار {label}</span>
        <span className="tw-flex tw-h-9 tw-w-9 tw-items-center tw-justify-center tw-rounded-xl tw-bg-brand-orange-soft tw-text-brand-orange-ink">
          <Icon size={18} aria-hidden />
        </span>
      </div>
      <div className="tw-flex tw-items-end tw-gap-4">
        <div>
          <strong className="tw-block tw-text-2xl tw-font-bold tw-leading-tight">{fa(totals.loads)}</strong>
          <span className="tw-text-xs tw-text-brand-muted">بار ثبت‌شده</span>
        </div>
        <div>
          <strong className="tw-block tw-text-lg tw-font-bold tw-leading-tight">{fa(totals.taken)}</strong>
          <span className="tw-text-xs tw-text-brand-muted">برداشته‌شده</span>
        </div>
      </div>
      <div className="tw-rounded-xl tw-bg-brand-bg tw-px-3 tw-py-2.5">
        <span className="tw-block tw-text-xs tw-text-brand-muted">کرایه‌ی بارهای برداشته‌شده</span>
        <strong className="tw-block tw-text-base tw-font-bold">{tomans(totals.freightTomans)}</strong>
        {other.length > 0 && (
          <span className="tw-mt-1 tw-block tw-text-xs tw-font-bold tw-text-brand-navy">
            + {other.map(([currency, amount]) => `${fa(amount)} ${currencyNames[currency] ?? currency}`).join('، ')}
          </span>
        )}
      </div>
      {totals.takenUnpriced > 0 && (
        <span className="tw-text-xs tw-text-brand-muted">{fa(totals.takenUnpriced)} بار برداشته‌شده کرایه‌ی مشخصی نداشت («نقدی»، «توافقی»، خالی)</span>
      )}
    </div>
  );
}

function Chip({ tone, label, value }: { tone: 'ok' | 'trial' | 'warn' | 'muted'; label: string; value: number }) {
  const tones = {
    ok: 'tw-bg-emerald-50 tw-text-emerald-800',
    trial: 'tw-bg-brand-orange-soft tw-text-brand-orange-ink',
    warn: 'tw-bg-red-50 tw-text-red-700',
    muted: 'tw-bg-brand-sky tw-text-brand-navy',
  };
  return (
    <span className={cn('tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-lg tw-px-2.5 tw-py-1 tw-text-xs', tones[tone])}>
      {label}
      <strong>{fa(value)}</strong>
    </span>
  );
}

/**
 * The admin's numbers: drivers and companies with where they stand on subscriptions, approved payments over the
 * last 1/3/6/12 months and in total, receipts waiting, and the three drivers who paid the most.
 */
export default function AdminStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<Period>('30');

  const load = useCallback(() => {
    setLoading(true);
    getAdminStats()
      .then((value) => {
        setStats(value);
        setFailed(false);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);
  // a receipt arrives or is decided: the counts follow
  useNotificationEvent('payment-receipt', load);

  if (failed && !stats) {
    return (
      <section className="tw-flex tw-items-center tw-justify-between tw-rounded-2xl tw-border tw-border-dashed tw-border-brand-line tw-bg-white tw-p-5 tw-text-sm tw-text-brand-muted">
        آمار دریافت نشد.
        <button type="button" onClick={load} className="tw-rounded-lg tw-border tw-border-brand-line tw-bg-white tw-px-3 tw-py-1.5 tw-text-xs tw-font-bold">تلاش دوباره</button>
      </section>
    );
  }
  if (!stats) return <div className="tw-h-64 tw-animate-pulse tw-rounded-2xl tw-bg-white" aria-label="در حال بارگذاری آمار" />;

  const selected = stats.revenue.periods.find((item) => String(item.days) === period) ?? stats.revenue.periods[0];
  const periodLabel = PERIODS.find((item) => item.value === period)?.label ?? '';
  const { drivers, companies } = stats.users;
  const selectedLoads = (stats.loads.periods.find((item) => String(item.days) === period) ?? stats.loads.periods[0]).byType;

  return (
    <section className="tw-space-y-4 tw-text-brand-navy" aria-label="آمار ترابوت">
      <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3">
        <h2 className="tw-flex tw-items-center tw-gap-2 tw-text-lg tw-font-bold">
          <span className="tw-h-2.5 tw-w-2.5 tw-rounded-full tw-bg-brand-orange tw-ring-4 tw-ring-brand-orange-soft" aria-hidden />
          آمار ترابوت
        </h2>
        <div className="tw-flex tw-items-center tw-gap-2">
          <Segmented value={period} onChange={setPeriod} options={[...PERIODS]} label="بازه‌ی پرداخت‌ها" />
          <button type="button" onClick={load} aria-label="به‌روزرسانی آمار" title="به‌روزرسانی" className="tw-flex tw-h-9 tw-w-9 tw-items-center tw-justify-center tw-rounded-full tw-border tw-border-brand-line tw-bg-white tw-text-brand-muted hover:tw-text-brand-navy">
            <RefreshCw size={16} className={loading ? 'tw-animate-spin' : ''} aria-hidden />
          </button>
        </div>
      </div>

      <div className="tw-grid tw-gap-3 sm:tw-grid-cols-2 xl:tw-grid-cols-4">
        <Tile icon={Wallet} accent label={`درآمد ${periodLabel} اخیر`} value={toman(selected.rials)} hint={`${fa(selected.payments)} پرداخت تأییدشده · ${fa(selected.rials)} ریال`} />
        <Tile icon={Crown} label="کل درآمد تا امروز" value={toman(stats.revenue.total.rials)} hint={`${fa(stats.revenue.total.payments)} پرداخت تأییدشده`} />
        <Tile icon={Receipt} label="رسیدهای منتظر بررسی" value={fa(stats.pendingReceipts)} hint={stats.pendingReceipts ? <Link to="/admin/subscription-orders" className="tw-font-bold tw-text-brand-orange-ink">بررسی رسیدها ←</Link> : 'رسیدی منتظر نیست'} />
        <Tile icon={CalendarClock} label="پرداخت‌ها در بازه‌ها" value={`${fa(selected.payments)} پرداخت`}>
          <ul className="tw-m-0 tw-grid tw-list-none tw-grid-cols-2 tw-gap-1.5 tw-p-0 tw-text-xs">
            {stats.revenue.periods.map((item) => (
              <li key={item.days} className={cn('tw-flex tw-justify-between tw-rounded-lg tw-px-2 tw-py-1', String(item.days) === period ? 'tw-bg-brand-orange-soft tw-font-bold' : 'tw-bg-brand-bg')}>
                <span>{PERIODS.find((p) => p.value === String(item.days))?.label}</span>
                <span>{fa(item.payments)}</span>
              </li>
            ))}
          </ul>
        </Tile>
      </div>

      <div className="tw-grid tw-gap-3 lg:tw-grid-cols-2">
        <Tile icon={Truck} label="رانندگان" value={fa(drivers.total)} hint={`${fa(drivers.newThisMonth)} نفر در ۳۰ روز اخیر`}>
          <div className="tw-flex tw-flex-wrap tw-gap-1.5">
            <Chip tone="ok" label="با اشتراک" value={drivers.subscribed} />
            <Chip tone="trial" label="در دوره‌ی رایگان" value={drivers.inTrial} />
            <Chip tone="warn" label="باید اشتراک بخرند" value={drivers.mustSubscribe} />
          </div>
        </Tile>
        <Tile icon={Building2} label="شرکت‌ها" value={fa(companies.total)} hint={`${fa(companies.newThisMonth)} شرکت در ۳۰ روز اخیر`}>
          <div className="tw-flex tw-flex-wrap tw-gap-1.5">
            <Chip tone="ok" label="با اشتراک" value={companies.subscribed} />
            <Chip tone="muted" label="بدون اشتراک" value={Math.max(0, companies.total - companies.subscribed)} />
          </div>
        </Tile>
      </div>

      <div className="tw-space-y-3">
        <h3 className="tw-m-0 tw-flex tw-items-center tw-gap-2 tw-text-base tw-font-bold">
          <Package size={18} className="tw-text-brand-orange" aria-hidden />
          بارها بر اساس نوع سفر <span className="tw-text-sm tw-font-normal tw-text-brand-muted">({periodLabel} اخیر)</span>
        </h3>
        <div className="tw-grid tw-gap-3 md:tw-grid-cols-3">
          {TRIP_TYPES.filter((type) => type.key !== 'UNKNOWN' || selectedLoads[type.key].loads > 0).map((type) => (
            <TripTypeCard key={type.key} label={type.label} icon={type.icon} totals={selectedLoads[type.key]} />
          ))}
        </div>
        <p className="tw-m-0 tw-text-xs tw-text-brand-muted">
          کرایه همان مبلغی است که شرکت برای بار نوشته (درآمد حمل، نه درآمد اشتراک ترابوت)؛ فقط بارهایی که راننده برداشته حساب می‌شوند و
          کرایه‌های دلاری جدا از جمع تومانی نوشته می‌شوند. کل تا امروز: {TRIP_TYPES.slice(0, 3).map((type) => `${type.label} ${fa(stats.loads.total[type.key].loads)} بار`).join('، ')}.
        </p>
      </div>

      <div className="tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white">
        <div className="tw-flex tw-items-center tw-gap-2 tw-border-b tw-border-brand-line tw-px-5 tw-py-3">
          <Medal size={18} className="tw-text-brand-orange" aria-hidden />
          <h3 className="tw-m-0 tw-text-base tw-font-bold">رانندگانی که بیشترین پرداخت را داشته‌اند</h3>
        </div>
        {stats.topDrivers.length === 0 ? (
          <p className="tw-m-0 tw-px-5 tw-py-6 tw-text-center tw-text-sm tw-text-brand-muted">هنوز پرداخت تأییدشده‌ای از رانندگان ثبت نشده است.</p>
        ) : (
          <table className="tw-w-full tw-text-sm">
            <thead className="tw-text-xs tw-text-brand-muted">
              <tr>
                <th className="tw-px-5 tw-py-2 tw-text-start tw-font-medium">رتبه</th>
                <th className="tw-px-2 tw-py-2 tw-text-start tw-font-medium">راننده</th>
                <th className="tw-px-2 tw-py-2 tw-text-start tw-font-medium">تعداد پرداخت</th>
                <th className="tw-px-2 tw-py-2 tw-text-start tw-font-medium">آخرین پرداخت</th>
                <th className="tw-px-5 tw-py-2 tw-text-end tw-font-medium">جمع پرداخت</th>
              </tr>
            </thead>
            <tbody>
              {stats.topDrivers.map((driver, index) => (
                <tr key={driver.userId} className="tw-border-t tw-border-brand-line">
                  <td className="tw-px-5 tw-py-3">
                    <span className={cn('tw-flex tw-h-7 tw-w-7 tw-items-center tw-justify-center tw-rounded-full tw-text-xs tw-font-bold', index === 0 ? 'tw-bg-brand-orange tw-text-white' : 'tw-bg-brand-orange-soft tw-text-brand-orange-ink')}>
                      {fa(index + 1)}
                    </span>
                  </td>
                  <td className="tw-px-2 tw-py-3">
                    <span className="tw-block tw-font-bold">{driver.name ?? 'بدون نام'}</span>
                    <span className="tw-block tw-text-xs tw-text-brand-muted" dir="ltr">{driver.mobile}</span>
                  </td>
                  <td className="tw-px-2 tw-py-3">{fa(driver.payments)}</td>
                  <td className="tw-px-2 tw-py-3 tw-text-brand-muted">{faDate(driver.lastPaidAt)}</td>
                  <td className="tw-px-5 tw-py-3 tw-text-end tw-font-bold" title={`${fa(driver.rials)} ریال`}>{toman(driver.rials)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {stats.otherCurrencies.length > 0 && (
        <p className="tw-m-0 tw-text-xs tw-text-brand-muted">
          پرداخت‌های ارزی (جدا از جمع ریالی): {stats.otherCurrencies.map((item) => `${fa(item.amount)} ${item.currency} (${fa(item.payments)} پرداخت)`).join('، ')}
        </p>
      )}
    </section>
  );
}
