import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  Archive,
  Banknote,
  BellDot,
  CheckCheck,
  CircleCheck,
  CircleDot,
  Clock,
  FileText,
  Inbox,
  Layers,
  Mail,
  Package,
  PackageCheck,
  Phone,
  RefreshCw,
  RotateCcw,
  Send,
  SquarePlus,
  TriangleAlert,
  Truck,
  Weight,
} from 'lucide-react';
import { useAuth } from 'src/core/auth/AuthContext';
import PageContainer from 'src/shared/components/container/PageContainer';
import Spinner from 'src/shared/components/spinner/Spinner';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { cn } from 'src/shared/utils/utils';
import {
  getSummary,
  listMyListings,
  listSuggestions,
  markAllSuggestionsRead,
  markSuggestionRead,
  setListingStatus,
  type CargoListing,
  type CargoSuggestion,
  type CargoSummary,
  type ListingStatus,
  type Page,
} from './api';
import CompanyShell from './CompanyShell';
import { useNotificationEvent } from './notificationSocket';
import {
  Badge,
  CardSkeleton,
  EmptyState,
  IconButton,
  Pager,
  PrimaryButton,
  RouteLine,
  SecondaryButton,
  SectionTitle,
  Segmented,
  Spec,
  StatTile,
  formatDate,
  timeAgo,
} from './components';

const statusLabels: Record<ListingStatus, string> = { OPEN: 'باز', TAKEN: 'برداشته شد' };

function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'ارتباط با سرور برقرار نشد. اتصال را بررسی و دوباره تلاش کنید.';
    if (error.response.status === 401) return 'نشست شما منقضی شده است. دوباره وارد شوید.';
    if (error.response.status === 404) return 'بار پیدا نشد.';
    return `خطای سرور (${error.response.status}). دوباره تلاش کنید.`;
  }
  return error instanceof Error ? error.message : 'عملیات انجام نشد.';
}

// Loads a page whenever `deps` change; `reload` forces a refetch.
function usePage<T>(load: () => Promise<Page<T>>, deps: unknown[]) {
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
      .catch((e) => active && setError(errorMessage(e)))
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
  if (state.error) return <ErrorBox message={state.error} onRetry={state.reload} />;
  if (!state.data?.items.length) return <EmptyState {...empty} />;
  return (
    <>
      <ul className="tw-m-0 tw-grid tw-list-none tw-gap-4 tw-p-0 md:tw-grid-cols-2">{state.data.items.map(render)}</ul>
      <Pager page={state.data.page} total={state.data.total} pageSize={state.data.pageSize} onChange={onPage} />
    </>
  );
}

// Card layout from the design: tinted header strip, route, spec chips, action footer.
function CargoCard({
  highlighted,
  head,
  route,
  specs,
  notes,
  extra,
  footer,
}: {
  highlighted?: boolean;
  head: JSX.Element;
  route: JSX.Element;
  specs: JSX.Element;
  notes?: string | null;
  extra?: JSX.Element | false;
  footer: JSX.Element;
}) {
  return (
    <li
      className={cn(
        'tw-flex tw-flex-col tw-overflow-hidden tw-rounded-2xl tw-border tw-bg-white tw-shadow-sm tw-transition-shadow hover:tw-shadow-md',
        highlighted ? 'tw-border-brand-orange/50' : 'tw-border-brand-line',
      )}
    >
      <div className={cn('tw-flex tw-items-center tw-justify-between tw-gap-2 tw-px-5 tw-py-3', highlighted ? 'tw-bg-brand-orange-soft/60' : 'tw-bg-brand-sky/60')}>
        {head}
      </div>
      <div className="tw-flex-1 tw-space-y-4 tw-p-5">
        {route}
        <div className="tw-flex tw-flex-wrap tw-gap-2">{specs}</div>
        {notes && <p className="tw-text-sm tw-leading-7 tw-text-brand-muted">{notes}</p>}
        {extra}
      </div>
      <div className="tw-flex tw-items-center tw-justify-between tw-gap-3 tw-border-t tw-border-brand-line tw-px-5 tw-py-3">{footer}</div>
    </li>
  );
}

function Specs({ cargoType, weight, vehicleType, price, priceHighlight = true }: { cargoType?: string | null; weight?: string | null; vehicleType?: string | null; price?: string | null; priceHighlight?: boolean }) {
  return (
    <>
      <Spec icon={Package} label="نوع بار" value={cargoType} />
      <Spec icon={Weight} label="وزن" value={weight} />
      <Spec icon={Truck} label="نوع خودرو" value={vehicleType} />
      <Spec icon={Banknote} label="کرایه" value={price} highlight={priceHighlight} />
    </>
  );
}

function SuggestionCard({ item, onRead }: { item: CargoSuggestion; onRead: () => void }) {
  const [open, setOpen] = useState(false);
  const { cargo } = item;
  const receivedAt = cargo.receivedAt || item.createdAt;
  return (
    <CargoCard
      highlighted={!item.isRead}
      head={
        <>
          <time dateTime={receivedAt} title={formatDate(receivedAt)} className="tw-inline-flex tw-items-center tw-gap-1.5 tw-text-xs tw-text-brand-muted">
            <Clock size={14} aria-hidden /> {timeAgo(receivedAt)}
          </time>
          <div className="tw-flex tw-gap-1.5">
            {!item.isRead && (
              <Badge tone="orange">
                <BellDot size={12} aria-hidden /> جدید
              </Badge>
            )}
            {item.published && (
              <Badge tone="sky">
                <Send size={12} aria-hidden /> منتشر شده · {statusLabels[item.published.status]}
              </Badge>
            )}
          </div>
        </>
      }
      route={<RouteLine origin={cargo.origin} destination={cargo.destination} />}
      specs={<Specs {...cargo} />}
      notes={cargo.extraNotes}
      extra={
        open && (
          <p className="tw-whitespace-pre-wrap tw-rounded-xl tw-bg-brand-bg tw-p-3 tw-text-sm tw-leading-7">{cargo.rawText || item.text}</p>
        )
      }
      footer={
        <>
          <SecondaryButton onClick={() => setOpen((v) => !v)}>
            <FileText size={16} aria-hidden /> {open ? 'بستن متن' : 'متن پیام'}
          </SecondaryButton>
          {!item.isRead && <IconButton icon={CheckCheck} label="علامت خوانده‌شده" onClick={onRead} />}
        </>
      }
    />
  );
}

function ListingCard({ listing, saving, disabled, onToggle }: { listing: CargoListing; saving: boolean; disabled: boolean; onToggle: () => void }) {
  const taken = listing.status === 'TAKEN';
  const ToggleIcon = saving ? RefreshCw : taken ? RotateCcw : PackageCheck;
  const toggleContent = (
    <>
      <ToggleIcon size={16} aria-hidden className={saving ? 'tw-animate-spin' : undefined} />
      {taken ? 'بازگرداندن' : 'برداشته شد'}
    </>
  );
  return (
    <CargoCard
      head={
        <>
          <span className="tw-inline-flex tw-items-center tw-gap-1.5 tw-text-xs tw-text-brand-muted" title={formatDate(listing.createdAt)}>
            <Send size={14} aria-hidden /> {timeAgo(listing.createdAt)}
          </span>
          <Badge tone={taken ? 'muted' : 'orange'}>
            {taken ? <CircleCheck size={12} aria-hidden /> : <CircleDot size={12} aria-hidden />}
            {statusLabels[listing.status]}
          </Badge>
        </>
      }
      route={<RouteLine origin={listing.origin} destination={listing.destination} />}
      specs={<Specs {...listing} priceHighlight={!taken} />}
      notes={listing.extraNotes}
      extra={
        !!listing.contactPhones.length && (
          <div className="tw-flex tw-flex-wrap tw-gap-2">
            {listing.contactPhones.map((phone) => (
              <a
                key={phone}
                href={`tel:${phone}`}
                dir="ltr"
                className="tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-full tw-border tw-border-brand-line tw-px-3 tw-py-1 tw-text-xs tw-font-medium hover:tw-border-brand-orange hover:tw-text-brand-orange"
              >
                <Phone size={13} aria-hidden /> {phone}
              </a>
            ))}
          </div>
        )
      }
      footer={
        <>
          <span className="tw-text-xs tw-text-brand-muted">{listing.takenAt ? `برداشته شد ${timeAgo(listing.takenAt)}` : 'در انتظار راننده'}</span>
          {taken ? (
            <SecondaryButton onClick={onToggle} disabled={disabled}>{toggleContent}</SecondaryButton>
          ) : (
            <PrimaryButton onClick={onToggle} disabled={disabled}>{toggleContent}</PrimaryButton>
          )}
        </>
      }
    />
  );
}

function Suggestions({ onChanged }: { onChanged: () => void }) {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const toast = useToast();
  const state = usePage(() => listSuggestions(page, filter === 'unread'), [page, filter]);

  // بار جدید از سوکت (NotificationsGateway) -- لیست و شمارنده‌ها همان لحظه به‌روز
  // می‌شوند، بدون رفرش صفحه.
  useNotificationEvent<{ kind: 'suggestion' | 'listing' }>('cargo-notification', (event) => {
    if (event.kind !== 'suggestion') return;
    toast.info('بار جدیدی در کانال‌های شما دیده شد.');
    state.reload();
    onChanged();
  });

  async function markRead(item: CargoSuggestion) {
    try {
      await markSuggestionRead(item.id);
      state.setData((current) => current && { ...current, items: current.items.map((row) => (row.id === item.id ? { ...row, isRead: true } : row)) });
      onChanged();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

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
        render={(item) => <SuggestionCard key={item.id} item={item} onRead={() => markRead(item)} />}
      />
    </section>
  );
}

function MyListings({ onChanged }: { onChanged: () => void }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ListingStatus | 'ALL'>('ALL');
  const [savingId, setSavingId] = useState('');
  const toast = useToast();
  const state = usePage(() => listMyListings(page, status === 'ALL' ? undefined : status), [page, status]);

  async function toggle(listing: CargoListing) {
    const next: ListingStatus = listing.status === 'OPEN' ? 'TAKEN' : 'OPEN';
    if (next === 'TAKEN' && !window.confirm('این بار «برداشته شد» اعلام شود؟ پیام راننده‌ها هم به‌روز می‌شود.')) return;
    setSavingId(listing.id);
    try {
      const updated = await setListingStatus(listing.id, next);
      state.setData((current) => current && { ...current, items: current.items.map((row) => (row.id === updated.id ? updated : row)) });
      toast.success(next === 'TAKEN' ? 'بار «برداشته شد» اعلام شد و پیام راننده‌ها به‌روز شد.' : 'بار دوباره باز شد.');
      onChanged();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSavingId('');
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
          <ListingCard key={listing.id} listing={listing} saving={savingId === listing.id} disabled={!!savingId} onToggle={() => toggle(listing)} />
        )}
      />
    </section>
  );
}

// After registering a load, CreateCargo navigates here with the recipient count in history state.
function useCreatedToast() {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const shownFor = useRef('');
  const recipients = (location.state as { createdRecipients?: number } | null)?.createdRecipients;
  useEffect(() => {
    // The ref keeps StrictMode's double effect from showing it twice.
    if (recipients === undefined || shownFor.current === location.key) return;
    shownFor.current = location.key;
    toast.success(`بار ثبت شد و برای ${recipients.toLocaleString('fa-IR')} راننده ارسال شد.`);
    // Clearing the history state keeps the toast from repeating on refresh.
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
  }, [recipients, location.key, location.pathname, location.search, navigate, toast]);
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

  function refresh() {
    setRefreshing(true);
    loadSummary();
    setRefreshKey((v) => v + 1);
    setTimeout(() => setRefreshing(false), 600);
  }

  return (
    <PageContainer title="لیست بارها | Setaş Transport" description="بارهای پیشنهادی و منتشرشده شرکت">
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
            <Suggestions key={`s${refreshKey}`} onChanged={loadSummary} />
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
