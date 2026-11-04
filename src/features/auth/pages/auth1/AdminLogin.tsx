import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Eye, EyeOff, KeyRound, LoaderCircle, ShieldCheck, UserRound } from 'lucide-react';
import endpoints from 'src/core/config/endpoints.json';
import { useAuth } from 'src/core/auth/AuthContext';
import { saveSession, type SessionTokens } from 'src/core/auth/session';
import PageContainer from 'src/shared/components/container/PageContainer';
import { Button } from 'src/shared/components/ui/button';
import { Input } from 'src/shared/components/ui/input';
import styles from '../../styles/login.module.css';
import trabotIcon from 'src/shared/assets/images/logos/trabot-icon.png';

// where an administrator lands after signing in
const ADMIN_HOME = '/admin/subscription-orders';

/** transport_backend POST api/auth/admin/login: an ADMIN account's username and password. */
async function adminSignIn(username: string, password: string): Promise<SessionTokens> {
  const { data } = await axios.post<{ success: boolean; data?: SessionTokens }>(
    `${endpoints.baseurl}${endpoints.login}admin/login`,
    { username, password },
    { timeout: 20000 },
  );
  if (!data.success || !data.data?.accessToken) throw new Error('ورود انجام نشد. دوباره تلاش کنید.');
  return data.data;
}

const errorText = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'ارتباط با سرور برقرار نشد.';
    const message = (error.response.data as { message?: unknown } | undefined)?.message;
    if (typeof message === 'string' && /[؀-ۿ]/.test(message)) return message;
    if (error.response.status === 401) return 'نام کاربری یا رمز عبور درست نیست.';
  }
  return 'ورود انجام نشد. دوباره تلاش کنید.';
};

/**
 * The admin panel's own sign-in, at its own address (/auth/admin): username and password, for an administrator only.
 * Everyone else signs in with a mobile and an SMS code at /auth/login.
 */
export default function AdminLogin() {
  const navigate = useNavigate();
  const { loadAuthData } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [shown, setShown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!username.trim() || !password || loading) return;
    setLoading(true);
    setError('');
    try {
      saveSession(await adminSignIn(username.trim(), password));
      localStorage.removeItem('activeUserRoleName');
      localStorage.removeItem('activeUserRoleId');
      if (!(await loadAuthData())) throw new Error();
      navigate(ADMIN_HOME, { replace: true });
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageContainer title="ورود مدیریت | ترابوت" description="ورود به پنل مدیریت ترابوت">
      <main className={styles.page} dir="rtl" lang="fa">
        <div className={styles.frame}>
          <section className={styles.login} aria-labelledby="admin-login-title">
            <header className={styles.brand}>
              <img className={styles.brandIcon} src={trabotIcon} alt="" />
              <div>
                <strong>ترابوت</strong>
                <p>پنل مدیریت</p>
              </div>
            </header>
            <div className={styles.formContent}>
              <div className={styles.welcomeIcon}>
                <ShieldCheck size={25} />
              </div>
              <h1 id="admin-login-title">ورود مدیریت</h1>
              <p className={styles.description}>این صفحه فقط برای مدیر سامانه است.</p>
              <form onSubmit={submit} onChange={() => setError('')} className={styles.form} aria-busy={loading} noValidate>
                <div className={styles.field}>
                  <label htmlFor="admin-username">نام کاربری</label>
                  <div className={styles.inputWrap}>
                    <UserRound size={19} className={styles.fieldIcon} aria-hidden="true" />
                    <Input
                      id="admin-username"
                      autoComplete="username"
                      dir="ltr"
                      autoFocus
                      required
                      value={username}
                      disabled={loading}
                      onChange={(event) => setUsername(event.target.value)}
                      className="tw-h-12 tw-rounded-xl tw-pr-11 tw-pl-3 tw-text-base"
                    />
                  </div>
                </div>
                <div className={styles.field}>
                  <label htmlFor="admin-password">رمز عبور</label>
                  <div className={styles.inputWrap}>
                    <KeyRound size={19} className={styles.fieldIcon} aria-hidden="true" />
                    <Input
                      id="admin-password"
                      type={shown ? 'text' : 'password'}
                      autoComplete="current-password"
                      dir="ltr"
                      required
                      value={password}
                      disabled={loading}
                      onChange={(event) => setPassword(event.target.value)}
                      className="tw-h-12 tw-rounded-xl tw-pr-11 tw-pl-11 tw-text-base"
                    />
                    <button
                      type="button"
                      onClick={() => setShown((value) => !value)}
                      aria-label={shown ? 'پنهان کردن رمز' : 'نمایش رمز'}
                      className="tw-absolute tw-left-3 tw-top-1/2 tw--translate-y-1/2 tw-border-0 tw-bg-transparent tw-p-0 tw-text-brand-muted"
                    >
                      {shown ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
                    </button>
                  </div>
                </div>
                {error && (
                  <div role="alert" className={styles.error}>
                    {error}
                  </div>
                )}
                <Button
                  type="submit"
                  disabled={loading || !username.trim() || !password}
                  className="tw-h-12 tw-w-full tw-gap-3 tw-rounded-xl tw-bg-brand-orange tw-text-base tw-font-bold tw-text-white hover:tw-bg-brand-orange-dark"
                >
                  {loading ? (
                    <>
                      <LoaderCircle size={20} className={styles.spinner} aria-hidden="true" /> در حال بررسی…
                    </>
                  ) : (
                    <>
                      ورود <ArrowLeft size={20} aria-hidden="true" />
                    </>
                  )}
                </Button>
              </form>
            </div>
          </section>
        </div>
      </main>
    </PageContainer>
  );
}
