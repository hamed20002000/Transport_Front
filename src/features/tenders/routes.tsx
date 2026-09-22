import { lazy } from 'react';
import { type RouteObject } from 'react-router-dom';
import Loadable from 'src/shared/components/loadable/Loadable';
import PermissionGuard from 'src/core/auth/PermissionGuard';

const ListAuction = Loadable(lazy(() => import('./pages/ListTender')));
const AuctionDetails = Loadable(lazy(() => import('./pages/TenderDetails')));

export const tendersRoutes: RouteObject[] = [
  {
    path: '/tender/list-tender',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListAuction />
      </PermissionGuard>
    ),
  },
  {
    path: '/tender/tender-details/:tenderId',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <AuctionDetails />
      </PermissionGuard>
    ),
  },
];
