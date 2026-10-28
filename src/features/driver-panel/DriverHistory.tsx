import { useEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowDownWideNarrow, Building2, CalendarRange, CheckCircle2, FilterX, History, Home, Layers, PlaneLanding, PlaneTakeoff, RefreshCw, Search, Timer } from 'lucide-react';
import { tripTypeLabels, type TripType } from 'src/features/company-cargo/api';
import { CardSkeleton, EmptyState, IconButton, LoadFailed, Pager, Segmented, StatTile, formatDate } from 'src/features/company-cargo/components';
import { tripHistory, type CargoRequest, type TripHistoryFilters } from './api';
import { LoadFrame, LoadHead, RouteLine, useAsync } from './components';
import { LoadSpecs } from './DriverLoads';
import DriverShell from './DriverShell';
import { onRequest, useListingContactEvent, useLoadsChangedEvent } from './loadEvents';

const fa = (value: number) => value.toLocaleString('fa-IR');

const periods = [
  { days: 0, label: 'همهٔ زمان‌ها' },
  { days: 30, label: '۳۰ روز اخیر' },
  { days: 90, label: '۳ ماه اخیر' },
  { days: 180, label: '۶ ماه اخیر' },
  { days: 365, label: 'یک سال اخیر' },
];

const tripTypeIcons = { DOMESTIC: Home, EXPORT: PlaneTakeoff, IMPORT: PlaneLanding } as const;

// From the company's acceptance to the delivery: «۳ روز و ۴ ساعت».
function tripLength(request: CargoRequest): string | null {
  if (!request.decidedAt || !request.deliveredAt) return null;
  const hours = Math.round((new Date(request.deliveredAt).getTime() - new Date(request.decidedAt).getTime()) / 3_600_000);
  if (hours < 1) return 'کمتر از یک ساعت';
  if (hours < 24) return `${fa(hours)} ساعت`;
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return rest ? `${fa(days)} روز و ${fa(rest)} ساعت` : `${fa(days)} روز`;
}

function TripCard({ request }: { request: CargoRequest }) {
  const listing = request.listing;
  if (!listing) return null;
  const TypeIcon = tripTypeIcons[listing.tripType];
  const length = tripLength(request);
  return (
    <LoadFrame
      head={
        <>
          <LoadHead code={listing.code} at={request.deliveredAt ?? request.createdAt} company={listing.companyName} />
          <span className="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-full tw-bg-white tw-px-2.5 tw-py-1 tw-text-xs tw-font-medium tw-text-brand-navy">
            <TypeIcon size={13} aria-hidden /> {tripTypeLabels[listing.tripType]}
          </span>
        </>
      }
      footer={
        <>
          <span className="tw-inline-flex tw-items-center tw-gap-1.5 tw-text-xs tw-text-emerald-700">
            <CheckCircle2 size={14} aria-hidden /> تحویل {formatDate(request.deliveredAt)}
          </span>
          {length && (
            <span className="tw-inline-flex tw-items-center tw-gap-1.5 tw-text-xs tw-text-brand-muted" title="از قبول شرکت حمل‌ونقل تا تحویل">
              <Timer size={14} aria-hidden /> {length}
            </span>
          )}
        </>
      }
    >
      <RouteLine origin={listing.origin} destination={listing.destination} />
      <LoadSpecs load={listing} />
    </LoadFrame>
  );
}

const selectClass =
  'tw-h-10 tw-min-w-0 tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-3 tw-text-sm tw-text-brand-navy focus:tw-border-brand-orange focus:tw-outline-none';

function Labeled({ icon: Icon, label, children }: { icon: typeof Search; label: string; children: ReactNode }) {
  return (
    <label className="tw-flex tw-min-w-0 tw-flex-col tw-gap-1.5">
      <span className="tw-inline-flex tw-items-center tw-gap-1 tw-text-xs tw-font-medium tw-text-brand-muted">
        <Icon size={13} aria-hidden /> {label}
      </span>
      {children}
    </label>
  );
}

function HistoryContent() {
  // Filters live in the URL: a refresh or «back» keeps them.
  const [params, setParams] = useSearchParams();
  const page = Math.max(Number(params.get('page')) || 1, 1);
  const tripType = (params.get('type') as TripType | null) ?? undefined;
  const filters: TripHistoryFilters = {
    q: params.get('q') ?? undefined,
    tripType: tripType && tripType in tripTypeLabels ? tripType : undefined,
    companyId: params.get('company') ?? undefined,
    days: Number(params.get('days')) || undefined,
    order: params.get('order') === 'oldest' ? 'oldest' : undefined,
  };
  const key = params.toString();

  function update(changes: Record<string, string | undefined>) {
    const next = new URLSearchParams(params);
    for (const [name, value] of Object.entries(changes)) {
      if (value) next.set(name, value);
      else next.delete(name);
    }
    // any filter change starts again from the first page
    if (!('page' in changes)) next.delete('page');
    setParams(next, { replace: true });
  }

  // Typing waits a moment before it searches.
  const [query, setQuery] = useState(filters.q ?? '');
  useEffect(() => {
    if (query === (filters.q ?? '')) return;
    const timer = setTimeout(() => update({ q: query.trim() || undefined }), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const state = useAsync(() => tripHistory(page, filters), [key]);
  // a delivery the company just confirmed shows up here
  useLoadsChangedEvent(state.reload);
  useListingContactEvent((contact) => state.setData((current) => current && { ...current, items: current.items.map(onRequest(contact)) }));

  const counts = state.data?.byTripType;
  const total = counts ? counts.DOMESTIC + counts.EXPORT + counts.IMPORT : undefined;
  const filtered = !!(filters.q || filters.tripType || filters.companyId || filters.days);

  return (
    <div className="tw-space-y-6">
      <div className="tw-flex tw-items-end tw-justify-between tw-gap-4">
        <div>
          <p className="tw-text-sm tw-font-bold tw-text-brand-orange-ink">کارنامه</p>
          <h1 className="tw-mt-1 tw-text-2xl tw-font-bold sm:tw-text-3xl">سفرهای رفته</h1>
          <p className="tw-mt-2 tw-text-sm tw-text-brand-muted">بارهایی که تحویل داده‌اید و شرکت حمل‌ونقل تحویلشان را ثبت کرده است</p>
        </div>
        <IconButton icon={RefreshCw} label="به‌روزرسانی" onClick={state.reload} spinning={state.loading} />
      </div>

      <div className="tw-grid tw-grid-cols-2 tw-gap-3 md:tw-grid-cols-4">
        <StatTile icon={History} label={filtered && !filters.tripType ? 'سفر با این فیلترها' : 'همهٔ سفرها'} value={total} accent />
        <StatTile icon={Home} label="داخلی" value={counts?.DOMESTIC} />
        <StatTile icon={PlaneTakeoff} label="صادراتی" value={counts?.EXPORT} />
        <StatTile icon={PlaneLanding} label="وارداتی" value={counts?.IMPORT} />
      </div>

      <section aria-label="فیلتر سفرها" className="tw-space-y-4 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-4 tw-shadow-sm">
        <div className="tw-relative">
          <Search size={16} aria-hidden className="tw-pointer-events-none tw-absolute tw-right-3 tw-top-1/2 -tw-translate-y-1/2 tw-text-brand-muted" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="جست‌وجو در کد بار، مبدأ، مقصد یا نام شرکت حمل‌ونقل"
            aria-label="جست‌وجو"
            className="tw-h-11 tw-w-full tw-rounded-xl tw-border tw-border-brand-line tw-bg-brand-bg tw-pl-3 tw-pr-9 tw-text-sm focus:tw-border-brand-orange focus:tw-bg-white focus:tw-outline-none"
          />
        </div>

        <div className="tw-overflow-x-auto">
          <Segmented
            label="نوع حمل"
            value={filters.tripType ?? 'ALL'}
            onChange={(value) => update({ type: value === 'ALL' ? undefined : value })}
            options={[
              { value: 'ALL', label: 'همه', icon: Layers },
              ...(Object.keys(tripTypeLabels) as TripType[]).map((type) => ({
                value: type,
                label: counts ? `${tripTypeLabels[type]} (${fa(counts[type])})` : tripTypeLabels[type],
                icon: tripTypeIcons[type],
              })),
            ]}
          />
        </div>

        <div className="tw-grid tw-grid-cols-1 tw-gap-3 sm:tw-grid-cols-3">
          <Labeled icon={CalendarRange} label="زمان تحویل">
            <select className={selectClass} value={filters.days ?? 0} onChange={(event) => update({ days: event.target.value === '0' ? undefined : event.target.value })}>
              {periods.map((period) => (
                <option key={period.days} value={period.days}>
                  {period.label}
                </option>
              ))}
            </select>
          </Labeled>
          <Labeled icon={Building2} label="شرکت حمل‌ونقل">
            <select className={selectClass} value={filters.companyId ?? ''} onChange={(event) => update({ company: event.target.value || undefined })}>
              <option value="">همهٔ شرکت‌های حمل‌ونقل</option>
              {state.data?.companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {`${company.name || 'بدون نام'} (${fa(company.trips)} سفر)`}
                </option>
              ))}
            </select>
          </Labeled>
          <Labeled icon={ArrowDownWideNarrow} label="ترتیب">
            <select className={selectClass} value={filters.order ?? 'newest'} onChange={(event) => update({ order: event.target.value === 'oldest' ? 'oldest' : undefined })}>
              <option value="newest">جدیدترین اول</option>
              <option value="oldest">قدیمی‌ترین اول</option>
            </select>
          </Labeled>
        </div>

        {filtered && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              update({ q: undefined, type: undefined, company: undefined, days: undefined });
            }}
            className="tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-3 tw-py-2 tw-text-xs tw-text-brand-navy hover:tw-border-brand-orange hover:tw-text-brand-orange"
          >
            <FilterX size={14} aria-hidden /> پاک کردن فیلترها
          </button>
        )}
      </section>

      {state.loading && !state.data ? (
        <div className="tw-grid tw-grid-cols-1 tw-gap-4 md:tw-grid-cols-2" role="status" aria-label="در حال دریافت سفرها">
          {[0, 1, 2, 3].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : state.failed ? (
        <LoadFailed onRetry={state.reload} />
      ) : !state.data?.items.length ? (
        filtered ? (
          <EmptyState icon={FilterX} title="سفری با این فیلترها نیست" hint="فیلترها را تغییر دهید یا «پاک کردن فیلترها» را بزنید." />
        ) : (
          <EmptyState icon={History} title="هنوز سفری تحویل نداده‌اید" hint="بعد از اینکه شرکت حمل‌ونقل تحویل بار را ثبت کند، سفر اینجا می‌آید." />
        )
      ) : (
        <>
          <p className="tw-m-0 tw-text-xs tw-text-brand-muted">{fa(state.data.total)} سفر</p>
          <ul className="tw-m-0 tw-grid tw-grid-cols-1 tw-list-none tw-gap-4 tw-p-0 md:tw-grid-cols-2">
            {state.data.items.map((request) => (
              <TripCard key={request.id} request={request} />
            ))}
          </ul>
          <Pager page={state.data.page} total={state.data.total} pageSize={state.data.pageSize} onChange={(next) => update({ page: next > 1 ? String(next) : undefined })} />
        </>
      )}
    </div>
  );
}

export default function DriverHistory() {
  return (
    <DriverShell title="سفرهای رفته">
      <HistoryContent />
    </DriverShell>
  );
}
