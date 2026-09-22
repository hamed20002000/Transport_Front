import { lazy } from 'react';
import { type RouteObject } from 'react-router-dom';

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const OperationalDashboard = lazy(() => import('./pages/OperationalDashboard'));

export const dashboardRoutes: RouteObject[] = [
  { path: '/admin', element: <AdminDashboard /> },
  { path: '/dashboards/dashboard', element: <OperationalDashboard /> },
];
