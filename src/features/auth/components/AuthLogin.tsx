import { useState } from 'react';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  LockKeyhole,
  UserRound,
  LoaderCircle,
  CircleAlert,
} from 'lucide-react';
import { Button } from 'src/shared/components/ui/button';
import { Input } from 'src/shared/components/ui/input';
import { useLogin } from '../hooks/useLogin';
import styles from '../styles/login.module.css';

export default function AuthLogin() {
  const form = useLogin();
  const [visible, setVisible] = useState(false);
  return (
    <form onSubmit={form.submit} className={styles.form} aria-busy={form.loading}>
      <div className={styles.field}>
        <label htmlFor="username">نام کاربری</label>
        <div className={styles.inputWrap}>
          <UserRound size={19} className={styles.fieldIcon} aria-hidden="true" />
          <Input
            id="username"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="next"
            required
            value={form.username}
            disabled={form.loading}
            onChange={(event) => form.setUsername(event.target.value)}
            placeholder="نام کاربری خود را وارد کنید"
            aria-describedby={form.error ? 'login-error' : undefined}
            className="tw-h-12 tw-rounded-xl tw-text-base tw-pr-11 tw-pl-3"
          />
        </div>
      </div>
      <div className={styles.field}>
        <label htmlFor="password">رمز عبور</label>
        <div className={styles.inputWrap}>
          <LockKeyhole size={19} className={styles.fieldIcon} aria-hidden="true" />
          <Input
            id="password"
            name="password"
            type={visible ? 'text' : 'password'}
            autoComplete="current-password"
            enterKeyHint="go"
            required
            value={form.password}
            disabled={form.loading}
            onChange={(event) => form.setPassword(event.target.value)}
            placeholder="رمز عبور خود را وارد کنید"
            aria-describedby={form.error ? 'login-error' : undefined}
            className="tw-h-12 tw-rounded-xl tw-text-base tw-px-11"
          />
          <button
            type="button"
            className={styles.passwordToggle}
            onClick={() => setVisible(!visible)}
            aria-label={visible ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'}
            aria-pressed={visible}
          >
            {visible ? <EyeOff size={19} /> : <Eye size={19} />}
          </button>
        </div>
      </div>
      <label className={styles.remember}>
        <input
          type="checkbox"
          checked={form.remember}
          onChange={(event) => form.setRemember(event.target.checked)}
        />
        نام کاربری من را به خاطر بسپار
      </label>
      {form.error && (
        <div id="login-error" role="alert" className={styles.error}>
          <CircleAlert size={19} />
          <span>{form.error}</span>
        </div>
      )}
      <Button
        type="submit"
        disabled={form.loading}
        className="tw-h-12 tw-w-full tw-rounded-xl tw-bg-emerald-800 tw-text-base tw-text-white hover:tw-bg-emerald-900 tw-gap-3"
      >
        {form.loading ? (
          <>
            <LoaderCircle size={20} className={styles.spinner} />
            در حال ورود…
          </>
        ) : (
          <>
            ورود به پنل مدیریت
            <ArrowLeft size={20} />
          </>
        )}
      </Button>
    </form>
  );
}
