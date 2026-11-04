import { lazy } from 'react';
import { type RouteObject } from 'react-router-dom';
import Loadable from 'src/shared/components/loadable/Loadable';
import ToLogin from './pages/auth1/ToLogin';

const Error = Loadable(lazy(() => import('./pages/Error')));
// Sign-in and sign-up for everyone: mobile number and an SMS code, no password.
const Login = Loadable(lazy(() => import('./pages/auth1/Login')));
// The admin panel's own sign-in: username and password, an administrator only.
const AdminLogin = Loadable(lazy(() => import('./pages/auth1/AdminLogin')));
const Maintenance = Loadable(lazy(() => import('./pages/Maintenance')));

export const authRoutes: RouteObject[] = [
  { path: '/auth/404', element: <Error /> },
  { path: '/auth/login', element: <Login /> },
  { path: '/auth/admin', element: <AdminLogin /> },
  // Old addresses (sign-up, password reset) lead to the one sign-in page.
  ...['/auth/register', '/auth/forgot-password', '/auth/reset-password'].map((path) => ({ path, element: <ToLogin /> })),
  { path: '/auth/maintenance', element: <Maintenance /> },
];
