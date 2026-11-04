import { Link, Navigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from 'src/core/auth/AuthContext';
import PageContainer from 'src/shared/components/container/PageContainer';
import Spinner from 'src/shared/components/spinner/Spinner';
import CompanyShell from './CompanyShell';
import DirectDriverForm from './DirectDriverForm';
import DriverInvites from './DriverInvites';
import { useCompanyFeatures } from './featuresApi';

/**
 * Adding drivers, apart from the list of drivers: the parent company registers one directly by name and number
 * (DirectDriverForm), and every company invites by link, one, a list or an Excel file, with its invites waiting.
 */
function AddDrivers() {
  const isParent = !!useCompanyFeatures()?.isParent;
  return (
    <div className="tw-space-y-5">
      <Link to="/account/company/drivers" className="tw-inline-flex tw-items-center tw-gap-1.5 tw-text-sm tw-font-bold tw-text-brand-navy tw-no-underline hover:tw-text-brand-orange-ink">
        <ArrowRight size={16} aria-hidden /> فهرست رانندگان
      </Link>
      {isParent && <DirectDriverForm onRegistered={() => undefined} />}
      <DriverInvites />
    </div>
  );
}

export default function CompanyDriversAdd() {
  const { isAuth, isAuthDataLoading, userRoles } = useAuth();
  if (isAuthDataLoading) return <Spinner />;
  if (!isAuth) return <Navigate to="/auth/login" replace />;
  if (!userRoles.some((role) => role.name === 'COMPANY')) return <Navigate to="/account/company" replace />;
  return (
    <PageContainer title="افزودن راننده | ترابوت" description="ثبت و دعوت رانندگان">
      <CompanyShell>
        <AddDrivers />
      </CompanyShell>
    </PageContainer>
  );
}
