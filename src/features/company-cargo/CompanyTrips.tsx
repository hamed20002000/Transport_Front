import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AlarmClock, CheckCircle2, Clock, MapPinned, Package, Scale, Truck, XCircle } from 'lucide-react';
import { useAuth } from 'src/core/auth/AuthContext';
import PageContainer from 'src/shared/components/container/PageContainer';
import Spinner from 'src/shared/components/spinner/Spinner';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { deliverTrip, listCompanyTrips, rejectTripDelivery, type CompanyTrip, type Page } from './api';
import { DriverPhoto } from './AssignDriverDialog';
import { errorMessage } from './cargoText';
import CompanyShell from './CompanyShell';
import { Badge, CardSkeleton, CargoCode, EmptyState, LoadFailed, Pager, PhoneLinks, PrimaryButton, RouteLine, SecondaryButton, SectionTitle, Spec, timeAgo } from './components';
import { useNotificationEvent } from './notificationSocket';
import { useMessageBox } from 'src/shared/components/message-box/MessageBoxProvider';

const PAGE_SIZE = 20;
// Same default as TRIP_DELIVERY_REMINDER_DAYS on the server: after this the trip is flagged as waiting for delivery.
const REMINDER_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

function TripCard({ trip, busy, onDeliver, onReject }: { trip: CompanyTrip; busy: boolean; onDeliver: () => void; onReject: () => void }) {
  const { cargo, driver, location } = trip;
  const overdue = Date.now() - new Date(trip.startedAt).getTime() > REMINDER_DAYS * DAY_MS;
  const live = location?.liveUntil && new Date(location.liveUntil).getTime() > Date.now();
  return (
    <li className="tw-space-y-3 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-4 tw-shadow-sm">
      <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-2">
        <CargoCode code={cargo?.code} />
        <div className="tw-flex tw-items-center tw-gap-2">
          {trip.deliveryReportedAt ? (
            <Badge tone="orange">
              <CheckCircle2 size={13} aria-hidden /> راننده تحویل را {timeAgo(trip.deliveryReportedAt)} اعلام کرد
            </Badge>
          ) : (
            overdue && (
              <Badge tone="orange">
                <AlarmClock size={13} aria-hidden /> تحویل ثبت نشده
              </Badge>
            )
          )}
          <span className="tw-inline-flex tw-items-center tw-gap-1 tw-text-xs tw-text-brand-muted">
            <Clock size={13} aria-hidden /> شروع {timeAgo(trip.startedAt)}
          </span>
        </div>
      </div>

      <RouteLine origin={cargo?.origin} destination={cargo?.destination} />
      <div className="tw-flex tw-flex-wrap tw-gap-2">
        <Spec icon={Package} label="نوع بار" value={cargo?.cargoType} />
        <Spec icon={Scale} label="وزن" value={cargo?.weight} />
        <Spec icon={Truck} label="نوع خودرو" value={cargo?.vehicleType} />
      </div>

      {driver && (
        <div className="tw-flex tw-items-start tw-gap-3 tw-rounded-xl tw-bg-brand-sky/50 tw-p-3">
          <DriverPhoto driver={driver} />
          <div className="tw-min-w-0 tw-flex-1 tw-space-y-1">
            <p className="tw-m-0 tw-font-bold">{driver.name}</p>
            {driver.plate && <span className="tw-rounded tw-bg-white tw-px-1.5 tw-text-xs">{driver.plate}</span>}
            {driver.mobile && <PhoneLinks phones={[driver.mobile]} />}
          </div>
        </div>
      )}

      <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3 tw-border-t tw-border-brand-line tw-pt-3">
        {location ? (
          <a
            href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
            target="_blank"
            rel="noreferrer"
            className="tw-inline-flex tw-items-center tw-gap-1.5 tw-text-sm tw-font-medium tw-text-brand-navy hover:tw-text-brand-orange"
          >
            <MapPinned size={16} aria-hidden />
            {live ? 'موقعیت زنده' : 'آخرین موقعیت'} · {timeAgo(location.receivedAt)}
          </a>
        ) : (
          <span className="tw-text-sm tw-text-brand-muted">راننده هنوز موقعیتی نفرستاده</span>
        )}
        {trip.deliveryReportedAt && (
          <SecondaryButton onClick={onReject} disabled={busy}>
            <XCircle size={16} aria-hidden /> تحویل نشده
          </SecondaryButton>
        )}
        <PrimaryButton onClick={onDeliver} disabled={busy}>
          <CheckCircle2 size={16} aria-hidden /> {busy ? 'در حال ثبت…' : trip.deliveryReportedAt ? 'تأیید تحویل' : 'تحویل شد'}
        </PrimaryButton>
      </div>
    </li>
  );
}

function Trips() {
  const toast = useToast();
  const messageBox = useMessageBox();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page<CompanyTrip> | null>(null);
  const [failed, setFailed] = useState(false);
  const [version, setVersion] = useState(0);
  const [busyId, setBusyId] = useState('');

  useEffect(() => {
    let active = true;
    setFailed(false);
    listCompanyTrips(page)
      .then((result) => active && setData(result))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [page, version]);

  // A driver confirmed an offer, registered delivery, or the company did it from a bot.
  useNotificationEvent('cargo-request-changed', () => setVersion((value) => value + 1));
  // The driver sent a location (or a Live Location moved): update that card in place, no reload.
  useNotificationEvent<{ requestId: string; location: CompanyTrip['location'] }>('trip-location', ({ requestId, location }) =>
    setData((current) => current && { ...current, items: current.items.map((trip) => (trip.requestId === requestId ? { ...trip, location } : trip)) }),
  );

  async function deliver(trip: CompanyTrip) {
    const route = trip.cargo ? `${trip.cargo.origin} به ${trip.cargo.destination}` : 'این بار';
    const question = trip.deliveryReportedAt
      ? `راننده تحویل بار ${route} را اعلام کرده. تأیید می‌کنید؟ راننده هم خبردار می‌شود.`
      : `تحویل بار ${route} ثبت شود؟ راننده هم خبردار می‌شود.`;
    if (!(await messageBox.confirm({ title: 'تحویل بار', message: question, confirmText: 'ثبت تحویل' }))) return;
    setBusyId(trip.requestId);
    try {
      await deliverTrip(trip.requestId);
      toast.success(trip.deliveryReportedAt ? 'تحویل تأیید شد و به راننده خبر دادیم.' : 'تحویل بار ثبت شد و به راننده خبر دادیم.');
      setVersion((value) => value + 1);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusyId('');
    }
  }

  // «تحویل نشده»: the driver's report is turned down; the trip stays here and the driver is told
  async function reject(trip: CompanyTrip) {
    if (!(await messageBox.confirm({ message: 'اعلام تحویل راننده رد شود؟ سفر فعال می‌ماند و راننده خبردار می‌شود.', tone: 'danger', confirmText: 'رد اعلام تحویل' }))) return;
    setBusyId(trip.requestId);
    try {
      await rejectTripDelivery(trip.requestId);
      toast.success('اعلام تحویل رد شد و به راننده خبر دادیم.');
      setVersion((value) => value + 1);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="tw-space-y-5">
      <SectionTitle title="سفرهای فعال" hint="بارهایی که راننده دارند و تحویلشان هنوز ثبت نشده؛ جدیدترین سفر اول" />
      {failed ? (
        <LoadFailed onRetry={() => setVersion((value) => value + 1)} />
      ) : !data ? (
        <div className="tw-space-y-3">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : !data.items.length ? (
        <EmptyState icon={Truck} title="سفر فعالی ندارید" hint="وقتی باری را به راننده بسپارید و تأیید کند، یا درخواست راننده‌ای را قبول کنید، سفرش اینجا می‌آید." />
      ) : (
        <>
          <ul className="tw-m-0 tw-grid tw-list-none tw-gap-3 tw-p-0 md:tw-grid-cols-2">
            {data.items.map((trip) => (
              <TripCard key={trip.requestId} trip={trip} busy={busyId === trip.requestId} onDeliver={() => void deliver(trip)} onReject={() => void reject(trip)} />
            ))}
          </ul>
          <Pager page={page} total={data.total} pageSize={PAGE_SIZE} onChange={setPage} />
        </>
      )}
    </div>
  );
}

export default function CompanyTrips() {
  const { isAuth, isAuthDataLoading, userRoles } = useAuth();
  if (isAuthDataLoading) return <Spinner />;
  if (!isAuth) return <Navigate to="/auth/login" replace />;
  if (!userRoles.some((role) => role.name === 'COMPANY')) return <Navigate to="/account/company" replace />;
  return (
    <PageContainer title="سفرهای فعال | ترابوت" description="سفرهای فعال شرکت">
      <CompanyShell>
        <Trips />
      </CompanyShell>
    </PageContainer>
  );
}
