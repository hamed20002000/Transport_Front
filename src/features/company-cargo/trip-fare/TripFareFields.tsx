import { Scale, Truck } from 'lucide-react';
import { cn } from 'src/shared/utils/utils';
import { Segmented } from '../components';
import {
  fareChangeReasonLabels,
  fareCurrencyLabels,
  faNumber,
  latinDigits,
  moneyWords,
  type FareBasis,
  type FareChangeReason,
  type FareCurrency,
  type FareDraft,
  type WeightUnit,
  draftTons,
  weightUnitLabels,
} from './tripFare';

const inputClass =
  'tw-h-11 tw-w-full tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-3 tw-text-sm tw-text-brand-navy tw-outline-none focus:tw-border-brand-orange';

/** An amount typed with any digits, shown grouped («۴۵٬۰۰۰٬۰۰۰»), kept as Latin digits. */
function AmountInput({ id, value, onChange, placeholder }: { id: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  const digits = latinDigits(value).replace(/\D/g, '');
  return (
    <input
      id={id}
      className={cn(inputClass, 'tw-text-left')}
      dir="ltr"
      inputMode="numeric"
      autoComplete="off"
      value={digits ? faNumber(Number(digits)) : ''}
      onChange={(event) => onChange(latinDigits(event.target.value).replace(/\D/g, '').slice(0, 15))}
      placeholder={placeholder}
    />
  );
}

/**
 * The fare and weight of one stage: how the fare is quoted, the amount (with the total and the amount in words, so a
 * missing zero shows), the weight and, at delivery when something changed, why. Controlled: the parent keeps the
 * draft (TripFareDialog), these only edit it.
 */
export default function TripFareFields({
  draft,
  onChange,
  total,
  weightLabel,
  askReason,
}: {
  draft: FareDraft;
  onChange: (draft: FareDraft) => void;
  /** the whole fare of the draft when it reads, for the line under the amount */
  total: number | null;
  weightLabel: string;
  /** delivery with a change: the reason is asked (and required) */
  askReason: boolean;
}) {
  const set = (patch: Partial<FareDraft>) => onChange({ ...draft, ...patch });
  const perTon = draft.basis === 'PER_TON';
  return (
    <div className="tw-space-y-4">
      <div className="tw-space-y-1.5">
        <span className="tw-block tw-text-sm tw-font-bold">نوع کرایه</span>
        <Segmented<FareBasis>
          label="نوع کرایه"
          value={draft.basis ?? ('' as FareBasis)}
          onChange={(basis) => set({ basis })}
          options={[
            { value: 'TOTAL', label: 'دربست (کل بار)', icon: Truck },
            { value: 'PER_TON', label: 'تنی (هر تن)', icon: Scale },
          ]}
        />
      </div>

      <div className="tw-grid tw-grid-cols-1 tw-gap-3 sm:tw-grid-cols-[2fr_1fr]">
        <label className="tw-block tw-space-y-1.5 tw-text-sm tw-font-bold" htmlFor="fare-rate">
          <span>{perTon ? 'کرایه‌ی هر تن' : 'مبلغ کل کرایه'}</span>
          <AmountInput id="fare-rate" value={draft.rate} onChange={(rate) => set({ rate })} placeholder={perTon ? 'مثلاً ۱٬۸۰۰٬۰۰۰' : 'مثلاً ۴۵٬۰۰۰٬۰۰۰'} />
        </label>
        <label className="tw-block tw-space-y-1.5 tw-text-sm tw-font-bold">
          <span>واحد</span>
          <select className={inputClass} value={draft.currency} onChange={(event) => set({ currency: event.target.value as FareCurrency })}>
            {(Object.keys(fareCurrencyLabels) as FareCurrency[]).map((currency) => (
              <option key={currency} value={currency}>
                {fareCurrencyLabels[currency]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="tw-grid tw-grid-cols-1 tw-gap-3 sm:tw-grid-cols-[2fr_1fr]">
        <label className="tw-block tw-space-y-1.5 tw-text-sm tw-font-bold" htmlFor="fare-weight">
          <span>{weightLabel}</span>
          <input
            id="fare-weight"
            className={cn(inputClass, 'tw-text-left')}
            dir="ltr"
            inputMode="decimal"
            autoComplete="off"
            value={draft.weight}
            onChange={(event) => set({ weight: latinDigits(event.target.value).replace(/[٫/]/g, '.').replace(/[^0-9.]/g, '').slice(0, 9) })}
            placeholder={draft.weightUnit === 'KG' ? 'مثلاً 25000' : 'مثلاً 25'}
          />
        </label>
        <label className="tw-block tw-space-y-1.5 tw-text-sm tw-font-bold">
          <span>واحد وزن</span>
          <select className={inputClass} value={draft.weightUnit} onChange={(event) => set({ weightUnit: event.target.value as WeightUnit })}>
            {(Object.keys(weightUnitLabels) as WeightUnit[]).map((unit) => (
              <option key={unit} value={unit}>
                {weightUnitLabels[unit]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {draft.weightUnit === 'KG' && draftTons(draft) > 0 && (
        <p className="tw-m-0 -tw-mt-2 tw-text-xs tw-text-brand-muted">برابر {faNumber(draftTons(draft))} تن</p>
      )}

      {total !== null && (
        <p className="tw-m-0 tw-rounded-xl tw-bg-brand-sky/60 tw-px-3 tw-py-2 tw-text-sm" aria-live="polite">
          جمع کرایه: <strong>{moneyWords(total, draft.currency)}</strong>
          {perTon && <span className="tw-text-brand-muted"> (کرایه‌ی هر تن × وزن)</span>}
        </p>
      )}

      {askReason && (
        <div className="tw-space-y-2 tw-rounded-xl tw-border tw-border-amber-200 tw-bg-amber-50 tw-p-3">
          <span className="tw-block tw-text-sm tw-font-bold">کرایه یا وزن با مقدار توافقی فرق دارد؛ دلیلش چیست؟</span>
          <div className="tw-flex tw-flex-wrap tw-gap-2" role="radiogroup" aria-label="دلیل تغییر">
            {(Object.keys(fareChangeReasonLabels) as FareChangeReason[]).map((reason) => (
              <button
                key={reason}
                type="button"
                role="radio"
                aria-checked={draft.changeReason === reason}
                onClick={() => set({ changeReason: reason })}
                className={cn(
                  'tw-rounded-full tw-border tw-px-3 tw-py-1.5 tw-text-xs tw-transition-colors',
                  draft.changeReason === reason
                    ? 'tw-border-brand-orange tw-bg-brand-orange-soft tw-font-bold tw-text-brand-orange-ink'
                    : 'tw-border-brand-line tw-bg-white tw-text-brand-navy hover:tw-border-brand-orange/50',
                )}
              >
                {fareChangeReasonLabels[reason]}
              </button>
            ))}
          </div>
          <input className={inputClass} value={draft.note} maxLength={300} onChange={(event) => set({ note: event.target.value })} placeholder="توضیح (اختیاری)، مثلاً ۳۰۰ کیلو کسری" />
        </div>
      )}
    </div>
  );
}
