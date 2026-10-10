import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BellDot,
  ChevronLeft,
  CircleCheckBig,
  Hourglass,
  PackageSearch,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from 'src/core/auth/AuthContext';
import { CardSkeleton, EmptyState, SectionTitle, StatTile } from 'src/features/company-cargo/components';
import { displayName, useProfile } from 'src/features/company-cargo/profileStore';
import { listActiveTrips, listLoads, listMyRequests, unreadLoadCount, type CargoRequest } from './api';
import { Hero, useAsync } from './components';
import { LoadCard, patchPage, useLoadActions, useLoadStatusEvents } from './DriverLoads';
import { useLoadsChangedEvent } from './loadEvents';
import DriverShell from './DriverShell';
import { TripCard } from './DriverTrip';
import LocationCard from './LocationCard';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 5) return 'شب بخیر';
  if (hour < 12) return 'صبح بخیر';
  if (hour < 17) return 'روز بخیر';
  return 'عصر بخیر';
}

async function loadSummary() {
  const [matching, unread, requests] = await Promise.all([
    listLoads({ page: 1, pageSize: 1, matchFilters: true }).then((page) => page.total),
    unreadLoadCount(),
    listMyRequests(1, 50),
  ]);
  const count = (status: CargoRequest['status']) => requests.items.filter((r) => r.status === status).length;
  return { matching, unread, pending: count('PENDING'), delivered: count('DELIVERED') };
}

const shortcuts: Array<{ to: string; title: string; hint: string; icon: LucideIcon }> = [
  { to: '/account/driver/loads', title: 'پیدا کردن بار', hint: 'جستجو بر اساس مبدأ و مقصد', icon: PackageSearch },
  { to: '/account/driver/filters', title: 'تنظیمات نمایش بار', hint: 'مسیر، خودرو و کرایه دلخواه', icon: SlidersHorizontal },
  { to: '/account/driver/profile', title: 'پروفایل', hint: 'نام و شماره تماس برای شرکت‌ها', icon: UserRound },
];

function HomeContent() {
  const { username } = useAuth();
  const name = displayName(useProfile());
  const summary = useAsync(loadSummary, []);
  const trips = useAsync(listActiveTrips, []);
  const latest = useAsync(() => listLoads({ page: 1, pageSize: 4, matchFilters: true }), []);
  const update = patchPage(latest.setData);
  useLoadsChangedEvent(latest.reload);
  const actions = useLoadActions(update);
  useLoadStatusEvents(update, latest.data?.items, latest.reload);

  const activeTrips = trips.data ?? [];
  const today = new Date().toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="tw-space-y-8">
      {activeTrips.length ? (
        <div className="tw-space-y-3">
          <p className="tw-m-0 tw-text-sm tw-text-brand-muted">
            {greeting()}، <bdi className="tw-font-bold tw-text-brand-navy">{name || username}</bdi> · {today}
          </p>
          {activeTrips.map((trip) => (
            <TripCard key={trip.id} trip={trip} onDelivered={() => trips.reload()} />
          ))}
        </div>
      ) : (
        <Hero>
          <div className="tw-flex tw-flex-wrap tw-items-end tw-justify-between tw-gap-6">
            <div className="tw-space-y-2">
              <p className="tw-m-0 tw-text-sm tw-text-white/60">{today}</p>
              <h1 className="tw-m-0 tw-text-2xl tw-font-bold sm:tw-text-3xl">
                {greeting()}، <bdi>{name || username}</bdi>
              </h1>
              <p className="tw-m-0 tw-max-w-md tw-text-sm tw-leading-7 tw-text-white/75">
                {summary.data?.matching
                  ? `${summary.data.matching.toLocaleString('fa-IR')} بار باز مطابق فیلترهای شما منتظر راننده است.`
                  : 'بارهای تازه شرکت‌ها را ببینید، مسیر و کرایه را بسنجید و با یک دکمه درخواست بدهید.'}
              </p>
            </div>
            <Link
              to="/account/driver/loads"
              className="tw-inline-flex tw-items-center tw-gap-2 tw-rounded-xl tw-bg-brand-orange tw-px-5 tw-py-3 tw-text-sm tw-font-bold tw-text-white tw-shadow-lg tw-shadow-brand-orange/30 hover:tw-bg-brand-orange-dark"
            >
              <PackageSearch size={18} aria-hidden /> پیدا کردن بار <ArrowLeft size={16} aria-hidden />
            </Link>
          </div>
        </Hero>
      )}

      <div className="tw-grid tw-grid-cols-2 tw-gap-3 md:tw-grid-cols-4">
        <StatTile icon={Sparkles} label="بار باز مطابق فیلتر" value={summary.data?.matching} accent />
        <StatTile icon={BellDot} label="بار تازه خوانده‌نشده" value={summary.data?.unread} />
        <StatTile icon={Hourglass} label="درخواست در انتظار" value={summary.data?.pending} />
        <StatTile icon={CircleCheckBig} label="بار تحویل‌شده" value={summary.data?.delivered} />
      </div>

      <div className="tw-grid tw-gap-4 lg:tw-grid-cols-[1.3fr_1fr]">
        <LocationCard onSent={latest.reload} />
        <nav aria-label="میانبرها" className="tw-grid tw-gap-2">
          {shortcuts.map(({ to, title, hint, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="tw-group tw-flex tw-items-center tw-gap-3 tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-p-3 tw-shadow-sm tw-transition-colors hover:tw-border-brand-orange/50"
            >
              <span className="tw-flex tw-h-10 tw-w-10 tw-items-center tw-justify-center tw-rounded-lg tw-bg-brand-sky tw-text-brand-navy tw-transition-colors group-hover:tw-bg-brand-orange group-hover:tw-text-white">
                <Icon size={19} aria-hidden />
              </span>
              <span className="tw-min-w-0 tw-flex-1">
                <strong className="tw-block tw-truncate tw-text-sm">{title}</strong>
                <span className="tw-block tw-truncate tw-text-xs tw-text-brand-muted">{hint}</span>
              </span>
              <ChevronLeft size={16} aria-hidden className="tw-text-brand-line group-hover:tw-text-brand-orange" />
            </Link>
          ))}
        </nav>
      </div>

      <section className="tw-space-y-4" aria-label="تازه‌ترین بارها">
        <SectionTitle
          title="تازه‌ترین بارهای مناسب شما"
          hint="بر اساس فیلترهای نمایش بار"
          side={
            <Link to="/account/driver/loads" className="tw-inline-flex tw-items-center tw-gap-1 tw-text-sm tw-font-bold tw-text-brand-orange-ink hover:tw-text-brand-orange">
              همه بارها <ChevronLeft size={16} aria-hidden />
            </Link>
          }
        />
        {latest.loading && !latest.data ? (
          <div className="tw-grid tw-gap-4 md:tw-grid-cols-2">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : !latest.data?.items.length ? (
          <EmptyState icon={PackageSearch} title="فعلاً بار مناسبی نیست" hint="به محض اعلام بار تازه، خبرتان می‌کنیم. می‌توانید فیلترهای نمایش بار را بازتر کنید." />
        ) : (
          <ul className="tw-m-0 tw-grid tw-list-none tw-gap-4 tw-p-0 md:tw-grid-cols-2">
            {latest.data.items.map((load) => (
              <LoadCard
                key={load.id}
                load={load}
                requesting={actions.requestingId === load.id}
                onDetails={() => actions.openDetails(load)}
                onRequest={() => actions.request(load)}
                onAnswered={(request) => update(load.id, { myRequest: { id: request.id, status: request.status } })}
              />
            ))}
          </ul>
        )}
      </section>
      {actions.dialog}
    </div>
  );
}

export default function DriverHome() {
  return (
    <DriverShell title="پنل راننده">
      <HomeContent />
    </DriverShell>
  );
}
