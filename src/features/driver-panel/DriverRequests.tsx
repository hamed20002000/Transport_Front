import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Navigation, RefreshCw, Undo2 } from 'lucide-react';
import { useDomainRefresh } from 'src/features/ai-agent/hooks/Usedomainrefres';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { CardSkeleton, EmptyState, IconButton, LoadFailed, Pager, PhoneLinks, timeAgo } from 'src/features/company-cargo/components';
import { useNotificationEvent } from 'src/features/company-cargo/notificationSocket';
import { cancelRequest, errorMessage, listMyRequests, type CargoRequest } from './api';
import { ActionButton, LoadFrame, LoadHead, RequestBadge, RouteLine, useAsync, useBrokerView } from './components';
import { LoadSpecs, type ListingChangedEvent } from './DriverLoads';
import DriverShell from './DriverShell';
import { onRequest, useListingContactEvent, useLoadsChangedEvent } from './loadEvents';
import OfferAnswer from './OfferAnswer';
import { useMessageBox } from 'src/shared/components/message-box/MessageBoxProvider';

// What happened last, in the card footer: «فرستاده شد ۲ ساعت پیش» / «قبول شد …».
function lastEvent(request: CargoRequest) {
  if (request.status === 'DELIVERED' && request.deliveredAt) return `تحویل ${timeAgo(request.deliveredAt)}`;
  // reported by the driver, not yet confirmed by the company
  if (request.status === 'ACCEPTED' && request.deliveryReportedAt) return `تحویل اعلام شد ${timeAgo(request.deliveryReportedAt)}؛ منتظر تأیید شرکت حمل‌ونقل`;
  if (request.decidedAt && (request.status === 'ACCEPTED' || request.status === 'REJECTED'))
    return `${request.status === 'ACCEPTED' ? 'قبول' : 'رد'} ${timeAgo(request.decidedAt)}`;
  return `درخواست ${timeAgo(request.createdAt)}`;
}

function RequestCard({
  request,
  busy,
  onCancel,
  onAnswered,
}: {
  request: CargoRequest;
  busy: boolean;
  onCancel: () => void;
  onAnswered: (request: CargoRequest) => void;
}) {
  const broker = useBrokerView();
  const listing = request.listing;
  if (!listing) return null;
  const ended = ['REJECTED', 'CANCELLED', 'DECLINED', 'EXPIRED'].includes(request.status);
  return (
    <LoadFrame
      tone={request.status === 'ACCEPTED' ? 'green' : request.status === 'PENDING' || request.status === 'OFFERED' ? 'orange' : 'sky'}
      head={
        <>
          <LoadHead code={listing.code} at={listing.createdAt} company={listing.companyName} />
          <RequestBadge status={request.status} short />
        </>
      }
      footer={
        <>
          <span className="tw-text-xs tw-text-brand-muted">{lastEvent(request)}</span>
          {request.status === 'OFFERED' && <OfferAnswer requestId={request.id} expiresAt={request.offerExpiresAt} onAnswered={onAnswered} />}
          {request.status === 'PENDING' && (
            <ActionButton variant="danger" onClick={onCancel} busy={busy}>
              <Undo2 size={16} aria-hidden /> لغو درخواست
            </ActionButton>
          )}
          {request.status === 'ACCEPTED' && broker && <span className="tw-text-sm tw-font-bold tw-text-emerald-700">قبول شد؛ راننده را با شرکت حمل‌ونقل هماهنگ کنید</span>}
          {request.status === 'ACCEPTED' && !broker && (
            <Link
              to="/account/driver/trip"
              className="tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-xl tw-bg-emerald-600 tw-px-4 tw-py-2 tw-text-sm tw-font-bold tw-text-white tw-shadow-sm hover:tw-bg-emerald-700"
            >
              <Navigation size={16} aria-hidden /> رفتن به سفر
            </Link>
          )}
        </>
      }
    >
      <div className={ended ? 'tw-opacity-60' : undefined}>
        <RouteLine origin={listing.origin} destination={listing.destination} />
      </div>
      <LoadSpecs load={listing} muted={ended} />
      {request.status === 'ACCEPTED' && <PhoneLinks phones={listing.contactPhones} />}
    </LoadFrame>
  );
}

const steps = [
  { title: 'درخواست', hint: 'از «بارها» روی «درخواست بار» بزنید' },
  { title: 'جواب شرکت حمل‌ونقل', hint: 'قبول یا رد را همین‌جا و در پیام‌رسان می‌بینید' },
  { title: 'سفر', hint: 'موقعیت بفرستید و بعد از تخلیه «تحویل دادم» بزنید' },
];

export function RequestsContent() {
  const toast = useToast();
  const messageBox = useMessageBox();
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState('');
  const state = useAsync(() => listMyRequests(page), [page]);
  // درخواستی که با agent یا از کارت‌های چت فرستاده شد
  useDomainRefresh('driver_loads', state.reload, 'account');
  useLoadsChangedEvent(state.reload);
  useListingContactEvent((contact) => state.setData((current) => current && { ...current, items: current.items.map(onRequest(contact)) }));

  // The company's answer reaches the bots; a status change on a listing is the web signal, so refresh.
  useNotificationEvent<ListingChangedEvent>('cargo-listing-changed', (event) => {
    if (state.data?.items.some((request) => request.listing?.id === event.listingId)) state.reload();
  });

  async function cancel(request: CargoRequest) {
    if (!(await messageBox.confirm({ message: 'درخواست این بار لغو شود؟', tone: 'danger', confirmText: 'لغو درخواست', cancelText: 'نه، بماند' }))) return;
    setBusyId(request.id);
    try {
      const updated = await cancelRequest(request.id);
      state.setData((current) => current && { ...current, items: current.items.map((item) => (item.id === updated.id ? updated : item)) });
      toast.success('درخواست لغو شد.');
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="tw-space-y-6">
      <div className="tw-flex tw-items-end tw-justify-between tw-gap-4">
        <div>
          <p className="tw-text-sm tw-font-bold tw-text-brand-orange-ink">پیگیری</p>
          <h1 className="tw-mt-1 tw-text-2xl tw-font-bold sm:tw-text-3xl">درخواست‌های من</h1>
          <p className="tw-mt-2 tw-text-sm tw-text-brand-muted">وضعیت درخواست‌هایی که برای بارها فرستاده‌اید</p>
        </div>
        <IconButton icon={RefreshCw} label="به‌روزرسانی" onClick={state.reload} spinning={state.loading} />
      </div>

      <ol className="tw-m-0 tw-grid tw-grid-cols-1 tw-list-none tw-gap-3 tw-p-0 sm:tw-grid-cols-3">
        {steps.map((step, i) => (
          <li key={step.title} className="tw-flex tw-items-start tw-gap-3 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-4">
            <span className="tw-flex tw-h-8 tw-w-8 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-bg-brand-navy tw-text-sm tw-font-bold tw-text-brand-orange">
              {(i + 1).toLocaleString('fa-IR')}
            </span>
            <div>
              <strong className="tw-text-sm">{step.title}</strong>
              <p className="tw-m-0 tw-text-xs tw-leading-6 tw-text-brand-muted">{step.hint}</p>
            </div>
          </li>
        ))}
      </ol>

      {state.loading && !state.data ? (
        <div className="tw-grid tw-grid-cols-1 tw-gap-4 md:tw-grid-cols-2" role="status" aria-label="در حال دریافت درخواست‌ها">
          {[0, 1].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : state.failed ? (
        <LoadFailed onRetry={state.reload} />
      ) : !state.data?.items.length ? (
        <EmptyState icon={ClipboardList} title="هنوز درخواستی نداده‌اید" hint="از صفحه «بارها» بار مناسب را پیدا کنید و «درخواست بار» بزنید." />
      ) : (
        <>
          <ul className="tw-m-0 tw-grid tw-grid-cols-1 tw-list-none tw-gap-4 tw-p-0 md:tw-grid-cols-2">
            {state.data.items.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                busy={busyId === request.id}
                onCancel={() => cancel(request)}
                onAnswered={(updated) =>
                  state.setData((current) => current && { ...current, items: current.items.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)) })
                }
              />
            ))}
          </ul>
          <Pager page={state.data.page} total={state.data.total} pageSize={state.data.pageSize} onChange={setPage} />
        </>
      )}
    </div>
  );
}

export default function DriverRequests() {
  return (
    <DriverShell title="درخواست‌ها">
      <RequestsContent />
    </DriverShell>
  );
}
