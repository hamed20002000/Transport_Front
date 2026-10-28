import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { CheckCircle2, Clock, Inbox, Package, Scale, Truck, XCircle } from 'lucide-react';
import { useAuth } from 'src/core/auth/AuthContext';
import PageContainer from 'src/shared/components/container/PageContainer';
import Spinner from 'src/shared/components/spinner/Spinner';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { decideCompanyRequest, listCompanyRequests, type CompanyRequest, type Page } from './api';
import { DriverPhoto } from './AssignDriverDialog';
import { errorMessage } from './cargoText';
import CompanyShell from './CompanyShell';
import { CardSkeleton, CargoCode, EmptyState, LoadFailed, Pager, PhoneLinks, PrimaryButton, RouteLine, SecondaryButton, SectionTitle, Spec, timeAgo } from './components';
import { useNotificationEvent } from './notificationSocket';
import { useMessageBox } from 'src/shared/components/message-box/MessageBoxProvider';
import AccountCode from 'src/shared/components/account-code/AccountCode';

const PAGE_SIZE = 20;

// One driver's request: the load, who the driver is (name, vehicle, photo, phone) and «قبول» / «رد».
function RequestCard({ request, busy, onDecide }: { request: CompanyRequest; busy: boolean; onDecide: (accept: boolean) => void }) {
  const { cargo, driver } = request;
  return (
    <li className="tw-space-y-3 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-4 tw-shadow-sm">
      <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-2">
        <CargoCode code={cargo?.code} />
        <span className="tw-inline-flex tw-items-center tw-gap-1 tw-text-xs tw-text-brand-muted">
          <Clock size={13} aria-hidden /> درخواست {timeAgo(request.requestedAt)}
        </span>
      </div>

      <RouteLine origin={cargo?.origin} destination={cargo?.destination} />
      <div className="tw-flex tw-flex-wrap tw-gap-2">
        <Spec icon={Package} label="نوع بار" value={cargo?.cargoType} />
        <Spec icon={Scale} label="وزن" value={cargo?.weight} />
        <Spec icon={Truck} label="نوع خودرو" value={cargo?.vehicleType} />
      </div>

      {driver && (
        <div className="tw-flex tw-items-start tw-gap-3 tw-rounded-xl tw-bg-brand-sky/50 tw-p-3">
          <DriverPhoto driver={driver} />
          <div className="tw-min-w-0 tw-flex-1 tw-space-y-1">
            <p className="tw-m-0 tw-font-bold">
              {driver.name}
              <AccountCode code={driver.accountCode} className="tw-mr-1.5 tw-align-middle" />
              {driver.broker && <span className="tw-mr-1.5 tw-inline-flex tw-items-center tw-rounded-full tw-bg-brand-orange-soft tw-px-2 tw-py-0.5 tw-align-middle tw-text-[11px] tw-font-medium tw-text-brand-orange-ink">واسط</span>}
            </p>
            <p className="tw-m-0 tw-text-xs tw-text-brand-muted">
              {[driver.vehicleType, driver.vehicleModel, driver.capacityTons ? `${driver.capacityTons.toLocaleString('fa-IR')} تن` : null, driver.homeCity]
                .filter(Boolean)
                .join(' · ')}
            </p>
            {driver.plate && <span className="tw-rounded tw-bg-white tw-px-1.5 tw-text-xs">{driver.plate}</span>}
            {driver.mobile && <PhoneLinks phones={[driver.mobile]} />}
          </div>
        </div>
      )}

      <div className="tw-flex tw-flex-wrap tw-justify-end tw-gap-2 tw-border-t tw-border-brand-line tw-pt-3">
        <SecondaryButton onClick={() => onDecide(false)} disabled={busy}>
          <XCircle size={16} aria-hidden /> رد
        </SecondaryButton>
        <PrimaryButton onClick={() => onDecide(true)} disabled={busy}>
          <CheckCircle2 size={16} aria-hidden /> {busy ? 'در حال ثبت…' : 'قبول'}
        </PrimaryButton>
      </div>
    </li>
  );
}

function Requests() {
  const toast = useToast();
  const messageBox = useMessageBox();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page<CompanyRequest> | null>(null);
  const [failed, setFailed] = useState(false);
  const [version, setVersion] = useState(0);
  const [busyId, setBusyId] = useState('');

  useEffect(() => {
    let active = true;
    setFailed(false);
    listCompanyRequests(page)
      .then((result) => active && setData(result))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [page, version]);

  // a new request, or one answered from a bot or another page
  useNotificationEvent('cargo-request-changed', () => setVersion((value) => value + 1));
  // a driver on this page changed name, phone or vehicle: only then is the page fetched again
  useNotificationEvent<{ userId: string }>('drivers-changed', ({ userId }) => {
    if (data?.items.some((request) => request.driver?.userId === userId)) setVersion((value) => value + 1);
  });

  async function decide(request: CompanyRequest, accept: boolean) {
    const route = request.cargo ? `${request.cargo.origin} به ${request.cargo.destination}` : 'این بار';
    const question = accept
      ? `درخواست ${request.driver?.name ?? 'راننده'} برای بار ${route} قبول شود؟ بار «برداشته شد» می‌شود، سفر راننده شروع می‌شود و درخواست بقیه رد می‌شود.`
      : `درخواست ${request.driver?.name ?? 'راننده'} برای بار ${route} رد شود؟ راننده خبردار می‌شود.`;
    if (!(await messageBox.confirm({ title: accept ? 'قبول درخواست' : 'رد درخواست', message: question, tone: accept ? 'primary' : 'danger', confirmText: accept ? 'قبول' : 'رد درخواست' }))) return;
    setBusyId(request.requestId);
    try {
      await decideCompanyRequest(request.requestId, accept ? 'accept' : 'reject');
      toast.success(accept ? 'قبول شد؛ بار برداشته شد و سفر راننده شروع شد.' : 'درخواست رد شد و به راننده خبر دادیم.');
      setVersion((value) => value + 1);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="tw-space-y-5">
      <SectionTitle title="درخواست رانندگان" hint="راننده‌هایی که برای بارهای شما درخواست داده‌اند؛ اول‌آمده اول. با «قبول» بار برداشته می‌شود و سفر راننده شروع می‌شود." />
      {failed ? (
        <LoadFailed onRetry={() => setVersion((value) => value + 1)} />
      ) : !data ? (
        <div className="tw-space-y-3">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : !data.items.length ? (
        <EmptyState icon={Inbox} title="درخواست تازه‌ای ندارید" hint="وقتی راننده‌ای برای یکی از بارهای اعلام‌شده‌ی شما درخواست بدهد، اینجا می‌آید و خبرتان می‌کنیم." />
      ) : (
        <>
          <ul className="tw-m-0 tw-grid tw-grid-cols-1 tw-list-none tw-gap-3 tw-p-0 md:tw-grid-cols-2">
            {data.items.map((request) => (
              <RequestCard key={request.requestId} request={request} busy={busyId === request.requestId} onDecide={(accept) => void decide(request, accept)} />
            ))}
          </ul>
          <Pager page={page} total={data.total} pageSize={PAGE_SIZE} onChange={setPage} />
        </>
      )}
    </div>
  );
}

export default function CompanyRequests() {
  const { isAuth, isAuthDataLoading, userRoles } = useAuth();
  if (isAuthDataLoading) return <Spinner />;
  if (!isAuth) return <Navigate to="/auth/login" replace />;
  if (!userRoles.some((role) => role.name === 'COMPANY')) return <Navigate to="/account/company" replace />;
  return (
    <PageContainer title="درخواست رانندگان | ترابوت" description="درخواست رانندگان برای بارهای شرکت">
      <CompanyShell>
        <Requests />
      </CompanyShell>
    </PageContainer>
  );
}
