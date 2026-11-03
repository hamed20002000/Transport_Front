import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Compass, LoaderCircle, Send, Truck, X } from 'lucide-react';
import { getBrokerAccess } from 'src/features/broker/accessApi';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { cn } from 'src/shared/utils/utils';
import { errorMessage, getBrokerDrivers, suggestDrivers, type BrokerDriver } from './api';

const FIELDS: Array<{ key: keyof BrokerDriver; label: string; placeholder: string; ltr?: boolean; optional?: boolean }> = [
  { key: 'name', label: 'نام و نام خانوادگی راننده', placeholder: 'مثلاً علی رضایی' },
  { key: 'nationalCode', label: 'کد ملی', placeholder: '۱۰ رقم', ltr: true },
  { key: 'mobile', label: 'موبایل', placeholder: '0912 123 4567', ltr: true },
  { key: 'plate', label: 'پلاک شهربانی', placeholder: 'مثلاً ۴۲ ع ۸۴۲ ایران ۳۵' },
  { key: 'transitPlate', label: 'پلاک ترانزیت', placeholder: 'مثلاً 81AA217/218', ltr: true, optional: true },
];
const EMPTY: Record<keyof BrokerDriver, string> = { name: '', nationalCode: '', mobile: '', plate: '', transitPlate: '' };
const inputClass =
  'tw-h-11 tw-w-full tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-3 tw-text-brand-navy tw-outline-none tw-transition-colors placeholder:tw-text-brand-muted/70 focus:tw-border-brand-orange';

/**
 * A broker's load request names the driver it is for (transport_backend BrokerDriver): one it gave before, picked
 * from its recent ones, or a new one. The server checks the fields and keeps them with the request; no account is
 * made for the driver. Or, paid, «به من راننده معرفی کن»: drivers of the load's route are told of it, and the first
 * who wants it becomes the request's driver.
 */
export default function BrokerDriverDialog({
  listingId,
  cargo,
  layer,
  sending,
  onSend,
  onClose,
}: {
  listingId: string;
  cargo: string;
  layer?: number;
  sending: boolean;
  onSend: (driver: BrokerDriver) => void;
  onClose: () => void;
}) {
  const panel = useRef<HTMLFormElement>(null);
  const [fields, setFields] = useState(EMPTY);
  const [recent, setRecent] = useState<BrokerDriver[]>([]);
  const [suggestions, setSuggestions] = useState<{ enabled: boolean; left: number } | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    getBrokerDrivers().then(setRecent, () => setRecent([]));
    getBrokerAccess().then((state) => setSuggestions({ enabled: state.policy.suggestionsEnabled, left: state.suggestions }), () => setSuggestions(null));
  }, []);

  async function suggest() {
    setSuggesting(true);
    try {
      const { asked } = await suggestDrivers(listingId);
      if (asked) {
        toast.success(`به ${asked.toLocaleString('fa-IR')} راننده‌ی همین مسیر خبر دادیم؛ اولین کسی که بخواهد، درخواست به نام او فرستاده می‌شود و خبرتان می‌کنیم.`);
        onClose();
      } else {
        toast.info('راننده‌ای که این مسیر یا نزدیکش را رفته باشد و الان آزاد باشد پیدا نشد؛ از معرفی‌های شما چیزی کم نشد.');
      }
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSuggesting(false);
    }
  }

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.querySelector('input')?.focus();
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [onClose]);

  const missing = FIELDS.some(({ key, optional }) => !optional && !fields[key].trim());

  function submit(event: FormEvent) {
    event.preventDefault();
    if (missing || sending) return;
    onSend({ ...fields, transitPlate: fields.transitPlate.trim() || null });
  }

  return createPortal(
    <div
      style={{ zIndex: (layer ?? 50) + 10 }}
      className="tw-fixed tw-inset-0 tw-flex tw-items-end tw-justify-center tw-bg-brand-navy/40 sm:tw-items-center sm:tw-p-6"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <form
        ref={panel}
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="broker-driver-title"
        dir="rtl"
        className="tw-flex tw-max-h-[94vh] tw-w-full tw-flex-col tw-overflow-y-auto tw-rounded-t-3xl tw-bg-white tw-p-5 tw-text-brand-navy tw-shadow-2xl sm:tw-max-w-lg sm:tw-rounded-3xl"
      >
        <div className="tw-flex tw-items-start tw-justify-between tw-gap-3">
          <div className="tw-min-w-0">
            <h2 id="broker-driver-title" className="tw-m-0 tw-flex tw-items-center tw-gap-2 tw-text-lg tw-font-bold">
              <Truck size={20} aria-hidden /> درخواست برای کدام راننده؟
            </h2>
            <p className="tw-m-0 tw-mt-1 tw-truncate tw-text-sm tw-text-brand-muted">{cargo}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="بستن" className="tw-rounded-lg tw-border-0 tw-bg-transparent tw-p-1.5 tw-text-brand-muted hover:tw-bg-brand-sky">
            <X size={18} aria-hidden />
          </button>
        </div>

        {suggestions?.enabled && (
          <button
            type="button"
            onClick={() => void suggest()}
            disabled={suggesting || !suggestions.left}
            className="tw-mt-4 tw-flex tw-w-full tw-items-center tw-gap-3 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-brand-sky/40 tw-p-3 tw-text-right hover:tw-bg-brand-sky disabled:tw-opacity-60"
          >
            {suggesting ? <LoaderCircle size={22} className="tw-shrink-0 tw-animate-spin" aria-hidden /> : <Compass size={22} className="tw-shrink-0 tw-text-brand-orange" aria-hidden />}
            <span className="tw-min-w-0">
              <span className="tw-block tw-font-bold">راننده ندارید؟ به من راننده معرفی کن</span>
              <span className="tw-block tw-text-xs tw-text-brand-muted">
                {suggestions.left
                  ? `به راننده‌هایی که این مسیر را رفته‌اند خبر می‌دهیم · ${suggestions.left.toLocaleString('fa-IR')} معرفی مانده`
                  : 'معرفی راننده‌ی شما تمام شده؛ از «شرکت‌ها و بسته‌ها» بخرید'}
              </span>
            </span>
          </button>
        )}

        {recent.length > 0 && (
          <div className="tw-mt-4 tw-space-y-2">
            <p className="tw-m-0 tw-text-sm tw-font-bold">راننده‌های قبلی</p>
            <div className="tw-flex tw-flex-wrap tw-gap-2">
              {recent.map((driver) => (
                <button
                  key={driver.mobile}
                  type="button"
                  onClick={() => setFields({ ...driver, transitPlate: driver.transitPlate ?? '' })}
                  className={cn(
                    'tw-rounded-xl tw-border tw-px-3 tw-py-1.5 tw-text-sm',
                    fields.mobile === driver.mobile ? 'tw-border-brand-orange tw-bg-brand-orange-soft' : 'tw-border-brand-line tw-bg-white hover:tw-bg-brand-sky',
                  )}
                >
                  {driver.name} · {driver.plate}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="tw-mt-4 tw-grid tw-gap-3 sm:tw-grid-cols-2">
          {FIELDS.map(({ key, label, placeholder, ltr, optional }) => (
            <label key={key} className={cn('tw-space-y-1.5 tw-text-sm tw-font-medium', key === 'name' && 'sm:tw-col-span-2')}>
              <span>
                {label} {optional ? <span className="tw-text-brand-muted">(اگر دارد)</span> : <span className="tw-text-brand-orange" aria-hidden>*</span>}
              </span>
              <input
                value={fields[key] ?? ''}
                onChange={(event) => setFields((current) => ({ ...current, [key]: event.target.value }))}
                placeholder={placeholder}
                dir={ltr ? 'ltr' : undefined}
                inputMode={key === 'nationalCode' || key === 'mobile' ? 'numeric' : undefined}
                maxLength={key === 'name' ? 100 : 30}
                className={cn(inputClass, ltr && 'tw-text-left')}
              />
            </label>
          ))}
        </div>
        <p className="tw-m-0 tw-mt-3 tw-text-xs tw-leading-6 tw-text-brand-muted">
          مشخصات راننده همراه درخواست برای شرکت حمل‌ونقل فرستاده می‌شود. یک درخواست از بسته‌ی شما کم می‌شود.
        </p>
        <button
          type="submit"
          disabled={missing || sending}
          className="tw-mt-4 tw-inline-flex tw-h-12 tw-w-full tw-items-center tw-justify-center tw-gap-2 tw-rounded-xl tw-border-0 tw-bg-brand-orange tw-font-bold tw-text-white hover:tw-bg-brand-orange-dark disabled:tw-opacity-50"
        >
          {sending ? <LoaderCircle size={18} className="tw-animate-spin" aria-hidden /> : <Send size={18} aria-hidden />} فرستادن درخواست
        </button>
      </form>
    </div>,
    document.body,
  );
}
