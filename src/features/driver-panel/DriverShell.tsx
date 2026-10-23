import { Suspense, useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Bell, ClipboardList, House, Landmark, Navigation, PackageSearch, SlidersHorizontal, Truck, UserRound } from 'lucide-react';
import { useAuth } from 'src/core/auth/AuthContext';
import PageContainer from 'src/shared/components/container/PageContainer';
import Spinner from 'src/shared/components/spinner/Spinner';
import { cn } from 'src/shared/utils/utils';
import { displayName, useProfile } from 'src/features/company-cargo/profileStore';
import { useNotificationEvent } from 'src/features/company-cargo/notificationSocket';
import { unreadLoadCount } from './api';
import MarketTicker from 'src/features/market/MarketTicker';
import { PageSkeleton, SignOutButton } from 'src/features/company-cargo/components';
import { preloadDriverPages } from './pages';
import SmoothScroll from 'src/shared/components/SmoothScroll';
import PushPrompt from 'src/shared/components/pwa/PushPrompt';
import FloatingPanelNav from 'src/shared/components/FloatingPanelNav';

const items = [
  { to: '/account/driver', label: 'خانه', icon: House },
  { to: '/account/driver/loads', label: 'بارها', icon: PackageSearch },
  { to: '/account/driver/requests', label: 'درخواست‌ها', icon: ClipboardList },
  { to: '/account/driver/trip', label: 'سفر فعال', icon: Navigation },
  { to: '/account/driver/borders', label: 'مرزها', icon: Landmark },
  { to: '/account/driver/profile', label: 'پروفایل', icon: UserRound },
];

const fa = (value: number) => value.toLocaleString('fa-IR');

// Unread loads for the bell; refreshed by the socket and by pages that mark loads read.
let refreshUnread: () => void = () => undefined;
export const reloadUnread = () => refreshUnread();

function useUnread() {
  const [count, setCount] = useState(0);
  const load = useCallback(() => {
    unreadLoadCount()
      .then(setCount)
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    load();
    refreshUnread = load;
  }, [load]);
  useNotificationEvent<{ kind: 'suggestion' | 'listing' }>('cargo-notification', (event) => event.kind === 'listing' && load());
  return count;
}

// Driver frame, sharing the floating navigation drawer with the company panel.
function Frame({ children }: { children: ReactNode }) {
  const name = displayName(useProfile());
  const unread = useUnread();
  const { pathname } = useLocation();
  return (
    <div dir="rtl" lang="fa" className="tw-min-h-[100dvh] tw-bg-brand-bg tw-text-brand-navy">
      <header className="tw-sticky tw-top-0 tw-z-20 tw-pt-[env(safe-area-inset-top)] tw-border-b tw-border-brand-line tw-bg-white/95 tw-backdrop-blur">
        <div className="tw-mx-auto tw-flex tw-h-16 tw-max-w-5xl tw-items-center tw-justify-between tw-gap-2 tw-px-3 sm:tw-px-6">
          <FloatingPanelNav
            title="منوی راننده"
            items={items.map((item) => ({ ...item, active: pathname === item.to || pathname === `${item.to}/` }))}
          />
          <div className="tw-flex tw-min-w-0 tw-flex-1 tw-items-center tw-gap-2">
            <strong className="tw-truncate tw-text-lg tw-font-bold tw-leading-none">{name || 'پنل راننده'}</strong>
            {name && <span className="tw-shrink-0 tw-rounded-full tw-bg-brand-orange-soft tw-px-2.5 tw-py-0.5 tw-text-xs tw-font-medium tw-text-brand-orange-ink">راننده</span>}
          </div>
          <div className="tw-flex tw-shrink-0 tw-items-center tw-gap-1 sm:tw-gap-1.5">
            <Link
              to="/account/driver/filters"
              aria-label="تنظیمات نمایش بار"
              title="تنظیمات نمایش بار"
              aria-current={pathname === '/account/driver/filters' ? 'page' : undefined}
              className={cn(
                'tw-flex tw-h-10 tw-w-10 tw-items-center tw-justify-center tw-rounded-full hover:tw-bg-brand-sky',
                pathname === '/account/driver/filters' ? 'tw-text-brand-orange' : 'tw-text-brand-navy',
              )}
            >
              <SlidersHorizontal size={21} aria-hidden />
            </Link>
            <Link
              to="/account/driver/loads?unread=1"
              aria-label={unread ? `${fa(unread)} بار تازه` : 'اعلان‌ها'}
              title="بارهای تازه"
              className="tw-relative tw-flex tw-h-10 tw-w-10 tw-items-center tw-justify-center tw-rounded-full tw-text-brand-navy hover:tw-bg-brand-sky"
            >
              <Bell size={22} aria-hidden />
              {!!unread && (
                <span className="tw-absolute tw-right-1 tw-top-1 tw-min-w-[1.1rem] tw-rounded-full tw-bg-brand-orange tw-px-1 tw-text-center tw-text-[10px] tw-font-bold tw-leading-[1.1rem] tw-text-white">
                  {unread > 99 ? '۹۹+' : fa(unread)}
                </span>
              )}
            </Link>
            <Link
              to="/account/driver/profile"
              aria-label="پروفایل راننده"
              title="پروفایل راننده"
              className="tw-flex tw-h-10 tw-w-10 tw-items-center tw-justify-center tw-rounded-full tw-bg-brand-navy tw-text-brand-orange"
            >
              <Truck size={20} aria-hidden />
            </Link>
            <SignOutButton />
          </div>
        </div>
        {/* Prices live in the sticky header so they stay in view while lists scroll. */}
        <div className="tw-border-t tw-border-brand-line tw-bg-brand-sky">
          <div className="tw-mx-auto tw-max-w-5xl tw-px-3 tw-py-1.5 sm:tw-px-6">
            <MarketTicker />
          </div>
        </div>
      </header>
      <main className="tw-mx-auto tw-max-w-5xl tw-px-4 tw-pb-[calc(4rem+env(safe-area-inset-bottom))] tw-pt-6 sm:tw-px-6">
        <PushPrompt />
        {children}
      </main>
    </div>
  );
}

// Layout route for every driver page: the frame mounts once and only the page under it swaps on a tab change.
// Only DRIVER accounts get in; others go to their own home.
export function DriverLayout() {
  const { isAuth, isAuthDataLoading, userRoles } = useAuth();
  const allowed = isAuth && userRoles.some((role) => role.name === 'DRIVER');
  useEffect(() => {
    if (allowed) preloadDriverPages();
  }, [allowed]);
  if (isAuthDataLoading) return <Spinner />;
  if (!isAuth) return <Navigate to="/auth/login" replace />;
  if (!allowed) {
    const other = userRoles.find((role) => role.name === 'COMPANY' || role.name === 'BROKER');
    return <Navigate to={other ? `/account/${other.name.toLowerCase()}` : '/dashboards/dashboard'} replace />;
  }
  return (
    <Frame>
      <SmoothScroll />
      <Suspense fallback={<PageSkeleton />}>
        <Outlet />
      </Suspense>
    </Frame>
  );
}

// Page wrapper: sets the tab title; the frame comes from DriverLayout.
export default function DriverShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <PageContainer title={`${title} | ترابوت`} description="پنل راننده">
      <>{children}</>
    </PageContainer>
  );
}
