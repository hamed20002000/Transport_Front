import { Outlet } from 'react-router-dom';
import { useSelector, type AppState } from 'src/app/store';
import { cn } from 'src/shared/utils/utils';
import Header from 'src/app/layouts/full/vertical/header/Header';
import Sidebar from 'src/app/layouts/full/vertical/sidebar/Sidebar';
import Customizer from 'src/app/layouts/full/shared/customizer/Customizer';
import Navigation from 'src/app/layouts/full/horizontal/navbar/Navigation';
import HorizontalHeader from 'src/app/layouts/full/horizontal/header/Header';
import styles from 'src/app/layouts/full/FullLayout.module.css';

export default function FullLayout() {
  const customizer = useSelector((state: AppState) => state.customizer);
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
          <Outlet />
        </main>
        <Customizer />
      </div>
    </div>
  );
}
