import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { LoaderCircle, Send, Truck, X } from 'lucide-react';
import { cn } from 'src/shared/utils/utils';
import { getBrokerDrivers, type BrokerDriver } from './api';
import { BorderChips, useLoadBorders } from './BorderPicker';

const FIELDS: Array<{ key: Exclude<keyof BrokerDriver, 'exitBorder'>; label: string; placeholder: string; ltr?: boolean; optional?: boolean }> = [
  { key: 'name', label: 'نام و نام خانوادگی راننده', placeholder: 'مثلاً علی رضایی' },
  { key: 'nationalCode', label: 'کد ملی', placeholder: '۱۰ رقم', ltr: true },
  { key: 'mobile', label: 'موبایل', placeholder: '0912 123 4567', ltr: true },
  { key: 'plate', label: 'پلاک شهربانی', placeholder: 'مثلاً ۴۲ ع ۸۴۲ ایران ۳۵' },
  { key: 'transitPlate', label: 'پلاک ترانزیت', placeholder: 'مثلاً 81AA217/218', ltr: true, optional: true },
  // this request's own details: asked again for a recent driver too
  { key: 'companyName', label: 'نام شرکت', placeholder: 'شرکتی که راننده با آن می‌رود' },
  { key: 'fare', label: 'مبلغ کرایه', placeholder: 'مثلاً ۴۵٬۰۰۰٬۰۰۰ تومان' },
  { key: 'referrer', label: 'معرف', placeholder: 'نام یا شماره‌ی معرف' },
];
// the border is not typed: it is picked from the load's borders (BorderChips)
type TypedKey = Exclude<keyof BrokerDriver, 'exitBorder'>;
const EMPTY: Record<TypedKey, string> = {
  name: '', nationalCode: '', mobile: '', plate: '', transitPlate: '', companyName: '', fare: '', referrer: '',
};
const inputClass =
  'tw-h-11 tw-w-full tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-3 tw-text-brand-navy tw-outline-none tw-transition-colors placeholder:tw-text-brand-muted/70 focus:tw-border-brand-orange';

/**
 * A broker's load request names the driver it is for (transport_backend BrokerDriver): one it gave before, picked
 * from its recent ones, or a new one. The server checks the fields and keeps them with the request; no account is
 * made for the driver. This request's own details (company, fare, referrer) are asked every time, and for an export
 * or import load the border, picked from the borders toward where it goes abroad.
 */
export default function BrokerDriverDialog({
  cargo,
  layer,
  sending,
  listingId,
  onSend,
  onClose,
}: {
  cargo: string;
  layer?: number;
  sending: boolean;
  listingId: string;
  onSend: (driver: BrokerDriver, border?: string) => void;
  onClose: () => void;
}) {
  const panel = useRef<HTMLFormElement>(null);
  const [fields, setFields] = useState(EMPTY);
  const [recent, setRecent] = useState<BrokerDriver[]>([]);

  useEffect(() => {
    getBrokerDrivers().then(setRecent, () => setRecent([]));
  }, []);

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

  // an export or import load: the border, from the borders toward where it goes abroad
  const { choice, failed } = useLoadBorders(listingId);
  const [border, setBorder] = useState('');
  const needsBorder = !!choice?.needed;
  const missing = FIELDS.some(({ key, optional }) => !optional && !fields[key]?.trim()) || (!choice && !failed) || (needsBorder && !border);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (missing || sending) return;
    onSend({ ...fields, transitPlate: fields.transitPlate.trim() || null }, needsBorder ? border : undefined);
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

        {recent.length > 0 && (
          <div className="tw-mt-4 tw-space-y-2">
            <p className="tw-m-0 tw-text-sm tw-font-bold">راننده‌های قبلی</p>
            <div className="tw-flex tw-flex-wrap tw-gap-2">
              {recent.map((driver) => (
                <button
                  key={driver.mobile}
                  type="button"
                  onClick={() =>
                    // who the driver is; this request's details stay as typed
                    setFields((current) => ({ ...current, name: driver.name, nationalCode: driver.nationalCode, mobile: driver.mobile, plate: driver.plate, transitPlate: driver.transitPlate ?? '' }))
                  }
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
                maxLength={key === 'name' || key === 'companyName' || key === 'referrer' ? 100 : key === 'fare' ? 60 : 30}
                className={cn(inputClass, ltr && 'tw-text-left')}
              />
            </label>
          ))}
        </div>
        {choice?.needed && (
          <div className="tw-mt-4">
            <BorderChips choice={choice} value={border} onChange={setBorder} />
          </div>
        )}
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
