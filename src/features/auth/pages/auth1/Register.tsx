import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, Truck, UserRoundPlus } from 'lucide-react';
import PageContainer from 'src/shared/components/container/PageContainer';
import { Button } from 'src/shared/components/ui/button';
import { Input } from 'src/shared/components/ui/input';
import TransportVisual from '../../components/TransportVisual';
import styles from '../../styles/login.module.css';
import { useRegister } from '../../hooks/useRegister';
import { AccountType } from '../../types/register';

export default function Register() {
  const form = useRegister();
  const [visible, setVisible] = useState(false);
  const { search } = useLocation();

  return (
    <PageContainer
      title="ثبت‌نام | Setaş Transport"
      description="ثبت‌نام در سامانه مدیریت حمل‌ونقل ستاش"
    >
      <main className={styles.page} dir="rtl" lang="fa">
        <div className={styles.frame}>
          <section className={styles.login} aria-labelledby="register-title">
            <header className={styles.brand}>
              <span className={styles.brandIcon}>
                <Truck size={27} />
              </span>
              <div>
                <strong dir="ltr">
                  SETAŞ<span> TRANSPORT</span>
                </strong>
                <p>سامانه مدیریت حمل‌ونقل</p>
              </div>
            </header>
            <div className={styles.formContent}>
              <span className={styles.formEyebrow}>به جمع کاربران ستاش بپیوندید</span>
              <h1 id="register-title">ایجاد حساب کاربری</h1>
              <p className={styles.description}>
                {form.step === 'details'
                  ? 'اطلاعات حساب خود را وارد کنید.'
                  : 'کد ارسال‌شده با پیامک را وارد کنید.'}
              </p>
              <form
                onChange={form.clearError}
                onClickCapture={(event) => {
                  if (event.target instanceof Element && event.target.closest('button, a'))
                    form.clearError();
                }}
                onSubmit={form.submit}
                aria-busy={form.loading}
              >
                <fieldset
                  className={`${styles.form} tw-min-w-0`}
                  disabled={form.loading || form.step === 'otp'}
                  hidden={form.step === 'otp'}
                  style={form.step === 'otp' ? { display: 'none' } : undefined}
                >
                  <div className={styles.field}>
                    <label htmlFor="register-account-type">نوع حساب</label>
                    <select
                      id="register-account-type"
                      name="accountType"
                      required
                      defaultValue=""
                      className="tw-h-12 tw-w-full tw-rounded-xl tw-border tw-border-input tw-bg-card tw-px-3 tw-text-base focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-ring"
                    >
                      <option value="" disabled>
                        نوع حساب خود را انتخاب کنید
                      </option>
                      <option value={AccountType.Company}>شرکت</option>
                      <option value={AccountType.Driver}>راننده</option>
                      <option value={AccountType.Broker}>واسط</option>
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="register-username">نام کاربری</label>
                    <Input
                      id="register-username"
                      name="username"
                      maxLength={100}
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      required
                      placeholder="نام کاربری خود را انتخاب کنید"
                      className="tw-h-12 tw-rounded-xl tw-text-base"
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="register-phone">شماره موبایل</label>
                    <Input
                      id="register-phone"
                      name="phoneNumber"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      dir="ltr"
                      required
                      aria-describedby="phone-hint"
                      placeholder="09121234567"
                      className="tw-h-12 tw-rounded-xl tw-text-base"
                    />
                    <p id="phone-hint" className={styles.description}>
                      شماره‌ای را وارد کنید که با آن از تلگرام و واتساپ استفاده می‌کنید تا حساب شما
                      در هر سه سرویس یکسان باشد. کد تأیید به همین شماره پیامک می‌شود.
                    </p>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="register-password">رمز عبور</label>
                    <div className={styles.inputWrap}>
                      <Input
                        id="register-password"
                        name="password"
                        minLength={8}
                        aria-describedby="password-hint"
                        autoComplete="new-password"
                        type={visible ? 'text' : 'password'}
                        required
                        placeholder="رمز عبور خود را وارد کنید"
                        className="tw-h-12 tw-rounded-xl tw-text-base tw-pl-11"
                      />
                      <button
                        type="button"
                        className={styles.passwordToggle}
                        onClick={() => setVisible(!visible)}
                        aria-pressed={visible}
                        aria-label={visible ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'}
                      >
                        {visible ? <EyeOff size={19} /> : <Eye size={19} />}
                      </button>
                    </div>
                  </div>
                  <p id="password-hint" className={styles.description}>
                    رمز عبور باید حداقل ۸ کاراکتر و حداکثر ۷۲ بایت باشد.
                  </p>
                  <div className={styles.field}>
                    <label htmlFor="register-confirm-password">تکرار رمز عبور</label>
                    <Input
                      id="register-confirm-password"
                      name="confirmPassword"
                      autoComplete="new-password"
                      type={visible ? 'text' : 'password'}
                      required
                      placeholder="رمز عبور را دوباره وارد کنید"
                      className="tw-h-12 tw-rounded-xl tw-text-base"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={form.loading}
                    className="tw-h-12 tw-w-full tw-rounded-xl tw-bg-emerald-800 tw-text-base tw-text-white"
                  >
                    <UserRoundPlus size={20} />
                    {form.loading ? 'در حال ارسال کد…' : 'ارسال کد تأیید'}
                  </Button>
                </fieldset>
                {form.step === 'otp' && (
                  <fieldset className={`${styles.form} tw-min-w-0`} disabled={form.loading}>
                    <p role="status" className={styles.description}>
                      کد تأیید به <bdi>{form.phoneNumber}</bdi> پیامک شد.
                    </p>
                    <div className={styles.field}>
                      <label htmlFor="register-otp">کد تأیید</label>
                      <Input
                        id="register-otp"
                        name="code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        autoFocus
                        dir="ltr"
                        required
                        value={form.code}
                        onChange={(event) => form.setCode(event.target.value)}
                        className="tw-h-12 tw-rounded-xl tw-text-center tw-text-xl tw-tracking-widest"
                      />
                    </div>
                    <p className={styles.description}>
                      {form.remaining > 0
                        ? `اعتبار کد: ${form.remaining} ثانیه`
                        : 'اعتبار کد تمام شده است. کد جدید درخواست کنید.'}
                    </p>
                    <Button
                      type="submit"
                      disabled={form.loading || form.remaining === 0}
                      className="tw-h-12 tw-w-full tw-rounded-xl tw-bg-emerald-800 tw-text-white"
                    >
                      {form.loading ? 'در حال تأیید…' : 'تأیید و تکمیل ثبت‌نام'}
                    </Button>
                    <Button type="button" variant="outline" onClick={form.editDetails}>
                      ویرایش شماره یا درخواست کد جدید
                    </Button>
                    <p className={styles.description}>
                      برای دریافت کد جدید، اطلاعات را بررسی و رمز عبور را دوباره وارد کنید.
                    </p>
                  </fieldset>
                )}
                {form.error && (
                  <div role="alert" className={`${styles.error} tw-mt-4`}>
                    {form.error}
                  </div>
                )}
                <Button
                  asChild
                  variant="outline"
                  className="tw-mt-4 tw-h-12 tw-w-full tw-rounded-xl"
                >
                  <Link to={`/auth/login${search}`}>حساب دارید؟ وارد شوید</Link>
                </Button>
              </form>
            </div>
            <footer className={styles.footer}>
              <ShieldCheck size={17} />
              <span>سامانه مدیریت حمل‌ونقل ستاش</span>
              <span dir="ltr">SETAŞ ©</span>
            </footer>
          </section>
          <TransportVisual />
        </div>
      </main>
    </PageContainer>
  );
}
