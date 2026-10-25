import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
const SubscriptionPlans = lazy(() => import('./SubscriptionPlans'));
const SubscriptionOrders = lazy(() => import('./SubscriptionOrders'));
const SubscriptionPolicy = lazy(() => import('./SubscriptionPolicy'));
export const subscriptionPlanRoutes: RouteObject[] = [
  { path: '/admin/subscription-plans', element: <SubscriptionPlans /> },
  { path: '/admin/subscription-orders', element: <SubscriptionOrders /> },
  { path: '/admin/subscription-policy', element: <SubscriptionPolicy /> },
];
