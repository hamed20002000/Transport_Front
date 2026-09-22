import { lazy } from 'react';
import { type RouteObject } from 'react-router-dom';
import Loadable from 'src/shared/components/loadable/Loadable';
import PermissionGuard from 'src/core/auth/PermissionGuard';

const ListNotif = Loadable(lazy(() => import('./pages/ListNotif')));

export const notificationsRoutes: RouteObject[] = [
  {
    path: '/notif/list-notif',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListNotif />
      </PermissionGuard>
    ),
  },
];
