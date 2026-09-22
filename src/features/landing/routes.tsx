import { lazy } from 'react';
import { type RouteObject } from 'react-router-dom';
import Loadable from 'src/shared/components/loadable/Loadable';

const Landingpage = Loadable(lazy(() => import('./pages/Landingpage')));

export const landingRoutes: RouteObject[] = [{ path: '/landingpage', element: <Landingpage /> }];
