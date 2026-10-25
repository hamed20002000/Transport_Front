import { Outlet } from 'react-router-dom';
import { useSelector, type AppState } from 'src/app/store';
import { cn } from 'src/shared/utils/utils';
import Header from 'src/app/layouts/full/vertical/header/Header';
import Sidebar from 'src/app/layouts/full/vertical/sidebar/Sidebar';
import Customizer from 'src/app/layouts/full/shared/customizer/Customizer';
import Navigation from 'src/app/layouts/full/horizontal/navbar/Navigation';
import HorizontalHeader from 'src/app/layouts/full/horizontal/header/Header';
import styles from 'src/app/layouts/full/FullLayout.module.css';
import PushPrompt from 'src/shared/components/pwa/PushPrompt';
import { useAuth } from 'src/core/auth/AuthContext';

export default function FullLayout() {
  const customizer = useSelector((state: AppState) => state.customizer);
  const isAdmin = useAuth().userRoles.some((role) => role.name === 'ADMIN');
  return (
    <div className={styles.shell}>
      {!customizer.isHorizontal && <Sidebar />}
      <div
        className={cn(
          styles.page,
          customizer.isCollapse && !customizer.isHorizontal && styles.collapsed,
        )}
      >
        {customizer.isHorizontal ? <HorizontalHeader /> : <Header />}
        {customizer.isHorizontal && <Navigation />}
        <main id="main-content" className={styles.content}>
          {/* a new payment receipt reaches the admin's phone, so no buyer waits on a review nobody knows about */}
          {/* a section, not a div: `.content > div` stretches the page itself to full height */}
          {isAdmin && (
            <section className="tw-pt-4">
              <PushPrompt hint="هر رسید پرداخت تازه، حتی وقتی پنل بسته است، روی گوشی‌تان اعلان می‌شود تا خریدار معطل نماند." />
            </section>
          )}
          <Outlet />
        </main>
        <Customizer />
      </div>
    </div>
  );
}
