import { Suspense, useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Bell, ClipboardList, CreditCard, History, House, Landmark, Navigation, PackageSearch, SlidersHorizontal, Sparkles, Truck, UserRound } from 'lucide-react';
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
import { useToast } from 'src/shared/components/toast/ToastProvider';
import SubscriptionPurchase from 'src/features/subscription/SubscriptionPurchase';
import { getSubscription, SUBSCRIPTION_REQUIRED_EVENT, watchSubscriptionRequired, type SubscriptionState } from 'src/features/subscription/api';

const items = [
  { to: '/account/driver', label: 'خانه', icon: House },
  { to: '/account/driver/loads', label: 'بارها', icon: PackageSearch },
  { to: '/account/driver/requests', label: 'درخواست‌ها', icon: ClipboardList },
  { to: '/account/driver/trip', label: 'سفر فعال', icon: Navigation },
  { to: '/account/driver/history', label: 'سفرهای رفته', icon: History },
  { to: '/account/driver/borders', label: 'مرزها', icon: Landmark },
  { to: '/account/driver/profile', label: 'پروفایل', icon: UserRound },
  { to: '/account/driver/subscription', label: 'اشتراک', icon: CreditCard },
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

// Whether the driver may work (a subscription, or the free first month): checked when the panel opens, when a
// request is refused with 402 (the month ran out meanwhile) and after a purchase is approved.
let refreshSubscription: () => void = () => undefined;
export const recheckSubscription = () => refreshSubscription();

function useSubscriptionAccess() {
  const [access, setAccess] = useState<SubscriptionState['access'] | null>(null);
  const load = useCallback(() => {
    getSubscription()
      .then((state) => setAccess(state.access))
      // unknown (offline, server down): the pages stay usable; the server still refuses with 402
      .catch(() => setAccess((current) => current ?? { allowed: true, reason: 'free', isDriver: true, trialEndsAt: null, expireAt: null }));
  }, []);
  useEffect(() => {
    watchSubscriptionRequired();
    load();
    refreshSubscription = load;
    window.addEventListener(SUBSCRIPTION_REQUIRED_EVENT, load);
    return () => window.removeEventListener(SUBSCRIPTION_REQUIRED_EVENT, load);
  }, [load]);
  return access;
}

const TRIAL_REMINDER_DAYS = 7;

/** The last week of the free month: a strip that leads to the purchase page. */
function TrialReminder({ endsAt }: { endsAt: string }) {
  const days = Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 86_400_000));
  if (days > TRIAL_REMINDER_DAYS) return null;
  return (
    <Link
      to="/account/driver/subscription"
      className="tw-mb-5 tw-flex tw-items-center tw-gap-3 tw-rounded-2xl tw-border tw-border-brand-orange/30 tw-bg-brand-orange-soft tw-px-4 tw-py-3 tw-text-sm tw-text-brand-navy tw-no-underline hover:tw-border-brand-orange"
    >
      <Sparkles size={20} className="tw-shrink-0 tw-text-brand-orange-ink" aria-hidden />
      <span className="tw-flex-1">
        {days === 0 ? 'استفاده‌ی رایگان شما امروز تمام می‌شود.' : `${fa(days)} روز از استفاده‌ی رایگان شما باقی مانده است.`}
      </span>
      <strong className="tw-shrink-0 tw-text-brand-orange-ink">خرید اشتراک</strong>
    </Link>
  );
}

// Driver frame, sharing the floating navigation drawer with the company panel.
function Frame({ children }: { children: ReactNode }) {
  const name = displayName(useProfile());
  const unread = useUnread();
  const { pathname } = useLocation();
  const toast = useToast();
  // A company's answer (accepted, delivery confirmed, …): the same news the messengers get, live while the panel is open.
  useNotificationEvent<{ type?: string; text?: string }>('cargo-request-changed', (event) => {
    if (event.type === 'driverNotice' && event.text) toast.info(event.text);
  });
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
      <SubscriptionGate>
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </SubscriptionGate>
    </Frame>
  );
}

/** Without a subscription after the free month, every page of the panel is the purchase page. */
function SubscriptionGate({ children }: { children: ReactNode }) {
  const access = useSubscriptionAccess();
  const { pathname } = useLocation();
  if (!access) return <PageSkeleton />;
  if (!access.allowed) {
    return (
      <PageContainer title="اشتراک | ترابوت" description="پنل راننده">
        <SubscriptionPurchase onActivated={recheckSubscription} />
      </PageContainer>
    );
  }
  return (
    <>
      {access.reason === 'trial' && access.trialEndsAt && pathname !== '/account/driver/subscription' && <TrialReminder endsAt={access.trialEndsAt} />}
      {children}
    </>
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
