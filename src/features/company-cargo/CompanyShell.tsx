import { createContext, Suspense, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Archive, Bell, BadgeCheck, Building2, ClipboardList, Crown, Factory, Gem, House, Inbox, Link2, ShieldCheck, SlidersHorizontal, SquarePlus, Truck, Users } from 'lucide-react';
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
import { COMPANY_FEATURES_PATH, featureByPath, lockedFeature, reloadCompanyFeatures, useCompanyFeatures } from './featuresApi';
import FeatureLocked from './FeatureLocked';
import AccountCode from 'src/shared/components/account-code/AccountCode';

const items = [
  { to: '/account/company', label: 'خانه', icon: House, match: (path: string, tab: string | null) => path === '/account/company' && !tab },
  { to: '/account/company/cargo', label: 'پیشنهادها', icon: Inbox, match: (path: string) => path === '/account/company/cargo' },
  { to: '/account/company/cargo/new', label: 'ثبت بار', icon: SquarePlus, match: (path: string) => path === '/account/company/cargo/new' },
  { to: '/account/company/published', label: 'بارهای منتشرشده', icon: Archive, match: (path: string) => path === '/account/company/published' },
  { to: '/account/company/requests', label: 'درخواست‌ها', icon: ClipboardList, match: (path: string) => path === '/account/company/requests' },
  { to: '/account/company/trips', label: 'سفرها', icon: Truck, match: (path: string) => path === '/account/company/trips' },
  { to: '/account/company/drivers', label: 'رانندگان', icon: Users, match: (path: string) => path === '/account/company/drivers' },
  { to: '/account/company/channels', label: 'کانال‌ها', icon: Link2, match: (path: string) => path === '/account/company/channels' },
  { to: '/account/company/factories', label: 'شرکت‌ها / کارخانه‌ها', icon: Factory, match: (path: string) => path === '/account/company/factories' },
  { to: '/account/company/profile', label: 'پروفایل', icon: Building2, match: (path: string) => path === '/account/company/profile' },
  { to: COMPANY_FEATURES_PATH, label: 'خرید امکانات', icon: Gem, match: (path: string) => path === COMPANY_FEATURES_PATH },
];
// only the parent company: inviting new transport companies, and checking those that signed up on their own
const PARENT_ITEMS = [
  { to: '/account/company/companies', label: 'دعوت شرکت‌های حمل‌ونقل', icon: Crown, match: (path: string) => path === '/account/company/companies' },
  { to: '/account/company/verifications', label: 'بررسی اعتبار', icon: BadgeCheck, match: (path: string) => path === '/account/company/verifications' },
];

const fa = (value: number) => value.toLocaleString('fa-IR');

// Lets the page under the layout put its unread count on the bell.
const UnreadContext = createContext<(count: number | undefined) => void>(() => undefined);

// Company frame with a shared floating navigation drawer.
function Frame({ children, unread }: { children: ReactNode; unread?: number }) {
  const profile = useProfile();
  const name = displayName(profile);
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
    if ((event.type === 'newRequest' || event.type === 'requestCancelled' || event.type === 'deliveryReminder' || event.type === 'deliveryReported') && event.text) toast.info(event.text);
    loadOverdue();
    loadRequests();
  });
  const { pathname, search } = useLocation();
  const tab = new URLSearchParams(search).get('tab');
  // a menu the company has not bought (parent companies have every menu): marked in the menu, and unlocked as soon as
  // the admin approves its receipt
  const features = useCompanyFeatures();
  useNotificationEvent('company-features-changed', () => void reloadCompanyFeatures());
  // a parent company approved the account while the panel was open: it opens at once
  useNotificationEvent('verification-changed', () => void reloadCompanyFeatures());
  return (
    // clip: a child wider than the phone must not widen the page; then the side menu (fixed to the right edge)
    // opened off to the left. clip, unlike hidden, keeps the header sticky.
    <div dir="rtl" lang="fa" className="tw-min-h-[100dvh] tw-overflow-x-clip tw-bg-brand-bg tw-text-brand-navy">
      <header className="tw-sticky tw-top-0 tw-z-20 tw-pt-[env(safe-area-inset-top)] tw-border-b tw-border-brand-line tw-bg-white/95 tw-backdrop-blur">
        {/* phones: the name gets the first row whole, the icons go to a second row; one row from sm up */}
        <div className="tw-mx-auto tw-flex tw-min-h-[4rem] tw-max-w-5xl tw-flex-wrap tw-items-center tw-justify-between tw-gap-x-2 tw-gap-y-1 tw-px-3 tw-py-2 sm:tw-h-16 sm:tw-flex-nowrap sm:tw-px-6 sm:tw-py-0">
          <FloatingPanelNav
            title="منوی شرکت حمل‌ونقل"
            items={[...items, ...(features?.isParent ? PARENT_ITEMS : [])].map((item) => ({
              ...item,
              label: lockedFeature(features, featureByPath[item.to]) ? `${item.label} 🔒` : item.label,
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
              <strong className="tw-line-clamp-2 tw-text-base tw-font-bold tw-leading-snug sm:tw-line-clamp-none sm:tw-truncate sm:tw-text-lg sm:tw-leading-none">{name || 'پنل شرکت حمل‌ونقل'}</strong>
              {name && <span className="tw-shrink-0 tw-rounded-full tw-bg-brand-orange-soft tw-px-2.5 tw-py-0.5 tw-text-xs tw-font-medium tw-text-brand-orange-ink">شرکت حمل‌ونقل</span>}
              <AccountCode code={profile?.accountCode} />
            </div>
          </div>
          <div className="tw-flex tw-w-full tw-shrink-0 tw-items-center tw-justify-end tw-gap-1 sm:tw-w-auto sm:tw-gap-1.5">
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
              aria-label="پروفایل شرکت حمل‌ونقل"
              title="پروفایل شرکت حمل‌ونقل"
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
          <LockedOrPage />
        </Suspense>
      </Frame>
    </UnreadContext.Provider>
  );
}

const PROFILE_PATH = '/account/company/profile';

function Unverified() {
  return (
    <div className="tw-flex tw-flex-col tw-items-center tw-gap-3 tw-rounded-2xl tw-border tw-border-dashed tw-border-brand-line tw-bg-white tw-px-6 tw-py-14 tw-text-center">
      <span className="tw-flex tw-h-14 tw-w-14 tw-items-center tw-justify-center tw-rounded-2xl tw-bg-brand-orange-soft tw-text-brand-orange-ink">
        <ShieldCheck size={26} aria-hidden />
      </span>
      <p className="tw-m-0 tw-text-lg tw-font-bold">حساب شما تا بررسی اعتبار فعال نیست</p>
      <p className="tw-m-0 tw-max-w-sm tw-text-sm tw-leading-7 tw-text-brand-muted">پروفایل شرکت حمل‌ونقل را کامل کنید و «درخواست بررسی اعتبار» را بزنید؛ بعد از تأیید شرکت مادر، پنل باز می‌شود.</p>
      <Link to={PROFILE_PATH} className="tw-mt-2 tw-inline-flex tw-h-11 tw-items-center tw-gap-2 tw-rounded-xl tw-bg-brand-orange tw-px-5 tw-font-bold tw-text-white hover:tw-bg-brand-orange-dark">
        رفتن به پروفایل
      </Link>
    </div>
  );
}

// A page of a menu the company has not bought: the purchase card instead (its requests would only get 402).
function LockedOrPage() {
  const { pathname } = useLocation();
  const features = useCompanyFeatures();
  // signed up on its own and not checked yet: every page but the profile waits for the parent company
  if (features && !features.verified && pathname !== PROFILE_PATH) return <Unverified />;
  const feature = featureByPath[pathname];
  const state = feature && lockedFeature(features, feature) ? features?.features.find((item) => item.feature === feature) : undefined;
  return state ? <FeatureLocked title={state.title} feature={state.feature} /> : <Outlet />;
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
