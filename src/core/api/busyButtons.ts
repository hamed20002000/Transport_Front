import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';

// A button whose click sent a request ignores clicks (and Enter in its form, which clicks the submit button) until
// every request it started has finished: no second save, payment or approval from a double tap. Marked aria-busy.

const CLICKABLE = 'button, input[type="submit"], input[type="button"], [role="button"]';
/** requests sent this long after a click are the click's (a handler may await a little before sending) */
const CLICK_WINDOW_MS = 1500;
/** a request that never settles (an interceptor threw before it was sent) frees its button after this */
const MAX_BUSY_MS = 120_000;

type BusyConfig = AxiosRequestConfig & { busyButton?: Element | null };

let lastClick: { button: Element; at: number } | null = null;
/** requests still open per button, and a timer that frees it if they never settle */
const pending = new Map<Element, { count: number; timer: number }>();

function free(button: Element) {
  const entry = pending.get(button);
  if (entry) window.clearTimeout(entry.timer);
  pending.delete(button);
  button.removeAttribute('aria-busy');
}

function hold(button: Element) {
  const entry = pending.get(button);
  if (entry) window.clearTimeout(entry.timer);
  pending.set(button, { count: (entry?.count ?? 0) + 1, timer: window.setTimeout(() => free(button), MAX_BUSY_MS) });
  button.setAttribute('aria-busy', 'true');
}

function release(button: Element) {
  const entry = pending.get(button);
  if (!entry || entry.count <= 1) free(button);
  else entry.count -= 1;
}

function clickedButton(): Element | null {
  if (!lastClick || performance.now() - lastClick.at > CLICK_WINDOW_MS || !lastClick.button.isConnected) return null;
  return lastClick.button;
}

if (typeof document !== 'undefined') {
  // capture on the document runs before React's own listeners on the root
  document.addEventListener(
    'click',
    (event) => {
      const button = (event.target as Element | null)?.closest?.(CLICKABLE);
      if (!button) return;
      if (pending.has(button)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      lastClick = { button, at: performance.now() };
    },
    true,
  );
}

/** Hooks an axios instance in: its requests keep the button that sent them busy. */
export function attachBusyButtons(instance: AxiosInstance) {
  instance.interceptors.request.use((config: BusyConfig) => {
    // a retry (e.g. after renewing the session) keeps the button of the first try
    const button = config.busyButton === undefined ? clickedButton() : config.busyButton;
    config.busyButton = button;
    if (button) hold(button);
    return config;
  });
  const done = (config?: BusyConfig) => {
    if (config?.busyButton) release(config.busyButton);
  };
  instance.interceptors.response.use(
    (response) => {
      done(response.config as BusyConfig);
      return response;
    },
    (error) => {
      done(error?.config as BusyConfig | undefined);
      throw error;
    },
  );
}

attachBusyButtons(axios);
