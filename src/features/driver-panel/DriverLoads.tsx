import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeftRight,
  Banknote,
  CircleCheck,
  Filter,
  Hand,
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
import { errorMessage, listLoads, markAllLoadsRead, requestLoad, type OpenLoad, type Page } from './api';
import { ActionButton, LoadFrame, LoadHead, RequestBadge, RouteLine, useAsync } from './components';
import DriverShell, { reloadUnread } from './DriverShell';
import LoadDetails from './LoadDetails';

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
}: {
  load: OpenLoad;
  fresh?: boolean;
  requesting: boolean;
  onDetails: () => void;
  onRequest: () => void;
}) {
  const taken = load.status === 'TAKEN';
  const status = load.myRequest?.status;
  const canRequest = !taken && (!status || status === 'CANCELLED');
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
          {status && status !== 'CANCELLED' ? (
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

// Request a load and the details dialog, shared by every list of loads.
export function useLoadActions(update: (id: string, patch: Partial<OpenLoad>) => void) {
  const toast = useToast();
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
      toast.success('درخواست شما برای شرکت فرستاده شد؛ جوابش را همین‌جا و در پیام‌رسان خبر می‌دهیم.');
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setRequestingId('');
    }
  }

  const dialog = details && <LoadDetails load={details} onClose={close} onRequest={() => request(details)} requesting={requestingId === details.id} />;
  return { requestingId, request, openDetails: setDetails, dialog };
}

export function patchPage(setData: (fn: (current: Page<OpenLoad> | null) => Page<OpenLoad> | null) => void) {
  return (id: string, patch: Partial<OpenLoad>) =>
    setData((current) => current && { ...current, items: current.items.map((item) => (item.id === id ? { ...item, ...patch } : item)) });
}

// Keeps load cards in step with the company: «برداشته شد» arrives over the socket.
export function useLoadStatusEvents(update: (id: string, patch: Partial<OpenLoad>) => void) {
  useNotificationEvent<{ listingId: string; status: 'OPEN' | 'TAKEN'; takenAt: string | null }>('cargo-status', (event) =>
    update(event.listingId, { status: event.status, takenAt: event.takenAt }),
  );
}

const inputClass =
  'tw-h-11 tw-w-full tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-pe-3 tw-ps-10 tw-text-sm tw-text-brand-navy tw-outline-none tw-transition-colors placeholder:tw-text-brand-muted/70 focus:tw-border-brand-orange focus:tw-ring-4 focus:tw-ring-brand-orange-soft';

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
  useLoadStatusEvents(update);

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
    if (page === 1) state.reload();
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
