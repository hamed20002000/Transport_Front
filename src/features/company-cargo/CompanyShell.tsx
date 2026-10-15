import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Archive, Bell, Building2, House, Inbox, Link2, SlidersHorizontal, SquarePlus, Truck, Users } from 'lucide-react';
import { cn } from 'src/shared/utils/utils';
import { displayName, useProfile } from './profileStore';
import MarketTicker from 'src/features/market/MarketTicker';

const items = [
  { to: '/account/company', label: 'خانه', icon: House, match: (path: string, tab: string | null) => path === '/account/company' && !tab },
  { to: '/account/company/cargo', label: 'پیشنهادها', icon: Inbox, match: (path: string, tab: string | null) => path === '/account/company/cargo' && tab !== 'listings' },
  { to: '/account/company/cargo/new', label: 'ثبت بار', icon: SquarePlus, match: (path: string) => path === '/account/company/cargo/new' },
  { to: '/account/company/cargo?tab=listings', label: 'بارهای من', icon: Archive, match: (path: string, tab: string | null) => path === '/account/company/cargo' && tab === 'listings' },
  { to: '/account/company/drivers', label: 'رانندگان', icon: Users, match: (path: string) => path === '/account/company/drivers' },
  { to: '/account/company/channels', label: 'کانال‌ها', icon: Link2, match: (path: string) => path === '/account/company/channels' },
  { to: '/account/company/profile', label: 'پروفایل', icon: Building2, match: (path: string) => path === '/account/company/profile' },
];

const fa = (value: number) => value.toLocaleString('fa-IR');

// Frame for company pages: brand bar plus an icon-over-label menu (the mobile tab-bar pattern, kept at the top).
export default function CompanyShell({ children, unread }: { children: ReactNode; unread?: number }) {
  const name = displayName(useProfile());
  const { pathname, search } = useLocation();
  const tab = new URLSearchParams(search).get('tab');
  return (
    <div dir="rtl" lang="fa" className="tw-min-h-screen tw-bg-brand-bg tw-text-brand-navy">
      <header className="tw-sticky tw-top-0 tw-z-20 tw-border-b tw-border-brand-line tw-bg-white/95 tw-backdrop-blur">
        <div className="tw-mx-auto tw-flex tw-h-16 tw-max-w-5xl tw-items-center tw-justify-between tw-gap-4 tw-px-4 sm:tw-px-6">
          <div className="tw-min-w-0">
            <div className="tw-flex tw-min-w-0 tw-items-center tw-gap-2">
              <strong className="tw-truncate tw-text-lg tw-font-bold tw-leading-none">{name || 'پنل شرکت'}</strong>
              {name && <span className="tw-shrink-0 tw-rounded-full tw-bg-brand-orange-soft tw-px-2.5 tw-py-0.5 tw-text-xs tw-font-medium tw-text-brand-orange-ink">شرکت</span>}
            </div>
          </div>
          <div className="tw-flex tw-items-center tw-gap-1.5">
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
          </div>
        </div>
        <nav aria-label="منوی شرکت" className="tw-mx-auto tw-grid tw-max-w-5xl tw-grid-cols-7 tw-px-1 sm:tw-flex sm:tw-justify-start sm:tw-gap-2 sm:tw-px-4">
          {items.map(({ to, label, icon: Icon, match }) => {
            const active = match(pathname, tab);
            return (
              <Link
                key={to}
                to={to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'tw-relative tw-flex tw-flex-col tw-items-center tw-gap-1 tw-whitespace-nowrap tw-px-1 tw-pb-2.5 tw-pt-1 tw-text-xs tw-transition-colors sm:tw-px-4',
                  active ? 'tw-font-bold tw-text-brand-orange' : 'tw-text-brand-navy/70 hover:tw-text-brand-navy',
                )}
              >
                <Icon size={22} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                {label}
                <span
                  aria-hidden
                  className={cn(
                    'tw-absolute tw-inset-x-4 tw-bottom-0 tw-h-[3px] tw-rounded-t-full tw-transition-colors',
                    active ? 'tw-bg-brand-orange' : 'tw-bg-transparent',
                  )}
                />
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="tw-mx-auto tw-max-w-5xl tw-px-4 tw-pb-16 tw-pt-6 sm:tw-px-6">
        <MarketTicker />
        {children}
      </main>
    </div>
  );
}
