import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeftRight,
  Banknote,
  CircleCheck,
  Filter,
  Hand,
  Hourglass,
  Layers,
  Map as MapIcon,
  MapPin,
  Flag,
  Package,
  PackageSearch,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Truck,
  Weight,
  X,
} from 'lucide-react';
import { useDomainRefresh } from 'src/features/ai-agent/hooks/Usedomainrefres';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { cn } from 'src/shared/utils/utils';
import {
  Badge,
  CardSkeleton,
  EmptyState,
  IconButton,
  LoadFailed,
  Pager,
  PhoneLinks,
  SectionTitle,
  Segmented,
  Spec,
} from 'src/features/company-cargo/components';
import { useNotificationEvent } from 'src/features/company-cargo/notificationSocket';
import { errorMessage, listLoads, markAllLoadsRead, requestLoad, type CargoRequest, type OpenLoad, type Page } from './api';
import OfferAnswer from './OfferAnswer';
import { ActionButton, LoadFrame, LoadHead, RequestBadge, RouteLine, useAsync } from './components';
import DriverShell, { reloadUnread } from './DriverShell';
import LoadDetails from './LoadDetails';
import { useLoadsChangedEvent } from './loadEvents';

export function LoadSpecs({ load, muted }: { load: Pick<OpenLoad, 'cargoType' | 'weight' | 'vehicleType' | 'price'>; muted?: boolean }) {
  return (
    <div className="tw-flex tw-flex-wrap tw-gap-2">
      <Spec icon={Package} label="نوع بار" value={load.cargoType} />
      <Spec icon={Weight} label="وزن" value={load.weight} />
      <Spec icon={Truck} label="نوع خودرو" value={load.vehicleType} />
      <Spec icon={Banknote} label="کرایه" value={load.price} highlight={!muted} />
    </div>
  );
}

// One open load with the driver's actions; used on this page and on the home page.
export function LoadCard({
  load,
  fresh,
  requesting,
  onDetails,
  onRequest,
  onAnswered,
}: {
  load: OpenLoad;
  fresh?: boolean;
  requesting: boolean;
  onDetails: () => void;
  onRequest: () => void;
  // The company handed this load to the driver and the driver answered (OfferAnswer).
  onAnswered?: (request: CargoRequest) => void;
}) {
  const taken = load.status === 'TAKEN';
  const status = load.myRequest?.status;
  const canRequest = !taken && !load.reserved && (!status || status === 'CANCELLED' || status === 'DECLINED' || status === 'EXPIRED');
  return (
    <LoadFrame
      tone={status === 'ACCEPTED' ? 'green' : fresh ? 'orange' : 'sky'}
      head={
        <>
          <LoadHead code={load.code} at={load.createdAt} company={load.companyName} />
          {taken ? (
            <Badge tone="muted">
              <CircleCheck size={12} aria-hidden /> برداشته شد
            </Badge>
          ) : load.reserved ? (
            <Badge tone="muted">
              <Hourglass size={12} aria-hidden /> رزرو شده
            </Badge>
          ) : (
            fresh && <Badge tone="orange">تازه</Badge>
          )}
        </>
      }
      footer={
        <>
          <ActionButton variant="secondary" onClick={onDetails}>
            <MapIcon size={16} aria-hidden /> مسیر و جزئیات
          </ActionButton>
          {status === 'OFFERED' && load.myRequest && onAnswered ? (
            <OfferAnswer requestId={load.myRequest.id} expiresAt={load.myRequest.offerExpiresAt} onAnswered={onAnswered} />
          ) : status && !['CANCELLED', 'DECLINED', 'EXPIRED'].includes(status) ? (
            <RequestBadge status={status} />
          ) : (
            canRequest && (
              <ActionButton onClick={onRequest} busy={requesting}>
                <Hand size={16} aria-hidden /> درخواست بار
              </ActionButton>
            )
          )}
        </>
      }
    >
      <div className={cn(taken && 'tw-opacity-60')}>
        <RouteLine origin={load.origin} destination={load.destination} />
      </div>
      <LoadSpecs load={load} muted={taken} />
      {load.extraNotes && <p className="tw-m-0 tw-line-clamp-2 tw-text-sm tw-leading-7 tw-text-brand-muted">{load.extraNotes}</p>}
      {!taken && <PhoneLinks phones={load.contactPhones} />}
    </LoadFrame>
  );
}

// Request a load and the details dialog, shared by every list of loads (and the agent chat, which
// shows the outcome itself and lifts the dialog above its panel).
export function useLoadActions(
  update: (id: string, patch: Partial<OpenLoad>) => void,
  options: { notify?: { success: (message: string) => void; error: (message: string) => void }; dialogLayer?: number; onChanged?: () => void } = {},
) {
  const toast = useToast();
  const say = options.notify ?? { success: (message: string) => toast.success(message), error: (message: string) => toast.error(message) };
  const [requestingId, setRequestingId] = useState('');
  const [details, setDetails] = useState<OpenLoad | null>(null);
  const close = useCallback(() => setDetails(null), []);

  async function request(load: OpenLoad) {
    setRequestingId(load.id);
    try {
      const created = await requestLoad(load.id);
      const patch = { myRequest: { id: created.id, status: created.status } };
      update(load.id, patch);
      setDetails((current) => (current?.id === load.id ? { ...current, ...patch } : current));
      say.success('درخواست شما برای شرکت فرستاده شد؛ جوابش را همین‌جا و در پیام‌رسان خبر می‌دهیم.');
      options.onChanged?.();
    } catch (error) {
      say.error(errorMessage(error));
    } finally {
      setRequestingId('');
    }
  }

  const dialog = details && (
    <LoadDetails load={details} layer={options.dialogLayer} onClose={close} onRequest={() => request(details)} requesting={requestingId === details.id} />
  );
  return { requestingId, request, openDetails: setDetails, dialog };
}

export function patchPage(setData: (fn: (current: Page<OpenLoad> | null) => Page<OpenLoad> | null) => void) {
  return (id: string, patch: Partial<OpenLoad>) =>
    setData((current) => current && { ...current, items: current.items.map((item) => (item.id === id ? { ...item, ...patch } : item)) });
}

export interface ListingChangedEvent {
  listingId: string;
  status: 'OPEN' | 'TAKEN';
  takenAt: string | null;
}

// Keeps load cards in step with the company. The event goes to every driver, not only the ones the
// listing was announced to, so a load that missed this driver's filters (or that they published
// themselves) still shows up or flips to «برداشته شد». `onOpened` gets loads that are not on screen yet.
export function useLoadStatusEvents(
  update: (id: string, patch: Partial<OpenLoad>) => void,
  items: OpenLoad[] | undefined,
  onOpened: () => void,
) {
  useNotificationEvent<ListingChangedEvent>('cargo-listing-changed', (event) => {
    if (items?.some((item) => item.id === event.listingId)) update(event.listingId, { status: event.status, takenAt: event.takenAt });
    else if (event.status === 'OPEN') onOpened();
  });
}

const inputClass =
  'tw-h-11 tw-w-full tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-pe-3 tw-ps-10 tw-text-sm tw-text-brand-navy tw-outline-none tw-transition-colors placeholder:tw-text-brand-muted/70 focus:tw-border-brand-orange';

function LoadsContent() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const origin = params.get('origin') ?? '';
  const destination = params.get('destination') ?? '';
  const scope = params.get('scope') === 'all' ? 'all' : 'mine';
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState({ origin, destination });
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const state = useAsync(() => listLoads({ page, origin, destination, matchFilters: scope === 'mine' }), [page, origin, destination, scope]);
  const update = patchPage(state.setData);
  const actions = useLoadActions(update);
  useLoadStatusEvents(update, state.data?.items, () => page === 1 && state.reload());
  useLoadsChangedEvent(state.reload);
  // درخواست یا جستجویی که با agent انجام شد
  useDomainRefresh('driver_loads', state.reload, 'account');

  useEffect(() => setDraft({ origin, destination }), [origin, destination]);

  // Opening the list counts as seeing the new loads.
  useEffect(() => {
    markAllLoadsRead()
      .then(reloadUnread)
      .catch(() => undefined);
  }, []);

  useNotificationEvent<{ kind: 'suggestion' | 'listing'; listing?: { id: string } | null }>('cargo-notification', (event) => {
    if (event.kind !== 'listing') return;
    toast.info('بار تازه‌ای اعلام شد.');
    if (event.listing?.id) setFreshIds((ids) => new Set(ids).add(event.listing!.id));
    // the list itself reloads on cargo-listing-changed
    markAllLoadsRead()
      .then(reloadUnread)
      .catch(() => undefined);
  });

  function setQuery(next: Record<string, string>) {
    const merged = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value) merged.set(key, value);
      else merged.delete(key);
    }
    merged.delete('unread');
    setParams(merged, { replace: true });
    setPage(1);
  }

  function search(event: FormEvent) {
    event.preventDefault();
    setQuery({ origin: draft.origin.trim(), destination: draft.destination.trim() });
  }

  const searching = !!(origin || destination);

  return (
    <div className="tw-space-y-6">
      <div className="tw-flex tw-items-end tw-justify-between tw-gap-4">
        <div>
          <p className="tw-text-sm tw-font-bold tw-text-brand-orange-ink">پیدا کردن بار</p>
          <h1 className="tw-mt-1 tw-text-2xl tw-font-bold sm:tw-text-3xl">بارهای اعلام‌شده</h1>
          <p className="tw-mt-2 tw-text-sm tw-text-brand-muted">بارهای باز شرکت‌ها را ببینید، مسیر و کرایه را بسنجید و درخواست بدهید</p>
        </div>
        <IconButton icon={RefreshCw} label="به‌روزرسانی" onClick={state.reload} spinning={state.loading} />
      </div>

      <form onSubmit={search} className="tw-grid tw-gap-3 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-4 tw-shadow-sm sm:tw-grid-cols-[1fr_auto_1fr_auto] sm:tw-items-center">
        <label className="tw-relative tw-block">
          <span className="tw-sr-only">مبدأ</span>
          <MapPin size={18} aria-hidden className="tw-absolute tw-right-3 tw-top-1/2 -tw-translate-y-1/2 tw-text-brand-orange" />
          <input value={draft.origin} onChange={(e) => setDraft({ ...draft, origin: e.target.value })} placeholder="مبدأ، مثلاً تهران" maxLength={100} className={inputClass} />
        </label>
        <button
          type="button"
          title="جابه‌جایی مبدأ و مقصد"
          aria-label="جابه‌جایی مبدأ و مقصد"
          onClick={() => setDraft({ origin: draft.destination, destination: draft.origin })}
          className="tw-hidden tw-h-9 tw-w-9 tw-items-center tw-justify-center tw-rounded-full tw-border tw-border-brand-line tw-bg-white tw-text-brand-muted hover:tw-text-brand-orange sm:tw-flex"
        >
          <ArrowLeftRight size={16} aria-hidden />
        </button>
        <label className="tw-relative tw-block">
          <span className="tw-sr-only">مقصد</span>
          <Flag size={18} aria-hidden className="tw-absolute tw-right-3 tw-top-1/2 -tw-translate-y-1/2 tw-text-brand-navy" />
          <input value={draft.destination} onChange={(e) => setDraft({ ...draft, destination: e.target.value })} placeholder="مقصد، مثلاً مشهد" maxLength={100} className={inputClass} />
        </label>
        <div className="tw-flex tw-gap-2">
          <button type="submit" className="tw-inline-flex tw-h-11 tw-flex-1 tw-items-center tw-justify-center tw-gap-1.5 tw-rounded-xl tw-bg-brand-navy tw-px-5 tw-text-sm tw-font-bold tw-text-white hover:tw-bg-brand-navy/90">
            <Search size={17} aria-hidden /> جستجو
          </button>
          {searching && <IconButton icon={X} label="پاک کردن جستجو" onClick={() => setQuery({ origin: '', destination: '' })} />}
        </div>
      </form>

      <SectionTitle
        title={searching ? 'نتیجه جستجو' : 'بارهای باز'}
        hint={state.data ? `${state.data.total.toLocaleString('fa-IR')} بار` : undefined}
        side={
          <div className="tw-flex tw-items-center tw-gap-2">
            <Segmented
              label="دامنه نمایش"
              value={scope}
              onChange={(value) => setQuery({ scope: value === 'all' ? 'all' : '' })}
              options={[
                { value: 'mine', label: 'مطابق فیلترهای من', icon: Filter },
                { value: 'all', label: 'همه بارها', icon: Layers },
              ]}
            />
            <Link
              to="/account/driver/filters"
              title="تنظیمات نمایش بار"
              aria-label="تنظیمات نمایش بار"
              className="tw-inline-flex tw-h-10 tw-w-10 tw-items-center tw-justify-center tw-rounded-full tw-border tw-border-brand-line tw-bg-white tw-text-brand-navy tw-shadow-sm hover:tw-border-brand-orange hover:tw-text-brand-orange"
            >
              <SlidersHorizontal size={18} aria-hidden />
            </Link>
          </div>
        }
      />

      {state.loading && !state.data ? (
        <div className="tw-grid tw-gap-4 md:tw-grid-cols-2" role="status" aria-label="در حال دریافت بارها">
          {[0, 1, 2, 3].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : state.failed ? (
        <LoadFailed onRetry={state.reload} />
      ) : !state.data?.items.length ? (
        <EmptyState
          icon={PackageSearch}
          title={searching ? 'باری با این مسیر پیدا نشد' : 'فعلاً بار بازی نیست'}
          hint={
            scope === 'mine'
              ? 'فقط بارهایی نمایش داده می‌شوند که با فیلترهای شما جورند. «همه بارها» را امتحان کنید یا فیلترها را باز کنید.'
              : 'به محض اینکه شرکتی بار تازه اعلام کند، همین‌جا و در پیام‌رسان‌هایتان خبر می‌دهیم.'
          }
        />
      ) : (
        <>
          <ul className={cn('tw-m-0 tw-grid tw-list-none tw-gap-4 tw-p-0 md:tw-grid-cols-2', state.loading && 'tw-opacity-60')}>
            {state.data.items.map((load) => (
              <LoadCard
                key={load.id}
                load={load}
                fresh={freshIds.has(load.id)}
                requesting={actions.requestingId === load.id}
                onDetails={() => actions.openDetails(load)}
                onRequest={() => actions.request(load)}
                onAnswered={(request) => update(load.id, { myRequest: { id: request.id, status: request.status } })}
              />
            ))}
          </ul>
          <Pager page={state.data.page} total={state.data.total} pageSize={state.data.pageSize} onChange={setPage} />
        </>
      )}
      {actions.dialog}
    </div>
  );
}

export default function DriverLoads() {
  return (
    <DriverShell title="بارها">
      <LoadsContent />
    </DriverShell>
  );
}
