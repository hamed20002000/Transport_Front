import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Archive,
  BellDot,
  CheckCheck,
  CircleCheck,
  CircleDot,
  Inbox,
  Layers,
  Mail,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  SquarePlus,
  TriangleAlert,
} from 'lucide-react';
import { useAuth } from 'src/core/auth/AuthContext';
import { useDomainRefresh } from 'src/features/ai-agent/hooks/Usedomainrefres';
import PageContainer from 'src/shared/components/container/PageContainer';
import Spinner from 'src/shared/components/spinner/Spinner';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import {
  announceListing,
  listUnannounced,
  getSummary,
  listMyListings,
  listSuggestions,
  markAllSuggestionsRead,
  tripTypeLabels,
  type CargoListing,
  type CargoSummary,
  type ListingStatus,
  type Page,
  type TripType,
} from './api';
import CompanyShell from './CompanyShell';
import { useListingToggle, useSuggestionActions } from './cargoActions';
import { ListingCard, SuggestionCard } from './cargoCards';
import AnnounceSettings from './AnnounceSettings';
import { CARGO_CHANGED_EVENT, errorMessage, statusLabels } from './cargoText';
import { useNotificationEvent } from './notificationSocket';
import {
  CardSkeleton,
  EmptyState,
  IconButton,
  Pager,
  LoadFailed,
  SectionTitle,
  Segmented,
  StatTile,
} from './components';


// Loads a page whenever `deps` change; `reload` forces a refetch.
function usePage<T>(load: () => Promise<Page<T>>, deps: unknown[]) {
  const toast = useToast();
  const [data, setData] = useState<Page<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    load()
      .then((page) => active && setData(page))
      .catch((e) => {
        if (!active) return;
        setError(errorMessage(e));
        toast.error(errorMessage(e));
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { data, setData, loading, error, reload };
}

function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="tw-flex tw-items-center tw-gap-3 tw-rounded-2xl tw-border tw-border-red-200 tw-bg-red-50 tw-p-4 tw-text-sm tw-text-red-800">
      <TriangleAlert size={20} aria-hidden />
      <span className="tw-flex-1">{message}</span>
      {onRetry && <IconButton icon={RotateCcw} label="تلاش مجدد" onClick={onRetry} />}
    </div>
  );
}

function ListBody<T>({
  state,
  empty,
  render,
  onPage,
}: {
  state: { data: Page<T> | null; loading: boolean; error: string; reload: () => void };
  empty: { icon: typeof Inbox; title: string; hint: string };
  render: (item: T) => JSX.Element;
  onPage: (page: number) => void;
}) {
  if (state.loading)
    return (
      <div className="tw-grid tw-gap-4 md:tw-grid-cols-2" role="status" aria-label="در حال دریافت بارها">
        {[0, 1, 2, 3].map((i) => <CardSkeleton key={i} />)}
      </div>
    );
  if (state.error) return <LoadFailed onRetry={state.reload} />;
  if (!state.data?.items.length) return <EmptyState {...empty} />;
  return (
    <>
      <ul className="tw-m-0 tw-grid tw-list-none tw-gap-4 tw-p-0 md:tw-grid-cols-2">{state.data.items.map(render)}</ul>
      <Pager page={state.data.page} total={state.data.total} pageSize={state.data.pageSize} onChange={onPage} />
    </>
  );
}


// The company's own loads that were registered but not announced: kept apart from the suggestions so the
// suggestion filters apply only to loads seen in the channels, and these are never lost.
function UnannouncedListings({ onChanged, version }: { onChanged: () => void; version: number }) {
  const toast = useToast();
  const [items, setItems] = useState<CargoListing[]>([]);
  const [announcingId, setAnnouncingId] = useState<string | null>(null);
  const reload = useCallback(() => {
    listUnannounced()
      .then(setItems)
      .catch(() => setItems([]));
  }, []);
  useEffect(reload, [reload, version]);
  const { toggle, savingId, dialog } = useListingToggle({
    // «برداشته شد» from here: it is no longer waiting to be announced
    update: () => reload(),
    onChanged,
  });

  async function announce(listing: CargoListing) {
    setAnnouncingId(listing.id);
    try {
      const announced = await announceListing(listing.id);
      setItems((current) => current.filter((row) => row.id !== listing.id));
      onChanged();
      toast.success(`بار ${listing.code} برای ${announced.recipients.toLocaleString('fa-IR')} رانندهٔ ${tripTypeLabels[listing.tripType]} اعلام شد و به «بارهای من» رفت.`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setAnnouncingId(null);
    }
  }

  if (!items.length) return null;
  return (
    <section className="tw-space-y-3" aria-label="بارهای من که اعلام نشده‌اند">
      <SectionTitle
        title={`بارهای من که اعلام نشده‌اند (${items.length.toLocaleString('fa-IR')})`}
        hint="ثبت شده‌اند ولی هنوز راننده‌ی مناسبی نبود (عضو شرکت شما، با همین نوع حمل و فیلتر جور)، یا در صف اعلام خودکارند"
      />
      {items.map((listing) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          saving={savingId === listing.id}
          disabled={!!savingId}
          onToggle={() => toggle(listing)}
          onAnnounce={() => announce(listing)}
          announcing={announcingId === listing.id}
        />
      ))}
      {dialog}
    </section>
  );
}

function Suggestions({ onChanged }: { onChanged: () => void }) {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const toast = useToast();
  const state = usePage(() => listSuggestions(page, filter === 'unread'), [page, filter]);
  // a load registered or announced elsewhere (the form, the assistant, a bot) changes the unannounced list too
  const [unannouncedVersion, setUnannouncedVersion] = useState(0);
  const actions = useSuggestionActions({
    update: (item) => state.setData((current) => current && { ...current, items: current.items.map((row) => (row.id === item.id ? item : row)) }),
    onChanged,
  });
  useNotificationEvent('cargo-listing-changed', () => setUnannouncedVersion((value) => value + 1));

  // بار جدید از سوکت (NotificationsGateway) -- لیست و شمارنده‌ها همان لحظه به‌روز
  // می‌شوند، بدون رفرش صفحه.
  useNotificationEvent<{ kind: 'suggestion' | 'listing' }>('cargo-notification', (event) => {
    if (event.kind !== 'suggestion') return;
    toast.info('بار جدیدی در کانال‌های شما دیده شد.');
    state.reload();
    onChanged();
  });

  async function markAll() {
    try {
      await markAllSuggestionsRead();
      state.reload();
      onChanged();
      toast.success('همهٔ بارها خوانده‌شده علامت خوردند.');
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <div className="tw-space-y-8">
      <UnannouncedListings onChanged={onChanged} version={unannouncedVersion} />
      <section className="tw-space-y-4" aria-label="بارهای پیشنهادی">
        <SectionTitle
          title="بارهای پیشنهادی"
          hint="بارهایی که در کانال‌های شما دیده شده‌اند"
          side={
            <div className="tw-flex tw-items-center tw-gap-2">
              <Segmented
                label="فیلتر"
                value={filter}
                onChange={(value) => {
                  setFilter(value);
                  setPage(1);
                }}
                options={[
                  { value: 'all', label: 'همه', icon: Layers },
                  { value: 'unread', label: 'خوانده‌نشده', icon: Mail },
                ]}
              />
              <IconButton icon={CheckCheck} label="همه خوانده شد" onClick={markAll} />
              <Link
                to="/account/company/filters"
                title="تنظیمات نمایش بار"
                aria-label="تنظیمات نمایش بار"
                className="tw-inline-flex tw-h-10 tw-w-10 tw-items-center tw-justify-center tw-rounded-full tw-border tw-border-brand-line tw-bg-white tw-text-brand-navy tw-shadow-sm tw-transition-colors hover:tw-border-brand-orange hover:tw-text-brand-orange"
              >
                <SlidersHorizontal size={18} aria-hidden />
              </Link>
            </div>
          }
        />
        <ListBody
          state={state}
          onPage={setPage}
          empty={{
            icon: Inbox,
            title: filter === 'unread' ? 'پیام خوانده‌نشده‌ای ندارید' : 'هنوز باری پیشنهاد نشده',
            hint: 'بارهایی که در کانال‌های ثبت‌شدهٔ شما دیده شوند و با فیلترهایتان جور باشند، اینجا نمایش داده می‌شوند.',
          }}
          render={(item) => <SuggestionCard key={item.id} item={item} onRead={() => actions.markRead(item)} onAnnounce={() => actions.announce(item)} />}
        />
        {actions.dialog}
      </section>
    </div>
  );
}

function MyListings({ onChanged }: { onChanged: () => void }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ListingStatus | 'ALL'>('ALL');
  const state = usePage(() => listMyListings(page, status === 'ALL' ? undefined : status), [page, status]);
  const { toggle, savingId, dialog } = useListingToggle({
    update: (updated) => state.setData((current) => current && { ...current, items: current.items.map((row) => (row.id === updated.id ? updated : row)) }),
    onChanged,
  });
  const toast = useToast();
  const [announcingId, setAnnouncingId] = useState<string | null>(null);

  async function announce(listing: CargoListing) {
    setAnnouncingId(listing.id);
    try {
      const announced = await announceListing(listing.id);
      state.setData((current) => current && { ...current, items: current.items.map((row) => (row.id === listing.id ? { ...row, announcedAt: announced.announcedAt } : row)) });
      toast.success(`بار ${listing.code} برای ${announced.recipients.toLocaleString('fa-IR')} رانندهٔ ${tripTypeLabels[listing.tripType]} اعلام شد.`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setAnnouncingId(null);
    }
  }

  return (
    <section className="tw-space-y-4" aria-label="بارهای من">
      <SectionTitle
        title="بارهای من"
        hint="بارهایی که برای راننده‌ها منتشر کرده‌اید"
        side={
          <Segmented
            label="وضعیت"
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            options={[
              { value: 'ALL', label: 'همه', icon: Layers },
              { value: 'OPEN', label: statusLabels.OPEN, icon: CircleDot },
              { value: 'TAKEN', label: statusLabels.TAKEN, icon: CircleCheck },
            ]}
          />
        }
      />
      <ListBody
        state={state}
        onPage={setPage}
        empty={{
          icon: Archive,
          title: 'باری منتشر نکرده‌اید',
          hint: 'بارهایی که برای راننده‌ها منتشر کنید اینجا می‌آیند و می‌توانید وضعیتشان را مدیریت کنید.',
        }}
        render={(listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            saving={savingId === listing.id}
            disabled={!!savingId}
            onToggle={() => toggle(listing)}
            onAnnounce={() => announce(listing)}
            announcing={announcingId === listing.id}
          />
        )}
      />
      {dialog}
    </section>
  );
}

// After registering a load, CreateCargo navigates here with the recipient count in history state
// (or, for an Excel upload, the number of loads published).
function useCreatedToast() {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const shownFor = useRef('');
  const { createdRecipients: recipients, createdCount, createdPending: pending, createdTripType: tripType, createdMessage } =
    (location.state as { createdRecipients?: number; createdCount?: number; createdPending?: boolean; createdTripType?: TripType; createdMessage?: string } | null) ?? {};
  useEffect(() => {
    // The ref keeps StrictMode's double effect from showing it twice.
    if ((recipients === undefined && createdCount === undefined) || shownFor.current === location.key) return;
    shownFor.current = location.key;
    const count = createdCount !== undefined ? `${createdCount.toLocaleString('fa-IR')} بار از فایل اکسل` : 'بار';
    toast.success(
      createdMessage ?? (pending
        ? `${count} ثبت شد و در نوبت بعدی اعلام خودکار برای راننده‌ها فرستاده می‌شود.`
        : createdCount !== undefined
          ? `${count} ثبت و برای راننده‌های هر نوع اعلام شد.`
          : `بار ثبت شد و برای ${recipients!.toLocaleString('fa-IR')} رانندهٔ ${tripType ? tripTypeLabels[tripType] : ''} ارسال شد.`),
    );
    // Clearing the history state keeps the toast from repeating on refresh.
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
  }, [recipients, createdCount, pending, tripType, createdMessage, location.key, location.pathname, location.search, navigate, toast]);
}

function CargoContent() {
  useCreatedToast();
  const [params] = useSearchParams();
  const tab = params.get('tab') === 'listings' ? 'listings' : 'suggestions';
  const [summary, setSummary] = useState<CargoSummary | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadSummary = useCallback(() => {
    getSummary()
      .then(setSummary)
      .catch(() => setSummary(null));
  }, []);
  useEffect(loadSummary, [loadSummary]);

  // ثبت/انتشار بار، «برداشته شد» یا خواندن پیشنهادها با agent: لیست‌ها و آمار همین‌جا بروز شوند
  useDomainRefresh(
    ['company_my_cargo', 'company_create_cargo', 'company_suggested_cargo'],
    () => {
      loadSummary();
      setRefreshKey((v) => v + 1);
    },
    'account',
  );
  // The driver confirmed or declined a load the company handed over, or the offer ran out.
  useNotificationEvent('cargo-request-changed', () => {
    loadSummary();
    setRefreshKey((v) => v + 1);
  });
  // Same for changes made on the cargo cards in the agent chat (they call the API directly).
  useEffect(() => {
    const reload = () => {
      loadSummary();
      setRefreshKey((v) => v + 1);
    };
    window.addEventListener(CARGO_CHANGED_EVENT, reload);
    return () => window.removeEventListener(CARGO_CHANGED_EVENT, reload);
  }, [loadSummary]);

  function refresh() {
    setRefreshing(true);
    loadSummary();
    setRefreshKey((v) => v + 1);
    setTimeout(() => setRefreshing(false), 600);
  }

  return (
    <PageContainer title="لیست بارها | ترابوت" description="بارهای پیشنهادی و منتشرشده شرکت">
      <CompanyShell unread={summary?.unread}>
        <div className="tw-space-y-8">
          <div className="tw-flex tw-items-end tw-justify-between tw-gap-4">
            <div>
              <p className="tw-text-sm tw-font-bold tw-text-brand-orange-ink">سامانه هوشمند بار</p>
              <h1 className="tw-mt-1 tw-text-2xl tw-font-bold sm:tw-text-3xl">مدیریت بارهای شرکت</h1>
              <p className="tw-mt-2 tw-text-sm tw-text-brand-muted">بارهای تازهٔ کانال‌ها را ببینید و وضعیت بارهای منتشرشده را مدیریت کنید</p>
            </div>
            <div className="tw-flex tw-shrink-0 tw-items-center tw-gap-2">
              <IconButton icon={RefreshCw} label="به‌روزرسانی" onClick={refresh} spinning={refreshing} />
              <Link
                to="/account/company/cargo/new"
                className="tw-inline-flex tw-h-10 tw-items-center tw-gap-1.5 tw-rounded-xl tw-bg-brand-orange tw-px-4 tw-text-sm tw-font-bold tw-text-white tw-shadow-sm hover:tw-bg-brand-orange-dark"
              >
                <SquarePlus size={18} aria-hidden />
                ثبت بار
              </Link>
            </div>
          </div>

          <div className="tw-grid tw-grid-cols-2 tw-gap-3 md:tw-grid-cols-4">
            <StatTile icon={Inbox} label="بار پیشنهادی" value={summary?.suggestions} />
            <StatTile icon={BellDot} label="خوانده‌نشده" value={summary?.unread} accent />
            <StatTile icon={CircleDot} label="منتشرشدهٔ باز" value={summary?.open} />
            <StatTile icon={CircleCheck} label="برداشته‌شده" value={summary?.taken} />
          </div>

          {tab === 'suggestions' ? (
            <>
              {/* اعلام خودکار پیشنهادهای کانال‌ها؛ «بارهای من» فقط بارهای اعلام‌شده است */}
              <AnnounceSettings />
              <Suggestions key={`s${refreshKey}`} onChanged={loadSummary} />
            </>
          ) : (
            <MyListings key={`l${refreshKey}`} onChanged={loadSummary} />
          )}
        </div>
      </CompanyShell>
    </PageContainer>
  );
}

export default function CompanyCargo() {
  const { isAuth, isAuthDataLoading, userRoles } = useAuth();
  if (isAuthDataLoading) return <Spinner />;
  if (!isAuth) return <Navigate to="/auth/login" replace />;
  if (!userRoles.some((role) => role.name === 'COMPANY'))
    return (
      <div dir="rtl" className="tw-p-6">
        <ErrorBox message="این بخش فقط برای حساب شرکت در دسترس است." />
      </div>
    );
  return <CargoContent />;
}
