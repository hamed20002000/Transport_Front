import { useState, type FormEvent } from 'react';
import { Crosshair, ExternalLink, LocateFixed, MapPin, MapPinOff, Radio, X } from 'lucide-react';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { cn } from 'src/shared/utils/utils';
import { formatDate, timeAgo } from 'src/features/company-cargo/components';
import { errorMessage, getLocation, sendLocation, sendLocationByPlace } from './api';
import { ActionButton, useAsync } from './components';

// Thrown when the browser cannot place the device at all; the card then offers the city/address box.
class PositionUnavailable extends Error {}

function locate(options: PositionOptions) {
  return new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, options));
}

// GPS first; laptops have none, so a failure retries once with the browser's network estimate.
async function currentPosition() {
  if (!navigator.geolocation) throw new PositionUnavailable('مرورگر شما موقعیت‌یابی را پشتیبانی نمی‌کند.');
  try {
    return await locate({ enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  } catch (error) {
    const code = (error as GeolocationPositionError).code;
    if (code === 1) throw new Error('اجازه دسترسی به موقعیت داده نشد. روی آیکن قفل کنار آدرس سایت بزنید و Location را مجاز کنید.');
  }
  try {
    return await locate({ enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60000 });
  } catch {
    throw new PositionUnavailable('مرورگر نتوانست موقعیت شما را پیدا کند (روی لپ‌تاپ بدون GPS رایج است). شهر یا آدرس خود را بنویسید.');
  }
}

// Last location the companies see, and a button to send the current one from the browser.
export default function LocationCard({ compact, onSent }: { compact?: boolean; onSent?: () => void }) {
  const toast = useToast();
  const state = useAsync(getLocation, []);
  const [sending, setSending] = useState(false);
  // Shown after the browser fails to locate the device, or on demand.
  const [manual, setManual] = useState(false);
  const [place, setPlace] = useState('');
  const location = state.data;
  const live = !!location?.liveUntil && new Date(location.liveUntil).getTime() > Date.now();
  const stale = !location || Date.now() - new Date(location.receivedAt).getTime() > 6 * 3_600_000;

  function sent(result: { sent: number; receivedAt: string }, latitude: number, longitude: number, where?: string) {
    state.setData({ latitude, longitude, liveUntil: null, receivedAt: result.receivedAt });
    const target = where ? `موقعیت ${where} ثبت شد` : 'موقعیت شما ثبت شد';
    toast.success(result.sent ? `${target} و برای ${result.sent.toLocaleString('fa-IR')} شرکت فرستاده شد.` : `${target}.`);
    onSent?.();
  }

  async function share() {
    setSending(true);
    try {
      const { coords } = await currentPosition();
      sent(await sendLocation(coords.latitude, coords.longitude), coords.latitude, coords.longitude);
      setManual(false);
    } catch (error) {
      if (error instanceof PositionUnavailable) setManual(true);
      toast.error(errorMessage(error));
    } finally {
      setSending(false);
    }
  }

  async function shareByPlace(event: FormEvent) {
    event.preventDefault();
    const where = place.trim();
    if (!where) return;
    setSending(true);
    try {
      const result = await sendLocationByPlace(where);
      // Show where the server actually put it, so a wrong match is noticed.
      sent(result, result.latitude, result.longitude, result.resolved && result.resolved !== where ? `«${where}» (نزدیک ${result.resolved})` : `«${where}»`);
      setManual(false);
      setPlace('');
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSending(false);
    }
  }

  return (
    <section
      aria-label="موقعیت من"
      className={cn('tw-flex tw-flex-col tw-gap-4 tw-rounded-2xl tw-border tw-bg-white tw-p-5 tw-shadow-sm', stale ? 'tw-border-amber-200' : 'tw-border-brand-line')}
    >
      <div className="tw-flex tw-items-start tw-gap-3">
        <span
          className={cn(
            'tw-relative tw-flex tw-h-12 tw-w-12 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-2xl',
            location ? 'tw-bg-blue-50 tw-text-blue-600' : 'tw-bg-amber-50 tw-text-amber-600',
          )}
        >
          {location ? <LocateFixed size={24} aria-hidden /> : <MapPinOff size={24} aria-hidden />}
          {live && <span className="tw-absolute -tw-right-0.5 -tw-top-0.5 tw-h-3 tw-w-3 tw-animate-ping tw-rounded-full tw-bg-emerald-500" aria-hidden />}
        </span>
        <div className="tw-min-w-0 tw-flex-1">
          <h3 className="tw-m-0 tw-flex tw-items-center tw-gap-2 tw-text-base tw-font-bold">
            موقعیت من
            {live && (
              <span className="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-full tw-bg-emerald-50 tw-px-2 tw-py-0.5 tw-text-[11px] tw-text-emerald-700">
                <Radio size={11} aria-hidden /> زنده
              </span>
            )}
          </h3>
          {state.loading ? (
            <div className="tw-mt-2 tw-h-4 tw-w-40 tw-animate-pulse tw-rounded tw-bg-brand-sky" />
          ) : location ? (
            <p className="tw-m-0 tw-mt-1 tw-text-sm tw-text-brand-muted">
              آخرین ثبت: <time dateTime={location.receivedAt} title={formatDate(location.receivedAt)} className="tw-font-medium tw-text-brand-navy">{timeAgo(location.receivedAt)}</time>
            </p>
          ) : (
            <p className="tw-m-0 tw-mt-1 tw-text-sm tw-text-amber-700">هنوز موقعیتی ثبت نکرده‌اید.</p>
          )}
          {!compact && (
            <p className="tw-m-0 tw-mt-2 tw-text-xs tw-leading-6 tw-text-brand-muted">
              شرکتِ سفر فعال شما موقعیت را می‌بیند و فاصله‌تان تا مبدأ بارها هم از همین محاسبه می‌شود. برای موقعیت زنده، در ربات تلگرام «Live Location» بفرستید.
            </p>
          )}
        </div>
      </div>
      <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
        <ActionButton onClick={share} busy={sending} variant={stale ? 'primary' : 'secondary'}>
          <Crosshair size={16} aria-hidden /> {sending ? 'در حال ارسال…' : 'ارسال موقعیت فعلی'}
        </ActionButton>
        {!manual && (
          <button type="button" onClick={() => setManual(true)} className="tw-bg-transparent tw-p-0 tw-text-xs tw-font-medium tw-text-brand-muted hover:tw-text-brand-orange-ink">
            وارد کردن شهر یا آدرس
          </button>
        )}
        {location && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`}
            target="_blank"
            rel="noreferrer"
            className="tw-inline-flex tw-items-center tw-gap-1 tw-text-xs tw-font-medium tw-text-brand-muted hover:tw-text-brand-orange-ink"
          >
            نمایش روی نقشه <ExternalLink size={12} aria-hidden />
          </a>
        )}
      </div>
      {manual && (
        <form onSubmit={shareByPlace} className="tw-space-y-2 tw-rounded-xl tw-bg-brand-bg tw-p-3">
          <label htmlFor="driver-place" className="tw-block tw-text-xs tw-font-medium tw-text-brand-navy">
            الان کجا هستید؟ شهر یا آدرس را بنویسید
          </label>
          <div className="tw-flex tw-gap-2">
            <div className="tw-relative tw-min-w-0 tw-flex-1">
              <MapPin size={16} aria-hidden className="tw-absolute tw-right-3 tw-top-1/2 -tw-translate-y-1/2 tw-text-brand-orange" />
              <input
                id="driver-place"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="مثلاً قزوین، یا تهران - میدان آزادی"
                maxLength={200}
                autoFocus
                className="tw-h-10 tw-w-full tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-pe-3 tw-ps-9 tw-text-sm tw-text-brand-navy tw-outline-none focus:tw-border-brand-orange"
              />
            </div>
            <button
              type="submit"
              disabled={sending || !place.trim()}
              className="tw-h-10 tw-shrink-0 tw-rounded-xl tw-bg-brand-navy tw-px-4 tw-text-sm tw-font-bold tw-text-white hover:tw-bg-brand-navy/90 disabled:tw-opacity-50"
            >
              ثبت
            </button>
            <button
              type="button"
              aria-label="بستن"
              title="بستن"
              onClick={() => setManual(false)}
              className="tw-flex tw-h-10 tw-w-10 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-xl tw-bg-transparent tw-text-brand-muted hover:tw-text-brand-navy"
            >
              <X size={16} aria-hidden />
            </button>
          </div>
          <p className="tw-m-0 tw-text-[11px] tw-text-brand-muted">موقعیت تقریبی (مرکز شهر یا محله) برای شرکت ثبت می‌شود.</p>
        </form>
      )}
    </section>
  );
}
