import { useEffect } from 'react';
import { useRoutes } from 'react-router-dom';
import Router from 'src/app/router/Router';
import ScrollToTop from 'src/shared/components/ScrollToTop';
import InstallPrompt from 'src/shared/components/pwa/InstallPrompt';
import { useAuth } from 'src/core/auth/AuthContext';
import { reportOpened } from 'src/shared/usage/usage';

export default function App() {
  const routing = useRoutes(Router);
  const { isAuth } = useAuth();
  // the admin's usage figures: opened today (in the app or a browser), and from which link
  useEffect(() => {
    if (!isAuth) return;
    void reportOpened();
    const onShow = () => document.visibilityState === 'visible' && void reportOpened();
    document.addEventListener('visibilitychange', onShow);
    return () => document.removeEventListener('visibilitychange', onShow);
  }, [isAuth]);
  return (
    <>
      <ScrollToTop>{routing}</ScrollToTop>
      <InstallPrompt />
    </>
  );
}
