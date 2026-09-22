import { lazy } from 'react';
import { type RouteObject } from 'react-router-dom';
import Loadable from 'src/shared/components/loadable/Loadable';

const Error = Loadable(lazy(() => import('./pages/Error')));
const Login = Loadable(lazy(() => import('./pages/auth1/Login')));
const Login2 = Loadable(lazy(() => import('./pages/auth2/Login2')));
const Register = Loadable(lazy(() => import('./pages/auth1/Register')));
const Register2 = Loadable(lazy(() => import('./pages/auth2/Register2')));
const ForgotPassword = Loadable(lazy(() => import('./pages/auth1/ForgotPassword')));
const ForgotPassword2 = Loadable(lazy(() => import('./pages/auth2/ForgotPassword2')));
const TwoSteps = Loadable(lazy(() => import('./pages/auth1/TwoSteps')));
const TwoSteps2 = Loadable(lazy(() => import('./pages/auth2/TwoSteps2')));
const Maintenance = Loadable(lazy(() => import('./pages/Maintenance')));
const ResetPassword = Loadable(lazy(() => import('./pages/auth1/ResetPassword')));

export const authRoutes: RouteObject[] = [
  { path: '/auth/404', element: <Error /> },
  { path: '/auth/login', element: <Login /> },
  { path: '/auth/login2', element: <Login2 /> },
  { path: '/auth/register', element: <Register /> },
  { path: '/auth/register2', element: <Register2 /> },
  { path: '/auth/forgot-password', element: <ForgotPassword /> },
  { path: '/auth/forgot-password2', element: <ForgotPassword2 /> },
  { path: '/auth/two-steps', element: <TwoSteps /> },
  { path: '/auth/two-steps2', element: <TwoSteps2 /> },
  { path: '/auth/maintenance', element: <Maintenance /> },
  { path: '/auth/reset-password', element: <ResetPassword /> },
];
