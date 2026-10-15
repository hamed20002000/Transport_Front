import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import Loadable from 'src/shared/components/loadable/Loadable';
export { default as CompanyShell } from './CompanyShell';
export { displayName, useProfile } from './profileStore';
const CompanyCargo = Loadable(lazy(() => import('./CompanyCargo')));
const CreateCargo = Loadable(lazy(() => import('./CreateCargo')));
const ChannelLinks = Loadable(lazy(() => import('./ChannelLinks')));
const CompanyProfile = Loadable(lazy(() => import('./CompanyProfile')));
const CargoFilters = Loadable(lazy(() => import('./CargoFilters')));
const CompanyDrivers = Loadable(lazy(() => import('./CompanyDrivers')));
export const companyCargoRoutes: RouteObject[] = [
  { path: '/account/company/cargo', element: <CompanyCargo /> },
  { path: '/account/company/cargo/new', element: <CreateCargo /> },
  { path: '/account/company/channels', element: <ChannelLinks /> },
  { path: '/account/company/profile', element: <CompanyProfile /> },
  { path: '/account/company/filters', element: <CargoFilters /> },
  { path: '/account/company/drivers', element: <CompanyDrivers /> },
];
