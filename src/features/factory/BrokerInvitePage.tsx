import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Handshake, LoaderCircle, LogIn } from 'lucide-react';
import { useAuth } from 'src/core/auth/AuthContext';
import { signOut } from 'src/core/auth/session';
import PageContainer from 'src/shared/components/container/PageContainer';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { getBrokerInviteInfo, getBrokerInviteMembership } from 'src/features/company-cargo/brokerInvitesApi';
import { factoryError } from './api';

const BROKER_HOME = '/account/broker';

/**
 * A broker's personal invite from a transport company (like a factory's /invite/… and a driver's /driver-invite/…).
 * The company made the broker's account with its number beforehand, so the broker just signs in with that number.
 * Signed in with another number: told the invite is not for it.
 */
export default function BrokerInvitePage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { isAuth, isAuthDataLoading } = useAuth();
  const [info, setInfo] = useState<{ valid: boolean; companyName: string | null; mobile: string | null } | null>(null);
  const [failed, setFailed] = useState('');
  const [otherNumber, setOtherNumber] = useState(false);
  const checking = useRef(false);

  useEffect(() => {
    getBrokerInviteInfo(token).then(setInfo, (error) => setFailed(factoryError(error)));
  }, [token]);

  useEffect(() => {
    if (!info?.valid || isAuthDataLoading || !isAuth || checking.current) return;
    checking.current = true;
    getBrokerInviteMembership(token)
      .then(({ member }) => {
        if (!member) return setOtherNumber(true);
        toast.success(`خوش آمدید؛ بارهای ${info.companyName} را می‌بینید و می‌توانید برایشان درخواست بدهید.`);
        navigate(BROKER_HOME, { replace: true });
      })
      .catch((error) => setFailed(factoryError(error)));
  }, [info, isAuth, isAuthDataLoading, token, navigate, toast]);

  const signIn = `/auth/login?url=${encodeURIComponent(`/broker-invite/${token}`)}`;

  // not signed in: the link goes straight to sign-in, which also offers this invite's messengers
  useEffect(() => {
    if (info?.valid && !isAuthDataLoading && !isAuth) navigate(signIn, { replace: true });
  }, [info, isAuth, isAuthDataLoading, navigate, signIn]);

  return (
    <PageContainer title="دعوت واسط | ترابوت" description="ورود واسط دعوت‌شده از طرف شرکت حمل‌ونقل">
      <main dir="rtl" lang="fa" className="tw-flex tw-min-h-[100dvh] tw-items-center tw-justify-center tw-bg-brand-bg tw-p-4 tw-text-brand-navy">
        <section className="tw-w-full tw-max-w-md tw-space-y-5 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-6 tw-text-center tw-shadow-sm sm:tw-p-8">
          <span className="tw-mx-auto tw-flex tw-h-14 tw-w-14 tw-items-center tw-justify-center tw-rounded-2xl tw-bg-brand-orange-soft tw-text-brand-orange-ink">
            <Handshake size={28} aria-hidden />
          </span>
          {failed ? (
            <p role="alert" className="tw-m-0 tw-text-red-700">{failed}</p>
          ) : !info || isAuthDataLoading ? (
            <p role="status" className="tw-m-0 tw-flex tw-items-center tw-justify-center tw-gap-2 tw-text-brand-muted">
              <LoaderCircle size={18} className="tw-animate-spin" aria-hidden /> در حال بررسی لینک دعوت…
            </p>
          ) : !info.valid ? (
            <>
              <h1 className="tw-m-0 tw-text-xl tw-font-bold">این لینک دعوت معتبر نیست</h1>
              <p className="tw-m-0 tw-text-sm tw-leading-7 tw-text-brand-muted">لینک درست را از شرکت حمل‌ونقل بگیرید.</p>
            </>
          ) : otherNumber ? (
            <>
              <h1 className="tw-m-0 tw-text-xl tw-font-bold">این دعوت برای شماره‌ی دیگری است</h1>
              <p className="tw-m-0 tw-text-sm tw-leading-7 tw-text-brand-muted">
                دعوت برای شماره‌ی <bdi dir="ltr">{info.mobile}</bdi> است. از این حساب خارج شوید و با همان شماره وارد شوید.
              </p>
              <button type="button" onClick={() => signOut()} className="tw-h-11 tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-5 tw-font-bold hover:tw-bg-brand-sky">
                خروج از این حساب
              </button>
            </>
          ) : isAuth ? (
            <p role="status" className="tw-m-0 tw-flex tw-items-center tw-justify-center tw-gap-2 tw-text-brand-muted">
              <LoaderCircle size={18} className="tw-animate-spin" aria-hidden /> در حال ورود…
            </p>
          ) : (
            <>
              <h1 className="tw-m-0 tw-text-xl tw-font-bold">دعوت از طرف {info.companyName}</h1>
              <p className="tw-m-0 tw-text-sm tw-leading-7 tw-text-brand-muted">
                حساب واسط شما با شماره‌ی <bdi dir="ltr">{info.mobile}</bdi> ساخته شده است؛ بارهای {info.companyName} را می‌بینید و می‌توانید برایشان درخواست بدهید. با همین شماره و کد پیامکی وارد شوید.
              </p>
              <Link
                to={signIn}
                className="tw-flex tw-h-12 tw-w-full tw-items-center tw-justify-center tw-gap-2 tw-rounded-xl tw-bg-brand-orange tw-font-bold tw-text-white hover:tw-bg-brand-orange-dark"
              >
                <LogIn size={18} aria-hidden /> ورود با همین شماره
              </Link>
            </>
          )}
        </section>
      </main>
    </PageContainer>
  );
}
