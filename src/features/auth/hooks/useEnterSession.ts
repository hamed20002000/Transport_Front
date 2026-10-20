import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { decodeJwtToken, useAuth } from 'src/core/auth/AuthContext';
import { saveSession, type SessionTokens } from 'src/core/auth/session';
import { accountHome, signInPage } from 'src/features/account';

export function returnPath(search: string, fallback = '/dashboards/dashboard') {
  const requested = new URLSearchParams(search).get('url');
  if (!requested) return fallback;
  try {
    const url = new URL(requested, window.location.origin);
    if (!['http:', 'https:'].includes(url.protocol) || url.pathname.startsWith('/auth/')) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

/** Stores the tokens, loads the account and opens its home page (or the page that asked for sign-in). */
export function useEnterSession() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const { loadAuthData } = useAuth();

  // firstStop: the account page to open (its home, or right after signing in with a code its profile)
  const open = useCallback(
    async (accessToken: string, firstStop: (role: string | undefined) => string | undefined | Promise<string | undefined>) => {
      const identity = decodeJwtToken(accessToken);
      const roles = identity?.roles ?? (Array.isArray(identity?.role) ? identity.role : [identity?.role]);
      const home = (await Promise.all(roles.map((role) => firstStop(role)))).find(Boolean);
      navigate(home || returnPath(search), { replace: true });
    },
    [navigate, search],
  );

  const enter = useCallback(
    async (tokens: SessionTokens) => {
      saveSession(tokens);
      localStorage.removeItem('activeUserRoleName');
      localStorage.removeItem('activeUserRoleId');
      if (!(await loadAuthData())) throw new Error('دریافت اطلاعات حساب انجام نشد. دوباره تلاش کنید.');
      // signed in with a code: the profile first, so the user sees what it controls (a driver in no company: why no
      // loads arrive)
      await open(tokens.accessToken, signInPage);
    },
    [loadAuthData, open],
  );

  /** Signed in before on this device (refresh token): straight to the account, no code needed. */
  const resume = useCallback(async () => {
    if (!(await loadAuthData())) return false;
    const token = localStorage.getItem('authToken');
    if (!token) return false;
    await open(token, accountHome);
    return true;
  }, [loadAuthData, open]);

  return { enter, resume };
}
