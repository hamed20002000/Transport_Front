import { Navigate, useLocation } from 'react-router-dom';

/** Sign-up is the same mobile + code flow as sign-in. */
export default function ToLogin() {
  const { search } = useLocation();
  return <Navigate to={`/auth/login${search}`} replace />;
}
