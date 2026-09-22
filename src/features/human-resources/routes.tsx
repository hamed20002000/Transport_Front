import { lazy } from 'react';
import { type RouteObject } from 'react-router-dom';
import Loadable from 'src/shared/components/loadable/Loadable';
import PermissionGuard from 'src/core/auth/PermissionGuard';

const ListPosition = Loadable(lazy(() => import('./pages/position/ListPosition')));
const ListPersonnel = Loadable(lazy(() => import('./pages/personnel/ListPersonnel')));
const ListLeaves = Loadable(lazy(() => import('./pages/leaves/ListLeaves')));
const ListPersonnelWorkPlaces = Loadable(
  lazy(() => import('./pages/personnel-work-places/ListPersonnelWorkPlaces')),
);
const ListPersonnelWorkPlacesByWorkhouse = Loadable(
  lazy(() => import('./pages/personnel-work-places/ListPersonnelWorkPlacesByWorkhouse')),
);
const ListConsignments = Loadable(lazy(() => import('./pages/Consignments/ListConsignments')));
const ListPersonnelConsigneds = Loadable(
  lazy(() => import('./pages/PersonnelConsigneds/ListPersonnelConsigneds')),
);

export const humanResourcesRoutes: RouteObject[] = [
  {
    path: '/hr/position/',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListPosition />
      </PermissionGuard>
    ),
  },
  {
    path: '/hr/personnal/',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListPersonnel />
      </PermissionGuard>
    ),
  },
  {
    path: '/hr/leaves/',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListLeaves />
      </PermissionGuard>
    ),
  },
  {
    path: '/hr/personnel-work-places/',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListPersonnelWorkPlaces />
      </PermissionGuard>
    ),
  },
  {
    path: '/hr/personnel-work-places-by-workhouse/:workhouseId',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListPersonnelWorkPlacesByWorkhouse />
      </PermissionGuard>
    ),
  },
  {
    path: '/hr/list-consignments/',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListConsignments />
      </PermissionGuard>
    ),
  },
  {
    path: '/hr/list-personal-consignments/',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListPersonnelConsigneds />
      </PermissionGuard>
    ),
  },
];
