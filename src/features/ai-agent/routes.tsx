import { lazy } from 'react';
import { type RouteObject } from 'react-router-dom';
import Loadable from 'src/shared/components/loadable/Loadable';

const AiAgentPage = Loadable(lazy(() => import('./pages/AiAgentPage')));

export const aiAgentRoutes: RouteObject[] = [
  {
    path: '/ai',
    element: <AiAgentPage />,
  },
];
