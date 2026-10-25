import { lazy } from 'react';
import { type RouteObject } from 'react-router-dom';
import Loadable from 'src/shared/components/loadable/Loadable';
import PermissionGuard from 'src/core/auth/PermissionGuard';

const ListCommiteeMembers = Loadable(
  lazy(() => import('./pages/commitee-members/ListCommiteeMembers')),
);
const ListCommiteeMembersReport = Loadable(
  lazy(() => import('./pages/commitee-members-report/ListCommiteeMembersReport')),
);
const ListConcreteReport = Loadable(
  lazy(() => import('./pages/concrete-report/ListConcreteReport')),
);
const ListItemReport = Loadable(lazy(() => import('./pages/concrete-report/ListItemReport')));
const ListCarwarehouseReport = Loadable(
  lazy(() => import('./pages/concrete-report/ListCarwarehouseReport')),
);
const ListPersonalWorkhouseReport = Loadable(
  lazy(() => import('./pages/concrete-report/ListPersonalWorkhouseReport')),
);
const ListPersonalCourse = Loadable(
  lazy(() => import('./pages/concrete-report/ListPersonalCourse')),
);
const ListTenderFlowReport = Loadable(
  lazy(() => import('./pages/concrete-report/ListTenderFlowReport')),
);
const ListRollCallsReport = Loadable(
  lazy(() => import('./pages/concrete-report/ListRollCallsReport')),
);
const ListFinancialState = Loadable(
  lazy(() => import('./pages/concrete-report/ListFinancialState')),
);
const ListKPIList = Loadable(lazy(() => import('./pages/concrete-report/ListKPIList')));

export const reportsRoutes: RouteObject[] = [
  {
    path: '/report/commitee-members/',
    element: (
      <PermissionGuard requiredOperationName="مشاهده">
        <ListCommiteeMembers />
      </PermissionGuard>
    ),
  },
  {
    path: '/report/commitee-members-report/',
    element: (
      <PermissionGuard requiredOperationName="مشاهده">
        <ListCommiteeMembersReport />
      </PermissionGuard>
    ),
  },
  {
    path: '/report/report-concrete/',
    element: (
      <PermissionGuard requiredOperationName="مشاهده">
        <ListConcreteReport />
      </PermissionGuard>
    ),
  },
  {
    path: '/report/report-item/',
    element: (
      <PermissionGuard requiredOperationName="مشاهده">
        <ListItemReport />
      </PermissionGuard>
    ),
  },
  {
    path: '/report/report-carwarehouse/',
    element: (
      <PermissionGuard requiredOperationName="مشاهده">
        <ListCarwarehouseReport />
      </PermissionGuard>
    ),
  },
  {
    path: '/report/report-personall-workhouse/',
    element: (
      <PermissionGuard requiredOperationName="مشاهده">
        <ListPersonalWorkhouseReport />
      </PermissionGuard>
    ),
  },
  {
    path: '/report/report-personall-course/',
    element: (
      <PermissionGuard requiredOperationName="مشاهده">
        <ListPersonalCourse />
      </PermissionGuard>
    ),
  },
  {
    path: '/report/report-tender-flow/',
    element: (
      <PermissionGuard requiredOperationName="مشاهده">
        <ListTenderFlowReport />
      </PermissionGuard>
    ),
  },
  {
    path: '/report/report-roll-call/',
    element: (
      <PermissionGuard requiredOperationName="مشاهده">
        <ListRollCallsReport />
      </PermissionGuard>
    ),
  },
  {
    path: '/report/report-financial-state-report/',
    element: (
      <PermissionGuard requiredOperationName="مشاهده">
        <ListFinancialState />
      </PermissionGuard>
    ),
  },
  {
    path: '/report/kpi-report/',
    element: (
      <PermissionGuard requiredOperationName="مشاهده">
        <ListKPIList />
      </PermissionGuard>
    ),
  },
];
