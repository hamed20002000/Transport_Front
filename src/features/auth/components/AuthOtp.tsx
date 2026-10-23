import { ArrowLeft, CircleAlert, Clock3, LoaderCircle, MessageSquareText, Smartphone, Truck, Building2 } from 'lucide-react';
import { Button } from 'src/shared/components/ui/button';
import { Input } from 'src/shared/components/ui/input';
import { useOtpLogin } from '../hooks/useOtpLogin';
import { AccountType, SELF_SERVICE_ACCOUNT_TYPES } from '../types/register';
import styles from '../styles/login.module.css';

const faDigits = (value: string | number) => String(value).replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
const clock = (seconds: number) =>
  faDigits(`${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`);

const TYPE_ICONS = { [AccountType.Driver]: Truck, [AccountType.Company]: Building2 } as const;

/** Sign in or sign up with the mobile number and an SMS code; no username or password. */
export default function AuthOtp() {
  const form = useOtpLogin();

  if (form.resuming) {
    return (
      <div role="status" className="tw-flex tw-items-center tw-justify-center tw-gap-2 tw-py-10 tw-text-sm tw-text-emerald-900">
        <LoaderCircle size={20} className={styles.spinner} aria-hidden="true" />
        در حال ورود خودکار…
      </div>
    );
  }

  const errorBox = form.error && (
    <div id="otp-error" role="alert" className={styles.error}>
      <CircleAlert size={19} aria-hidden="true" />
      <span>{form.error}</span>
    </div>
  );

  if (form.step === 'accountType') {
    return (
      <div className={styles.form} aria-busy={form.loading}>
        <p role="status" className={styles.description}>
          شماره‌ی <bdi dir="ltr">{form.sentTo}</bdi> تأیید شد. این شماره هنوز حساب ندارد؛ نوع حساب را انتخاب کنید.
        </p>
        <div className="tw-grid tw-gap-3">
          {SELF_SERVICE_ACCOUNT_TYPES.map((item) => {
            const Icon = TYPE_ICONS[item.type];
            return (
              <button
                key={item.type}
                type="button"
                disabled={form.loading}
                onClick={() => form.chooseAccountType(item.type)}
                className="tw-flex tw-w-full tw-items-center tw-gap-3 tw-rounded-xl tw-border tw-border-emerald-200 tw-bg-white tw-p-4 tw-text-start tw-transition-colors hover:tw-border-emerald-700 hover:tw-bg-emerald-50 disabled:tw-opacity-60"
              >
                <span className="tw-grid tw-h-11 tw-w-11 tw-shrink-0 tw-place-items-center tw-rounded-xl tw-bg-emerald-50 tw-text-emerald-800">
                  <Icon size={22} aria-hidden="true" />
                </span>
                <span className="tw-min-w-0 tw-flex-1">
                  <span className="tw-block tw-font-bold">{item.label}</span>
                  <span className="tw-block tw-text-xs tw-text-[#718079]">{item.hint}</span>
                </span>
                <ArrowLeft size={18} aria-hidden="true" />
              </button>
            );
          })}
        </div>
        {errorBox}
        <Button type="button" variant="outline" onClick={form.backToPhone} disabled={form.loading} className="tw-h-12 tw-rounded-xl">
          شماره‌ی دیگر
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={form.submit}
      onChange={form.clearError}
      className={styles.form}
      aria-busy={form.loading}
      noValidate
    >
      {form.step === 'phone' ? (
        <div className={styles.field}>
          <label htmlFor="otp-phone">شماره موبایل</label>
          <div className={styles.inputWrap}>
            <Smartphone size={19} className={styles.fieldIcon} aria-hidden="true" />
            <Input
              id="otp-phone"
              name="phoneNumber"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              autoFocus
              required
              value={form.phone}
              disabled={form.loading}
              onChange={(event) => form.setPhone(event.target.value)}
              placeholder="09121234567"
              aria-describedby={form.error ? 'otp-error phone-hint' : 'phone-hint'}
              className="tw-h-12 tw-rounded-xl tw-border-brand-orange tw-text-base tw-pr-11 tw-pl-3 focus-visible:tw-ring-brand-orange/30"
            />
          </div>
          <p id="phone-hint" className={styles.description}>
            کد ورود به این شماره پیامک می‌شود. اگر حساب ندارید، با همین کد ساخته می‌شود. همان شماره‌ای که در تلگرام، بله، روبیکا یا
            واتساپ دارید تا حسابتان همه‌جا یکی باشد.
          </p>
        </div>
      ) : (
        <>
          <p role="status" className={styles.description}>
            کد به <bdi dir="ltr">{form.sentTo}</bdi> پیامک شد.{' '}
            <button type="button" onClick={form.backToPhone} className="tw-font-bold tw-text-emerald-800 tw-underline">
              ویرایش شماره
            </button>
          </p>
          <div className={styles.field}>
            <label htmlFor="otp-code">کد پیامک‌شده</label>
            <div className={styles.inputWrap}>
              <MessageSquareText size={19} className={styles.fieldIcon} aria-hidden="true" />
              <Input
                id="otp-code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={10}
                dir="ltr"
                autoFocus
                required
                value={form.code}
                disabled={form.loading}
                onChange={(event) => form.setCode(event.target.value)}
                aria-describedby={form.error ? 'otp-error' : undefined}
                className="tw-h-12 tw-rounded-xl tw-pr-11 tw-text-center tw-text-xl tw-tracking-widest"
              />
            </div>
            <p className={styles.description}>
              {form.remaining > 0 ? `اعتبار کد: ${clock(form.remaining)}` : 'اعتبار کد تمام شد؛ کد جدید بگیرید.'}
            </p>
          </div>
        </>
      )}

      {errorBox}

      <Button
        type="submit"
        disabled={form.loading || (form.step === 'code' && form.remaining === 0)}
        className="tw-h-12 tw-w-full tw-gap-3 tw-rounded-xl tw-bg-brand-orange tw-text-base tw-font-bold tw-text-white hover:tw-bg-brand-orange-dark"
      >
        {form.loading ? (
          <>
            <LoaderCircle size={20} className={styles.spinner} aria-hidden="true" />
            {form.step === 'phone' ? 'در حال ارسال کد…' : 'در حال بررسی…'}
          </>
        ) : (
          <>
            {form.step === 'phone' ? 'دریافت کد ورود' : 'ورود'}
            <ArrowLeft size={20} aria-hidden="true" />
          </>
        )}
      </Button>

      {form.step === 'code' &&
        (form.retryRemaining > 0 ? (
          <p className="tw-flex tw-items-center tw-justify-center tw-gap-2 tw-text-sm tw-text-emerald-900">
            <Clock3 size={17} aria-hidden="true" />
            ارسال دوباره‌ی کد تا <span role="timer">{clock(form.retryRemaining)}</span>
          </p>
        ) : (
          <Button type="button" variant="outline" disabled={form.loading} onClick={() => void form.resend()} className="tw-h-12 tw-rounded-xl">
            ارسال دوباره‌ی کد
          </Button>
        ))}
    </form>
  );
}
