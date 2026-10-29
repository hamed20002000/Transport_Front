import { useCallback, useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { ClipboardList, Handshake, PackageSearch, Unlock, UserRound } from 'lucide-react';
import { useAuth } from 'src/core/auth/AuthContext';
import PushPrompt from 'src/shared/components/pwa/PushPrompt';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import PageContainer from 'src/shared/components/container/PageContainer';
import Spinner from 'src/shared/components/spinner/Spinner';
import { CardSkeleton, LoadFailed, Segmented, SignOutButton } from 'src/features/company-cargo/components';
import { displayName, useProfile } from 'src/features/company-cargo/profileStore';
import { getVerification, type VerificationState } from 'src/features/company-cargo/verificationApi';
import { useNotificationEvent } from 'src/features/company-cargo/notificationSocket';
import { BrokerView } from 'src/features/driver-panel/components';
import { LoadsContent } from 'src/features/driver-panel/DriverLoads';
import { RequestsContent } from 'src/features/driver-panel/DriverRequests';
import FactoryProfile from 'src/features/factory/FactoryProfile';
import trabotIcon from 'src/shared/assets/images/logos/trabot-icon.png';
import AccountCode from 'src/shared/components/account-code/AccountCode';
import { BrokerAccessBanner, BrokerAccessContent } from './BrokerAccess';

type Tab = 'loads' | 'requests' | 'access' | 'profile';

const tabs = [
  { value: 'loads' as const, label: 'بارها', icon: PackageSearch },
  { value: 'requests' as const, label: 'درخواست‌های من', icon: ClipboardList },
  { value: 'access' as const, label: 'خرید شرکت‌ها', icon: Unlock },
  { value: 'profile' as const, label: 'پروفایل', icon: UserRound },
];

function PanelContent() {
  // the tab in the address, so a reload or the bot's link stays on it
  const [params, setParams] = useSearchParams();
  const tab = (tabs.find((item) => item.value === params.get('tab'))?.value ?? 'loads') as Tab;
  return (
    <div className="tw-space-y-5">
      <Segmented label="بخش پنل واسط" value={tab} onChange={(value) => setParams(value === 'loads' ? {} : { tab: value })} options={tabs} />
      {tab === 'loads' && (
        <>
          <BrokerAccessBanner onBuy={() => setParams({ tab: 'access' })} />
          <LoadsContent />
        </>
      )}
      {tab === 'access' && <BrokerAccessContent />}
      {tab === 'requests' && <RequestsContent />}
      {tab === 'profile' && <FactoryProfile kind="BROKER" />}
    </div>
  );
}

/**
 * A broker signs up on its own and works only after a parent company checks it: until then only its profile, with
 * «درخواست بررسی اعتبار».
 */
function VerifiedPanel() {
  const [state, setState] = useState<VerificationState | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => {
    setFailed(false);
    getVerification().then(setState, () => setFailed(true));
  }, []);
  useEffect(load, [load]);
  // the parent company decided while the panel was open
  useNotificationEvent('verification-changed', () => load());

  if (failed) return <LoadFailed onRetry={load} />;
  if (!state) return <CardSkeleton />;
  if (state.status !== 'APPROVED') return <FactoryProfile kind="BROKER" onVerification={(next) => next.status === 'APPROVED' && setState(next)} />;
  return <PanelContent />;
}

/** The broker's (واسط) panel: like a driver it sees the open loads and requests them; it has no trips of its own. */
export default function BrokerPanel() {
  const { username, isAuth, isAuthDataLoading, userRoles } = useAuth();
  const profile = useProfile();
  const name = displayName(profile);
  const toast = useToast();
  // a company's answer (accepted, delivery confirmed, …): the same news the messengers get, live while the panel is open
  useNotificationEvent<{ type?: string; text?: string }>('cargo-request-changed', (event) => {
    if (event.type === 'driverNotice' && event.text) toast.info(event.text);
  });
  if (isAuthDataLoading) return <Spinner />;
  if (!isAuth) return <Navigate to="/auth/login" replace />;
  if (!userRoles.some((role) => role.name === 'BROKER')) return <Navigate to="/auth/404" replace />;
  return (
    <PageContainer title="پنل واسط | ترابوت" description="دیدن بارها و درخواست بار">
      <div dir="rtl" lang="fa" className="tw-min-h-[100dvh] tw-overflow-x-clip tw-bg-brand-bg tw-text-brand-navy">
        <header className="tw-sticky tw-top-0 tw-z-20 tw-border-b tw-border-brand-line tw-bg-white/95 tw-pt-[env(safe-area-inset-top)] tw-backdrop-blur">
          <div className="tw-mx-auto tw-flex tw-h-16 tw-max-w-5xl tw-items-center tw-justify-between tw-gap-3 tw-px-4 sm:tw-px-6">
            <div className="tw-flex tw-min-w-0 tw-items-center tw-gap-2">
              <img src={trabotIcon} alt="" className="tw-h-9 tw-w-9 tw-shrink-0 tw-rounded-xl tw-object-cover" />
              <strong className="tw-truncate">{name || username}</strong>
              <span className="tw-inline-flex tw-shrink-0 tw-items-center tw-gap-1 tw-rounded-full tw-bg-brand-orange-soft tw-px-2.5 tw-py-0.5 tw-text-xs tw-font-medium tw-text-brand-orange-ink">
                <Handshake size={12} aria-hidden /> واسط
              </span>
              <AccountCode code={profile?.accountCode} />
            </div>
            <SignOutButton />
          </div>
        </header>
        <main className="tw-mx-auto tw-max-w-5xl tw-space-y-5 tw-px-4 tw-pb-16 tw-pt-6 sm:tw-px-6">
          <PushPrompt hint="جواب شرکت‌های حمل‌ونقل به درخواست‌ها، تأیید تحویل و نتیجه‌ی بررسی اعتبار را حتی وقتی برنامه بسته است به‌صورت اعلان روی گوشی ببینید." />
          <BrokerView.Provider value>
            <VerifiedPanel />
          </BrokerView.Provider>
        </main>
      </div>
    </PageContainer>
  );
}
