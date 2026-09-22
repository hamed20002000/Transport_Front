import { lazy } from 'react';
import { type RouteObject } from 'react-router-dom';
import Loadable from 'src/shared/components/loadable/Loadable';
import PermissionGuard from 'src/core/auth/PermissionGuard';

const ListDrivers = Loadable(lazy(() => import('./pages/ListDrivers')));

export const driversRoutes: RouteObject[] = [
  {
    path: '/driver/list-driver/',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListDrivers />
      </PermissionGuard>
    ),
  },
];
