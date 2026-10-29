import { useEffect, useState } from 'react';
import { BellRing, X } from 'lucide-react';
import { currentSubscription, ownerOf, publicKey, subscribe, supported, turnedOff } from './pushApi';
import PhoneQuestion from './PhoneQuestion';

// Phone notifications of the installed app (Web Push): the same news the messengers get (a driver's request, a
// delivery, …), even while the app is closed. Shown inside the driver and company panels.

const DISMISS_KEY = 'push-prompt-dismissed-at';
const DISMISS_DAYS = 7;

function recentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return !!at && Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

/** hint: what this panel's notifications bring (the driver/company default, or e.g. new payment receipts for an admin) */
export default function PushPrompt({ hint = 'درخواست رانندگان، تحویل بار و پیام‌های سفر را حتی وقتی برنامه بسته است به‌صورت اعلان روی گوشی ببینید.' }: { hint?: string } = {}) {
  const [key, setKey] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [taken, setTaken] = useState(false);

  useEffect(() => {
    if (!supported()) return;
    let active = true;
    (async () => {
      const info = await publicKey();
      if (!active || !info || turnedOff() || Notification.permission === 'denied') return;
      // never turned on without asking, even when the browser already allows notifications: an account made on
      // someone else's phone must not quietly take it (the server also keeps a device with its first account)
      const subscription = Notification.permission === 'granted' ? await currentSubscription() : null;
      const owner = subscription ? (await ownerOf(subscription.endpoint)).owner : 'none';
      if (!active || owner !== 'none' || recentlyDismissed()) return;
      setKey(info.key);
      setPhone(info.phone);
      setVisible(true);
    })().catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  if (!visible || !key) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // storage unavailable: hidden for this visit only
    }
    setVisible(false);
  };

  const enable = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted' && !(await subscribe(key))) {
        setTaken(true);
        return;
      }
      setVisible(false);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div role="region" aria-label="اعلان گوشی" className="tw-mb-6 tw-flex tw-items-start tw-gap-3 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-4 tw-shadow-sm">
      <span className="tw-flex tw-h-10 tw-w-10 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-bg-brand-orange-soft tw-text-brand-orange">
        <BellRing size={20} aria-hidden />
      </span>
      <div className="tw-min-w-0 tw-flex-1 tw-space-y-2">
        <p className="tw-m-0 tw-text-sm tw-font-bold">اعلان گوشی را روشن کنید</p>
        <p className="tw-m-0 tw-text-xs tw-leading-6 tw-text-brand-muted">{hint}</p>
        <PhoneQuestion phone={phone} />
        {failed && <p className="tw-m-0 tw-text-xs tw-text-red-700">اعلان روشن نشد. اتصال را بررسی کنید و دوباره امتحان کنید.</p>}
        {taken && <p className="tw-m-0 tw-text-xs tw-text-red-700">اعلان این گوشی برای حساب دیگری روشن است؛ اعلان‌های این حساب روی گوشی خود صاحب حساب روشن شود.</p>}
        <div className="tw-flex tw-flex-wrap tw-gap-2">
          <button
            type="button"
            onClick={() => void enable()}
            disabled={busy}
            className="tw-rounded-xl tw-border-0 tw-bg-brand-orange tw-px-4 tw-py-2 tw-text-sm tw-font-bold tw-text-white hover:tw-bg-brand-orange-dark"
          >
            {busy ? 'در حال روشن کردن…' : 'روشن کردن'}
          </button>
          <button type="button" onClick={dismiss} className="tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-4 tw-py-2 tw-text-sm tw-text-brand-navy">
            بعداً
          </button>
        </div>
      </div>
      <button type="button" onClick={dismiss} aria-label="بستن" className="tw-shrink-0 tw-rounded-md tw-border-0 tw-bg-transparent tw-p-1 tw-text-brand-muted">
        <X size={16} aria-hidden />
      </button>
    </div>
  );
}
