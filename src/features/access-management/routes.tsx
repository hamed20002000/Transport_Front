import { lazy } from 'react';
import { type RouteObject } from 'react-router-dom';
import Loadable from 'src/shared/components/loadable/Loadable';
import PermissionGuard from 'src/core/auth/PermissionGuard';

const SystemOperation = Loadable(lazy(() => import('./pages/system-operation/SystemOperation')));
const ListRoles = Loadable(lazy(() => import('./pages/list-roles/ListRoles')));
const ListUsers = Loadable(lazy(() => import('./pages/list-users/ListUsers')));

export const accessManagementRoutes: RouteObject[] = [
  {
    path: '/managmentusers/system-operation',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <SystemOperation />
      </PermissionGuard>
    ),
  },
  {
    path: '/managmentusers/list-roles',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListRoles />
      </PermissionGuard>
    ),
  },
  {
    path: '/managmentusers/list-users',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListUsers />
      </PermissionGuard>
    ),
  },
];
