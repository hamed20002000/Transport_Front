import { lazy } from 'react';
import { type RouteObject } from 'react-router-dom';
import Loadable from 'src/shared/components/loadable/Loadable';
import PermissionGuard from 'src/core/auth/PermissionGuard';

const ListWarehouses = Loadable(lazy(() => import('./pages/list-warehouse/ListWarehouses')));
const ListWarehousesDistpach = Loadable(
  lazy(() => import('./pages/list-warehouse/ListWarehousesDistpach')),
);
const ListWarehouseDispatchReturnToCenter = Loadable(
  lazy(
    () => import('./pages/warehouse-dispatch-return-to-center/ListWarehouseDispatchReturnToCenter'),
  ),
);
const ListBetweenWarehouseDispatch = Loadable(
  lazy(() => import('./pages/list-warehouse/ListBetweenWarehouseDispatch')),
);
const ListInvoices = Loadable(lazy(() => import('./pages/list-invoice/ListInvoices')));
const ListStoreInvoice = Loadable(
  lazy(() => import('./pages/list-store-invoice/ListStoreInvoice')),
);
const ListReceipt = Loadable(lazy(() => import('./pages/list-receipt/ListReceipt')));
const ListReceiptsSendedFromStore = Loadable(
  lazy(() => import('./pages/list-receipts-sended-from-store/ListReceiptsSendedFromStore')),
);
const ListReceiptsDestructionSendedFromStore = Loadable(
  lazy(
    () =>
      import('./pages/list-receipts-destruction-sended-from-store/ListReceiptsDestructionSendedFromStore'),
  ),
);
const ListBetweenReceipt = Loadable(
  lazy(() => import('./pages/list-between-receipt/ListBetweenReceipt')),
);

export const warehouseRoutes: RouteObject[] = [
  {
    path: '/warehouse/list-warehouse/',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListWarehouses />
      </PermissionGuard>
    ),
  },
  {
    path: '/warehouse/list-warehouse-dispatch/:warehouseId',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListWarehousesDistpach />
      </PermissionGuard>
    ),
  },
  {
    path: '/warehouse/list-warehouse-dispatch-return-to-center/:warehouseId',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListWarehouseDispatchReturnToCenter />
      </PermissionGuard>
    ),
  },
  {
    path: '/warehousespatch/betweenwarehusedispatch/:warehouseId',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListBetweenWarehouseDispatch />
      </PermissionGuard>
    ),
  },
  {
    path: '/invoice/list-invoice/',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListInvoices />
      </PermissionGuard>
    ),
  },
  {
    path: '/invoice/list-store-invoice/',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListStoreInvoice />
      </PermissionGuard>
    ),
  },
  {
    path: '/receipt/list-receipt/',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListReceipt />
      </PermissionGuard>
    ),
  },
  {
    path: '/receipt/list-receipts-sended-from-store/',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListReceiptsSendedFromStore />
      </PermissionGuard>
    ),
  },
  {
    path: '/receipt/list-receipts-destruction-sended-from-store/',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListReceiptsDestructionSendedFromStore />
      </PermissionGuard>
    ),
  },
  {
    path: '/receipt/list-between-receipt/',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListBetweenReceipt />
      </PermissionGuard>
    ),
  },
];
