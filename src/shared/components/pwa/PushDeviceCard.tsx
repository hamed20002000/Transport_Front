import { useEffect, useState } from 'react';
import { BellOff, BellRing } from 'lucide-react';
import axios from 'axios';
import endpoints from 'src/core/config/endpoints.json';
import { authConfig, currentSubscription, ownerOf, persianDigits, publicKey, setTurnedOff, subscribe, supported } from './pushApi';
import PhoneQuestion from './PhoneQuestion';

// The profile's card for this device's phone notifications. A device never moves to another account quietly (an
// account made on someone else's phone must not send its news there); when it has another account's notifications,
// the holder can move them to this account here, after seeing both numbers.

type State = 'loading' | 'unavailable' | 'denied' | 'none' | 'mine' | 'other';

type Read = { state: State; key: string | null; phone: string | null; otherPhone: string | null };

async function readState(): Promise<Read> {
  const unavailable: Read = { state: 'unavailable', key: null, phone: null, otherPhone: null };
  if (!supported()) return unavailable;
  const info = await publicKey();
  if (!info) return unavailable;
  const { key, phone } = info;
  if (Notification.permission === 'denied') return { state: 'denied', key, phone, otherPhone: null };
  const subscription = Notification.permission === 'granted' ? await currentSubscription() : null;
  const { owner, otherPhone } = subscription ? await ownerOf(subscription.endpoint) : { owner: 'none' as const, otherPhone: null };
  return { state: owner, key, phone, otherPhone };
}

const texts: Record<Exclude<State, 'loading' | 'unavailable'>, string> = {
  mine: 'اعلان‌های این حساب روی همین گوشی می‌آید.',
  none: 'اعلان این گوشی خاموش است. با روشن کردن، درخواست رانندگان، تحویل بار و پیام‌های سفر حتی وقتی برنامه بسته است روی همین گوشی می‌آید.',
  other: 'اعلان این گوشی برای حساب دیگری روشن است و اعلان‌های این حساب به آن نمی‌آید.',
  denied: 'اعلان این برنامه در تنظیمات مرورگر یا گوشی بسته شده است؛ برای روشن کردنش، اجازه‌ی اعلان را از همان‌جا بدهید.',
};

export default function PushDeviceCard() {
  const [state, setState] = useState<State>('loading');
  const [key, setKey] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [otherPhone, setOtherPhone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    readState()
      .then((result) => {
        if (!active) return;
        setKey(result.key);
        setPhone(result.phone);
        setOtherPhone(result.otherPhone);
        setState(result.state);
      })
      .catch(() => active && setState('unavailable'));
    return () => {
      active = false;
    };
  }, []);

  if (state === 'loading' || state === 'unavailable') return null;

  // takeOver: the device has another account's notifications and the holder confirmed the phone is theirs
  const turnOn = async (takeOver = false) => {
    if (!key) return;
    setBusy(true);
    setFailed(false);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'denied') return setState('denied');
      if (permission !== 'granted') return;
      setTurnedOff(false);
      setState((await subscribe(key, takeOver)) ? 'mine' : 'other');
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const subscription = await currentSubscription();
      if (subscription) {
        await axios.delete(`${endpoints.baseurl}push/subscriptions`, { ...authConfig(), data: { endpoint: subscription.endpoint } });
        // a fresh subscription next time, owned by whichever account turns notifications on then
        await subscription.unsubscribe().catch(() => undefined);
      }
      setTurnedOff(true);
      setState('none');
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const on = state === 'mine';
  const Icon = on ? BellRing : BellOff;
  return (
    <section aria-label="اعلان این گوشی" className="tw-flex tw-items-start tw-gap-3 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-5 tw-shadow-sm">
      <span className="tw-flex tw-h-9 tw-w-9 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-lg tw-bg-brand-sky tw-text-brand-navy">
        <Icon size={18} aria-hidden />
      </span>
      <div className="tw-min-w-0 tw-flex-1 tw-space-y-2">
        <h3 className="tw-m-0 tw-text-base tw-font-bold">اعلان این گوشی</h3>
        <p className="tw-m-0 tw-text-sm tw-leading-6 tw-text-brand-muted">{texts[state]}</p>
        {state === 'none' && <PhoneQuestion phone={phone} />}
        {state === 'other' && (
          <p className="tw-m-0 tw-rounded-xl tw-bg-brand-sky tw-p-3 tw-text-sm tw-leading-6 tw-text-brand-navy">
            اعلان این گوشی الان برای حساب {otherPhone ? <bdi dir="ltr" className="tw-font-bold">{persianDigits(otherPhone)}</bdi> : 'دیگری'} است. اگر
            این گوشی مال شماست، اعلان‌ها به حساب {phone ? <bdi dir="ltr" className="tw-font-bold">{persianDigits(phone)}</bdi> : 'شما'} منتقل
            شود؟ اگر مال صاحب آن حساب است، دست نزنید.
          </p>
        )}
        {failed && <p className="tw-m-0 tw-text-xs tw-text-red-700">انجام نشد. اتصال را بررسی کنید و دوباره امتحان کنید.</p>}
        {state === 'mine' && (
          <button type="button" onClick={() => void turnOff()} disabled={busy}
            className="tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-4 tw-py-2 tw-text-sm tw-font-bold tw-text-brand-navy hover:tw-border-red-300 hover:tw-text-red-700">
            {busy ? 'در حال خاموش کردن…' : 'خاموش کردن اعلان این گوشی'}
          </button>
        )}
        {state === 'other' && (
          <button type="button" onClick={() => void turnOn(true)} disabled={busy}
            className="tw-rounded-xl tw-border-0 tw-bg-brand-orange tw-px-4 tw-py-2 tw-text-sm tw-font-bold tw-text-white hover:tw-bg-brand-orange-dark">
            {busy ? 'در حال انتقال…' : 'انتقال به این حساب'}
          </button>
        )}
        {state === 'none' && (
          <button type="button" onClick={() => void turnOn()} disabled={busy}
            className="tw-rounded-xl tw-border-0 tw-bg-brand-orange tw-px-4 tw-py-2 tw-text-sm tw-font-bold tw-text-white hover:tw-bg-brand-orange-dark">
            {busy ? 'در حال روشن کردن…' : 'روشن کردن'}
          </button>
        )}
      </div>
    </section>
  );
}
