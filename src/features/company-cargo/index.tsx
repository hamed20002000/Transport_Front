import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import Loadable from 'src/shared/components/loadable/Loadable';
export { default as CompanyShell } from './CompanyShell';
const CompanyCargo = Loadable(lazy(() => import('./CompanyCargo')));
const CreateCargo = Loadable(lazy(() => import('./CreateCargo')));
const ChannelLinks = Loadable(lazy(() => import('./ChannelLinks')));
export const companyCargoRoutes: RouteObject[] = [
  { path: '/account/company/cargo', element: <CompanyCargo /> },
  { path: '/account/company/cargo/new', element: <CreateCargo /> },
  { path: '/account/company/channels', element: <ChannelLinks /> },
];
