import { useRoutes } from 'react-router-dom';
import Router from 'src/app/router/Router';
import ScrollToTop from 'src/shared/components/ScrollToTop';

export default function App() {
  const routing = useRoutes(Router);
  return <ScrollToTop>{routing}</ScrollToTop>;
}
