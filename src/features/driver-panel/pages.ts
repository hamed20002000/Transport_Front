import { lazy } from 'react';
import { preloadWhenIdle } from 'src/shared/utils/preload';

// Page chunks, shared by the routes and by the preload that runs once the driver frame is up.
const loaders = {
  home: () => import('./DriverHome'),
  loads: () => import('./DriverLoads'),
  requests: () => import('./DriverRequests'),
  trip: () => import('./DriverTrip'),
  history: () => import('./DriverHistory'),
  filters: () => import('./DriverSettings'),
  profile: () => import('./DriverProfile'),
  borders: () => import('./DriverBorders'),
};

export const DriverHome = lazy(loaders.home);
export const DriverLoads = lazy(loaders.loads);
export const DriverRequests = lazy(loaders.requests);
export const DriverTrip = lazy(loaders.trip);
export const DriverHistory = lazy(loaders.history);
export const DriverFilters = lazy(loaders.filters);
export const DriverProfile = lazy(loaders.profile);
export const DriverBorders = lazy(loaders.borders);

// The other tabs, fetched in the background so switching to them doesn't wait on the network.
export function preloadDriverPages() {
  preloadWhenIdle(Object.values(loaders));
}
