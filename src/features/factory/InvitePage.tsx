import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Factory, LoaderCircle, LogIn } from 'lucide-react';
import { useAuth } from 'src/core/auth/AuthContext';
import { signOut } from 'src/core/auth/session';
import PageContainer from 'src/shared/components/container/PageContainer';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { factoryError, getInviteInfo, getInviteMembership } from './api';

export const FACTORY_HOME = '/account/factory';

/**
 * A factory's personal invite from a transport company (apart from a transport company's /join/…). The company made
 * the factory's account with its number beforehand, so the factory just signs in with that number and lands on its
 * panel. Signed in with another number: told the invite is not for it.
 */
export default function InvitePage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { isAuth, isAuthDataLoading } = useAuth();
  const [info, setInfo] = useState<{ valid: boolean; companyName: string | null; mobile: string | null } | null>(null);
  const [failed, setFailed] = useState('');
  const [otherNumber, setOtherNumber] = useState(false);
  const checking = useRef(false);

  useEffect(() => {
    getInviteInfo(token).then(setInfo, (error) => setFailed(factoryError(error)));
  }, [token]);

  // signed in (right after signing in here, or before): the invited number goes to its panel
  useEffect(() => {
    if (!info?.valid || isAuthDataLoading || !isAuth || checking.current) return;
    checking.current = true;
    getInviteMembership(token)
      .then(({ member }) => {
        if (!member) return setOtherNumber(true);
        toast.success(`خوش آمدید؛ بارتان را برای ${info.companyName} ثبت کنید.`);
        navigate(FACTORY_HOME, { replace: true });
      })
      .catch((error) => setFailed(factoryError(error)));
  }, [info, isAuth, isAuthDataLoading, token, navigate, toast]);

  const signIn = `/auth/login?url=${encodeURIComponent(`/invite/${token}`)}`;

  return (
    <PageContainer title="دعوت کارخانه | ترابوت" description="ورود کارخانه‌ی دعوت‌شده از طرف شرکت حمل‌ونقل">
      <main dir="rtl" lang="fa" className="tw-flex tw-min-h-[100dvh] tw-items-center tw-justify-center tw-bg-brand-bg tw-p-4 tw-text-brand-navy">
        <section className="tw-w-full tw-max-w-md tw-space-y-5 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-6 tw-text-center tw-shadow-sm sm:tw-p-8">
          <span className="tw-mx-auto tw-flex tw-h-14 tw-w-14 tw-items-center tw-justify-center tw-rounded-2xl tw-bg-brand-orange-soft tw-text-brand-orange-ink">
            <Factory size={28} aria-hidden />
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
                حساب شرکت / کارخانهی شما با شماره‌ی <bdi dir="ltr">{info.mobile}</bdi> ساخته شده است. با همین شماره و کد پیامکی وارد شوید و بارهایتان را (تکی یا با اکسل) ثبت کنید؛ بار مستقیم به {info.companyName} می‌رسد و لازم نیست تماس بگیرید.
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
