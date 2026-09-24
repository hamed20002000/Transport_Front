import { lazy } from 'react';
import { Navigate, type RouteObject } from 'react-router-dom';
import Loadable from 'src/shared/components/loadable/Loadable';
import { dashboardRoutes } from 'src/features/dashboard';
import { accessManagementRoutes } from 'src/features/access-management';
import { notificationsRoutes } from 'src/features/notifications';
import { referenceDataRoutes } from 'src/features/reference-data';
import { tendersRoutes } from 'src/features/tenders';
import { operationsRoutes } from 'src/features/operations';
import { warehouseRoutes } from 'src/features/warehouse';
import { ordersRoutes } from 'src/features/orders';
import { driversRoutes } from 'src/features/drivers';
import { projectsRoutes } from 'src/features/projects';
import { humanResourcesRoutes } from 'src/features/human-resources';
import { vehiclesRoutes } from 'src/features/vehicles';
import { educationRoutes } from 'src/features/education';
import { reportsRoutes } from 'src/features/reports';
import { aiAgentRoutes } from 'src/features/ai-agent';
import { authRoutes } from 'src/features/auth';
import { accountRoutes } from 'src/features/account';
import { subscriptionPlanRoutes } from 'src/features/subscription-plans';
import { landingRoutes } from 'src/features/landing';

const FullLayout = Loadable(lazy(() => import('src/app/layouts/full/FullLayout')));
const BlankLayout = Loadable(lazy(() => import('src/app/layouts/blank/BlankLayout')));

const Router: RouteObject[] = [
  {
    path: '/',
    element: <FullLayout />,
    children: [
      { path: '/', element: <Navigate to="/auth/login" /> },
      ...dashboardRoutes,
      ...subscriptionPlanRoutes,
      ...accessManagementRoutes,
      ...notificationsRoutes,
      ...referenceDataRoutes,
      ...tendersRoutes,
      ...operationsRoutes,
      ...warehouseRoutes,
      ...ordersRoutes,
      ...driversRoutes,
      ...projectsRoutes,
      ...humanResourcesRoutes,
      ...vehiclesRoutes,
      ...educationRoutes,
      ...reportsRoutes,
      { path: '*', element: <Navigate to="/auth/404" /> },
      ...aiAgentRoutes,
    ],
  },
  {
    path: '/',
    element: <BlankLayout />,
    children: [
      ...authRoutes,
      ...accountRoutes,
      ...landingRoutes,
      { path: '*', element: <Navigate to="/auth/404" /> },
    ],
  },
];

export default Router;
