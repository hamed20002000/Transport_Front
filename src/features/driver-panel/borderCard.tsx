import { AlertTriangle, ChevronDown, Megaphone, Navigation, ParkingSquare } from 'lucide-react';
import type { ComponentType, HTMLAttributes, ReactNode } from 'react';
import AF from 'country-flag-icons/react/3x2/AF';
import AM from 'country-flag-icons/react/3x2/AM';
import AZ from 'country-flag-icons/react/3x2/AZ';
import IQ from 'country-flag-icons/react/3x2/IQ';
import PK from 'country-flag-icons/react/3x2/PK';
import TM from 'country-flag-icons/react/3x2/TM';
import TR from 'country-flag-icons/react/3x2/TR';
import { cn } from 'src/shared/utils/utils';
import type { BorderQueue, BorderStatus } from './api';

// One border crossing from borderpark.ir: the «مرزها» page lists them all, load details shows the ones on the route.

// Iran's land neighbours: every country a borderpark crossing can lead to. SVG, since emoji flags show as letters on Windows.
const FLAGS: Record<string, ComponentType<HTMLAttributes<HTMLElement & SVGElement>>> = { AF, AM, AZ, IQ, PK, TM, TR };

function CountryFlag({ code, country }: { code: string; country: string }) {
  const Flag = FLAGS[code.toUpperCase()];
  return (
    <span className="tw-flex tw-h-9 tw-w-[54px] tw-shrink-0 tw-items-center tw-justify-center tw-overflow-hidden tw-rounded-md tw-bg-brand-sky tw-shadow-sm tw-ring-1 tw-ring-black/10 sm:tw-h-10 sm:tw-w-[60px]">
      {Flag ? (
        <Flag role="img" aria-label={`پرچم ${country}`} className="tw-block tw-h-full tw-w-full" />
      ) : (
        <span className="tw-text-xs tw-font-bold" aria-hidden>
          {code}
        </span>
      )}
    </span>
  );
}

const fa = (value: number) => value.toLocaleString('fa-IR');

// Some borders wait hundreds of hours; days read better past two.
const waitText = (hours: number) => (hours > 48 ? `حدود ${fa(Math.round(hours / 24))} روز` : `${fa(hours)} ساعت`);

const maxWait = (status: BorderStatus) => Math.max(0, ...status.queues.filter((queue) => queue.inQueue).map((queue) => queue.waitHours));

// «1405-07-23 20:38» → «۱۴۰۵/۰۷/۲۳ ساعت ۲۰:۳۸»
function updatedAt(value: string | null) {
  if (!value) return '';
  const [date, time] = value.split(' ');
  return `${date.replace(/-/g, '/')}${time ? ` ساعت ${time}` : ''}`.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
}

const mapUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(5)},${lng.toFixed(5)}&travelmode=driving`;

// Queue size as a colour: the crowded borders stand out in the list.
function crowdTone(inQueue: number) {
  if (inQueue >= 3000) return 'tw-bg-red-50 tw-text-red-700';
  if (inQueue >= 1000) return 'tw-bg-amber-50 tw-text-amber-800';
  return 'tw-bg-emerald-50 tw-text-emerald-700';
}

function Figure({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="tw-min-w-0">
      <p className="tw-m-0 tw-text-xs tw-text-brand-muted">{label}</p>
      <p className="tw-m-0 tw-text-sm tw-font-bold">{value}</p>
      {hint && <p className="tw-m-0 tw-text-[11px] tw-text-brand-muted">{hint}</p>}
    </div>
  );
}

function QueueRow({ queue }: { queue: BorderQueue }) {
  return (
    <div className="tw-rounded-xl tw-border tw-border-brand-line tw-p-3">
      <p className="tw-m-0 tw-mb-2 tw-text-sm tw-font-bold">{queue.title}</p>
      <div className="tw-grid tw-grid-cols-2 tw-gap-3 sm:tw-grid-cols-5">
        <Figure
          label="در صف"
          value={fa(queue.inQueue)}
          hint={[queue.notPresent ? `${fa(queue.notPresent)} هنوز در مرز نیستند` : '', queue.empty ? `${fa(queue.empty)} خالی` : ''].filter(Boolean).join(' · ') || undefined}
        />
        <Figure label="فراخوان‌شده" value={fa(queue.called)} />
        <Figure label="در انتظار ورود به گمرک" value={fa(queue.waitingCustoms)} />
        <Figure label="پذیرش گمرک" value={fa(queue.customsCheckedIn)} />
        <Figure label="زمان انتظار" value={queue.waitHours ? waitText(queue.waitHours) : '—'} />
      </div>
    </div>
  );
}

function BorderDetails({ status }: { status: BorderStatus }) {
  const { stats } = status.border;
  const statParts = [
    ['صادرات', stats.export],
    ['ترانزیت', stats.transit],
    ['تخلیه', stats.unload],
    ['بارگیری', stats.load],
    ['پذیرش گمرک', stats.customsCheckedIn],
  ].filter(([, value]) => value) as Array<[string, number]>;
  return (
    <div className="tw-space-y-4 tw-border-t tw-border-brand-line tw-p-4">
      {status.notices.map((notice, index) => (
        <div key={index} className="tw-flex tw-gap-2 tw-rounded-xl tw-bg-amber-50 tw-p-3 tw-text-sm tw-leading-7 tw-text-amber-900">
          <Megaphone size={18} aria-hidden className="tw-mt-1 tw-shrink-0" />
          <p className="tw-m-0 tw-whitespace-pre-line">{notice}</p>
        </div>
      ))}

      {status.queues.length ? (
        <div className="tw-space-y-2">
          {status.queues.map((queue) => (
            <QueueRow key={queue.title} queue={queue} />
          ))}
        </div>
      ) : (
        <p className="tw-m-0 tw-text-sm tw-text-brand-muted">الان صفی در این مرز ثبت نشده.</p>
      )}

      {statParts.length > 0 && (
        <p className="tw-m-0 tw-text-sm">
          <span className="tw-text-brand-muted">آمار اخیر مرز: </span>
          {statParts.map(([label, value]) => `${label} ${fa(value)}`).join(' · ')}
        </p>
      )}

      {status.tirparks.length > 0 && (
        <div className="tw-space-y-2">
          <p className="tw-m-0 tw-flex tw-items-center tw-gap-1.5 tw-text-sm tw-font-bold">
            <ParkingSquare size={16} aria-hidden /> تیرپارک‌ها
          </p>
          {status.tirparks.map((tirpark) => (
            <div key={tirpark.name} className="tw-flex tw-flex-wrap tw-items-start tw-justify-between tw-gap-3 tw-rounded-xl tw-bg-brand-sky/50 tw-p-3 tw-text-sm">
              <div className="tw-min-w-0 tw-space-y-1">
                <p className="tw-m-0 tw-font-bold">
                  {tirpark.name}
                  {tirpark.capacity > 0 && <span className="tw-font-normal tw-text-brand-muted"> · ظرفیت {fa(tirpark.capacity)}</span>}
                </p>
                {tirpark.address && <p className="tw-m-0 tw-text-brand-muted">{tirpark.address}</p>}
                {tirpark.accepts.length > 0 && <p className="tw-m-0 tw-text-xs tw-text-brand-muted">پذیرش: {tirpark.accepts.join('، ')}</p>}
              </div>
              <a
                href={mapUrl(tirpark.lat, tirpark.lng)}
                target="_blank"
                rel="noreferrer"
                className="tw-inline-flex tw-shrink-0 tw-items-center tw-gap-1.5 tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-3 tw-py-1.5 tw-text-xs tw-font-medium hover:tw-border-brand-orange hover:tw-text-brand-orange"
              >
                <Navigation size={14} aria-hidden /> مسیریابی
              </a>
            </div>
          ))}
        </div>
      )}

      <p className="tw-m-0 tw-text-xs tw-text-brand-muted">
        {status.lastUpdate && `آخرین به‌روزرسانی: ${updatedAt(status.lastUpdate)} · `}منبع: borderpark.ir
      </p>
    </div>
  );
}

export function BorderCard({
  status,
  open,
  onToggle,
  note,
}: {
  status: BorderStatus;
  open: boolean;
  onToggle: () => void;
  // Extra line under the name, e.g. where the route crosses this border.
  note?: ReactNode;
}) {
  const wait = maxWait(status);
  return (
    <section className="tw-overflow-hidden tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-shadow-sm">
      <button type="button" onClick={onToggle} aria-expanded={open} className="tw-flex tw-w-full tw-items-center tw-gap-3 tw-bg-transparent tw-p-4 tw-text-right">
        <CountryFlag code={status.border.countryCode} country={status.border.country} />
        <div className="tw-min-w-0 tw-flex-1">
          <p className="tw-m-0 tw-flex tw-items-center tw-gap-2 tw-font-bold">
            {status.border.name}
            <span className="tw-rounded-full tw-bg-brand-sky tw-px-2 tw-py-0.5 tw-text-xs tw-font-medium">{status.border.country}</span>
            {status.stale && <AlertTriangle size={15} aria-label="داده‌ی قدیمی" className="tw-text-amber-600" />}
          </p>
          {note && <p className="tw-m-0 tw-mt-1 tw-text-xs tw-font-medium tw-text-brand-orange-ink">{note}</p>}
          <p className="tw-m-0 tw-mt-1 tw-text-xs tw-text-brand-muted">
            {fa(status.totals.called)} فراخوان‌شده{wait ? ` · انتظار تا ${waitText(wait)}` : ''}
          </p>
        </div>
        <span className={cn('tw-shrink-0 tw-rounded-xl tw-px-3 tw-py-1.5 tw-text-sm tw-font-bold', crowdTone(status.totals.inQueue))}>
          {fa(status.totals.inQueue)} در صف
        </span>
        <ChevronDown size={18} aria-hidden className={cn('tw-shrink-0 tw-transition-transform', open && 'tw-rotate-180')} />
      </button>
      {open && <BorderDetails status={status} />}
    </section>
  );
}

