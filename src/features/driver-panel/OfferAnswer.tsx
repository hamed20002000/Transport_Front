import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { errorMessage, respondOffer, type CargoRequest } from './api';
import { ActionButton } from './components';
import { DRIVER_LOADS_CHANGED_EVENT } from './loadEvents';

// «۱۴:۳۵»
const clock = (value: string) => new Date(value).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

/**
 * The company handed this load to the driver: confirm (the trip starts and the load is taken) or decline
 * (the company picks someone else). Used on the load cards and on «درخواست‌های من».
 */
export default function OfferAnswer({
  requestId,
  expiresAt,
  onAnswered,
}: {
  requestId: string;
  expiresAt?: string | null;
  onAnswered: (request: CargoRequest) => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState<'yes' | 'no' | ''>('');

  async function answer(accept: boolean) {
    setBusy(accept ? 'yes' : 'no');
    try {
      const updated = await respondOffer(requestId, accept);
      toast.success(accept ? 'بار را تأیید کردید؛ سفر شما شروع شد.' : 'بار را نپذیرفتید؛ به شرکت خبر دادیم.');
      onAnswered(updated);
      window.dispatchEvent(new Event(DRIVER_LOADS_CHANGED_EVENT));
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
      {expiresAt && <span className="tw-text-xs tw-text-brand-muted">تا {clock(expiresAt)} فرصت دارید</span>}
      <ActionButton variant="danger" onClick={() => answer(false)} busy={busy === 'no'} disabled={!!busy}>
        <X size={16} aria-hidden /> نمی‌پذیرم
      </ActionButton>
      <ActionButton variant="success" onClick={() => answer(true)} busy={busy === 'yes'} disabled={!!busy}>
        <Check size={16} aria-hidden /> تأیید می‌کنم
      </ActionButton>
    </div>
  );
}
