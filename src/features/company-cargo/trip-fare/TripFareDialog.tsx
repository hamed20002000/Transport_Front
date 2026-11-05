import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Banknote, CheckCircle2, Handshake, PencilLine, X } from 'lucide-react';
import { cn } from 'src/shared/utils/utils';
import { errorMessage } from '../cargoText';
import { IconButton, PrimaryButton, SecondaryButton } from '../components';
import TripFareFields from './TripFareFields';
import {
  brokerPayModelHints,
  brokerPayModelLabels,
  draftFrom,
  fareChanged,
  fareLine,
  moneyWords,
  readDraft,
  type BrokerPayModel,
  type FareDraft,
  type TripFareForm,
  type TripFareInput,
} from './tripFare';

export type TripFareMode = 'accept' | 'offer' | 'deliver';

const COPY: Record<TripFareMode, { heading: string; hint: string; submit: string; weight: string }> = {
  accept: {
    heading: 'قبول درخواست · کرایه و وزن توافقی',
    hint: 'مبلغی که با راننده یا واسط توافق کردید. بعد از شروع سفر عوض نمی‌شود؛ تغییرها را موقع تأیید تحویل وارد می‌کنید.',
    submit: 'قبول و ثبت',
    weight: 'وزن بار (تن)',
  },
  offer: {
    heading: 'سپردن بار · کرایه و وزن توافقی',
    hint: 'مبلغی که با راننده توافق کردید؛ همراه پیام تأیید برای راننده می‌رود.',
    submit: 'سپردن بار',
    weight: 'وزن بار (تن)',
  },
  deliver: {
    heading: 'تأیید تحویل · کرایه و وزن نهایی',
    hint: 'اگر کرایه یا وزن نسبت به توافق فرق کرد (کسری، توقف، اضافه‌بار…)، مقدار نهایی را وارد کنید؛ مقدار توافقی جدا می‌ماند.',
    submit: 'ثبت تحویل',
    weight: 'وزن بارنامه (تن)',
  },
};

/** How a broker is paid for this trip: two cards to pick from, with what each means. */
function PayModelPicker({ value, onChange }: { value: BrokerPayModel | null; onChange: (model: BrokerPayModel) => void }) {
  return (
    <fieldset className="tw-m-0 tw-space-y-2 tw-border-0 tw-p-0">
      <legend className="tw-mb-1.5 tw-flex tw-items-center tw-gap-1.5 tw-text-sm tw-font-bold">
        <Handshake size={16} aria-hidden className="tw-text-brand-orange" /> این بار را واسط آورده؛ واسط چطور پولش را می‌گیرد؟
      </legend>
      <div className="tw-grid tw-grid-cols-1 tw-gap-2 sm:tw-grid-cols-2">
        {(Object.keys(brokerPayModelLabels) as BrokerPayModel[]).map((model) => (
          <button
            key={model}
            type="button"
            role="radio"
            aria-checked={value === model}
            onClick={() => onChange(model)}
            className={cn(
              'tw-space-y-1 tw-rounded-xl tw-border tw-bg-white tw-p-3 tw-text-start tw-transition-colors',
              value === model ? 'tw-border-brand-orange tw-ring-2 tw-ring-brand-orange-soft' : 'tw-border-brand-line hover:tw-border-brand-orange/50',
            )}
          >
            <span className="tw-block tw-text-sm tw-font-bold">{brokerPayModelLabels[model]}</span>
            <span className="tw-block tw-text-xs tw-leading-5 tw-text-brand-muted">{brokerPayModelHints[model]}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * The company records a trip's fare and weight: on accepting a request and handing a load to a driver (the agreed
 * values), and on confirming a delivery (the final values, starting from the agreed ones: «بدون تغییر» in one click,
 * or changed with the reason). The same dialog for the three; what it does on «ثبت» is `submit`.
 * Rendered in a portal; `layer` lifts it above another dialog.
 */
export default function TripFareDialog({
  mode,
  summary,
  load,
  submit,
  onClose,
  layer,
}: {
  mode: TripFareMode;
  /** who and which load, under the heading */
  summary: ReactNode;
  load: () => Promise<TripFareForm>;
  submit: (fare: TripFareInput, payModel: BrokerPayModel | null) => Promise<void>;
  onClose: () => void;
  layer?: number;
}) {
  const copy = COPY[mode];
  const panel = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<TripFareForm | null>(null);
  const [loadError, setLoadError] = useState('');
  const [draft, setDraft] = useState<FareDraft>(draftFrom(null));
  const [payModel, setPayModel] = useState<BrokerPayModel | null>(null);
  // delivery: the agreed values stand unless the company says they changed
  const [editing, setEditing] = useState(mode !== 'deliver');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tried, setTried] = useState(false);

  useEffect(() => {
    let active = true;
    load()
      .then((result) => {
        if (!active) return;
        setForm(result);
        setDraft(draftFrom(result.values));
        setPayModel(result.payModel);
        if (!result.agreed) setEditing(true);
      })
      .catch((e) => active && setLoadError(errorMessage(e)));
    return () => {
      active = false;
    };
    // the form is loaded once, when the dialog opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const agreed = form?.agreed ?? null;
  const read = useMemo(() => readDraft(draft), [draft]);
  const changed = mode === 'deliver' && !!agreed && editing && 'fare' in read && fareChanged(agreed, read.fare);
  const problem = !editing ? null : 'error' in read ? read.error : changed && !draft.changeReason ? 'دلیل تغییر را انتخاب کنید.' : form?.broker && mode === 'accept' && !payModel ? 'نحوه‌ی دریافت واسط را انتخاب کنید.' : null;

  async function save() {
    setTried(true);
    setError('');
    let fare: TripFareInput;
    if (!editing && agreed) {
      fare = { basis: agreed.basis, rate: agreed.rate, weightTons: agreed.weightTons, currency: agreed.currency };
    } else {
      if (problem || !('fare' in read)) return;
      const { basis, rate, weightTons, currency, changeReason, note } = read.fare;
      fare = { basis, rate, weightTons, currency, changeReason: changed ? changeReason : undefined, note: changed ? note : undefined };
    }
    setSaving(true);
    try {
      await submit(fare, form?.broker && mode === 'accept' ? payModel : null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

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
        aria-labelledby="fare-title"
        tabIndex={-1}
        dir="rtl"
        className="tw-flex tw-max-h-[92vh] tw-w-full tw-flex-col tw-overflow-hidden tw-rounded-t-2xl tw-bg-white tw-text-brand-navy tw-shadow-xl tw-outline-none sm:tw-max-w-xl sm:tw-rounded-2xl"
      >
        <div className="tw-flex tw-items-start tw-gap-3 tw-border-b tw-border-brand-line tw-bg-emerald-50 tw-px-5 tw-py-4">
          <div className="tw-min-w-0 tw-flex-1 tw-space-y-2">
            <h2 id="fare-title" className="tw-m-0 tw-flex tw-items-center tw-gap-2 tw-text-lg tw-font-bold">
              <Banknote size={20} aria-hidden className="tw-text-emerald-700" /> {copy.heading}
            </h2>
            {summary}
            <p className="tw-m-0 tw-text-xs tw-leading-6 tw-text-brand-muted">{copy.hint}</p>
          </div>
          <IconButton icon={X} label="بستن" onClick={onClose} />
        </div>

        <div className="tw-flex-1 tw-space-y-4 tw-overflow-y-auto tw-p-5">
          {!form && !loadError && <p className="tw-m-0 tw-text-sm tw-text-brand-muted">در حال آماده‌سازی فرم…</p>}
          {loadError && (
            <p role="alert" className="tw-m-0 tw-rounded-xl tw-bg-red-50 tw-px-3 tw-py-2 tw-text-sm tw-text-red-800">
              {loadError}
            </p>
          )}

          {form && mode === 'deliver' && agreed && (
            <div className="tw-space-y-3 tw-rounded-xl tw-border tw-border-brand-line tw-bg-brand-bg tw-p-3">
              <p className="tw-m-0 tw-text-sm">
                <span className="tw-text-brand-muted">توافقی: </span>
                <strong>{fareLine(agreed)}</strong>
              </p>
              <div className="tw-flex tw-flex-wrap tw-gap-2" role="radiogroup" aria-label="کرایه‌ی نهایی">
                {[
                  { value: false, label: 'بدون تغییر', icon: CheckCircle2 },
                  { value: true, label: 'مقادیر فرق کرد', icon: PencilLine },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={label}
                    type="button"
                    role="radio"
                    aria-checked={editing === value}
                    onClick={() => setEditing(value)}
                    className={cn(
                      'tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-full tw-border tw-px-3.5 tw-py-1.5 tw-text-sm',
                      editing === value ? 'tw-border-brand-orange tw-bg-brand-orange-soft tw-font-bold tw-text-brand-orange-ink' : 'tw-border-brand-line tw-bg-white',
                    )}
                  >
                    <Icon size={15} aria-hidden /> {label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {form && mode === 'deliver' && !agreed && (
            <p className="tw-m-0 tw-rounded-xl tw-bg-amber-50 tw-px-3 tw-py-2 tw-text-sm tw-text-amber-900">کرایه‌ی توافقی این سفر ثبت نشده؛ کرایه و وزن نهایی را وارد کنید.</p>
          )}

          {form && editing && (
            <TripFareFields draft={draft} onChange={setDraft} total={'fare' in read ? read.fare.total : null} weightLabel={copy.weight} askReason={changed} />
          )}
          {form && !editing && agreed && (
            <p className="tw-m-0 tw-rounded-xl tw-bg-brand-sky/60 tw-px-3 tw-py-2 tw-text-sm">
              جمع کرایه: <strong>{moneyWords(agreed.total, agreed.currency)}</strong>
            </p>
          )}

          {form?.broker && mode === 'accept' && <PayModelPicker value={payModel} onChange={setPayModel} />}

          {((tried && problem) || error) && (
            <p role="alert" className="tw-m-0 tw-rounded-xl tw-bg-red-50 tw-px-3 tw-py-2 tw-text-sm tw-text-red-800">
              {error || problem}
            </p>
          )}
        </div>

        <div className="tw-flex tw-items-center tw-justify-end tw-gap-2 tw-border-t tw-border-brand-line tw-px-5 tw-py-3">
          <SecondaryButton onClick={onClose}>انصراف</SecondaryButton>
          <PrimaryButton onClick={() => void save()} disabled={!form || saving}>
            <CheckCircle2 size={16} aria-hidden /> {saving ? 'در حال ثبت…' : copy.submit}
          </PrimaryButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}
