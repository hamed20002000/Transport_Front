import axios from 'axios';
import endpoints from 'src/core/config/endpoints.json';

// Phone notifications (Web Push) of this device: shared by the panels' prompt and the profile's device card.

// phone numbers as shown in the panels
export const persianDigits = (value: string) => value.replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);

// set when notifications are turned off from the device card: the panels stop quietly turning them back on
const OFF_KEY = 'push-off';

export const authConfig = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }, timeout: 15000 });

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.matchMedia('(display-mode: fullscreen)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// iOS shows web notifications only for an app added to the home screen
export const supported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && (!isIos() || isStandalone());

export function turnedOff(): boolean {
  try {
    return localStorage.getItem(OFF_KEY) === '1';
  } catch {
    return false;
  }
}

export function setTurnedOff(off: boolean): void {
  try {
    if (off) localStorage.setItem(OFF_KEY, '1');
    else localStorage.removeItem(OFF_KEY);
  } catch {
    // storage unavailable: the panels may turn notifications on again on the next visit
  }
}

function keyBytes(base64: string): Uint8Array {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

type KeyResponse = { publicKey?: string | null; phone?: string | null };

/** null: notifications are not set up on this server. phone: the account's number, asked about before turning them on. */
export async function publicKey(): Promise<{ key: string; phone: string | null } | null> {
  const { data } = await axios.get<KeyResponse & { data?: KeyResponse }>(`${endpoints.baseurl}push/public-key`, authConfig());
  const { publicKey: key, phone } = data.data ?? data;
  return key ? { key, phone: phone ?? null } : null;
}

const serviceWorker = () =>
  Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('no service worker')), 10000)),
  ]);

export async function currentSubscription(): Promise<PushSubscription | null> {
  return (await serviceWorker()).pushManager.getSubscription();
}

/**
 * This device's push address if it already has one, without waiting for the service worker (null otherwise): sent
 * with a sign-in so the account's other devices hear of it, and not this one.
 */
export async function thisDeviceEndpoint(): Promise<string | null> {
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    return (await registration?.pushManager?.getSubscription())?.endpoint ?? null;
  } catch {
    return null;
  }
}

export type DeviceOwner = 'mine' | 'other' | 'none';

type OwnerResponse = { owner?: DeviceOwner; otherPhone?: string | null };

/** Whose notifications this device gets: this account's, another account's (otherPhone: its masked number), or nobody's yet. */
export async function ownerOf(endpoint: string): Promise<{ owner: DeviceOwner; otherPhone: string | null }> {
  const { data } = await axios.post<OwnerResponse & { data?: OwnerResponse }>(`${endpoints.baseurl}push/subscriptions/status`, { endpoint }, authConfig());
  const { owner, otherPhone } = data.data ?? data;
  return { owner: owner ?? 'none', otherPhone: otherPhone ?? null };
}

/**
 * This device's subscription, made if needed, sent to the server (it keeps one row per device). False when the device
 * belongs to another account; takeOver (the holder confirmed the phone is theirs) moves it to this one.
 */
export async function subscribe(key: string, takeOver = false): Promise<boolean> {
  const registration = await serviceWorker();
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) }));
  const { data } = await axios.post<{ data?: { subscribed: boolean }; subscribed?: boolean }>(
    `${endpoints.baseurl}push/subscriptions`,
    { ...subscription.toJSON(), takeOver },
    authConfig(),
  );
  return (data.data ?? data).subscribed !== false;
}
