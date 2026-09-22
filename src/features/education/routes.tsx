import { lazy } from 'react';
import { type RouteObject } from 'react-router-dom';
import Loadable from 'src/shared/components/loadable/Loadable';
import PermissionGuard from 'src/core/auth/PermissionGuard';

const ListTeachers = Loadable(lazy(() => import('./pages/teachers/ListTeachers')));
const ListCourses = Loadable(lazy(() => import('./pages/courses/ListCourses')));
const ListParticipationCertificate = Loadable(
  lazy(() => import('./pages/participation-certificate/ListParticipationCertificate')),
);

export const educationRoutes: RouteObject[] = [
  {
    path: '/education/list-teachers/',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListTeachers />
      </PermissionGuard>
    ),
  },
  {
    path: '/education/list-courses/',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListCourses />
      </PermissionGuard>
    ),
  },
  {
    path: '/education/list-participation-certificate/',
    element: (
      <PermissionGuard requiredOperationName="Görüntülemek">
        <ListParticipationCertificate />
      </PermissionGuard>
    ),
  },
];
