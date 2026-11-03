import { useEffect, useState } from 'react';
import axios from 'axios';
import { Check, Copy, Download, EllipsisVertical, Share, SquarePlus, X } from 'lucide-react';
import endpoints from 'src/core/config/endpoints.json';
import { Button } from 'src/shared/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// closed for this visit only: it asks again the next time the site is opened, until the app is installed
const DISMISS_KEY = 'pwa-install-dismissed';
// this device has run the installed app (Android's installed app shares the site's storage; iPhone's does not)
const INSTALLED_KEY = 'pwa-installed';
// the server's answer for this visit (transport_backend api/usage/installed)
const SERVER_KEY = 'pwa-installed-server';

// Chrome may fire this before React mounts, so it is captured at import time.
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    remember(INSTALLED_KEY, localStorage);
    notify();
  });
}

function remember(key: string, storage: Storage) {
  try {
    storage.setItem(key, '1');
  } catch {
    // storage unavailable (private mode): this visit only
  }
}

function recalls(key: string, storage: Storage): boolean {
  try {
    return storage.getItem(key) === '1';
  } catch {
    return false;
  }
}

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.matchMedia('(display-mode: fullscreen)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  // iPadOS reports itself as a Mac.
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/**
 * Where the page is open, for how to install it:
 * - prompt: the browser offers its own install dialog (Chrome and Edge on Android and computers);
 * - ios-safari / ios-browser: Safari, or Chrome/Firefox/Edge on an iPhone (iOS 16.4+): Share → Add to Home Screen;
 * - in-app: inside a messenger's or Instagram's own browser, where nothing can be installed: open it in the browser;
 * - android-browser: another Android browser (Firefox, Samsung Internet): its menu → Install / Add to Home screen;
 * - null: nothing to show (a computer without an install dialog).
 */
type Where = 'prompt' | 'ios-safari' | 'ios-browser' | 'in-app' | 'android-browser' | null;

function where(canPrompt: boolean): Where {
  const agent = navigator.userAgent;
  const inApp = /FBAN|FBAV|Instagram|Telegram|WhatsApp|Bale|Eitaa|Rubika|Line\//i.test(agent);
  if (isIos()) {
    // the messengers' own browsers on an iPhone are web views: no «Safari/» in their agent
    if (inApp || !/Safari\//.test(agent)) return 'in-app';
    return /CriOS|FxiOS|EdgiOS|OPiOS/.test(agent) ? 'ios-browser' : 'ios-safari';
  }
  if (canPrompt) return 'prompt';
  if (/android/i.test(agent)) return inApp || /; wv\)/.test(agent) ? 'in-app' : 'android-browser';
  return null;
}

/** Asks the server whether this user has run the installed app (on any device); false when signed out or offline. */
async function installedOnServer(): Promise<boolean> {
  if (recalls(SERVER_KEY, sessionStorage)) return true;
  const token = localStorage.getItem('authToken');
  if (!token) return false;
  try {
    const { data } = await axios.get<{ data?: { installed?: boolean } }>(`${endpoints.baseurl}usage/installed`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000,
    });
    const installed = !!data?.data?.installed;
    if (installed) remember(SERVER_KEY, sessionStorage);
    return installed;
  } catch {
    return false;
  }
}

function CopyLink() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked: the address stays in the browser's own menu
    }
  };
  return (
    <button type="button" onClick={copy} className="tw-mt-2 tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-lg tw-border tw-border-border tw-bg-transparent tw-px-2.5 tw-py-1 tw-text-xs tw-font-semibold">
      {copied ? <Check className="tw-h-3.5 tw-w-3.5" /> : <Copy className="tw-h-3.5 tw-w-3.5" />}
      {copied ? 'کپی شد' : 'کپی آدرس ترابوت'}
    </button>
  );
}

const icon = 'tw-mx-1 tw-inline tw-h-4 tw-w-4 tw-align-text-bottom';

function Steps({ place }: { place: Exclude<Where, null> }) {
  if (place === 'prompt') {
    return <p className="tw-m-0 tw-mt-1 tw-text-xs tw-leading-6 tw-text-muted-foreground">برای دسترسی سریع‌تر و گرفتن اعلان بار حتی وقتی سایت بسته است، برنامه را روی گوشی نصب کنید.</p>;
  }
  if (place === 'in-app') {
    return (
      <div className="tw-mt-1 tw-text-xs tw-leading-6 tw-text-muted-foreground">
        <p className="tw-m-0">این صفحه داخل پیام‌رسان باز شده و از این‌جا نصب نمی‌شود.</p>
        <p className="tw-m-0">
          از منوی <EllipsisVertical className={icon} /> یا ••• گزینه‌ی «باز کردن در مرورگر» ({isIos() ? 'Open in Safari' : 'Open in Chrome'}) را بزنید و آن‌جا برنامه را نصب کنید.
        </p>
        <CopyLink />
      </div>
    );
  }
  if (place === 'android-browser') {
    return (
      <p className="tw-m-0 tw-mt-1 tw-text-xs tw-leading-6 tw-text-muted-foreground">
        از منوی مرورگر <EllipsisVertical className={icon} /> گزینه‌ی «Install app» یا «Add to Home screen» (افزودن به صفحه‌ی اصلی) را بزنید.
      </p>
    );
  }
  return (
    <ol className="tw-m-0 tw-mt-1 tw-list-inside tw-list-decimal tw-space-y-0.5 tw-p-0 tw-text-xs tw-leading-6 tw-text-muted-foreground">
      <li>
        دکمه‌ی اشتراک‌گذاری <Share className={icon} /> را بزنید{place === 'ios-safari' ? ' (در iOS جدید ممکن است داخل منوی ••• باشد)' : ''}.
      </li>
      <li>
        «Add to Home Screen» (افزودن به صفحه‌ی اصلی) <SquarePlus className={icon} /> را انتخاب کنید؛ اگر نبود، فهرست را پایین بکشید.
      </li>
      <li>«Add» (افزودن) را بزنید و برنامه را از صفحه‌ی اصلی گوشی باز کنید.</li>
      <li className="tw-list-none tw-font-semibold tw-text-card-foreground">در آیفون، اعلان بار فقط در برنامه‌ی نصب‌شده می‌رسد.</li>
      {/* a messenger may open links in a Safari view (Telegram does): it looks like Safari but cannot add to the home screen */}
      <li className="tw-list-none">اگر این گزینه را ندیدید (مثلاً صفحه از داخل پیام‌رسان باز شده)، اول «Open in Safari» را بزنید یا همین آدرس را در Safari باز کنید.</li>
    </ol>
  );
}

/**
 * Asks to install the app until it is: on each visit (closing it hides it for that visit only), stopping once the
 * app is installed — this device ran it installed, the browser said so, or (for an iPhone, whose Safari cannot tell)
 * the server saw this user open the installed app. The steps fit where the page is open: the browser's own dialog,
 * Share → Add to Home Screen on an iPhone, or first leaving a messenger's built-in browser.
 */
export default function InstallPrompt() {
  const [canPrompt, setCanPrompt] = useState(!!deferredPrompt);
  const [hidden, setHidden] = useState(() => isStandalone() || recalls(DISMISS_KEY, sessionStorage) || recalls(INSTALLED_KEY, localStorage));
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // the installed app: remember it here, so this device's browser stops asking
    if (isStandalone()) {
      remember(INSTALLED_KEY, localStorage);
      return;
    }
    const update = () => setCanPrompt(!!deferredPrompt);
    listeners.add(update);
    let active = true;
    void installedOnServer().then((installed) => {
      if (!active) return;
      if (installed) setHidden(true);
      setChecked(true);
    });
    return () => {
      active = false;
      listeners.delete(update);
    };
  }, []);

  const place = where(canPrompt);
  if (hidden || !checked || !place) return null;

  const dismiss = () => {
    remember(DISMISS_KEY, sessionStorage);
    setHidden(true);
  };

  // The event works only once and can go stale (a hot reload of this module drops it while the button stays,
  // or Chrome rejects it after the manifest changed); then the button hides instead of doing nothing.
  const install = async () => {
    const event = deferredPrompt;
    deferredPrompt = null;
    setCanPrompt(false);
    if (!event) return;
    try {
      await event.prompt();
      const { outcome } = await event.userChoice;
      if (outcome === 'accepted') remember(INSTALLED_KEY, localStorage);
      else dismiss();
    } catch {
      // Chrome fires beforeinstallprompt again when installing becomes possible.
    }
  };

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-label="نصب اپلیکیشن"
      className="tw-fixed tw-inset-x-3 tw-z-[1500] tw-mx-auto tw-max-w-md tw-rounded-xl tw-border tw-border-border tw-bg-card tw-p-4 tw-text-card-foreground tw-shadow-lg"
      style={{ bottom: 'calc(12px + env(safe-area-inset-bottom))' }}
    >
      <div className="tw-flex tw-items-start tw-gap-3">
        <img src="/pwa/trabot-icon-192.png" alt="" className="tw-h-12 tw-w-12 tw-shrink-0 tw-rounded-lg" />
        <div className="tw-min-w-0 tw-flex-1">
          <p className="tw-m-0 tw-text-sm tw-font-semibold">نصب اپلیکیشن ترابوت</p>
          <Steps place={place} />
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="بستن"
          className="tw-shrink-0 tw-rounded-md tw-border-0 tw-bg-transparent tw-p-1 tw-text-muted-foreground hover:tw-bg-accent"
        >
          <X className="tw-h-4 tw-w-4" />
        </button>
      </div>
      {place === 'prompt' && canPrompt && (
        <Button className="tw-mt-3 tw-w-full" onClick={install}>
          <Download />
          نصب
        </Button>
      )}
    </div>
  );
}
