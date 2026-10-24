import type { RouteObject } from 'react-router-dom';
export { default as CompanyShell, CompanyLayout } from './CompanyShell';
export { displayName, useProfile } from './profileStore';
import { CargoFilters, ChannelLinks, CompanyCargo, CompanyDrivers, CompanyPublished, CompanyProfile, CompanyRequests, CompanyTrips, CreateCargo } from './pages';
// These render under CompanyLayout (see the app router, which also puts the account home there).
export const companyCargoRoutes: RouteObject[] = [
  { path: '/account/company/cargo', element: <CompanyCargo /> },
  { path: '/account/company/cargo/new', element: <CreateCargo /> },
  { path: '/account/company/published', element: <CompanyPublished /> },
  { path: '/account/company/channels', element: <ChannelLinks /> },
  { path: '/account/company/profile', element: <CompanyProfile /> },
  { path: '/account/company/filters', element: <CargoFilters /> },
  { path: '/account/company/drivers', element: <CompanyDrivers /> },
  { path: '/account/company/trips', element: <CompanyTrips /> },
  { path: '/account/company/requests', element: <CompanyRequests /> },
];
