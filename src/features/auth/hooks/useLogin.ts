import { useFormError } from './useFormError';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { accountHome } from 'src/features/account';
import { decodeJwtToken, useAuth } from 'src/core/auth/AuthContext';
import { login } from '../api/login';

const rememberedUsernameKey = 'transport.rememberedUsername';

function returnPath(search: string, fallback = '/dashboards/dashboard') {
  const requested = new URLSearchParams(search).get('url');
  if (!requested) return fallback;
  try {
    const url = new URL(requested, window.location.origin);
    if (!['http:', 'https:'].includes(url.protocol) || url.pathname.startsWith('/auth/'))
      return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function useLogin() {
  const location = useLocation();
  const [username, setUsername] = useState(
    () =>
      (location.state as { registrationUsername?: string } | null)?.registrationUsername ??
      localStorage.getItem(rememberedUsernameKey) ??
      '',
  );
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(() => !!localStorage.getItem(rememberedUsernameKey));
  const [loading, setLoading] = useState(false);
  const { error, setError, clearError } = useFormError();
  const pending = useRef(false);
  const navigate = useNavigate();
  const { loadAuthData } = useAuth();
  useEffect(() => {
    if ((location.state as { registrationLoginFailed?: boolean } | null)?.registrationLoginFailed) {
      setError('حساب شما ساخته شد، اما ورود خودکار انجام نشد. لطفاً وارد شوید.');
      navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    }
  }, [location.state, location.pathname, location.search, navigate, setError]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    if (!username.trim() || !password) {
      setError('نام کاربری و رمز عبور را وارد کنید.');
      return;
    }
    pending.current = true;
    setLoading(true);
    setError('');
    try {
      const token = await login(username.trim(), password);
      localStorage.setItem('authToken', token);
      const loaded = await loadAuthData();
      if (!loaded)
        throw new Error('دریافت اطلاعات حساب انجام نشد. دوباره تلاش کنید.');
      if (remember) localStorage.setItem(rememberedUsernameKey, username.trim());
      else localStorage.removeItem(rememberedUsernameKey);
      const identity = decodeJwtToken(token);
      const roles =
        identity?.roles ?? (Array.isArray(identity?.role) ? identity.role : [identity?.role]);
      const home = roles.map((role) => accountHome(role)).find(Boolean);
      navigate(home || returnPath(location.search), { replace: true });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(
          error.response?.status === 400 || error.response?.status === 401
            ? 'نام کاربری یا رمز عبور صحیح نیست.'
            : 'ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.',
        );
      } else setError(error instanceof Error ? error.message : 'ورود انجام نشد. دوباره تلاش کنید.');
    } finally {
      pending.current = false;
      setLoading(false);
    }
  }
  return {
    username,
    setUsername,
    password,
    setPassword,
    remember,
    setRemember,
    loading,
    error,
    clearError,
    submit,
  };
}
