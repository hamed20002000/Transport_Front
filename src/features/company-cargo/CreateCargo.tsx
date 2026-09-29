import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from 'src/core/auth/AuthContext';
import PageContainer from 'src/shared/components/container/PageContainer';
import Spinner from 'src/shared/components/spinner/Spinner';
import { createListing, getListingDefaults } from './api';
import CompanyShell from './CompanyShell';
import { SectionTitle } from './components';
import ListingForm from './ListingForm';

function CreateForm() {
  const navigate = useNavigate();
  return (
    <div className="tw-space-y-6">
      <SectionTitle title="ثبت بار جدید" hint="بار به نام شرکت شما برای راننده‌های مشترک فرستاده می‌شود" />
      <ListingForm
        variant="page"
        load={getListingDefaults}
        submit={createListing}
        onDone={(listing) => navigate('/account/company/cargo?tab=listings', { state: { createdRecipients: listing.recipients } })}
      />
    </div>
  );
}

export default function CreateCargo() {
  const { isAuth, isAuthDataLoading, userRoles } = useAuth();
  if (isAuthDataLoading) return <Spinner />;
  if (!isAuth) return <Navigate to="/auth/login" replace />;
  if (!userRoles.some((role) => role.name === 'COMPANY')) return <Navigate to="/account/company" replace />;
  return (
    <PageContainer title="ثبت بار | Setaş Transport" description="ثبت بار جدید برای راننده‌ها">
      <CompanyShell>
        <CreateForm />
      </CompanyShell>
    </PageContainer>
  );
}
