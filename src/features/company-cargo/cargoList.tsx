import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { RotateCcw, TriangleAlert, type LucideIcon } from 'lucide-react';
import { useAuth } from 'src/core/auth/AuthContext';
import { useDomainRefresh } from 'src/features/ai-agent/hooks/Usedomainrefres';
import Spinner from 'src/shared/components/spinner/Spinner';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { driversOfLoad, getSummary, type CargoSummary, type Page, type TripType } from './api';
import { CARGO_CHANGED_EVENT, errorMessage } from './cargoText';
import { useNotificationEvent } from './notificationSocket';
import { CardSkeleton, EmptyState, IconButton, LoadFailed, Pager } from './components';

// Shared by the company's cargo pages: «پیشنهادها» (CompanyCargo) and «بارهای منتشرشده» (CompanyPublished).

// Loads a page whenever `deps` change; `reload` forces a refetch.
export function usePage<T>(load: () => Promise<Page<T>>, deps: unknown[]) {
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

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="tw-flex tw-items-center tw-gap-3 tw-rounded-2xl tw-border tw-border-red-200 tw-bg-red-50 tw-p-4 tw-text-sm tw-text-red-800">
      <TriangleAlert size={20} aria-hidden />
      <span className="tw-flex-1">{message}</span>
      {onRetry && <IconButton icon={RotateCcw} label="تلاش مجدد" onClick={onRetry} />}
    </div>
  );
}

export function ListBody<T>({
  state,
  empty,
  render,
  onPage,
}: {
  state: { data: Page<T> | null; loading: boolean; error: string; reload: () => void };
  empty: { icon: LucideIcon; title: string; hint: string };
  render: (item: T) => JSX.Element;
  onPage: (page: number) => void;
}) {
  if (state.loading)
    return (
      <div className="tw-grid tw-grid-cols-1 tw-gap-4 md:tw-grid-cols-2" role="status" aria-label="در حال دریافت بارها">
        {[0, 1, 2, 3].map((i) => <CardSkeleton key={i} />)}
      </div>
    );
  if (state.error) return <LoadFailed onRetry={state.reload} />;
  if (!state.data?.items.length) return <EmptyState {...empty} />;
  return (
    <>
      <ul className="tw-m-0 tw-grid tw-grid-cols-1 tw-list-none tw-gap-4 tw-p-0 md:tw-grid-cols-2">{state.data.items.map(render)}</ul>
      <Pager page={state.data.page} total={state.data.total} pageSize={state.data.pageSize} onChange={onPage} />
    </>
  );
}


// After registering a load, CreateCargo navigates here with the recipient count in history state
// (or, for an Excel upload, the number of loads published).
export function useCreatedToast() {
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
          : `بار ثبت شد و برای ${recipients!.toLocaleString('fa-IR')} رانندهٔ ${tripType ? driversOfLoad(tripType) : ''} ارسال شد.`),
    );
    // Clearing the history state keeps the toast from repeating on refresh.
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
  }, [recipients, createdCount, pending, tripType, createdMessage, location.key, location.pathname, location.search, navigate, toast]);
}

/**
 * Header totals plus a key that remounts the lists: refreshed after a change made with the agent, by a
 * driver's answer (socket) or on the cargo cards in the agent chat.
 */
export function useCargoRefresh() {
  const [summary, setSummary] = useState<CargoSummary | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadSummary = useCallback(() => {
    getSummary()
      .then(setSummary)
      .catch(() => setSummary(null));
  }, []);
  useEffect(loadSummary, [loadSummary]);

  const reload = useCallback(() => {
    loadSummary();
    setRefreshKey((v) => v + 1);
  }, [loadSummary]);
  // ثبت/انتشار بار، «برداشته شد» یا خواندن پیشنهادها با agent: لیست‌ها و آمار همین‌جا بروز شوند
  useDomainRefresh(['company_my_cargo', 'company_create_cargo', 'company_suggested_cargo'], reload, 'account');
  // The driver confirmed or declined a load the company handed over, or the offer ran out.
  useNotificationEvent('cargo-request-changed', reload);
  // this company changed its phone or name (here or in a bot): its loads show the new ones
  useNotificationEvent('cargo-listing-contact', reload);
  // Same for changes made on the cargo cards in the agent chat (they call the API directly).
  useEffect(() => {
    window.addEventListener(CARGO_CHANGED_EVENT, reload);
    return () => window.removeEventListener(CARGO_CHANGED_EVENT, reload);
  }, [reload]);

  function refresh() {
    setRefreshing(true);
    reload();
    setTimeout(() => setRefreshing(false), 600);
  }
  return { summary, loadSummary, refreshKey, refresh, refreshing };
}

/** Only company accounts get in. */
export function CompanyOnly({ children }: { children: ReactNode }) {
  const { isAuth, isAuthDataLoading, userRoles } = useAuth();
  if (isAuthDataLoading) return <Spinner />;
  if (!isAuth) return <Navigate to="/auth/login" replace />;
  if (!userRoles.some((role) => role.name === 'COMPANY'))
    return (
      <div dir="rtl" className="tw-p-6">
        <ErrorBox message="این بخش فقط برای حساب شرکت حمل‌ونقل در دسترس است." />
      </div>
    );
  return <>{children}</>;
}

