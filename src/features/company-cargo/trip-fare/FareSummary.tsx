import { Banknote } from 'lucide-react';
import { cn } from 'src/shared/utils/utils';
import { fareChangeReasonLabels, fareLine, type TripFareView } from './tripFare';

/**
 * One stage's fare on a card: «💰 توافقی: دربست · ۴۵٬۰۰۰٬۰۰۰ تومان · ۲۵ تن», and at delivery the reason it changed.
 * Nothing when the stage was not recorded.
 */
export default function FareSummary({ fare, label, className }: { fare: TripFareView | null | undefined; label: string; className?: string }) {
  if (!fare) return null;
  return (
    <p className={cn('tw-m-0 tw-flex tw-flex-wrap tw-items-center tw-gap-1.5 tw-text-sm', className)}>
      <Banknote size={15} aria-hidden className="tw-shrink-0 tw-text-emerald-700" />
      <span className="tw-text-brand-muted">{label}:</span>
      <span className="tw-font-bold">{fareLine(fare)}</span>
      {fare.changeReason && <span className="tw-text-xs tw-text-brand-orange-ink">({fareChangeReasonLabels[fare.changeReason]})</span>}
    </p>
  );
}
