import { lazy } from 'react';
import { type RouteObject } from 'react-router-dom';
import Loadable from 'src/shared/components/loadable/Loadable';
import PermissionGuard from 'src/core/auth/PermissionGuard';

const ListOrders = Loadable(lazy(() => import('./pages/ListOrders')));

export const ordersRoutes: RouteObject[] = [
  {
    path: '/order/list-order/',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListOrders />
      </PermissionGuard>
    ),
  },
];
