import { lazy } from 'react';
import { type RouteObject } from 'react-router-dom';
import Loadable from 'src/shared/components/loadable/Loadable';
import PermissionGuard from 'src/core/auth/PermissionGuard';

const ListCarWarehouse = Loadable(
  lazy(() => import('./pages/list-carwarehouse/ListCareWarehouse')),
);
const ListDetailsCarWarehouse = Loadable(
  lazy(() => import('./pages/list-details-carwarehouse/ListDetailsCarWarehouse')),
);
const ListConsignedCarwarehouse = Loadable(
  lazy(() => import('./pages/consigned-carwarehouse/ListConsignedCarwarehouse')),
);
const ListCarFuels = Loadable(lazy(() => import('./pages/list-car-fuels/ListCarFuels')));

export const vehiclesRoutes: RouteObject[] = [
  {
    path: '/care-warehouse/list-care-warehouse/',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListCarWarehouse />
      </PermissionGuard>
    ),
  },
  {
    path: '/care-warehouse/list-details-care-warehouse/',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListDetailsCarWarehouse />
      </PermissionGuard>
    ),
  },
  {
    path: '/care-warehouse/list-consigned-care-warehouse/',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListConsignedCarwarehouse />
      </PermissionGuard>
    ),
  },
  {
    path: '/car-warehouse/list-car-fuels/:consignedCarId',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListCarFuels />
      </PermissionGuard>
    ),
  },
];
