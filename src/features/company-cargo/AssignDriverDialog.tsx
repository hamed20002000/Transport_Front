import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Check, Hourglass, PackageCheck, Search, Truck, UserRound, X } from 'lucide-react';
import { cn } from 'src/shared/utils/utils';
import { fetchDriverPhoto, getCandidates, offerLoad, searchDrivers, type CargoListing, type DriverCard } from './api';
import { errorMessage } from './cargoText';
import { IconButton, PrimaryButton, RouteLine, SecondaryButton, timeAgo } from './components';
import AccountCode from 'src/shared/components/account-code/AccountCode';

// «۱۴:۳۵»
const clock = (value: string) => new Date(value).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

/** Face photo, else the vehicle, else an icon; the photo endpoint needs the token, hence the blob URL. */
export function DriverPhoto({ driver }: { driver: DriverCard }) {
  const kind = driver.photos.face ? 'face' : driver.photos.vehicle ? 'vehicle' : null;
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!kind) return;
    let url: string | null = null;
    let active = true;
    fetchDriverPhoto(driver.userId, kind)
      .then((value) => {
        url = value;
        if (active) setSrc(value);
        else URL.revokeObjectURL(value);
      })
      .catch(() => undefined);
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [driver.userId, kind]);
  return src ? (
    <img src={src} alt={kind === 'face' ? `عکس ${driver.name}` : `ماشین ${driver.name}`} className="tw-h-14 tw-w-14 tw-shrink-0 tw-rounded-xl tw-object-cover" />
  ) : (
    <span className="tw-flex tw-h-14 tw-w-14 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-xl tw-bg-brand-sky tw-text-brand-navy" aria-hidden>
      <UserRound size={26} />
    </span>
  );
}

function DriverRow({ driver, selected, onSelect }: { driver: DriverCard; selected: boolean; onSelect: () => void }) {
  const vehicle = [driver.vehicleType, driver.vehicleModel, driver.capacityTons ? `${driver.capacityTons.toLocaleString('fa-IR')} تن` : null]
    .filter(Boolean)
    .join(' · ');
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={cn(
          'tw-flex tw-w-full tw-items-center tw-gap-3 tw-rounded-xl tw-border tw-bg-white tw-p-3 tw-text-start tw-transition-colors',
          selected ? 'tw-border-brand-orange tw-ring-2 tw-ring-brand-orange-soft' : 'tw-border-brand-line hover:tw-border-brand-orange/50',
        )}
      >
        <DriverPhoto driver={driver} />
        <span className="tw-min-w-0 tw-flex-1 tw-space-y-0.5">
          <strong className="tw-block tw-truncate">
            {driver.name}
            <AccountCode code={driver.accountCode} className="tw-mr-1.5 tw-align-middle" />
            {driver.broker && <span className="tw-mr-1.5 tw-inline-flex tw-items-center tw-rounded-full tw-bg-brand-orange-soft tw-px-2 tw-py-0.5 tw-align-middle tw-text-[11px] tw-font-medium tw-text-brand-orange-ink">واسط</span>}
          </strong>
          {driver.mobile && (
            <span dir="ltr" className="tw-block tw-text-xs tw-text-brand-muted">
              {driver.mobile}
            </span>
          )}
          {(vehicle || driver.plate) && (
            <span className="tw-flex tw-flex-wrap tw-items-center tw-gap-x-2 tw-text-xs tw-text-brand-navy">
              {vehicle && (
                <span className="tw-inline-flex tw-items-center tw-gap-1">
                  <Truck size={12} aria-hidden /> {vehicle}
                </span>
              )}
              {driver.plate && <span className="tw-rounded tw-bg-brand-sky tw-px-1.5">{driver.plate}</span>}
            </span>
          )}
          {driver.requestedAt && <span className="tw-block tw-text-[11px] tw-text-brand-muted">درخواست {timeAgo(driver.requestedAt)}</span>}
        </span>
        <span
          className={cn(
            'tw-flex tw-h-6 tw-w-6 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-border-2',
            selected ? 'tw-border-brand-orange tw-bg-brand-orange tw-text-white' : 'tw-border-brand-line',
          )}
          aria-hidden
        >
          {selected && <Check size={14} />}
        </span>
      </button>
    </li>
  );
}

/**
 * «برداشته شد»: the company picks which driver the load went to (drivers who asked for it, or another
 * driver of the platform by mobile/plate) and confirms; the driver then confirms too, and only then the
 * load is taken. Rendered in a portal; `layer` lifts it above the agent chat panel.
 */
export default function AssignDriverDialog({
  listing,
  layer,
  onClose,
  onOffered,
}: {
  listing: CargoListing;
  layer?: number;
  onClose: () => void;
  onOffered: (driver: DriverCard, expiresAt: string) => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [drivers, setDrivers] = useState<DriverCard[]>([]);
  const [waiting, setWaiting] = useState<{ driver: DriverCard | null; expiresAt: string } | null>(null);
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<DriverCard[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<DriverCard | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getCandidates(listing.id)
      .then((result) => {
        if (!active) return;
        setDrivers(result.drivers);
        setWaiting(result.offer ? { driver: result.offer.driver, expiresAt: result.offer.expiresAt } : null);
        setState('ready');
      })
      .catch((e) => {
        if (!active) return;
        setError(errorMessage(e));
        setState('failed');
      });
    return () => {
      active = false;
    };
  }, [listing.id]);

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

  async function search(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError('');
    try {
      setFound(await searchDrivers(listing.id, query.trim()));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSearching(false);
    }
  }

  async function confirm() {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      const offer = await offerLoad(listing.id, selected.userId);
      onOffered(selected, offer.offerExpiresAt);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  const requestedIds = new Set(drivers.map((d) => d.userId));
  const extra = (found ?? []).filter((d) => !requestedIds.has(d.userId));

  return createPortal(
    <div
      style={layer ? { zIndex: layer } : undefined}
      className="tw-fixed tw-inset-0 tw-z-50 tw-flex tw-items-end tw-justify-center tw-bg-brand-navy/40 sm:tw-items-center sm:tw-p-6"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-title"
        tabIndex={-1}
        dir="rtl"
        className="tw-flex tw-max-h-[92vh] tw-w-full tw-flex-col tw-overflow-hidden tw-rounded-t-2xl tw-bg-white tw-text-brand-navy tw-shadow-xl tw-outline-none sm:tw-max-w-xl sm:tw-rounded-2xl"
      >
        <div className="tw-flex tw-items-start tw-gap-3 tw-border-b tw-border-brand-line tw-bg-brand-orange-soft/60 tw-px-5 tw-py-4">
          <div className="tw-min-w-0 tw-flex-1 tw-space-y-2">
            <h2 id="assign-title" className="tw-m-0 tw-flex tw-items-center tw-gap-2 tw-text-lg tw-font-bold">
              <PackageCheck size={20} aria-hidden className="tw-text-brand-orange" /> بار به کدام راننده داده شد؟
            </h2>
            <RouteLine origin={listing.origin} destination={listing.destination} />
            <p className="tw-m-0 tw-text-xs tw-leading-6 tw-text-brand-muted">
              بعد از انتخاب، پیام تأیید برای راننده می‌رود؛ بار وقتی «برداشته شد» می‌شود که راننده هم تأیید کند.
            </p>
          </div>
          <IconButton icon={X} label="بستن" onClick={onClose} />
        </div>

        <div className="tw-flex-1 tw-space-y-4 tw-overflow-y-auto tw-p-5">
          {state === 'loading' && <p className="tw-m-0 tw-text-sm tw-text-brand-muted">در حال دریافت راننده‌ها…</p>}
          {waiting && (
            <div className="tw-flex tw-items-center tw-gap-3 tw-rounded-xl tw-border tw-border-amber-200 tw-bg-amber-50 tw-p-3 tw-text-sm">
              <Hourglass size={18} aria-hidden className="tw-shrink-0 tw-text-amber-700" />
              <span>
                بار به <strong>{waiting.driver?.name ?? 'راننده'}</strong> سپرده شده و تا {clock(waiting.expiresAt)} منتظر تأیید اوست. اگر نپذیرد یا
                جواب ندهد، می‌توانید راننده‌ی دیگری انتخاب کنید.
              </span>
            </div>
          )}

          {state === 'ready' && !waiting && (
            <>
              <section className="tw-space-y-2">
                <h3 className="tw-m-0 tw-text-sm tw-font-bold">راننده‌هایی که برای این بار درخواست داده‌اند</h3>
                {drivers.length ? (
                  <ul className="tw-m-0 tw-list-none tw-space-y-2 tw-p-0">
                    {drivers.map((driver) => (
                      <DriverRow key={driver.userId} driver={driver} selected={selected?.userId === driver.userId} onSelect={() => setSelected(driver)} />
                    ))}
                  </ul>
                ) : (
                  <p className="tw-m-0 tw-text-sm tw-text-brand-muted">هنوز راننده‌ای برای این بار درخواست نداده؛ راننده را با موبایل یا پلاک پیدا کنید.</p>
                )}
              </section>

              <section className="tw-space-y-2">
                <h3 className="tw-m-0 tw-text-sm tw-font-bold">راننده‌ی دیگری از سامانه</h3>
                <form onSubmit={search} className="tw-flex tw-gap-2">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="موبایل کامل یا پلاک، مثلاً 09121234567"
                    maxLength={40}
                    className="tw-h-11 tw-min-w-0 tw-flex-1 tw-rounded-xl tw-border tw-border-brand-line tw-px-3 tw-text-sm tw-outline-none focus:tw-border-brand-orange"
                  />
                  <button
                    type="submit"
                    disabled={searching}
                    className="tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-4 tw-text-sm tw-font-medium tw-text-brand-navy hover:tw-bg-brand-sky"
                  >
                    <Search size={16} aria-hidden /> {searching ? 'جستجو…' : 'جستجو'}
                  </button>
                </form>
                {found && !extra.length && <p className="tw-m-0 tw-text-sm tw-text-brand-muted">راننده‌ای با این موبایل یا پلاک در سامانه پیدا نشد.</p>}
                {!!extra.length && (
                  <ul className="tw-m-0 tw-list-none tw-space-y-2 tw-p-0">
                    {extra.map((driver) => (
                      <DriverRow key={driver.userId} driver={driver} selected={selected?.userId === driver.userId} onSelect={() => setSelected(driver)} />
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
          {error && (
            <p role="alert" className="tw-m-0 tw-rounded-xl tw-bg-red-50 tw-px-3 tw-py-2 tw-text-sm tw-text-red-800">
              {error}
            </p>
          )}
        </div>

        <div className="tw-flex tw-items-center tw-justify-end tw-gap-2 tw-border-t tw-border-brand-line tw-px-5 tw-py-3">
          <SecondaryButton onClick={onClose}>{waiting ? 'بستن' : 'انصراف'}</SecondaryButton>
          {!waiting && (
            <PrimaryButton onClick={confirm} disabled={!selected || saving}>
              <PackageCheck size={16} aria-hidden /> {selected ? `سپردن بار به ${selected.name}` : 'راننده را انتخاب کنید'}
            </PrimaryButton>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
