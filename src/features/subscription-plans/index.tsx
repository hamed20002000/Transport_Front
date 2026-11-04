import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
const SubscriptionPlans = lazy(() => import('./SubscriptionPlans'));
const SubscriptionOrders = lazy(() => import('./SubscriptionOrders'));
const SubscriptionPolicy = lazy(() => import('./SubscriptionPolicy'));
const CompanyFeatures = lazy(() => import('./CompanyFeatures'));
const BrokerAccess = lazy(() => import('./BrokerAccess'));
const AdminCirculars = lazy(() => import('src/features/circulars/AdminCirculars'));
export const subscriptionPlanRoutes: RouteObject[] = [
  { path: '/admin/subscription-plans', element: <SubscriptionPlans /> },
  { path: '/admin/subscription-orders', element: <SubscriptionOrders /> },
  { path: '/admin/subscription-policy', element: <SubscriptionPolicy /> },
  { path: '/admin/company-features', element: <CompanyFeatures /> },
  { path: '/admin/broker-access', element: <BrokerAccess /> },
  { path: '/admin/circulars', element: <AdminCirculars /> },
];
