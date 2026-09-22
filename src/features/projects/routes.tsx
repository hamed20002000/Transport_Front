import { lazy } from 'react';
import { type RouteObject } from 'react-router-dom';
import Loadable from 'src/shared/components/loadable/Loadable';
import PermissionGuard from 'src/core/auth/PermissionGuard';

const ListProjects = Loadable(lazy(() => import('./pages/list-projects/ListProjects')));
const ListProjectPlanning = Loadable(
  lazy(() => import('./pages/list-project-planing/ListProjectPlaning')),
);
const ListProjectPlanningImplementation = Loadable(
  lazy(
    () => import('./pages/list-project-planning-implementation/ListProjectPlanningImplementation'),
  ),
);
const ProjectPlanningImplementationReport = Loadable(
  lazy(
    () =>
      import('./pages/project-planning-implementation-report/ProjectPlanningImplementationReport'),
  ),
);
const ListSetProjectPlanningImplementation = Loadable(
  lazy(
    () =>
      import('./pages/list-set-project-planning-implementation/ListSetProjectPlanningImplementation'),
  ),
);

export const projectsRoutes: RouteObject[] = [
  {
    path: '/project/list-projects/',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListProjects />
      </PermissionGuard>
    ),
  },
  {
    path: '/project/project-planing/',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListProjectPlanning />
      </PermissionGuard>
    ),
  },
  {
    path: '/project/project-planing/:projectId',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListProjectPlanning />
      </PermissionGuard>
    ),
  },
  {
    path: '/project/project-planing-implementation/',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListProjectPlanningImplementation />
      </PermissionGuard>
    ),
  },
  {
    path: '/project/project-planing-implementation-report/',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ProjectPlanningImplementationReport />
      </PermissionGuard>
    ),
  },
  {
    path: '/project/set-project-planing-implementation/:dateId',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListSetProjectPlanningImplementation />
      </PermissionGuard>
    ),
  },
];
