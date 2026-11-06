import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { BadgeCheck, Handshake, LoaderCircle, Search, ShieldCheck, Truck, UserRoundPlus } from 'lucide-react';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { groupDigits } from 'src/shared/utils/digitGroups';
import { factoryError } from 'src/features/factory/api';
import AccountCode from 'src/shared/components/account-code/AccountCode';
import CompanyShell from './CompanyShell';
import { CardSkeleton, EmptyState, LoadFailed, Pager, PhoneLinks, SectionTitle } from './components';
import { useCompanyFeatures } from './featuresApi';
import { registerDriver } from './driverInvitesApi';
import { listBrokerDrivers, type BrokerDriverRow } from './brokerDriversApi';
import type { Page } from './api';

const PAGE_SIZE = 20;
const fa = (value: number) => value.toLocaleString('fa-IR');
const faDate = (value: string) => new Date(value).toLocaleDateString('fa-IR', { year: 'numeric', month: 'short', day: 'numeric' });
const STATUS: Record<string, string> = {
  PENDING: 'در انتظار جواب',
  OFFERED: 'پیشنهاد به راننده',
  ACCEPTED: 'پذیرفته شد',
  DELIVERED: 'تحویل شد',
  REJECTED: 'رد شد',
  CANCELLED: 'لغو شد',
  DECLINED: 'راننده نپذیرفت',
  EXPIRED: 'منقضی شد',
  TRIP_CANCELLED: 'سفر لغو شد',
};

function Detail({ label, value, ltr }: { label: string; value?: string | null; ltr?: boolean }) {
  if (!value) return null;
  return (
    <div className="tw-min-w-0">
      <dt className="tw-text-xs tw-text-brand-muted">{label}</dt>
      <dd className="tw-m-0 tw-truncate tw-font-medium">{ltr ? <bdi dir="ltr">{value}</bdi> : value}</dd>
    </div>
  );
}

/** One driver: every detail the brokers gave, who gave it, its requests; and registering it as the company's driver. */
function DriverCard({ row, onRegistered }: { row: BrokerDriverRow; onRegistered: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const { driver, last } = row;

  async function register() {
    setBusy(true);
    try {
      const { outcomes } = await registerDriver({ name: driver.name, mobile: row.mobile });
      const outcome = outcomes[0];
      if (outcome?.status === 'refused') return toast.error(outcome.reason);
      toast.success(`«${driver.name}» به رانندگان شما اضافه شد؛ بعد از کامل کردن پروفایل و تأیید شرکت مادر فعال می‌شود.`);
      onRegistered();
    } catch (error) {
      toast.error(factoryError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="tw-space-y-3 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-4 tw-shadow-sm">
      <div className="tw-flex tw-flex-wrap tw-items-start tw-justify-between tw-gap-3">
        <div className="tw-min-w-0 tw-space-y-1">
          <p className="tw-m-0 tw-flex tw-items-center tw-gap-2 tw-font-bold">
            <Truck size={17} aria-hidden /> {driver.name}
          </p>
          <PhoneLinks phones={[row.mobile]} />
        </div>
        {row.account?.companyDriver ? (
          <span className="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-full tw-bg-emerald-50 tw-px-2.5 tw-py-1 tw-text-xs tw-font-bold tw-text-emerald-700">
            <BadgeCheck size={14} aria-hidden /> از رانندگان شماست
          </span>
        ) : row.account ? (
          <span className="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-full tw-bg-brand-sky tw-px-2.5 tw-py-1 tw-text-xs tw-font-bold">
            <BadgeCheck size={14} aria-hidden /> راننده‌ی ترابوت است
          </span>
        ) : (
          <button
            type="button"
            onClick={register}
            disabled={busy}
            className="tw-inline-flex tw-h-9 tw-items-center tw-gap-1.5 tw-rounded-xl tw-border-0 tw-bg-brand-orange tw-px-3 tw-text-sm tw-font-bold tw-text-white hover:tw-bg-brand-orange-dark disabled:tw-opacity-50"
          >
            {busy ? <LoaderCircle size={15} className="tw-animate-spin" aria-hidden /> : <UserRoundPlus size={15} aria-hidden />} ثبت به‌عنوان راننده‌ی شما
          </button>
        )}
      </div>

      <dl className="tw-m-0 tw-grid tw-grid-cols-2 tw-gap-x-4 tw-gap-y-2 tw-text-sm sm:tw-grid-cols-4">
        <Detail label="کد ملی" value={driver.nationalCode} ltr />
        <Detail label="پلاک" value={driver.plate} />
        <Detail label="پلاک ترانزیت" value={driver.transitPlate} ltr />
        <Detail label="نام شرکت" value={driver.companyName} />
        <Detail label="مبلغ کرایه" value={driver.fare ? groupDigits(driver.fare) : null} />
        <Detail label="معرف" value={driver.referrer} />
        <Detail label="مرز خروج" value={last.exitBorder} />
      </dl>

      <div className="tw-space-y-1.5 tw-rounded-xl tw-bg-brand-bg tw-p-3 tw-text-sm">
        <p className="tw-m-0 tw-flex tw-flex-wrap tw-items-center tw-gap-x-3 tw-gap-y-1">
          <span className="tw-font-bold">{fa(row.requests)} درخواست</span>
          {row.accepted > 0 && <span className="tw-text-emerald-700">{fa(row.accepted)} پذیرفته‌شده</span>}
          <span className="tw-text-brand-muted">
            {row.requests > 1 ? `از ${faDate(row.firstAt)} تا ${faDate(row.lastAt)}` : faDate(row.lastAt)}
          </span>
        </p>
        <p className="tw-m-0">
          آخرین: {last.origin} ← {last.destination}
          {last.code && <span className="tw-text-brand-muted"> · کد {last.code}</span>}
          {last.company && <span className="tw-text-brand-muted"> · بار {last.company}</span>}
          {' · '}
          <span className="tw-font-medium">{STATUS[last.status] ?? last.status}</span>
          {last.exitBorder && (
            <span className="tw-text-brand-muted">
              {' · '}
              <ShieldCheck size={13} className="tw-inline" aria-hidden /> {last.exitBorder}
            </span>
          )}
        </p>
      </div>

      <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2 tw-text-sm">
        <span className="tw-inline-flex tw-items-center tw-gap-1 tw-text-brand-muted">
          <Handshake size={14} aria-hidden /> {row.brokers.length > 1 ? 'واسط‌ها:' : 'واسط:'}
        </span>
        {row.brokers.map((broker) => (
          <span key={broker.userId} className="tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-full tw-border tw-border-brand-line tw-px-2.5 tw-py-0.5">
            {broker.name}
            {broker.mobile && (
              <a href={`tel:${broker.mobile}`} dir="ltr" className="tw-text-xs tw-text-brand-muted">
                {broker.mobile}
              </a>
            )}
            <AccountCode code={broker.accountCode} />
          </span>
        ))}
      </div>
    </li>
  );
}

function BrokerDriversContent() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<Page<BrokerDriverRow> | null>(null);
  const [failed, setFailed] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setFailed(false);
    listBrokerDrivers(page, search, PAGE_SIZE)
      .then((result) => active && setData(result))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [page, search, version]);

  function submit(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setSearch(query.trim());
  }

  return (
    <div className="tw-space-y-5">
      <SectionTitle
        title="رانندگان واسط‌ها"
        hint="همه‌ی راننده‌هایی که واسط‌ها برایشان درخواست بار داده‌اند، با آخرین مشخصاتی که واسط داده است؛ جدیدترین اول"
      />
      <form onSubmit={submit} className="tw-flex tw-h-11 tw-items-center tw-gap-2 tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-3">
        <Search size={16} className="tw-text-brand-muted" aria-hidden />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="جستجوی نام، موبایل، کد ملی، پلاک یا نام واسط"
          className="tw-h-full tw-min-w-0 tw-flex-1 tw-border-0 tw-bg-transparent tw-text-sm tw-outline-none"
        />
      </form>
      {failed ? (
        <LoadFailed onRetry={() => setVersion((value) => value + 1)} />
      ) : !data ? (
        <CardSkeleton />
      ) : !data.items.length ? (
        <EmptyState icon={Handshake} title={search ? 'راننده‌ای پیدا نشد' : 'هنوز راننده‌ای نیست'} hint="راننده‌هایی که واسط‌ها برایشان درخواست بار بدهند اینجا می‌آیند." />
      ) : (
        <>
          <p className="tw-m-0 tw-text-sm tw-text-brand-muted">{fa(data.total)} راننده</p>
          <ul className="tw-m-0 tw-list-none tw-space-y-3 tw-p-0">
            {data.items.map((row) => (
              <DriverCard key={row.mobile} row={row} onRegistered={() => setVersion((value) => value + 1)} />
            ))}
          </ul>
          <Pager page={page} total={data.total} pageSize={PAGE_SIZE} onChange={setPage} />
        </>
      )}
    </div>
  );
}

/** The parent company's page of the drivers brokers named (no account is made for them). */
export default function CompanyBrokerDrivers() {
  const features = useCompanyFeatures();
  if (features && !features.isParent) return <Navigate to="/account/company" replace />;
  return (
    <CompanyShell>
      <BrokerDriversContent />
    </CompanyShell>
  );
}
