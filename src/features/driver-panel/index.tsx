import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import Loadable from 'src/shared/components/loadable/Loadable';

export const DriverHome = Loadable(lazy(() => import('./DriverHome')));
const DriverLoads = Loadable(lazy(() => import('./DriverLoads')));
const DriverRequests = Loadable(lazy(() => import('./DriverRequests')));
const DriverTrip = Loadable(lazy(() => import('./DriverTrip')));
const DriverFilters = Loadable(lazy(() => import('./DriverSettings')));
const DriverProfile = Loadable(lazy(() => import('./DriverProfile')));

// /account/driver itself is served by the account feature (it renders DriverHome).
export const driverPanelRoutes: RouteObject[] = [
  { path: '/account/driver/loads', element: <DriverLoads /> },
  { path: '/account/driver/requests', element: <DriverRequests /> },
  { path: '/account/driver/trip', element: <DriverTrip /> },
  { path: '/account/driver/filters', element: <DriverFilters /> },
  { path: '/account/driver/profile', element: <DriverProfile /> },
];
