import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useAuth } from 'src/core/auth/AuthContext';
import { getBrokerAccess } from 'src/features/broker/accessApi';
import { lockedFeature, useCompanyFeatures } from 'src/features/company-cargo/featuresApi';
import { useNotificationEvent } from 'src/features/company-cargo/notificationSocket';

// The assistant panel is large (chat, voice, socket); it loads only when first opened.
const AiAgentPage = lazy(() => import('src/features/ai-agent/pages/AiAgentPage'));

/**
 * Floating AI button for the company, driver and account panels (the admin panel has no assistant).
 * Shown only to logged-in users; a transport company sees it only once it has the assistant (bought, or the parent),
 * a broker once approved and with companies bought.
 */
export default function AiLauncher() {
  const { isAuth, userRoles } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  // a factory only sends loads to its transport companies: no assistant there (nor on an invite link)
  const factoryOnly = userRoles.length > 0 && userRoles.every((role) => role.name === 'FACTORY');
  if (!isAuth || pathname.startsWith('/auth') || pathname.startsWith('/invite/') || pathname.startsWith('/join/') || pathname.startsWith('/driver-invite/') || factoryOnly) return null;

  const company = userRoles.some((role) => role.name === 'COMPANY' || role.name === 'COMPANY_ADMIN');
  if (company) return <CompanyLauncher open={open} setOpen={setOpen} />;
  const brokerOnly = userRoles.some((role) => role.name === 'BROKER') && !userRoles.some((role) => role.name === 'DRIVER');
  return brokerOnly ? <BrokerLauncher open={open} setOpen={setOpen} /> : <Launcher open={open} setOpen={setOpen} />;
}

// a broker: hidden until the parent company approves it and, while brokers pay, until it has bought companies
function BrokerLauncher(props: LauncherProps) {
  const [allowed, setAllowed] = useState(false);
  const load = useCallback(() => {
    getBrokerAccess().then((access) => setAllowed(access.agent), () => setAllowed(false));
  }, []);
  useEffect(load, [load]);
  useNotificationEvent('verification-changed', load);
  useNotificationEvent('broker-access-changed', load);
  return allowed ? <Launcher {...props} /> : null;
}

// the assistant is a paid menu (AGENT) of a transport company: hidden until known and while locked or unverified
function CompanyLauncher(props: LauncherProps) {
  const features = useCompanyFeatures();
  if (!features || lockedFeature(features, 'AGENT')) return null;
  return <Launcher {...props} />;
}

type LauncherProps = { open: boolean; setOpen: (open: boolean) => void };

function Launcher({ open, setOpen }: LauncherProps) {
  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="دستیار هوشمند"
          title="دستیار هوشمند"
          className="tw-fixed tw-bottom-[calc(1.25rem+env(safe-area-inset-bottom))] tw-left-5 tw-z-40 tw-flex tw-h-14 tw-w-14 tw-items-center tw-justify-center tw-rounded-full tw-border tw-border-white/40 tw-text-white tw-shadow-[0_12px_24px_rgba(245,118,26,0.38)] tw-transition-transform hover:tw-scale-105 focus-visible:tw-outline-none focus-visible:tw-ring-4 focus-visible:tw-ring-orange-200"
          style={{ background: 'linear-gradient(135deg, #f7934a 0%, #f5761a 50%, #dc6310 100%)' }}
        >
          <Sparkles size={24} aria-hidden />
          <span className="tw-absolute -tw-top-1 -tw-right-1 tw-rounded-full tw-bg-white tw-px-1.5 tw-text-[10px] tw-font-bold tw-leading-4 tw-text-brand-orange-ink tw-shadow">AI</span>
        </button>
      )}
      {open && (
        <Suspense fallback={null}>
          <AiAgentPage backend="account" onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
