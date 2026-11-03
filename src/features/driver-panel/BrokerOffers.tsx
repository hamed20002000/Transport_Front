import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Handshake, LoaderCircle, X } from 'lucide-react';
import { useAuth } from 'src/core/auth/AuthContext';
import { useNotificationEvent } from 'src/features/company-cargo/notificationSocket';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { groupDigits } from 'src/shared/utils/digitGroups';
import { answerBrokerOffer, errorMessage, getBrokerOffers, type BrokerOffer } from './api';

const RESULT_TEXT = {
  accepted: 'مشخصات شما برای واسط فرستاده شد و درخواست این بار به نام شما برای شرکت حمل‌ونقل رفت.',
  declined: 'این پیشنهاد را رد کردید.',
  closed: 'این پیشنهاد دیگر باز نیست: راننده‌ی دیگری زودتر قبول کرد، بار برداشته شد یا وقتش گذشت.',
} as const;

/**
 * A broker looking for a driver for a load told this driver of it (transport_backend DriverSuggestionService): the
 * broker's name and the load, «می‌خواهم» or «نه». Saying yes sends the driver's name, national code, plate and mobile
 * to the broker and the company, as the broker's request. Only for drivers; it shows nothing without an offer.
 */
export default function BrokerOffers() {
  const { userRoles } = useAuth();
  const driver = userRoles.some((role) => role.name === 'DRIVER');
  const toast = useToast();
  const [offers, setOffers] = useState<BrokerOffer[]>([]);
  const [busy, setBusy] = useState('');
  const [needProfile, setNeedProfile] = useState(false);

  const load = useCallback(() => {
    if (driver) getBrokerOffers().then(setOffers, () => setOffers([]));
  }, [driver]);
  useEffect(load, [load]);
  useNotificationEvent('broker-offer', load);

  async function answer(offer: BrokerOffer, accept: boolean) {
    setBusy(offer.id);
    try {
      const { result } = await answerBrokerOffer(offer.id, accept);
      if (result === 'profile') return setNeedProfile(true);
      if (result === 'accepted') toast.success(RESULT_TEXT.accepted);
      else toast.info(RESULT_TEXT[result]);
      load();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy('');
    }
  }

  if (!offers.length) return null;
  return (
    <section className="tw-mb-5 tw-space-y-3" aria-label="پیشنهاد بار از واسط‌ها">
      {offers.map((offer) => (
        <article key={offer.id} className="tw-space-y-3 tw-rounded-2xl tw-border tw-border-brand-orange/40 tw-bg-brand-orange-soft/40 tw-p-4">
          <p className="tw-m-0 tw-flex tw-items-center tw-gap-2 tw-font-bold">
            <Handshake size={18} aria-hidden /> واسط «{offer.broker}» برای این بار راننده می‌خواهد
          </p>
          <p className="tw-m-0 tw-text-sm">
            {offer.listing.origin} ← {offer.listing.destination}
            {[offer.listing.cargoType, groupDigits(offer.listing.weight), groupDigits(offer.listing.price)].filter(Boolean).map((part) => ` · ${part}`)}
          </p>
          <p className="tw-m-0 tw-text-xs tw-leading-6 tw-text-brand-muted">
            اگر بخواهید، نام، کد ملی، پلاک و موبایل شما برای واسط و شرکت حمل‌ونقل فرستاده می‌شود. شماره‌ی شما تا قبول نکنید به کسی داده نمی‌شود.
          </p>
          {needProfile && (
            <p className="tw-m-0 tw-rounded-lg tw-bg-white tw-p-2 tw-text-xs tw-text-red-700">
              اول <Link to="/account/driver/profile">پروفایل راننده</Link> را کامل کنید (نام، کد ملی و پلاک)، بعد دوباره «می‌خواهم» را بزنید.
            </p>
          )}
          <div className="tw-flex tw-gap-2">
            <button
              type="button"
              disabled={busy === offer.id}
              onClick={() => void answer(offer, true)}
              className="tw-inline-flex tw-h-10 tw-flex-1 tw-items-center tw-justify-center tw-gap-1.5 tw-rounded-xl tw-border-0 tw-bg-brand-orange tw-font-bold tw-text-white hover:tw-bg-brand-orange-dark"
            >
              {busy === offer.id ? <LoaderCircle size={16} className="tw-animate-spin" aria-hidden /> : <Check size={16} aria-hidden />} می‌خواهم
            </button>
            <button
              type="button"
              disabled={busy === offer.id}
              onClick={() => void answer(offer, false)}
              className="tw-inline-flex tw-h-10 tw-items-center tw-justify-center tw-gap-1.5 tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-4 tw-font-bold"
            >
              <X size={16} aria-hidden /> نه
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
