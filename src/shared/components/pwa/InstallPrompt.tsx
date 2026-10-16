import { useEffect, useState } from 'react';
import { Download, Share, SquarePlus, X } from 'lucide-react';
import { Button } from 'src/shared/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa-install-dismissed-at';
const DISMISS_DAYS = 7;

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
    notify();
  });
}

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  // iPadOS reports itself as a Mac.
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const recentlyDismissed = () => {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return !!at && Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
};

export default function InstallPrompt() {
  const [canPrompt, setCanPrompt] = useState(!!deferredPrompt);
  const [hidden, setHidden] = useState(() => isStandalone() || recentlyDismissed());
  const ios = isIos();

  useEffect(() => {
    const update = () => setCanPrompt(!!deferredPrompt);
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);

  if (hidden || (!canPrompt && !ios)) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Storage unavailable (private mode); hide for this session only.
    }
    setHidden(true);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    setCanPrompt(false);
    if (outcome === 'dismissed') dismiss();
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
        <img src="/pwa/icon-192.png" alt="" className="tw-h-12 tw-w-12 tw-shrink-0 tw-rounded-lg" />
        <div className="tw-min-w-0 tw-flex-1">
          <p className="tw-m-0 tw-text-sm tw-font-semibold">نصب اپلیکیشن Setaş</p>
          {ios && !canPrompt ? (
            <p className="tw-m-0 tw-mt-1 tw-text-xs tw-leading-6 tw-text-muted-foreground">
              در Safari دکمه‌ی اشتراک‌گذاری
              <Share className="tw-mx-1 tw-inline tw-h-4 tw-w-4 tw-align-text-bottom" />
              را بزنید و سپس گزینه‌ی «Add to Home Screen»
              <SquarePlus className="tw-mx-1 tw-inline tw-h-4 tw-w-4 tw-align-text-bottom" />
              را انتخاب کنید.
            </p>
          ) : (
            <p className="tw-m-0 tw-mt-1 tw-text-xs tw-leading-6 tw-text-muted-foreground">
              برای دسترسی سریع‌تر، برنامه را روی گوشی خود نصب کنید.
            </p>
          )}
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
      {canPrompt && (
        <Button className="tw-mt-3 tw-w-full" onClick={install}>
          <Download />
          نصب
        </Button>
      )}
    </div>
  );
}
