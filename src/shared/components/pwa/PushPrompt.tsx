import { useEffect, useState } from 'react';
import axios from 'axios';
import { BellRing, X } from 'lucide-react';
import endpoints from 'src/core/config/endpoints.json';

// Phone notifications of the installed app (Web Push): the same news the messengers get (a driver's request, a
// delivery, …), even while the app is closed. Shown inside the driver and company panels.

const DISMISS_KEY = 'push-prompt-dismissed-at';
const DISMISS_DAYS = 7;

const authConfig = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }, timeout: 15000 });

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.matchMedia('(display-mode: fullscreen)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// iOS shows web notifications only for an app added to the home screen
const supported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && (!isIos() || isStandalone());

function recentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return !!at && Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function keyBytes(base64: string): Uint8Array {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

async function publicKey(): Promise<string | null> {
  const { data } = await axios.get<{ data?: { publicKey: string | null }; publicKey?: string | null }>(`${endpoints.baseurl}push/public-key`, authConfig());
  return (data.data ?? data).publicKey ?? null;
}

/** This device's subscription, made if needed, sent to the server (it keeps one row per device). */
async function subscribe(key: string): Promise<void> {
  const registration = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('no service worker')), 10000)),
  ]);
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) }));
  await axios.post(`${endpoints.baseurl}push/subscriptions`, subscription.toJSON(), authConfig());
}

/** hint: what this panel's notifications bring (the driver/company default, or e.g. new payment receipts for an admin) */
export default function PushPrompt({ hint = 'درخواست رانندگان، تحویل بار و پیام‌های سفر را حتی وقتی برنامه بسته است به‌صورت اعلان روی گوشی ببینید.' }: { hint?: string } = {}) {
  const [key, setKey] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!supported()) return;
    let active = true;
    publicKey()
      .then((value) => {
        if (!active || !value) return;
        setKey(value);
        // already allowed: keep the server's copy of this device current (a reinstall makes a new subscription)
        if (Notification.permission === 'granted') void subscribe(value).catch(() => undefined);
        else if (Notification.permission === 'default' && !recentlyDismissed()) setVisible(true);
      })
      .catch(() => undefined);
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
      if (permission === 'granted') await subscribe(key);
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
        {failed && <p className="tw-m-0 tw-text-xs tw-text-red-700">اعلان روشن نشد. اتصال را بررسی کنید و دوباره امتحان کنید.</p>}
        <div className="tw-flex tw-flex-wrap tw-gap-2">
          <button
            type="button"
            onClick={() => void enable()}
            disabled={busy}
            className="tw-rounded-xl tw-border-0 tw-bg-brand-orange tw-px-4 tw-py-2 tw-text-sm tw-font-bold tw-text-white hover:tw-bg-brand-orange-dark disabled:tw-opacity-60"
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
