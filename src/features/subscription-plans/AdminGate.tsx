import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from 'src/core/auth/AuthContext';

/** Admin pages of the subscription section: the content only for an ADMIN account. */
export default function AdminGate({ children }: { children: ReactNode }) {
  const { isAuth, isAuthDataLoading, userRoles } = useAuth();
  if (isAuthDataLoading) return <p role="status">در حال دریافت اطلاعات حساب…</p>;
  if (!isAuth) return <Navigate to="/auth/login" replace />;
  if (!userRoles.some((role) => role.name === 'ADMIN'))
    return (
      <p role="alert" dir="rtl">
        این بخش فقط برای مدیر سیستم در دسترس است.
      </p>
    );
  return <>{children}</>;
}
