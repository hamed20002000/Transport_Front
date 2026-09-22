import { lazy } from 'react';
import { type RouteObject } from 'react-router-dom';
import Loadable from 'src/shared/components/loadable/Loadable';
import PermissionGuard from 'src/core/auth/PermissionGuard';

const ListCategory = Loadable(lazy(() => import('./pages/category/ListCategory')));
const ListUnit = Loadable(lazy(() => import('./pages/unit/ListUnit')));
const ListItem = Loadable(lazy(() => import('./pages/item/ListItem')));
const ListForceMajors = Loadable(lazy(() => import('./pages/forcemajor/ListForceMajors')));
const ListProductTypes = Loadable(lazy(() => import('./pages/producttypes/ListProductTypes')));
const ListRegion = Loadable(lazy(() => import('./pages/region/ListRegion')));
const ListProviders = Loadable(lazy(() => import('./pages/provider/ListProviders')));

export const referenceDataRoutes: RouteObject[] = [
  {
    path: '/baseinfo/list-categories',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListCategory />
      </PermissionGuard>
    ),
  },
  {
    path: '/baseinfo/list-units',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListUnit />
      </PermissionGuard>
    ),
  },
  {
    path: '/baseinfo/list-items',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListItem />
      </PermissionGuard>
    ),
  },
  {
    path: '/baseinfo/list-forcemajor',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListForceMajors />
      </PermissionGuard>
    ),
  },
  {
    path: '/product-type/list-product-types/',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListProductTypes />
      </PermissionGuard>
    ),
  },
  {
    path: '/region/list-regions/',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListRegion />
      </PermissionGuard>
    ),
  },
  {
    path: '/provider/list-provider/',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListProviders />
      </PermissionGuard>
    ),
  },
];
