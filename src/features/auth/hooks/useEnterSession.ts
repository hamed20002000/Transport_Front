import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { decodeJwtToken, useAuth } from 'src/core/auth/AuthContext';
import { saveSession, type SessionTokens } from 'src/core/auth/session';
import { accountHome } from 'src/features/account';

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

  const open = useCallback(
    (accessToken: string) => {
      const identity = decodeJwtToken(accessToken);
      const roles = identity?.roles ?? (Array.isArray(identity?.role) ? identity.role : [identity?.role]);
      const home = roles.map((role) => accountHome(role)).find(Boolean);
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
      open(tokens.accessToken);
    },
    [loadAuthData, open],
  );

  /** Signed in before on this device (refresh token): straight to the account, no code needed. */
  const resume = useCallback(async () => {
    if (!(await loadAuthData())) return false;
    const token = localStorage.getItem('authToken');
    if (!token) return false;
    open(token);
    return true;
  }, [loadAuthData, open]);

  return { enter, resume };
}
