import { useEffect, useRef, useState } from 'react';
import {
  Banknote,
  CarFront,
  Clock,
  ExternalLink,
  Fuel,
  Gauge,
  Hand,
  Map as MapIcon,
  MapPinned,
  Package,
  RefreshCw,
  Repeat,
  Route,
  TrafficCone,
  Truck,
  Weight,
  X,
} from 'lucide-react';
import { cn } from 'src/shared/utils/utils';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { IconButton, PhoneLinks, Spec } from 'src/features/company-cargo/components';
import {
  errorMessage,
  getLoadInsight,
  getRouteFuel,
  listReturnLoads,
  type CargoListing,
  type LoadInsight,
  type OpenLoad,
  type RouteFuel,
  type TrafficLevel,
} from './api';
import {
  ActionButton,
  LoadHead,
  Metric,
  RequestBadge,
  RouteLine,
  RouteSketch,
  formatDuration,
  formatKm,
  formatLiters,
  mapLink,
  useAsync,
  type SketchMarker,
} from './components';

const traffic: Record<TrafficLevel, { label: string; tone: string }> = {
  smooth: { label: 'روان', tone: 'tw-text-emerald-700' },
  moderate: { label: 'نیمه‌سنگین', tone: 'tw-text-amber-700' },
  heavy: { label: 'سنگین', tone: 'tw-text-red-700' },
};

function Skeleton() {
  return (
    <div className="tw-animate-pulse tw-space-y-4" role="status" aria-label="در حال محاسبه مسیر">
      <div className="tw-aspect-[2/1] tw-rounded-xl tw-bg-brand-sky" />
      <div className="tw-grid tw-grid-cols-2 tw-gap-3 sm:tw-grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="tw-h-16 tw-rounded-xl tw-bg-brand-sky" />
        ))}
      </div>
    </div>
  );
}

function FuelStations({ listingId, route, onStations }: { listingId: string; route: number; onStations: (fuel: RouteFuel | null) => void }) {
  const toast = useToast();
  const [fuel, setFuel] = useState<RouteFuel | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFuel(null);
    onStations(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route]);

  async function load() {
    setLoading(true);
    try {
      const result = await getRouteFuel(listingId, route);
      setFuel(result);
      onStations(result);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  if (!fuel)
    return (
      <ActionButton variant="secondary" onClick={load} busy={loading}>
        <Fuel size={16} aria-hidden /> {loading ? 'در حال یافتن جایگاه‌ها…' : 'جایگاه‌های سوخت این مسیر'}
      </ActionButton>
    );

  const diesel = fuel.stations.filter((s) => s.diesel !== false);
  return (
    <div className="tw-space-y-3 tw-rounded-xl tw-border tw-border-emerald-200 tw-bg-emerald-50/50 tw-p-4">
      <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-2">
        <strong className="tw-flex tw-items-center tw-gap-1.5 tw-text-sm">
          <Fuel size={16} aria-hidden className="tw-text-emerald-600" /> {fuel.stations.length.toLocaleString('fa-IR')} جایگاه سوخت در مسیر
        </strong>
        {fuel.longestGap && (
          <span className="tw-text-xs tw-text-brand-muted">
            طولانی‌ترین فاصله بی‌جایگاه: <strong className="tw-text-brand-navy">{formatKm(fuel.longestGap.toKm - fuel.longestGap.fromKm)}</strong>
          </span>
        )}
      </div>
      {fuel.coverage !== 'complete' && <p className="tw-m-0 tw-text-xs tw-text-amber-700">اطلاعات جایگاه‌های بخشی از مسیر هنوز کامل نیست.</p>}
      {!!diesel.length && (
        <ol className="tw-m-0 tw-max-h-48 tw-list-none tw-space-y-1.5 tw-overflow-y-auto tw-p-0">
          {diesel.map((station) => (
            <li key={station.id} className="tw-flex tw-items-center tw-justify-between tw-gap-2 tw-rounded-lg tw-bg-white tw-px-3 tw-py-2 tw-text-xs">
              <span className="tw-min-w-0 tw-truncate tw-font-medium">{station.name || 'جایگاه بدون نام'}</span>
              <span className="tw-flex tw-shrink-0 tw-items-center tw-gap-2 tw-text-brand-muted">
                {station.cng && <span className="tw-rounded tw-bg-sky-50 tw-px-1.5 tw-text-sky-700">CNG</span>}
                کیلومتر {Math.round(station.atKm).toLocaleString('fa-IR')}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function ReturnLoads({ listing, counts }: { listing: CargoListing; counts: LoadInsight['returnLoads'] }) {
  const [open, setOpen] = useState(false);
  const state = useAsync(() => (open ? listReturnLoads(listing.id) : Promise.resolve(null)), [open, listing.id]);
  if (!counts.fromDestination)
    return <p className="tw-m-0 tw-text-sm tw-text-brand-muted">فعلاً بار بازی از مقصد این بار ({listing.destination}) نیست.</p>;
  return (
    <div className="tw-space-y-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="tw-flex tw-w-full tw-items-center tw-justify-between tw-gap-3 tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-p-3 tw-text-start hover:tw-border-brand-orange/50"
      >
        <span className="tw-flex tw-items-center tw-gap-2 tw-text-sm">
          <Repeat size={18} aria-hidden className="tw-text-brand-orange" />
          <span>
            <strong>{counts.fromDestination.toLocaleString('fa-IR')} بار برگشتی</strong> از {listing.destination}
            {!!counts.toOrigin && <span className="tw-text-brand-muted"> · {counts.toOrigin.toLocaleString('fa-IR')} بار مستقیم به {listing.origin}</span>}
          </span>
        </span>
        <span className="tw-text-xs tw-font-bold tw-text-brand-orange-ink">{open ? 'بستن' : 'نمایش'}</span>
      </button>
      {open &&
        (state.loading ? (
          <div className="tw-h-16 tw-animate-pulse tw-rounded-xl tw-bg-brand-sky" />
        ) : (
          <ul className="tw-m-0 tw-list-none tw-space-y-2 tw-p-0">
            {state.data?.items.map((item) => (
              <li key={item.id} className="tw-space-y-1.5 tw-rounded-xl tw-bg-brand-bg tw-p-3">
                <div className="tw-flex tw-items-center tw-justify-between tw-gap-2">
                  <div className="tw-min-w-0 tw-flex-1 tw-text-sm">
                    <RouteLine origin={item.origin} destination={item.destination} />
                  </div>
                  {item.toOrigin && <span className="tw-shrink-0 tw-rounded-full tw-bg-emerald-50 tw-px-2 tw-py-0.5 tw-text-[11px] tw-font-bold tw-text-emerald-700">مستقیم برگشت</span>}
                </div>
                <div className="tw-flex tw-flex-wrap tw-gap-1.5">
                  <Spec icon={Truck} label="نوع خودرو" value={item.vehicleType} />
                  <Spec icon={Banknote} label="کرایه" value={item.price} highlight />
                </div>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}

// «مسیر و جزئیات»: everything the driver needs to decide on a load, as in the bot's detail view.
export default function LoadDetails({
  load,
  onClose,
  onRequest,
  requesting,
}: {
  load: OpenLoad;
  onClose: () => void;
  onRequest?: () => void;
  requesting?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const state = useAsync(() => getLoadInsight(load.id), [load.id]);
  const [route, setRoute] = useState(0);
  const [fuel, setFuel] = useState<RouteFuel | null>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [onClose]);

  const insight = state.data;
  const selected = insight?.routes[route];
  const markers: SketchMarker[] = [];
  if (insight?.originPoint) markers.push({ point: insight.originPoint, kind: 'origin', label: load.origin });
  if (insight?.destinationPoint) markers.push({ point: insight.destinationPoint, kind: 'destination', label: load.destination });
  for (const station of fuel?.stations ?? []) markers.push({ point: { lat: station.lat, lng: station.lng }, kind: 'fuel', label: station.name || undefined });
  const directions = insight && mapLink(insight.originPoint, insight.destinationPoint);
  const status = load.myRequest?.status;
  const canRequest = load.status === 'OPEN' && (!status || status === 'CANCELLED');

  return (
    <div
      className="tw-fixed tw-inset-0 tw-z-50 tw-flex tw-items-end tw-justify-center tw-bg-brand-navy/40 sm:tw-items-center sm:tw-p-6"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="load-details-title"
        tabIndex={-1}
        dir="rtl"
        className="tw-flex tw-max-h-[94vh] tw-w-full tw-flex-col tw-overflow-hidden tw-rounded-t-3xl tw-bg-white tw-text-brand-navy tw-shadow-2xl tw-outline-none sm:tw-max-w-3xl sm:tw-rounded-3xl"
      >
        <div className="tw-flex tw-items-start tw-gap-3 tw-border-b tw-border-brand-line tw-px-5 tw-py-4">
          <div className="tw-min-w-0 tw-flex-1 tw-space-y-2">
            <h2 id="load-details-title" className="tw-flex tw-items-center tw-gap-2 tw-text-lg tw-font-bold">
              <MapIcon size={20} aria-hidden className="tw-text-brand-orange" /> مسیر و جزئیات بار
            </h2>
            <LoadHead code={load.code} at={load.createdAt} company={load.companyName} />
          </div>
          <IconButton icon={X} label="بستن" onClick={onClose} />
        </div>

        <div className="tw-flex-1 tw-space-y-5 tw-overflow-y-auto tw-p-5">
          <RouteLine origin={load.origin} destination={load.destination} />
          <div className="tw-flex tw-flex-wrap tw-gap-2">
            <Spec icon={Package} label="نوع بار" value={load.cargoType} />
            <Spec icon={Weight} label="وزن" value={load.weight} />
            <Spec icon={Truck} label="نوع خودرو" value={load.vehicleType} />
            <Spec icon={Banknote} label="کرایه" value={load.price} highlight />
          </div>
          {load.extraNotes && <p className="tw-m-0 tw-rounded-xl tw-bg-brand-bg tw-p-3 tw-text-sm tw-leading-7">{load.extraNotes}</p>}

          {state.loading ? (
            <Skeleton />
          ) : !insight ? (
            <div className="tw-flex tw-items-center tw-justify-between tw-gap-3 tw-rounded-xl tw-border tw-border-dashed tw-border-brand-line tw-p-4 tw-text-sm tw-text-brand-muted">
              مسیر محاسبه نشد.
              <IconButton icon={RefreshCw} label="تلاش مجدد" onClick={state.reload} />
            </div>
          ) : (
            <>
              {insight.routes.length ? (
                <RouteSketch routes={insight.routes.map((r) => r.points)} active={route} markers={markers} />
              ) : (
                <p className="tw-m-0 tw-rounded-xl tw-bg-amber-50 tw-p-3 tw-text-sm tw-text-amber-800">
                  مختصات مبدأ یا مقصد پیدا نشد؛ مسیر قابل محاسبه نیست.
                </p>
              )}

              {insight.routes.length > 1 && (
                <div role="radiogroup" aria-label="انتخاب مسیر" className="tw-flex tw-gap-2 tw-overflow-x-auto tw-pb-1">
                  {insight.routes.map((option, i) => (
                    <button
                      key={i}
                      type="button"
                      role="radio"
                      aria-checked={route === i}
                      onClick={() => setRoute(i)}
                      className={cn(
                        'tw-shrink-0 tw-rounded-xl tw-border tw-px-3 tw-py-2 tw-text-start tw-text-xs tw-transition-colors',
                        route === i ? 'tw-border-brand-orange tw-bg-brand-orange-soft tw-text-brand-orange-ink' : 'tw-border-brand-line tw-bg-white hover:tw-border-brand-orange/50',
                      )}
                    >
                      <div className="tw-font-bold">{option.via ? `از ${option.via}` : `مسیر ${(i + 1).toLocaleString('fa-IR')}`}</div>
                      <div className="tw-text-brand-muted">
                        {formatKm(option.distanceKm)} · {formatDuration(option.truckMinutes)}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selected && (
                <div className="tw-grid tw-grid-cols-2 tw-gap-3 sm:tw-grid-cols-4">
                  <Metric icon={Route} label="مسافت" value={formatKm(selected.distanceKm)} />
                  <Metric icon={Clock} label="زمان رانندگی" value={formatDuration(selected.truckMinutes)} hint="برای کامیون" />
                  <Metric icon={Gauge} label="سوخت تقریبی" value={formatLiters(selected.fuelLiters)} />
                  <Metric
                    icon={TrafficCone}
                    label="ترافیک الان"
                    value={selected.traffic ? traffic[selected.traffic.level].label : 'نامشخص'}
                    hint={selected.traffic?.delayMin ? `${formatDuration(selected.traffic.delayMin)} تأخیر` : undefined}
                  />
                </div>
              )}
              {!!selected?.roads.length && (
                <p className="tw-m-0 tw-text-xs tw-leading-6 tw-text-brand-muted">
                  <strong className="tw-text-brand-navy">جاده‌های اصلی:</strong> {selected.roads.slice(0, 6).join('، ')}
                </p>
              )}

              <div className="tw-grid tw-gap-3 sm:tw-grid-cols-2">
                <div className="tw-flex tw-items-center tw-gap-3 tw-rounded-xl tw-border tw-border-brand-line tw-p-3">
                  <span className="tw-flex tw-h-10 tw-w-10 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-bg-blue-50 tw-text-blue-600">
                    <CarFront size={20} aria-hidden />
                  </span>
                  {insight.driver ? (
                    <div className="tw-text-sm">
                      <div>
                        فاصله شما تا مبدأ: <strong>{formatKm(insight.driver.distanceKm)}</strong>
                      </div>
                      <div className="tw-text-xs tw-text-brand-muted">حدود {formatDuration(insight.driver.durationMin)} رانندگی</div>
                    </div>
                  ) : (
                    <p className="tw-m-0 tw-text-xs tw-leading-6 tw-text-brand-muted">برای دیدن فاصله‌تان تا مبدأ، از صفحه «سفر فعال» یا خانه موقعیت خود را بفرستید.</p>
                  )}
                </div>
                {directions && (
                  <a
                    href={directions}
                    target="_blank"
                    rel="noreferrer"
                    className="tw-flex tw-items-center tw-justify-center tw-gap-2 tw-rounded-xl tw-border tw-border-brand-line tw-p-3 tw-text-sm tw-font-bold tw-text-brand-navy hover:tw-border-brand-orange hover:tw-text-brand-orange-ink"
                  >
                    <MapPinned size={18} aria-hidden /> مسیریابی در نقشه <ExternalLink size={14} aria-hidden />
                  </a>
                )}
              </div>

              {!!insight.routes.length && <FuelStations listingId={load.id} route={route} onStations={setFuel} />}
              <ReturnLoads listing={insight.listing} counts={insight.returnLoads} />
            </>
          )}

          <PhoneLinks phones={load.contactPhones} />
        </div>

        <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3 tw-border-t tw-border-brand-line tw-bg-brand-bg/60 tw-px-5 tw-py-3">
          {status && status !== 'CANCELLED' ? <RequestBadge status={status} /> : <span className="tw-text-xs tw-text-brand-muted">{load.status === 'OPEN' ? 'این بار هنوز باز است' : 'این بار برداشته شده'}</span>}
          {onRequest && canRequest && (
            <ActionButton onClick={onRequest} busy={requesting}>
              <Hand size={16} aria-hidden /> درخواست این بار
            </ActionButton>
          )}
        </div>
      </div>
    </div>
  );
}
