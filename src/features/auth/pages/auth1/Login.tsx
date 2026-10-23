import { Truck } from 'lucide-react';
import PageContainer from 'src/shared/components/container/PageContainer';
import AuthOtp from '../../components/AuthOtp';
import TransportVisual from '../../components/TransportVisual';
import styles from '../../styles/login.module.css';
import trabotIcon from 'src/shared/assets/images/logos/trabot-icon.png';

export default function Login() {
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
              <AuthOtp />
            </div>
          </section>
          <TransportVisual />
        </div>
      </main>
    </PageContainer>
  );
}
