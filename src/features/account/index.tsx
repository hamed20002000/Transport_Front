import { lazy } from 'react';
import { Link, Navigate, type RouteObject } from 'react-router-dom';
import { Archive, Building2, ChevronLeft, Factory, Handshake, Inbox, Link2, SlidersHorizontal, SquarePlus, Truck, UserRound } from 'lucide-react';
import { useAuth } from 'src/core/auth/AuthContext';
import PageContainer from 'src/shared/components/container/PageContainer';
import Spinner from 'src/shared/components/spinner/Spinner';
import { CompanyShell, displayName, useProfile } from 'src/features/company-cargo';
import { driverHasNoCompany } from 'src/features/driver-panel';
import trabotIcon from 'src/shared/assets/images/logos/trabot-icon.png';
import Loadable from 'src/shared/components/loadable/Loadable';

const BrokerPanel = Loadable(lazy(() => import('src/features/broker/BrokerPanel')));

const accounts = {
  COMPANY: { path: '/account/company', title: 'شرکت حمل‌ونقل', icon: Building2, profile: '/account/company/profile' },
  // straight to «دریافت اعلام بار» (only while the driver is in no company: until then no load reaches them)
  DRIVER: { path: '/account/driver', title: 'راننده', icon: Truck, profile: '/account/driver/profile#announcements' },
  // the broker panel opens on its profile until a parent company approves it (features/broker)
  BROKER: { path: '/account/broker', title: 'واسط', icon: Handshake, profile: undefined },
  // the factory panel is in features/factory (only sending loads to the companies that invited it)
  FACTORY: { path: '/account/factory', title: 'شرکت / کارخانه', icon: Factory, profile: undefined },
};

const companyTiles = [
  { to: '/account/company/cargo', title: 'بارهای پیشنهادی', icon: Inbox },
  { to: '/account/company/cargo/new', title: 'ثبت بار', icon: SquarePlus },
  { to: '/account/company/published', title: 'بارهای منتشرشده', icon: Archive },
  { to: '/account/company/channels', title: 'گروه‌ها و کانال‌ها', icon: Link2 },
  { to: '/account/company/factories', title: 'شرکت‌ها / کارخانه‌ها', icon: Factory },
  { to: '/account/company/filters', title: 'تنظیمات نمایش بار', icon: SlidersHorizontal },
  { to: '/account/company/profile', title: 'پروفایل', icon: UserRound },
];

export function accountHome(role: string | null | undefined) {
  return role && role in accounts ? accounts[role as keyof typeof accounts].path : undefined;
}

/**
 * Where a sign-in with a code lands: the profile first, so the user sees what it controls; the home page when there
 * is none, and for a driver who is already in a company (they already get loads).
 */
export async function signInPage(role: string | null | undefined): Promise<string | undefined> {
  if (!role || !(role in accounts)) return undefined;
  if (role === 'DRIVER' && !(await driverHasNoCompany())) return accounts.DRIVER.path;
  return accounts[role as keyof typeof accounts].profile ?? accountHome(role);
}

function Welcome({ title, username }: { title: string; username: string }) {
  const name = displayName(useProfile());
  return (
    <section>
      <p className="tw-text-sm tw-font-bold tw-text-brand-orange-ink">سامانه هوشمند بار</p>
      <h1 className="tw-mt-1 tw-text-2xl tw-font-bold tw-text-brand-navy sm:tw-text-3xl">پنل {title}</h1>
      <p className="tw-mt-2 tw-text-brand-muted">
        <bdi>{name || username}</bdi>، خوش آمدید.
      </p>
    </section>
  );
}

function CompanyHome({ username }: { username: string }) {
  return (
    <CompanyShell>
      <div className="tw-space-y-8">
        <Welcome title="شرکت حمل‌ونقل" username={username} />
        <nav aria-label="بخش‌های شرکت حمل‌ونقل" className="tw-grid tw-grid-cols-2 tw-gap-3 sm:tw-max-w-2xl sm:tw-grid-cols-3">
          {companyTiles.map(({ to, title, icon: TileIcon }) => (
            <Link
              key={to}
              to={to}
              className="tw-group tw-flex tw-items-center tw-gap-2.5 tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-p-2.5 tw-shadow-sm tw-transition-colors hover:tw-border-brand-orange/50"
            >
              <span className="tw-flex tw-h-9 tw-w-9 tw-items-center tw-justify-center tw-rounded-lg tw-bg-brand-sky tw-text-brand-navy tw-transition-colors group-hover:tw-bg-brand-orange group-hover:tw-text-white">
                <TileIcon size={18} aria-hidden="true" />
              </span>
              <strong className="tw-min-w-0 tw-flex-1 tw-truncate tw-text-sm tw-text-brand-navy">{title}</strong>
              <ChevronLeft size={16} aria-hidden="true" className="tw-text-brand-line tw-transition-colors group-hover:tw-text-brand-orange" />
            </Link>
          ))}
        </nav>
      </div>
    </CompanyShell>
  );
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
    <PageContainer title={`پنل ${title} | ترابوت`} description={`صفحه اصلی حساب ${title}`}>
      {type === 'COMPANY' ? (
        <CompanyHome username={username} />
      ) : (
        <main dir="rtl" lang="fa" className="tw-min-h-[100dvh] tw-bg-brand-bg tw-p-6 tw-text-brand-navy sm:tw-p-12">
          <div className="tw-mx-auto tw-max-w-4xl tw-space-y-8">
            <header className="tw-flex tw-items-center tw-gap-3">
              <img src={trabotIcon} alt="" className="tw-h-10 tw-w-10 tw-rounded-xl tw-object-cover" />
              <strong>ترابوت</strong>
            </header>
            <div className="tw-flex tw-items-center tw-gap-4 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-6 tw-shadow-sm sm:tw-p-8">
              <span className="tw-flex tw-h-14 tw-w-14 tw-items-center tw-justify-center tw-rounded-xl tw-bg-brand-sky">
                <Icon size={28} aria-hidden="true" />
              </span>
              <Welcome title={title} username={username} />
            </div>
          </div>
        </main>
      )}
    </PageContainer>
  );
}

// The driver home lives in the driver panel's routes; the company home goes under CompanyLayout (see the app router).
export const companyHomeRoute: RouteObject = { path: accounts.COMPANY.path, element: <AccountHome type="COMPANY" /> };
// the broker (واسط) panel: the open loads and its requests (features/broker)
export const accountRoutes: RouteObject[] = [{ path: accounts.BROKER.path, element: <BrokerPanel /> }];
