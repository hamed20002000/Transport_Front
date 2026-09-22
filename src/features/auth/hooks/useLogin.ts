import { useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from 'src/core/auth/AuthContext';
import { login } from '../api/login';

const rememberedUsernameKey = 'transport.rememberedUsername';

function returnPath(search: string) {
  const fallback = '/dashboards/dashboard';
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
  const [username, setUsername] = useState(() => localStorage.getItem(rememberedUsernameKey) || '');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(() => !!localStorage.getItem(rememberedUsernameKey));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { loadAuthData } = useAuth();

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
      await loadAuthData();
      if (!localStorage.getItem('authToken'))
        throw new Error('دریافت اطلاعات حساب انجام نشد. دوباره تلاش کنید.');
      if (remember) localStorage.setItem(rememberedUsernameKey, username.trim());
      else localStorage.removeItem(rememberedUsernameKey);
      navigate(returnPath(location.search), { replace: true });
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
    submit,
  };
}
