import { Navigate, type RouteObject } from 'react-router-dom';
import { Building2, Truck, Handshake } from 'lucide-react';
import { useAuth } from 'src/core/auth/AuthContext';
import PageContainer from 'src/shared/components/container/PageContainer';
import Spinner from 'src/shared/components/spinner/Spinner';

const accounts = {
  COMPANY: { path: '/account/company', title: 'شرکت', icon: Building2 },
  DRIVER: { path: '/account/driver', title: 'راننده', icon: Truck },
  BROKER: { path: '/account/broker', title: 'واسط', icon: Handshake },
};

export function accountHome(role: string | null | undefined) {
  return role && role in accounts ? accounts[role as keyof typeof accounts].path : undefined;
}

function AccountHome({ type }: { type: keyof typeof accounts }) {
  const { username, isAuth, isAuthDataLoading, userRoles } = useAuth();
  if (isAuthDataLoading) return <Spinner />;
  if (!isAuth) return <Navigate to="/auth/login" replace />;
  if (!userRoles.some((role) => role.name === type)) {
    const ownHome = userRoles.map((role) => accountHome(role.name)).find(Boolean);
    return <Navigate to={ownHome || '/dashboards/dashboard'} replace />;
  }
  const { title, icon: Icon } = accounts[type];
  return (
    <PageContainer title={`پنل ${title} | Setaş Transport`} description={`صفحه اصلی حساب ${title}`}>
      <main dir="rtl" lang="fa" className="tw-min-h-screen tw-bg-stone-50 tw-p-6 sm:tw-p-12">
        <div className="tw-mx-auto tw-max-w-4xl">
          <header className="tw-mb-12 tw-flex tw-items-center tw-gap-3 tw-text-emerald-900">
            <Truck size={30} />
            <strong dir="ltr">SETAŞ TRANSPORT</strong>
          </header>
          <section className="tw-rounded-3xl tw-border tw-border-emerald-100 tw-bg-white tw-p-8 sm:tw-p-12">
            <Icon size={40} className="tw-mb-6 tw-text-emerald-800" aria-hidden="true" />
            <h1 className="tw-text-3xl tw-font-bold tw-text-emerald-950">پنل {title}</h1>
            <p className="tw-mt-5 tw-text-lg tw-text-stone-700">
              <bdi>{username}</bdi>، خوش آمدید.
            </p>
            <p className="tw-mt-3 tw-text-stone-500">به صفحهٔ حساب کاربری خود خوش آمدید.</p>
          </section>
        </div>
      </main>
    </PageContainer>
  );
}

export const accountRoutes: RouteObject[] = (
  Object.keys(accounts) as Array<keyof typeof accounts>
).map((type) => ({ path: accounts[type].path, element: <AccountHome type={type} /> }));
