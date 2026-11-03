import axios from 'axios';
import endpoints from 'src/core/config/endpoints.json';

/** The installed app (PWA) or the site in a browser. */
export const appMode = (): 'pwa' | 'web' =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.matchMedia('(display-mode: fullscreen)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true
    ? 'pwa'
    : 'web';

// every request says which: the server counts load requests and details by it (transport_backend UsageService)
axios.defaults.headers.common['X-App-Mode'] = appMode();

const OPENED_KEY = 'usage-opened';

/**
 * Tells the server the panel was opened (transport_backend api/usage/opened): once a day per mode, and whenever a
 * link brought it here — a messenger's («?src=bale») or a phone notification's («?src=push»). The source is taken
 * out of the address after.
 */
export async function reportOpened(): Promise<void> {
  const token = localStorage.getItem('authToken');
  if (!token) return;
  const url = new URL(window.location.href);
  const source = url.searchParams.get('src') ?? undefined;
  const mode = appMode();
  const mark = `${new Date().toDateString()}:${mode}`;
  if (!source && localStorage.getItem(OPENED_KEY) === mark) return;
  try {
    await axios.post(`${endpoints.baseurl}usage/opened`, { mode, ...(source && { source }) }, { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 });
    localStorage.setItem(OPENED_KEY, mark);
  } catch {
    // figures only: never in the way
  }
  if (source) {
    url.searchParams.delete('src');
    window.history.replaceState(window.history.state, '', url.toString());
  }
}
