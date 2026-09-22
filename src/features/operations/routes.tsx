import { lazy } from 'react';
import { type RouteObject } from 'react-router-dom';
import Loadable from 'src/shared/components/loadable/Loadable';
import PermissionGuard from 'src/core/auth/PermissionGuard';

const ListWorks = Loadable(lazy(() => import('./pages/list-work/ListWorks')));
const ListNetworks = Loadable(lazy(() => import('./pages/list-network/ListNetworks')));
const NetworkDetails = Loadable(lazy(() => import('./pages/list-network/NetworkDetails')));
const ListWorkHouse = Loadable(lazy(() => import('./pages/list-workhouse/ListWorkhouses')));
const WorkHouseDetails = Loadable(lazy(() => import('./pages/list-workhouse/WorkhouseDetails')));
const ListTransmission = Loadable(lazy(() => import('./pages/transmission/ListTransmission')));
const ListStores = Loadable(lazy(() => import('./pages/store/ListStores')));
const ListBetweenStoreReceipt = Loadable(
  lazy(() => import('./pages/list-between-store-receipt/ListBetweenStoreReceipt')),
);
const ListStoreReceipts = Loadable(lazy(() => import('./pages/StoreReceipt/ListStoreReceipt')));
const ListStoreReceiptInvoice = Loadable(
  lazy(() => import('./pages/store-receipt-invoice/ListStoreReceiptInvoice')),
);
const ListStoreDispatchToCenter = Loadable(
  lazy(() => import('./pages/storedispatchtocenter/ListStoreDispatchToCenter')),
);
const ListStoreDispatchReturnToCenter = Loadable(
  lazy(() => import('./pages/storedispatchreturntocenter/ListStoreDispatchReturnToCenter')),
);
const ListBetweenStoreDispatch = Loadable(
  lazy(() => import('./pages/store/ListBetweenStoreDispatch')),
);
const ListStoreDispatch = Loadable(lazy(() => import('./pages/store/ListStoreDistpach')));
const RequestTabs = Loadable(lazy(() => import('./pages/list-request/RequestTabs')));
const RequestReceiptTabs = Loadable(
  lazy(() => import('./pages/list-request-receipt/RequestReceiptTabs')),
);
const ListRollCalls = Loadable(lazy(() => import('./pages/list-roll-calls/ListRollCalls')));

export const operationsRoutes: RouteObject[] = [
  {
    path: '/tender/define-work/',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListWorks />
      </PermissionGuard>
    ),
  },
  {
    path: '/work/:workId/networks',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListNetworks />
      </PermissionGuard>
    ),
  },
  {
    path: '/network/list-network',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListNetworks />
      </PermissionGuard>
    ),
  },
  {
    path: '/network/:networkId/details',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <NetworkDetails />
      </PermissionGuard>
    ),
  },
  {
    path: '/workhouse/list-workhouse/:workId',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListWorkHouse />
      </PermissionGuard>
    ),
  },
  {
    path: '/workhouse/list-workhouse/',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListWorkHouse />
      </PermissionGuard>
    ),
  },
  {
    path: '/workhouse/workhousedetails/:workhouseId',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <WorkHouseDetails />
      </PermissionGuard>
    ),
  },
  {
    path: '/transmission/list-transmission/:networkId',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListTransmission />
      </PermissionGuard>
    ),
  },
  {
    path: '/store/list-stores/:workhouseId',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListStores />
      </PermissionGuard>
    ),
  },
  {
    path: '/store/list-stores/',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListStores />
      </PermissionGuard>
    ),
  },
  {
    path: '/store/list-between-store-receipt/',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListBetweenStoreReceipt />
      </PermissionGuard>
    ),
  },
  {
    path: '/store/list-store-receipt/',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListStoreReceipts />
      </PermissionGuard>
    ),
  },
  {
    path: '/store/list-store-receipt-invoice/',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListStoreReceiptInvoice />
      </PermissionGuard>
    ),
  },
  {
    path: '/store/list-store-receipt/:storeId',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListStoreReceipts />
      </PermissionGuard>
    ),
  },
  {
    path: '/store/list-store-dispatch-to-center/:storeId',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListStoreDispatchToCenter />
      </PermissionGuard>
    ),
  },
  {
    path: '/store/list-store-dispatch-return-to-center/:storeId',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListStoreDispatchReturnToCenter />
      </PermissionGuard>
    ),
  },
  {
    path: '/store/between-store-dispatch/:storeId',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListBetweenStoreDispatch />
      </PermissionGuard>
    ),
  },
  {
    path: '/store/store-dispatch/:storeId',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListStoreDispatch />
      </PermissionGuard>
    ),
  },
  {
    path: '/store/list-requests/',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <RequestTabs />
      </PermissionGuard>
    ),
  },
  {
    path: '/order/list-request-receipt/',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <RequestReceiptTabs />
      </PermissionGuard>
    ),
  },
  {
    path: '/hr/list-roll-calls/',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListRollCalls />
      </PermissionGuard>
    ),
  },
];
