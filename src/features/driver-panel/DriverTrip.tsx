import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, ChevronLeft, CircleCheckBig, Map as MapIcon, Navigation, PackageSearch, RefreshCw, Repeat, Timer } from 'lucide-react';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { CargoCode, EmptyState, IconButton, LoadFailed, PhoneLinks, timeAgo } from 'src/features/company-cargo/components';
import { errorMessage, listActiveTrips, markDelivered, type CargoRequest } from './api';
import { ActionButton, Hero, useAsync } from './components';
import DriverShell from './DriverShell';
import { LoadSpecs, useLoadActions } from './DriverLoads';
import LocationCard from './LocationCard';
import { onRequest, useListingContactEvent, useLoadsChangedEvent } from './loadEvents';
import { useMessageBox } from 'src/shared/components/message-box/MessageBoxProvider';

// Big card for an accepted request: who to call, where to go, and «تحویل دادم».
export function TripCard({ trip, onDelivered }: { trip: CargoRequest; onDelivered: (trip: CargoRequest) => void }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const messageBox = useMessageBox();
  const actions = useLoadActions(() => undefined);
  const listing = trip.listing;
  if (!listing) return null;

  // the driver reports it; the load becomes «تحویل‌شده» once the company confirms
  async function deliver() {
    if (!(await messageBox.confirm({ title: 'اعلام تحویل', message: 'تحویل این بار را اعلام می‌کنید؟ شرکت خبردار می‌شود و بعد از تأیید شرکت، بار تحویل‌شده می‌شود.', confirmText: 'اعلام تحویل' }))) return;
    setSaving(true);
    try {
      onDelivered(await markDelivered(trip.id));
      toast.success('اعلام تحویل ثبت شد و به شرکت خبر دادیم. بعد از تأیید شرکت، بار تحویل‌شده می‌شود.');
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Hero>
      <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3">
        <span className="tw-inline-flex tw-items-center tw-gap-2 tw-rounded-full tw-bg-emerald-400/15 tw-px-3 tw-py-1 tw-text-xs tw-font-bold tw-text-emerald-300 tw-ring-1 tw-ring-emerald-400/30">
          <span className="tw-h-2 tw-w-2 tw-animate-pulse tw-rounded-full tw-bg-emerald-400" aria-hidden /> سفر فعال
        </span>
        <div className="tw-flex tw-items-center tw-gap-2 [&_button]:tw-bg-white/10 [&_button]:tw-text-white [&_button]:tw-border-white/20">
          <CargoCode code={listing.code} />
        </div>
      </div>

      <div className="tw-mt-6 tw-grid tw-grid-cols-[auto_1fr] tw-gap-x-4">
        <div className="tw-flex tw-flex-col tw-items-center tw-pt-1.5" aria-hidden>
          <span className="tw-h-4 tw-w-4 tw-rounded-full tw-border-4 tw-border-brand-orange tw-bg-brand-navy" />
          <span className="tw-my-1 tw-w-0.5 tw-flex-1 tw-bg-gradient-to-b tw-from-brand-orange tw-to-white/60" />
          <span className="tw-h-4 tw-w-4 tw-rounded-full tw-bg-white" />
        </div>
        <div className="tw-space-y-5">
          <div>
            <div className="tw-text-xs tw-text-white/60">مبدأ بارگیری</div>
            <div className="tw-text-xl tw-font-bold sm:tw-text-2xl">{listing.origin}</div>
          </div>
          <div>
            <div className="tw-text-xs tw-text-white/60">مقصد تخلیه</div>
            <div className="tw-text-xl tw-font-bold sm:tw-text-2xl">{listing.destination}</div>
          </div>
        </div>
      </div>

      <div className="tw-mt-6 tw-flex tw-flex-wrap tw-gap-x-6 tw-gap-y-2 tw-text-sm tw-text-white/80">
        {listing.companyName && (
          <span className="tw-inline-flex tw-items-center tw-gap-1.5">
            <Building2 size={16} aria-hidden /> {listing.companyName}
          </span>
        )}
        {trip.decidedAt && (
          <span className="tw-inline-flex tw-items-center tw-gap-1.5">
            <Timer size={16} aria-hidden /> شروع سفر {timeAgo(trip.decidedAt)}
          </span>
        )}
      </div>

      <div className="tw-mt-4 tw-rounded-2xl tw-bg-white tw-p-4 tw-text-brand-navy">
        <LoadSpecs load={listing} />
        {listing.extraNotes && <p className="tw-m-0 tw-mt-3 tw-text-sm tw-leading-7 tw-text-brand-muted">{listing.extraNotes}</p>}
        {!!listing.contactPhones.length && (
          <div className="tw-mt-3 tw-flex tw-flex-wrap tw-items-center tw-gap-2 tw-text-xs tw-text-brand-muted">
            تماس با شرکت: <PhoneLinks phones={listing.contactPhones} />
          </div>
        )}
      </div>

      <div className="tw-mt-5 tw-flex tw-flex-wrap tw-gap-2">
        {trip.deliveryReportedAt ? (
          <span className="tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-xl tw-bg-white/15 tw-px-4 tw-py-2 tw-text-sm tw-font-bold tw-text-white">
            <Timer size={16} aria-hidden /> تحویل را {timeAgo(trip.deliveryReportedAt)} اعلام کردید؛ منتظر تأیید شرکت
          </span>
        ) : (
          <ActionButton variant="success" onClick={deliver} busy={saving}>
            <CircleCheckBig size={16} aria-hidden /> بار را تحویل دادم
          </ActionButton>
        )}
        <button
          type="button"
          onClick={() => actions.openDetails({ ...listing, myRequest: { id: trip.id, status: trip.status } })}
          className="tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-xl tw-border tw-border-white/25 tw-bg-white/10 tw-px-4 tw-py-2 tw-text-sm tw-font-bold tw-text-white hover:tw-bg-white/20"
        >
          <MapIcon size={16} aria-hidden /> مسیر و جایگاه‌های سوخت
        </button>
      </div>
      {actions.dialog}
    </Hero>
  );
}

function TripContent() {
  const state = useAsync(listActiveTrips, []);
  // the company handed over a load or recorded a delivery while this page is open
  useLoadsChangedEvent(state.reload);
  // the company changed its phone or name: «تماس با شرکت» shows the new one
  useListingContactEvent((contact) => state.setData((current) => current && current.map(onRequest(contact))));
  const trips = state.data ?? [];
  // reported: the card stays, waiting for the company; delivered (confirmed): it leaves the list
  const delivered = (trip: CargoRequest) =>
    state.setData(
      (current) => current && (trip.status === 'DELIVERED' ? current.filter((t) => t.id !== trip.id) : current.map((t) => (t.id === trip.id ? { ...t, ...trip } : t))),
    );

  return (
    <div className="tw-space-y-6">
      <div className="tw-flex tw-items-end tw-justify-between tw-gap-4">
        <div>
          <p className="tw-text-sm tw-font-bold tw-text-brand-orange-ink">در جاده</p>
          <h1 className="tw-mt-1 tw-text-2xl tw-font-bold sm:tw-text-3xl">سفر فعال</h1>
          <p className="tw-mt-2 tw-text-sm tw-text-brand-muted">باری که شرکت درخواستتان را قبول کرده؛ موقعیت بفرستید و تحویل را ثبت کنید</p>
        </div>
        <IconButton icon={RefreshCw} label="به‌روزرسانی" onClick={state.reload} spinning={state.loading} />
      </div>

      {state.loading && !state.data ? (
        <div className="tw-h-80 tw-animate-pulse tw-rounded-3xl tw-bg-brand-navy/10" role="status" aria-label="در حال دریافت سفر" />
      ) : state.failed ? (
        <LoadFailed onRetry={state.reload} />
      ) : !trips.length ? (
        <EmptyState icon={Navigation} title="سفر فعالی ندارید" hint="وقتی شرکتی درخواست شما را قبول کند، سفر اینجا می‌آید. از «بارها» برای بارهای باز درخواست بدهید." />
      ) : (
        <div className="tw-space-y-5">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} onDelivered={delivered} />
          ))}
        </div>
      )}

      <LocationCard />

      {!state.loading && !trips.length && (
        <div className="tw-flex tw-justify-center">
          <Link
            to="/account/driver/loads"
            className="tw-inline-flex tw-items-center tw-gap-2 tw-rounded-xl tw-bg-brand-orange tw-px-5 tw-py-2.5 tw-text-sm tw-font-bold tw-text-white tw-shadow-sm hover:tw-bg-brand-orange-dark"
          >
            <PackageSearch size={18} aria-hidden /> پیدا کردن بار
          </Link>
        </div>
      )}
      {trips.map(
        (trip) =>
          trip.listing && (
            <Link
              key={trip.id}
              to={`/account/driver/loads?scope=all&origin=${encodeURIComponent(trip.listing.destination)}`}
              className="tw-group tw-flex tw-items-center tw-gap-3 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-4 tw-shadow-sm hover:tw-border-brand-orange/50"
            >
              <span className="tw-flex tw-h-11 tw-w-11 tw-items-center tw-justify-center tw-rounded-xl tw-bg-brand-orange-soft tw-text-brand-orange">
                <Repeat size={20} aria-hidden />
              </span>
              <span className="tw-min-w-0 tw-flex-1">
                <strong className="tw-block tw-text-sm">بار برگشتی از {trip.listing.destination}</strong>
                <span className="tw-text-xs tw-text-brand-muted">برای خالی برنگشتن، از همین حالا بار مقصد را ببینید</span>
              </span>
              <ChevronLeft size={18} aria-hidden className="tw-text-brand-line group-hover:tw-text-brand-orange" />
            </Link>
          ),
      )}
    </div>
  );
}

export default function DriverTrip() {
  return (
    <DriverShell title="سفر فعال">
      <TripContent />
    </DriverShell>
  );
}
