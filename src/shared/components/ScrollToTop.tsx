import { useEffect, ReactElement } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop({ children }: { children: ReactElement | null }) {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    // a #section link scrolls to that section itself
    if (hash) return;
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth',
    });
  }, [pathname, hash]);

  return children || null;
}
