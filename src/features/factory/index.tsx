import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import Loadable from 'src/shared/components/loadable/Loadable';

const InvitePage = Loadable(lazy(() => import('./InvitePage')));
const FactoryPanel = Loadable(lazy(() => import('./FactoryPanel')));
const JoinPage = Loadable(lazy(() => import('./JoinPage')));
const DriverInvitePage = Loadable(lazy(() => import('./DriverInvitePage')));

// The invite links (open before sign-in): a transport company's for factories, the parent company's for new
// transport companies; and the factory's own panel.
export const factoryRoutes: RouteObject[] = [
  { path: '/invite/:token', element: <InvitePage /> },
  { path: '/join/:token', element: <JoinPage /> },
  { path: '/driver-invite/:token', element: <DriverInvitePage /> },
  { path: '/account/factory', element: <FactoryPanel /> },
];
