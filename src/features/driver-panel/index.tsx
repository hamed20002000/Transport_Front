import type { RouteObject } from 'react-router-dom';
import { DriverLayout } from './DriverShell';
import { getDriverProfile } from './api';
import { DriverBorders, DriverFilters, DriverHistory, DriverHome, DriverLoads, DriverProfile, DriverRequests, DriverTrip } from './pages';

export const driverPanelRoutes: RouteObject[] = [
  {
    element: <DriverLayout />,
    children: [
      { path: '/account/driver', element: <DriverHome /> },
      { path: '/account/driver/loads', element: <DriverLoads /> },
      { path: '/account/driver/requests', element: <DriverRequests /> },
      { path: '/account/driver/trip', element: <DriverTrip /> },
      { path: '/account/driver/history', element: <DriverHistory /> },
      { path: '/account/driver/filters', element: <DriverFilters /> },
      { path: '/account/driver/profile', element: <DriverProfile /> },
      { path: '/account/driver/borders', element: <DriverBorders /> },
    ],
  },
];

/** The driver is a member of no company yet, so no load announcement reaches them. Unknown (request failed): false. */
export async function driverHasNoCompany(): Promise<boolean> {
  try {
    return !(await getDriverProfile()).companyUserIds?.length;
  } catch {
    return false;
  }
}
