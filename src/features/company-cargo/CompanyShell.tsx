import { createContext, Suspense, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Archive, Bell, Building2, ClipboardList, House, Inbox, Link2, SlidersHorizontal, SquarePlus, Truck, Users } from 'lucide-react';
import { countCompanyRequests, getOverdueTrips } from './api';
import { PageSkeleton, SignOutButton } from './components';
import { preloadCompanyPages } from './pages';
import SmoothScroll from 'src/shared/components/SmoothScroll';
import PushPrompt from 'src/shared/components/pwa/PushPrompt';
import FloatingPanelNav from 'src/shared/components/FloatingPanelNav';
import { cn } from 'src/shared/utils/utils';
import { displayName, useProfile } from './profileStore';
import MarketTicker from 'src/features/market/MarketTicker';
import { useNotificationEvent } from './notificationSocket';
import { useToast } from 'src/shared/components/toast/ToastProvider';

const items = [
  { to: '/account/company', label: 'خانه', icon: House, match: (path: string, tab: string | null) => path === '/account/company' && !tab },
  { to: '/account/company/cargo', label: 'پیشنهادها', icon: Inbox, match: (path: string, tab: string | null) => path === '/account/company/cargo' && tab !== 'listings' },
  { to: '/account/company/cargo/new', label: 'ثبت بار', icon: SquarePlus, match: (path: string) => path === '/account/company/cargo/new' },
  { to: '/account/company/cargo?tab=listings', label: 'بارهای من', icon: Archive, match: (path: string, tab: string | null) => path === '/account/company/cargo' && tab === 'listings' },
  { to: '/account/company/requests', label: 'درخواست‌ها', icon: ClipboardList, match: (path: string) => path === '/account/company/requests' },
  { to: '/account/company/trips', label: 'سفرها', icon: Truck, match: (path: string) => path === '/account/company/trips' },
  { to: '/account/company/drivers', label: 'رانندگان', icon: Users, match: (path: string) => path === '/account/company/drivers' },
  { to: '/account/company/channels', label: 'کانال‌ها', icon: Link2, match: (path: string) => path === '/account/company/channels' },
  { to: '/account/company/profile', label: 'پروفایل', icon: Building2, match: (path: string) => path === '/account/company/profile' },
];

const fa = (value: number) => value.toLocaleString('fa-IR');

// Lets the page under the layout put its unread count on the bell.
const UnreadContext = createContext<(count: number | undefined) => void>(() => undefined);

// Company frame with a shared floating navigation drawer.
function Frame({ children, unread }: { children: ReactNode; unread?: number }) {
  const name = displayName(useProfile());
  const toast = useToast();
  // Trips with no delivery registered for days: a count on the «سفرها» tab, so a reminder missed while offline still shows.
  const [overdue, setOverdue] = useState<{ count: number; days: number } | null>(null);
  const loadOverdue = useCallback(() => {
    getOverdueTrips()
      .then(setOverdue)
      .catch(() => setOverdue(null));
  }, []);
  useEffect(loadOverdue, [loadOverdue]);
  // drivers' requests waiting for an answer: a count on «درخواست‌ها», kept even after the toast is gone
  const [requests, setRequests] = useState(0);
  const loadRequests = useCallback(() => {
    countCompanyRequests()
      .then(setRequests)
      .catch(() => setRequests(0));
  }, []);
  useEffect(loadRequests, [loadRequests]);
  useNotificationEvent<{ type?: string; text?: string }>('cargo-request-changed', (event) => {
    // The same reminder the messengers get («تحویل داده شد؟»), live while the panel is open.
    if ((event.type === 'newRequest' || event.type === 'deliveryReminder' || event.type === 'deliveryReported') && event.text) toast.info(event.text);
    loadOverdue();
    loadRequests();
  });
  const { pathname, search } = useLocation();
  const tab = new URLSearchParams(search).get('tab');
  return (
    <div dir="rtl" lang="fa" className="tw-min-h-[100dvh] tw-bg-brand-bg tw-text-brand-navy">
      <header className="tw-sticky tw-top-0 tw-z-20 tw-pt-[env(safe-area-inset-top)] tw-border-b tw-border-brand-line tw-bg-white/95 tw-backdrop-blur">
        <div className="tw-mx-auto tw-flex tw-h-16 tw-max-w-5xl tw-items-center tw-justify-between tw-gap-2 tw-px-3 sm:tw-px-6">
          <FloatingPanelNav
            title="منوی شرکت"
            items={items.map((item) => ({
              ...item,
              active: item.match(pathname, tab),
              count: item.to === '/account/company/requests' ? requests : item.to === '/account/company/trips' ? overdue?.count : undefined,
              countLabel: item.to === '/account/company/requests'
                ? `${fa(requests)} درخواست منتظر جواب`
                : item.to === '/account/company/trips' && overdue
                  ? `${fa(overdue.count)} سفر بیش از ${fa(overdue.days)} روز است تحویلش ثبت نشده`
                  : undefined,
            }))}
          />
          <div className="tw-min-w-0 tw-flex-1">
            <div className="tw-flex tw-min-w-0 tw-items-center tw-gap-2">
              <strong className="tw-truncate tw-text-lg tw-font-bold tw-leading-none">{name || 'پنل شرکت'}</strong>
              {name && <span className="tw-shrink-0 tw-rounded-full tw-bg-brand-orange-soft tw-px-2.5 tw-py-0.5 tw-text-xs tw-font-medium tw-text-brand-orange-ink">شرکت</span>}
            </div>
          </div>
          <div className="tw-flex tw-shrink-0 tw-items-center tw-gap-1 sm:tw-gap-1.5">
            <Link
              to="/account/company/filters"
              aria-label="تنظیمات نمایش بار"
              title="تنظیمات نمایش بار"
              aria-current={pathname === '/account/company/filters' ? 'page' : undefined}
              className={cn(
                'tw-flex tw-h-10 tw-w-10 tw-items-center tw-justify-center tw-rounded-full hover:tw-bg-brand-sky',
                pathname === '/account/company/filters' ? 'tw-text-brand-orange' : 'tw-text-brand-navy',
              )}
            >
              <SlidersHorizontal size={21} aria-hidden />
            </Link>
            <Link
              to="/account/company/cargo"
              aria-label={unread ? `${fa(unread)} بار خوانده‌نشده` : 'اعلان‌ها'}
              title="اعلان‌ها"
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
              to="/account/company/profile"
              aria-label="پروفایل شرکت"
              title="پروفایل شرکت"
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

// Layout route for every company page: the frame mounts once and only the page under it swaps on a tab change.
export function CompanyLayout() {
  const [unread, setUnread] = useState<number | undefined>();
  useEffect(preloadCompanyPages, []);
  return (
    <UnreadContext.Provider value={setUnread}>
      <Frame unread={unread}>
        <SmoothScroll />
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </Frame>
    </UnreadContext.Provider>
  );
}

// Page wrapper: the frame comes from CompanyLayout; a page that knows the unread count hands it up.
export default function CompanyShell({ children, unread }: { children: ReactNode; unread?: number }) {
  const setUnread = useContext(UnreadContext);
  useEffect(() => {
    setUnread(unread);
    return () => setUnread(undefined);
  }, [setUnread, unread]);
  return <>{children}</>;
}
