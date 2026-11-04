import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LoaderCircle, Send, ShieldCheck, X } from 'lucide-react';
import { cn } from 'src/shared/utils/utils';
import { getExitBorders, type BorderChoice } from './api';

/**
 * The borders a request of this load picks from (transport_backend LoadBorderService): toward where an export load
 * goes or an import load comes from; needed=false for a domestic load. null while loading or when it failed.
 */
export function useLoadBorders(listingId: string | null) {
  const [choice, setChoice] = useState<BorderChoice | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setChoice(null);
    setFailed(false);
    if (listingId) getExitBorders(listingId).then(setChoice, () => setFailed(true));
  }, [listingId]);
  return { choice, failed };
}

/** The borders as chips, one picked. */
export function BorderChips({ choice, value, onChange }: { choice: BorderChoice; value: string; onChange: (border: string) => void }) {
  return (
    <div className="tw-space-y-2" role="radiogroup" aria-label={choice.label}>
      <p className="tw-m-0 tw-flex tw-items-center tw-gap-1.5 tw-text-sm tw-font-bold">
        <ShieldCheck size={15} aria-hidden className="tw-text-brand-muted" /> {choice.label} <span className="tw-text-brand-orange" aria-hidden>*</span>
      </p>
      <div className="tw-flex tw-flex-wrap tw-gap-2">
        {choice.options.map((name) => (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={value === name}
            onClick={() => onChange(name)}
            className={cn(
              'tw-rounded-xl tw-border tw-px-3 tw-py-1.5 tw-text-sm',
              value === name ? 'tw-border-brand-orange tw-bg-brand-orange-soft tw-font-bold' : 'tw-border-brand-line tw-bg-white hover:tw-bg-brand-sky',
            )}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

/** A driver's request of an export or import load: which border, in a modal (a sheet from the bottom on a phone). */
export default function BorderDialog({
  cargo,
  choice,
  layer,
  sending,
  onPick,
  onClose,
}: {
  cargo: string;
  choice: BorderChoice;
  layer?: number;
  sending: boolean;
  onPick: (border: string) => void;
  onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const [border, setBorder] = useState('');

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.querySelector('button')?.focus();
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [onClose]);

  return createPortal(
    <div
      style={{ zIndex: (layer ?? 50) + 10 }}
      className="tw-fixed tw-inset-0 tw-flex tw-items-end tw-justify-center tw-bg-brand-navy/40 sm:tw-items-center sm:tw-p-6"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="border-title"
        dir="rtl"
        className="tw-flex tw-max-h-[94vh] tw-w-full tw-flex-col tw-overflow-y-auto tw-rounded-t-3xl tw-bg-white tw-p-5 tw-text-brand-navy tw-shadow-2xl sm:tw-max-w-md sm:tw-rounded-3xl"
      >
        <div className="tw-flex tw-items-start tw-justify-between tw-gap-3">
          <div className="tw-min-w-0">
            <h2 id="border-title" className="tw-m-0 tw-text-lg tw-font-bold">از کدام مرز؟</h2>
            <p className="tw-m-0 tw-mt-1 tw-truncate tw-text-sm tw-text-brand-muted">{cargo}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="بستن" className="tw-rounded-lg tw-border-0 tw-bg-transparent tw-p-1.5 tw-text-brand-muted hover:tw-bg-brand-sky">
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="tw-mt-4">
          <BorderChips choice={choice} value={border} onChange={setBorder} />
        </div>
        <button
          type="button"
          onClick={() => border && !sending && onPick(border)}
          disabled={!border || sending}
          className="tw-mt-5 tw-inline-flex tw-h-12 tw-w-full tw-items-center tw-justify-center tw-gap-2 tw-rounded-xl tw-border-0 tw-bg-brand-orange tw-font-bold tw-text-white hover:tw-bg-brand-orange-dark disabled:tw-opacity-50"
        >
          {sending ? <LoaderCircle size={18} className="tw-animate-spin" aria-hidden /> : <Send size={18} aria-hidden />} فرستادن درخواست
        </button>
      </div>
    </div>,
    document.body,
  );
}
