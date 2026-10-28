import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from 'src/core/auth/AuthContext';
import PageContainer from 'src/shared/components/container/PageContainer';
import Spinner from 'src/shared/components/spinner/Spinner';
import { createListing, getListingDefaults, type ExcelImportResult } from './api';
import CompanyShell from './CompanyShell';
import { SectionTitle } from './components';
import ExcelImport from './ExcelImport';
import ListingForm, { type PublishedListing } from './ListingForm';

const fa = (value: number) => value.toLocaleString('fa-IR');

// Manual mode with no matching drivers is not the automatic queue, so the Excel toast says which loads waited and why.
function excelMessage(created: ExcelImportResult['created']): string | undefined {
  const noDrivers = created.filter((item) => item.pendingReason === 'noDrivers').length;
  if (!noDrivers) return undefined;
  const announced = created.filter((item) => !item.pending).length;
  const waiting = `${fa(noDrivers)} بار به‌دلیل نبود راننده مناسب اعلام نشد و در «پیشنهادها» زیر «بارهای من که اعلام نشده‌اند» است.`;
  return announced ? `${fa(created.length)} بار از فایل اکسل ثبت شد؛ ${fa(announced)} بار اعلام شد و ${waiting}` : `${fa(created.length)} بار از فایل اکسل ثبت شد، اما ${waiting}`;
}

function CreateForm() {
  const navigate = useNavigate();
  return (
    <div className="tw-space-y-6">
      <SectionTitle title="ثبت بار جدید" hint="بار به نام شرکت حمل‌ونقل شما برای راننده‌های مشترک فرستاده می‌شود" />
      <ExcelImport
        onDone={(created) =>
          navigate(created.some((item) => item.pending) ? '/account/company/cargo' : '/account/company/published', {
            state: { createdCount: created.length, createdPending: created.some((item) => item.pending), createdMessage: excelMessage(created) },
          })
        }
      />
      <ListingForm<PublishedListing>
        variant="page"
        load={getListingDefaults}
        submit={createListing}
        onDone={(listing) =>
          navigate(listing.pending ? '/account/company/cargo' : '/account/company/published', {
            state: { createdRecipients: listing.recipients, createdPending: listing.pending, createdTripType: listing.tripType, createdMessage: listing.message },
          })
        }
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
    <PageContainer title="ثبت بار | ترابوت" description="ثبت بار جدید برای راننده‌ها">
      <CompanyShell>
        <CreateForm />
      </CompanyShell>
    </PageContainer>
  );
}
