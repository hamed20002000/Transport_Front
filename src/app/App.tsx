import { useRoutes } from 'react-router-dom';
import Router from 'src/app/router/Router';
import ScrollToTop from 'src/shared/components/ScrollToTop';
import InstallPrompt from 'src/shared/components/pwa/InstallPrompt';

export default function App() {
  const routing = useRoutes(Router);
  return (
    <>
      <ScrollToTop>{routing}</ScrollToTop>
      <InstallPrompt />
    </>
  );
}
