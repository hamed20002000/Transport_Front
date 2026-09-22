import { ShieldCheck, Truck } from 'lucide-react';
import PageContainer from 'src/shared/components/container/PageContainer';
import AuthLogin from '../../components/AuthLogin';
import TransportVisual from '../../components/TransportVisual';
import styles from '../../styles/login.module.css';

export default function Login() {
  return (
    <PageContainer title="ورود | Setaş Transport" description="ورود به سامانه مدیریت حمل‌ونقل ستاش">
      <main className={styles.page} dir="rtl" lang="fa">
        <div className={styles.frame}>
          <section className={styles.login} aria-labelledby="login-title">
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
              <div className={styles.welcomeIcon}>
                <Truck size={25} />
              </div>
              <span className={styles.formEyebrow}>مسیر کارتان از اینجا شروع می‌شود</span>
              <h1 id="login-title">
                خوش آمدید<span>!</span>
              </h1>
              <p className={styles.description}>برای مدیریت حمل‌ونقل، وارد حساب خود شوید.</p>
              <AuthLogin />
              <p className={styles.help}>
                برای دریافت یا بازیابی حساب، با مدیر سامانه تماس بگیرید.
              </p>
            </div>
            <footer className={styles.footer}>
              <ShieldCheck size={17} />
              <span>دسترسی ویژه کاربران سامانه</span>
              <span dir="ltr">SETAŞ ©</span>
            </footer>
          </section>
          <TransportVisual />
        </div>
      </main>
    </PageContainer>
  );
}
