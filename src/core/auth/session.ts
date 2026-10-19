import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import endpoints from 'src/core/config/endpoints.json';

/*
 * Web session: a short-lived access token (JWT, `authToken`) plus a 30-day single-use refresh token.
 * Both are kept in localStorage so the next visit signs in by itself; every refresh rotates the pair.
 * Requests made with an expiring token are renewed first, and a 401 is retried once after a refresh.
 */

const ACCESS_KEY = 'authToken';
const REFRESH_KEY = 'authRefreshToken';
// Renew this long before the access token expires.
const RENEW_BEFORE_MS = 5 * 60_000;
const authBase = `${endpoints.baseurl}${endpoints.login}`;

export interface SessionTokens {
  accessToken: string;
  refreshToken?: string;
}

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export function saveSession(tokens: SessionTokens) {
  localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  if (tokens.refreshToken) localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  else localStorage.removeItem(REFRESH_KEY);
}

/** Signs out on this device: the refresh token is revoked on the server (best effort) and both tokens removed. */
export function clearSession() {
  const refreshToken = read(REFRESH_KEY);
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  if (refreshToken) {
    void fetch(`${authBase}logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      keepalive: true,
    }).catch(() => undefined);
  }
}

/**
 * «خروج» from the company/driver panels: ends the session (refresh token revoked) and reloads at the login page, so
 * nothing of this account stays in memory (auth context, sockets, cached lists) for whoever signs in next.
 */
export function signOut() {
  clearSession();
  for (const key of ['activeUserRoleName', 'activeUserRoleId', 'hasSeenWelcomeMessage']) localStorage.removeItem(key);
  window.location.assign('/auth/login');
}

function expiresAt(token: string | null): number {
  if (!token) return 0;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : Number.POSITIVE_INFINITY;
  } catch {
    return 0;
  }
}

const expiringSoon = () => expiresAt(read(ACCESS_KEY)) - RENEW_BEFORE_MS <= Date.now();

let inFlight: Promise<string | null> | null = null;

/** `rejected`: the access token the server just refused (renew even if it has not expired). */
async function exchange(rejected?: string | null): Promise<string | null> {
  // Another tab may have rotated the pair while this one waited for the lock.
  const current = read(ACCESS_KEY);
  if (rejected === undefined ? !expiringSoon() : current && current !== rejected) return current;
  const refreshToken = read(REFRESH_KEY);
  if (!refreshToken) return null;
  try {
    const response = await fetch(`${authBase}refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (response.status === 400 || response.status === 401) {
      // Revoked, expired or already used: the user has to sign in again.
      if (read(REFRESH_KEY) === refreshToken) localStorage.removeItem(REFRESH_KEY);
      return null;
    }
    const body = (await response.json()) as { data?: SessionTokens };
    if (!response.ok || !body.data?.accessToken) return null;
    saveSession(body.data);
    return body.data.accessToken;
  } catch {
    // Offline or server down: keep the refresh token for the next try.
    return null;
  }
}

/** Renews the pair with the refresh token; one request at a time across tabs. Null when not possible. */
export function refreshSession(rejected?: string | null): Promise<string | null> {
  const run = () => exchange(rejected);
  inFlight ??= (
    typeof navigator !== 'undefined' && navigator.locks ? navigator.locks.request('transport-auth-refresh', run) : run()
  ).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** The current access token, renewed first if it is about to expire and a refresh token is stored. */
export async function freshAccessToken(): Promise<string | null> {
  if (!expiringSoon()) return read(ACCESS_KEY);
  if (!read(REFRESH_KEY)) return read(ACCESS_KEY);
  return (await refreshSession()) ?? read(ACCESS_KEY);
}

export const hasStoredSession = () => !!read(ACCESS_KEY) || !!read(REFRESH_KEY);

const isAuthCall = (url?: string) => !!url && url.startsWith(authBase);

function withToken(config: AxiosRequestConfig, token: string) {
  const headers = (config.headers ?? {}) as Record<string, unknown>;
  for (const name of ['Authorization', 'authorization']) {
    const header = headers[name];
    if (typeof header === 'string' && header.startsWith('Bearer ')) headers[name] = `Bearer ${token}`;
  }
  return config;
}

/** Hooks an axios instance into the session: renew before sending, retry once after a 401. */
export function attachSessionRefresh(instance: AxiosInstance) {
  instance.interceptors.request.use(async (config) => {
    if (isAuthCall(config.url) || !read(REFRESH_KEY) || !expiringSoon()) return config;
    const token = await refreshSession();
    return token ? withToken(config, token) : config;
  });
  instance.interceptors.response.use(undefined, async (error) => {
    const config = error?.config as (AxiosRequestConfig & { _sessionRetried?: boolean }) | undefined;
    if (error?.response?.status !== 401 || !config || config._sessionRetried || isAuthCall(config.url) || !read(REFRESH_KEY)) {
      throw error;
    }
    config._sessionRetried = true;
    // Renew even if the token still looks valid (e.g. revoked or roles changed on the server).
    const token = await refreshSession(read(ACCESS_KEY));
    if (!token) throw error;
    return instance.request(withToken(config, token));
  });
}

attachSessionRefresh(axios);
// Sockets and fetch() calls read the token directly: keep it renewed in the background too.
if (typeof window !== 'undefined') {
  window.setInterval(() => {
    if (read(REFRESH_KEY) && expiringSoon()) void refreshSession();
  }, 60_000);
}
