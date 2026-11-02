import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Globe2, Link2, LoaderCircle, MapPinned, Search, Trash2, Truck, UserRound, Users } from 'lucide-react';
import { useAuth } from 'src/core/auth/AuthContext';
import PageContainer from 'src/shared/components/container/PageContainer';
import Spinner from 'src/shared/components/spinner/Spinner';
import { driverKindHints, driverKindLabels, driverKindTripTypes, listDrivers, type DriverCard, type DriverKind, type Page } from './api';
import { DriverPhoto } from './AssignDriverDialog';
import CompanyShell from './CompanyShell';
import { CardSkeleton, EmptyState, LoadFailed, Pager, PhoneLinks, SectionTitle, Segmented } from './components';
import { useNotificationEvent } from './notificationSocket';
import { removeDriverInvite } from './driverInvitesApi';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { useMessageBox } from 'src/shared/components/message-box/MessageBoxProvider';
import DriverInvites from './DriverInvites';
import AccountCode from 'src/shared/components/account-code/AccountCode';
import { cn } from 'src/shared/utils/utils';

const PAGE_SIZE = 20;
const fa = (value: number) => value.toLocaleString('fa-IR');

// a driver is domestic or international (export and import loads)
const tabs: Array<{ value: DriverKind; icon: typeof Truck }> = [
  { value: 'DOMESTIC', icon: MapPinned },
  { value: 'INTERNATIONAL', icon: Globe2 },
];

// how the driver came to Trabot: by this company's invite link, another company's, or by signing up alone
const joinedLabels = {
  yourInvite: { label: 'با لینک دعوت شما', icon: Link2, tone: 'tw-bg-brand-orange-soft tw-text-brand-orange-ink' },
  invite: { label: 'با لینک دعوت شرکت دیگر', icon: Link2, tone: 'tw-bg-brand-sky tw-text-brand-navy' },
  self: { label: 'خودش ثبت‌نام کرد', icon: UserRound, tone: 'tw-bg-stone-100 tw-text-brand-muted' },
} as const;

function JoinedBy({ how }: { how: NonNullable<DriverCard['joinedBy']> }) {
  const { label, icon: Icon, tone } = joinedLabels[how];
  return (
    <span className={cn('tw-inline-flex tw-w-fit tw-items-center tw-gap-1 tw-rounded-full tw-px-2 tw-py-0.5 tw-text-xs tw-font-medium', tone)}>
      <Icon size={12} aria-hidden /> {label}
    </span>
  );
}

/**
 * A driver this company invited (with the link, or who came in alone) can be taken off its drivers: the invite is revoked and the
 * company leaves the driver's list (DriverInviteService.remove); the driver keeps their account.
 */
function RemoveDriver({ driver, onRemoved }: { driver: DriverCard; onRemoved: () => void }) {
  const toast = useToast();
  const messageBox = useMessageBox();
  const [removing, setRemoving] = useState(false);
  async function remove() {
    const confirmed = await messageBox.confirm({
      message: `«${driver.name}» از رانندگان شما حذف شود؟ دعوتش باطل می‌شود و دیگر بارهای اعلام‌شده‌ی شما برایش نمی‌آید. حساب خود راننده می‌ماند.`,
      confirmText: 'حذف',
      tone: 'danger',
    });
    if (!confirmed) return;
    setRemoving(true);
    try {
      await removeDriverInvite(driver.userId);
      toast.success('راننده از رانندگان شما حذف شد.');
      onRemoved();
    } catch {
      toast.error('حذف راننده انجام نشد. دوباره تلاش کنید.');
    } finally {
      setRemoving(false);
    }
  }
  return (
    <button
      type="button"
      onClick={remove}
      disabled={removing}
      title="حذف از رانندگان شما"
      aria-label={`حذف ${driver.name} از رانندگان شما`}
      className="tw-flex tw-h-9 tw-w-9 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-xl tw-border tw-border-red-100 tw-bg-white tw-text-red-600 hover:tw-bg-red-50"
    >
      {removing ? <LoaderCircle size={16} className="tw-animate-spin" aria-hidden /> : <Trash2 size={16} aria-hidden />}
    </button>
  );
}

function DriverItem({ driver, onRemoved }: { driver: DriverCard; onRemoved: () => void }) {
  const vehicle = [driver.vehicleType, driver.vehicleModel, driver.capacityTons ? `${fa(driver.capacityTons)} تن` : null].filter(Boolean).join(' · ');
  return (
    <li className="tw-flex tw-items-start tw-gap-3 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-4 tw-shadow-sm">
      <DriverPhoto driver={driver} />
      <div className="tw-min-w-0 tw-flex-1 tw-space-y-1.5">
        <p className="tw-m-0 tw-flex tw-flex-wrap tw-items-center tw-gap-2 tw-font-bold">{driver.name}<AccountCode code={driver.accountCode} /></p>
        {driver.joinedBy && <JoinedBy how={driver.joinedBy} />}
        {(vehicle || driver.plate) && (
          <p className="tw-m-0 tw-flex tw-flex-wrap tw-items-center tw-gap-x-2 tw-gap-y-1 tw-text-sm">
            {vehicle && (
              <span className="tw-inline-flex tw-items-center tw-gap-1">
                <Truck size={14} aria-hidden /> {vehicle}
              </span>
            )}
            {driver.plate && <span className="tw-rounded tw-bg-brand-sky tw-px-1.5 tw-text-xs">{driver.plate}</span>}
          </p>
        )}
        {driver.homeCity && <p className="tw-m-0 tw-text-xs tw-text-brand-muted">شهر: {driver.homeCity}</p>}
        {driver.mobile && <PhoneLinks phones={[driver.mobile]} />}
      </div>
      {driver.removable && <RemoveDriver driver={driver} onRemoved={onRemoved} />}
    </li>
  );
}

function Drivers() {
  const [type, setType] = useState<DriverKind>('DOMESTIC');
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<Page<DriverCard> | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    listDrivers(driverKindTripTypes[type][0], page, search)
      .then((result) => active && setData(result))
      .catch(() => active && setFailed(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [type, page, search, version]);

  // راننده‌ای پروفایلش را (در پنل یا ربات) عوض کرد؛ لیست بی‌صدا دوباره گرفته می‌شود (اسکلت فقط وقتی داده‌ای نیست).
  useNotificationEvent('drivers-changed', () => setVersion((value) => value + 1));
  // an invited driver came in: the list shows them, with «با لینک دعوت شما»
  useNotificationEvent<{ kind: string }>('invite-used', ({ kind }) => kind === 'driver' && setVersion((value) => value + 1));

  function submit(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setSearch(query.trim());
  }

  return (
    <div className="tw-space-y-5">
      <DriverInvites />
      <SectionTitle
        title="رانندگان"
        hint="بار هر نوع فقط به راننده‌های همان نوع اعلام می‌شود"
        side={
          <Segmented
            label="نوع راننده"
            value={type}
            onChange={(value) => {
              setType(value);
              setPage(1);
            }}
            options={tabs.map(({ value, icon }) => ({ value, label: driverKindLabels[value], icon }))}
          />
        }
      />
      <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3">
        <p className="tw-m-0 tw-text-sm tw-text-brand-muted">
          رانندگان {driverKindLabels[type]}: {driverKindHints[type]}
          {data && !loading ? ` · ${fa(data.total)} راننده` : ''}
        </p>
        <form onSubmit={submit} className="tw-flex tw-items-center tw-gap-2" role="search">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="نام، موبایل یا پلاک"
            aria-label="جستجوی راننده"
            className="tw-h-10 tw-w-56 tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-3 tw-text-sm focus:tw-border-brand-orange focus:tw-outline-none"
          />
          <button
            type="submit"
            aria-label="جستجو"
            className="tw-flex tw-h-10 tw-w-10 tw-items-center tw-justify-center tw-rounded-xl tw-border tw-border-brand-line tw-bg-white hover:tw-border-brand-orange"
          >
            <Search size={18} aria-hidden />
          </button>
        </form>
      </div>

      {loading && !data ? (
        <div className="tw-space-y-3">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : failed ? (
        <LoadFailed onRetry={() => setVersion((value) => value + 1)} />
      ) : !data?.items.length ? (
        <EmptyState
          icon={Users}
          title={search ? 'راننده‌ای با این مشخصات پیدا نشد' : `رانندهٔ ${driverKindLabels[type]} ثبت نشده`}
          hint="راننده‌ها نوع خودشان (داخلی، صادراتی یا وارداتی) را در پروفایل پنل یا تنظیمات ربات انتخاب می‌کنند."
        />
      ) : (
        <>
          <ul className="tw-m-0 tw-grid tw-grid-cols-1 tw-list-none tw-gap-3 tw-p-0 md:tw-grid-cols-2">
            {data.items.map((driver) => (
              <DriverItem key={driver.userId} driver={driver} onRemoved={() => setVersion((value) => value + 1)} />
            ))}
          </ul>
          <Pager page={page} total={data.total} pageSize={PAGE_SIZE} onChange={setPage} />
        </>
      )}
    </div>
  );
}

export default function CompanyDrivers() {
  const { isAuth, isAuthDataLoading, userRoles } = useAuth();
  if (isAuthDataLoading) return <Spinner />;
  if (!isAuth) return <Navigate to="/auth/login" replace />;
  if (!userRoles.some((role) => role.name === 'COMPANY')) return <Navigate to="/account/company" replace />;
  return (
    <PageContainer title="رانندگان | ترابوت" description="رانندگان داخلی، صادراتی و وارداتی">
      <CompanyShell>
        <Drivers />
      </CompanyShell>
    </PageContainer>
  );
}
