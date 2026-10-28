import { createContext, useCallback, useContext, useEffect, useId, useState, type ReactNode } from 'react';
import {
  Ban,
  Building2,
  CircleCheck,
  CircleX,
  Clock,
  Hourglass,
  Navigation,
  Send,
  type LucideIcon,
} from 'lucide-react';
import { CargoPicture } from 'src/features/company-cargo/cargoDisplay';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { cn } from 'src/shared/utils/utils';
import { CargoCode, RouteLine, timeAgo, formatDate } from 'src/features/company-cargo/components';
import { errorMessage, type GeoPoint, type RequestStatus } from './api';

const fa = (value: number, digits = 0) => value.toLocaleString('fa-IR', { maximumFractionDigits: digits });

export const formatKm = (km: number) => `${fa(km < 10 ? Math.round(km * 10) / 10 : Math.round(km), 1)} کیلومتر`;
export const formatLiters = (liters: number) => `${fa(Math.round(liters))} لیتر`;

// 330 → "۵ ساعت و ۳۰ دقیقه"
export function formatDuration(minutes: number) {
  const total = Math.max(1, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (!hours) return `${fa(rest)} دقیقه`;
  return rest ? `${fa(hours)} ساعت و ${fa(rest)} دقیقه` : `${fa(hours)} ساعت`;
}

// Loads `load()` whenever `deps` change; failures are toasted and kept for a retry button.
export function useAsync<T>(load: () => Promise<T>, deps: unknown[]) {
  const toast = useToast();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    load()
      .then((value) => active && setData(value))
      .catch((error) => {
        if (!active) return;
        setFailed(true);
        toast.error(errorMessage(error));
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { data, setData, loading, failed, reload };
}

export const requestStatus: Record<RequestStatus, { label: string; icon: LucideIcon; tone: string }> = {
  PENDING: { label: 'در انتظار جواب شرکت حمل‌ونقل', icon: Hourglass, tone: 'tw-bg-amber-50 tw-text-amber-700 tw-ring-amber-200' },
  OFFERED: { label: 'شرکت حمل‌ونقل بار را به شما سپرده · منتظر تأیید شما', icon: Send, tone: 'tw-bg-brand-orange-soft tw-text-brand-orange-ink tw-ring-brand-orange/40' },
  ACCEPTED: { label: 'قبول شد · سفر فعال', icon: Navigation, tone: 'tw-bg-emerald-50 tw-text-emerald-700 tw-ring-emerald-200' },
  REJECTED: { label: 'رد شد', icon: CircleX, tone: 'tw-bg-red-50 tw-text-red-700 tw-ring-red-200' },
  DECLINED: { label: 'نپذیرفتید', icon: Ban, tone: 'tw-bg-stone-100 tw-text-brand-muted tw-ring-stone-200' },
  EXPIRED: { label: 'مهلت تأیید تمام شد', icon: Hourglass, tone: 'tw-bg-stone-100 tw-text-brand-muted tw-ring-stone-200' },
  CANCELLED: { label: 'لغو کردید', icon: Ban, tone: 'tw-bg-stone-100 tw-text-brand-muted tw-ring-stone-200' },
  DELIVERED: { label: 'تحویل شد', icon: CircleCheck, tone: 'tw-bg-brand-sky tw-text-brand-navy tw-ring-brand-line' },
};

export function RequestBadge({ status, short }: { status: RequestStatus; short?: boolean }) {
  const { label, icon: Icon, tone } = requestStatus[status];
  return (
    <span className={cn('tw-inline-flex tw-items-center tw-gap-1 tw-whitespace-nowrap tw-rounded-full tw-px-3 tw-py-1 tw-text-xs tw-font-bold tw-ring-1', tone)}>
      <Icon size={12} aria-hidden />
      {short ? label.split(' · ')[0] : label}
    </span>
  );
}

/**
 * The broker panel (واسط) shows the driver's lists of loads and requests: it requests loads like a driver but has no
 * trips, filters page or location, so their links are hidden there.
 */
export const BrokerView = createContext(false);
export const useBrokerView = () => useContext(BrokerView);

// Card frame shared by loads, requests and trips: tinted head, body, action footer.
export function LoadFrame({
  tone = 'sky',
  head,
  children,
  footer,
  as: Tag = 'li',
  image,
}: {
  tone?: 'sky' | 'orange' | 'green';
  head: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  as?: 'li' | 'article';
  // the load's picture when the driver sees loads as pictures (useCargoDisplay)
  image?: { src: string; alt: string };
}) {
  const tones = {
    sky: 'tw-border-brand-line [&>div:first-child]:tw-bg-brand-sky/60',
    orange: 'tw-border-brand-orange/50 [&>div:first-child]:tw-bg-brand-orange-soft/60',
    green: 'tw-border-emerald-300 [&>div:first-child]:tw-bg-emerald-50',
  };
  return (
    <Tag className={cn('tw-flex tw-flex-col tw-overflow-hidden tw-rounded-2xl tw-border tw-bg-white tw-shadow-sm tw-transition-shadow hover:tw-shadow-md', tones[tone])}>
      <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-2 tw-px-5 tw-py-3">{head}</div>
      {image ? (
        <div className="tw-flex tw-flex-1 tw-items-start tw-gap-4 tw-p-5">
          <CargoPicture src={image.src} alt={image.alt} />
          <div className="tw-min-w-0 tw-flex-1 tw-space-y-4">{children}</div>
        </div>
      ) : (
        <div className="tw-flex-1 tw-space-y-4 tw-p-5">{children}</div>
      )}
      {footer && <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3 tw-border-t tw-border-brand-line tw-px-5 tw-py-3">{footer}</div>}
    </Tag>
  );
}

// Code chip, age and publishing company: the left side of every load card head.
export function LoadHead({ code, at, company }: { code?: string | null; at: string; company?: string | null }) {
  return (
    <div className="tw-flex tw-min-w-0 tw-flex-wrap tw-items-center tw-gap-2">
      <CargoCode code={code} />
      <time dateTime={at} title={formatDate(at)} className="tw-inline-flex tw-items-center tw-gap-1 tw-text-xs tw-text-brand-muted">
        <Clock size={13} aria-hidden /> {timeAgo(at)}
      </time>
      {company && (
        <span className="tw-inline-flex tw-min-w-0 tw-items-center tw-gap-1 tw-text-xs tw-font-medium tw-text-brand-navy">
          <Building2 size={13} aria-hidden className="tw-shrink-0 tw-text-brand-muted" />
          <span className="tw-truncate">{company}</span>
        </span>
      )}
    </div>
  );
}

export { RouteLine };

export function ActionButton({
  children,
  onClick,
  disabled,
  variant = 'primary',
  busy,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  busy?: boolean;
}) {
  const variants = {
    primary: 'tw-bg-brand-orange tw-text-white hover:tw-bg-brand-orange-dark tw-shadow-sm',
    success: 'tw-bg-emerald-600 tw-text-white hover:tw-bg-emerald-700 tw-shadow-sm',
    secondary: 'tw-border tw-border-brand-line tw-bg-white tw-text-brand-navy hover:tw-bg-brand-sky',
    danger: 'tw-border tw-border-red-200 tw-bg-white tw-text-red-700 hover:tw-bg-red-50',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cn(
        'tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-xl tw-px-4 tw-py-2 tw-text-sm tw-font-bold tw-transition-colors disabled:tw-cursor-not-allowed disabled:tw-opacity-60',
        variants[variant],
        busy && 'tw-animate-pulse',
      )}
    >
      {children}
    </button>
  );
}

export function Metric({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: string; hint?: string }) {
  return (
    <div className="tw-flex tw-items-center tw-gap-3 tw-rounded-xl tw-bg-brand-bg tw-p-3">
      <span className="tw-flex tw-h-9 tw-w-9 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-lg tw-bg-white tw-text-brand-navy tw-shadow-sm">
        <Icon size={18} aria-hidden />
      </span>
      <div className="tw-min-w-0">
        <div className="tw-text-xs tw-text-brand-muted">{label}</div>
        <div className="tw-text-sm tw-font-bold tw-leading-snug">{value}</div>
        {hint && <div className="tw-truncate tw-text-[11px] tw-text-brand-muted">{hint}</div>}
      </div>
    </div>
  );
}

export function mapLink(from: GeoPoint | null, to: GeoPoint | null) {
  if (!to) return null;
  const point = (p: GeoPoint) => `${p.lat},${p.lng}`;
  return from
    ? `https://www.google.com/maps/dir/?api=1&origin=${point(from)}&destination=${point(to)}&travelmode=driving`
    : `https://www.google.com/maps/search/?api=1&query=${point(to)}`;
}

export interface SketchMarker {
  point: GeoPoint;
  kind: 'origin' | 'destination' | 'driver' | 'fuel';
  label?: string;
}

// A light route drawing (no tile server): routes projected into an SVG box, origin/destination pins,
// the driver's position and fuel stations. `active` is drawn on top in orange.
export function RouteSketch({ routes, active = 0, markers, className }: { routes: GeoPoint[][]; active?: number; markers: SketchMarker[]; className?: string }) {
  const gridId = useId();
  const all = [...routes.flat(), ...markers.map((m) => m.point)];
  if (all.length < 2) return null;

  const width = 600;
  const height = 300;
  const pad = 28;
  const lats = all.map((p) => p.lat);
  const lngs = all.map((p) => p.lng);
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const kx = Math.cos((midLat * Math.PI) / 180);
  const minX = Math.min(...lngs) * kx;
  const maxX = Math.max(...lngs) * kx;
  const minY = Math.min(...lats);
  const maxY = Math.max(...lats);
  const scale = Math.min((width - pad * 2) / Math.max(maxX - minX, 1e-6), (height - pad * 2) / Math.max(maxY - minY, 1e-6));
  const offsetX = (width - (maxX - minX) * scale) / 2;
  const offsetY = (height - (maxY - minY) * scale) / 2;
  const project = (p: GeoPoint) => [offsetX + (p.lng * kx - minX) * scale, height - (offsetY + (p.lat - minY) * scale)] as const;
  const path = (points: GeoPoint[]) => points.map((p, i) => `${i ? 'L' : 'M'}${project(p).map((n) => n.toFixed(1)).join(',')}`).join(' ');
  const order = routes.map((_, i) => i).filter((i) => i !== active);
  if (routes[active]) order.push(active);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="طرح مسیر روی نقشه" className={cn('tw-block tw-h-auto tw-w-full tw-rounded-xl tw-bg-[#EEF3FB]', className)}>
      <defs>
        <pattern id={gridId} width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M30 0H0V30" fill="none" stroke="#DCE5F3" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={width} height={height} fill={`url(#${gridId})`} />
      {order.map((i) => (
        <g key={i}>
          <path d={path(routes[i])} fill="none" stroke="#fff" strokeWidth={i === active ? 9 : 6} strokeLinecap="round" strokeLinejoin="round" />
          <path
            d={path(routes[i])}
            fill="none"
            stroke={i === active ? '#F5761A' : '#9AA8C4'}
            strokeWidth={i === active ? 5 : 3}
            strokeDasharray={i === active ? undefined : '6 6'}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      ))}
      {markers.map((marker, i) => {
        const [x, y] = project(marker.point);
        if (marker.kind === 'fuel')
          return (
            <g key={i}>
              <title>{marker.label || 'جایگاه سوخت'}</title>
              <circle cx={x} cy={y} r={5.5} fill="#10B981" stroke="#fff" strokeWidth={2} />
            </g>
          );
        if (marker.kind === 'driver')
          return (
            <g key={i}>
              <title>{marker.label || 'موقعیت شما'}</title>
              <circle cx={x} cy={y} r={14} fill="#2563EB" opacity={0.18} />
              <circle cx={x} cy={y} r={7} fill="#2563EB" stroke="#fff" strokeWidth={3} />
            </g>
          );
        const origin = marker.kind === 'origin';
        return (
          <g key={i}>
            <title>{marker.label}</title>
            {origin ? (
              <circle cx={x} cy={y} r={8} fill="#fff" stroke="#F5761A" strokeWidth={4} />
            ) : (
              <path d={`M${x} ${y} l-9 -14 a10.5 10.5 0 1 1 18 0 z`} fill="#0E1A3B" stroke="#fff" strokeWidth={2} />
            )}
            {marker.label && (
              <text
                x={x}
                y={origin ? y + 24 : y - 26}
                textAnchor="middle"
                fontSize="15"
                fontWeight="700"
                fill="#0E1A3B"
                stroke="#fff"
                strokeWidth="4"
                paintOrder="stroke"
                style={{ fontFamily: 'inherit' }}
              >
                {marker.label.length > 18 ? `${marker.label.slice(0, 18)}…` : marker.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// Glassy coloured hero used at the top of the home and trip pages.
export function Hero({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        'tw-relative tw-overflow-hidden tw-rounded-3xl tw-bg-brand-navy tw-p-6 tw-text-white tw-shadow-lg sm:tw-p-8',
        "before:tw-absolute before:-tw-left-16 before:-tw-top-24 before:tw-h-64 before:tw-w-64 before:tw-rounded-full before:tw-bg-brand-orange/25 before:tw-blur-3xl before:tw-content-['']",
        "after:tw-absolute after:-tw-bottom-24 after:tw-right-10 after:tw-h-56 after:tw-w-56 after:tw-rounded-full after:tw-bg-sky-400/20 after:tw-blur-3xl after:tw-content-['']",
        className,
      )}
    >
      <div className="tw-relative tw-z-10">{children}</div>
    </section>
  );
}
