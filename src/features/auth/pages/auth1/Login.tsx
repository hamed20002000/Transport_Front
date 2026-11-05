import { Truck } from 'lucide-react';
import PageContainer from 'src/shared/components/container/PageContainer';
import AuthOtp from '../../components/AuthOtp';
import InviteMessengers from '../../components/InviteMessengers';
import TransportVisual from '../../components/TransportVisual';
import styles from '../../styles/login.module.css';
import trabotIcon from 'src/shared/assets/images/logos/trabot-icon.png';

export default function Login() {
  // signed out because the account signed in on another browser or device (one session at a time)
  const elsewhere = new URLSearchParams(window.location.search).get('reason') === 'elsewhere';
  return (
    <PageContainer title="ورود | ترابوت" description="ورود به ترابوت، دستیار هوشمند حمل‌ونقل">
      <main className={styles.page} dir="rtl" lang="fa">
        <div className={styles.frame}>
          <section className={styles.login} aria-labelledby="login-title">
            <header className={styles.brand}>
              <img className={styles.brandIcon} src={trabotIcon} alt="" />
              <div>
                <strong>ترابوت</strong>
                <p>دستیار هوشمند حمل‌ونقل</p>
              </div>
            </header>
            <div className={styles.formContent}>
              <div className={styles.welcomeIcon}>
                <Truck size={25} />
              </div>
              <span className={styles.formEyebrow}>مسیر کارتان از اینجا شروع می‌شود</span>
              <h1 id="login-title">خوش آمدید</h1>
              <p className={styles.description}>ورود و ثبت‌نام فقط با شماره موبایل؛ رمز عبور لازم نیست.</p>
              {elsewhere && (
                <p role="alert" className="tw-m-0 tw-mb-3 tw-rounded-xl tw-bg-amber-50 tw-px-3 tw-py-2 tw-text-sm tw-leading-6 tw-text-amber-900">
                  با این حساب از مرورگر یا دستگاه دیگری وارد شدند و از اینجا خارج شدید. هر حساب در هر لحظه فقط از یک جا وارد است؛ برای ادامه دوباره وارد شوید.
                </p>
              )}
              <AuthOtp />
              <InviteMessengers />
            </div>
          </section>
          <TransportVisual />
        </div>
      </main>
    </PageContainer>
  );
}
