import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
const SubscriptionPlans = lazy(() => import('./SubscriptionPlans'));
export const subscriptionPlanRoutes: RouteObject[] = [
  { path: '/admin/subscription-plans', element: <SubscriptionPlans /> },
];
