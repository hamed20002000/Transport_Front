import { lazy } from 'react';
import { preloadWhenIdle } from 'src/shared/utils/preload';

// Page chunks, shared by the routes and by the preload that runs once the company frame is up.
const loaders = {
  cargo: () => import('./CompanyCargo'),
  published: () => import('./CompanyPublished'),
  create: () => import('./CreateCargo'),
  channels: () => import('./ChannelLinks'),
  profile: () => import('./CompanyProfile'),
  filters: () => import('./CargoFilters'),
  drivers: () => import('./CompanyDrivers'),
  trips: () => import('./CompanyTrips'),
  requests: () => import('./CompanyRequests'),
  features: () => import('./CompanyFeatures'),
  factories: () => import('./CompanyFactories'),
  invites: () => import('./CompanyInvites'),
  verifications: () => import('./CompanyVerifications'),
};

export const CompanyCargo = lazy(loaders.cargo);
export const CompanyPublished = lazy(loaders.published);
export const CreateCargo = lazy(loaders.create);
export const ChannelLinks = lazy(loaders.channels);
export const CompanyProfile = lazy(loaders.profile);
export const CargoFilters = lazy(loaders.filters);
export const CompanyDrivers = lazy(loaders.drivers);
export const CompanyTrips = lazy(loaders.trips);
export const CompanyRequests = lazy(loaders.requests);
export const CompanyFeatures = lazy(loaders.features);
export const CompanyFactories = lazy(loaders.factories);
export const CompanyInvites = lazy(loaders.invites);
export const CompanyVerifications = lazy(loaders.verifications);

// The other tabs, fetched in the background so switching to them doesn't wait on the network.
export function preloadCompanyPages() {
  preloadWhenIdle(Object.values(loaders));
}
