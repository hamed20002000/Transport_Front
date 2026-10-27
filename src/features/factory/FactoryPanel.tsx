import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Building2, Clock, Factory, FileSpreadsheet, History, Inbox, SquarePlus } from 'lucide-react';
import { useAuth } from 'src/core/auth/AuthContext';
import PageContainer from 'src/shared/components/container/PageContainer';
import Spinner from 'src/shared/components/spinner/Spinner';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { cn } from 'src/shared/utils/utils';
import { updateUserProfile } from 'src/features/company-cargo/api';
import { CardSkeleton, EmptyState, LoadFailed, Pager, RouteLine, SectionTitle, Segmented, SignOutButton } from 'src/features/company-cargo/components';
import { displayName, setCachedProfile, useProfile } from 'src/features/company-cargo/profileStore';
import ListingForm from 'src/features/company-cargo/ListingForm';
import ExcelImport from 'src/features/company-cargo/ExcelImport';
import trabotIcon from 'src/shared/assets/images/logos/trabot-icon.png';
import FactoryProfile from './FactoryProfile';
import { getVerification, type VerificationState } from 'src/features/company-cargo/verificationApi';
import { useNotificationEvent } from 'src/features/company-cargo/notificationSocket';
import {
  downloadFactoryTemplate,
  factoryError,
  getFactoryCompanies,
  getFactoryDraft,
  getFactoryLoads,
  importFactoryExcel,
  sendFactoryLoad,
  type FactoryCompany,
  type FactoryLoad,
} from './api';

type Tab = 'single' | 'excel' | 'history' | 'profile';

const tabs = [
  { value: 'single' as const, label: 'ثبت بار', icon: SquarePlus },
  { value: 'excel' as const, label: 'ثبت با اکسل', icon: FileSpreadsheet },
  { value: 'history' as const, label: 'بارهای من', icon: History },
  { value: 'profile' as const, label: 'پروفایل', icon: Building2 },
];
const PAGE_SIZE = 20;
const fa = (value: number) => value.toLocaleString('fa-IR');
const faDateTime = (value: string) => new Date(value).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' });
const inputClass =
  'tw-h-11 tw-w-full tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-3 tw-text-brand-navy tw-outline-none tw-transition-colors placeholder:tw-text-brand-muted/70 focus:tw-border-brand-orange';

/** The factory's name, asked once: the transport company sees its loads under it. */
function FactoryName() {
  const profile = useProfile();
  const toast = useToast();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  if (!profile || profile.companyName?.trim()) return null;

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      setCachedProfile(await updateUserProfile({ companyName: name.trim(), profileType: 1 }));
      toast.success('نام کارخانه ثبت شد.');
    } catch (error) {
      toast.error(factoryError(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="tw-space-y-3 tw-rounded-2xl tw-border tw-border-brand-orange/30 tw-bg-brand-orange-soft/40 tw-p-4">
      <p className="tw-m-0 tw-font-bold">نام کارخانه را وارد کنید</p>
      <p className="tw-m-0 tw-text-sm tw-text-brand-muted">شرکت حمل‌ونقل بارهای شما را با همین نام می‌بیند.</p>
      <div className="tw-flex tw-gap-2">
        <input value={name} onChange={(event) => setName(event.target.value)} maxLength={200} placeholder="مثلاً کارخانه سیمان تهران" aria-label="نام کارخانه" className={inputClass} />
        <button type="submit" disabled={!name.trim() || saving} className="tw-h-11 tw-shrink-0 tw-rounded-xl tw-border-0 tw-bg-brand-orange tw-px-4 tw-font-bold tw-text-white disabled:tw-opacity-50">
          {saving ? 'در حال ذخیره…' : 'ذخیره'}
        </button>
      </div>
    </form>
  );
}

/** Which transport company the load goes to: one of those whose invite link the factory opened. */
function CompanyPicker({ companies, value, onChange }: { companies: FactoryCompany[]; value: string; onChange: (id: string) => void }) {
  return (
    <fieldset className="tw-m-0 tw-space-y-2 tw-border-0 tw-p-0">
      <legend className="tw-mb-2 tw-text-sm tw-font-bold">بار برای کدام شرکت حمل‌ونقل فرستاده شود؟</legend>
      <div className="tw-flex tw-flex-wrap tw-gap-2" role="radiogroup">
        {companies.map((company) => (
          <button
            key={company.userId}
            type="button"
            role="radio"
            aria-checked={company.userId === value}
            onClick={() => onChange(company.userId)}
            className={cn(
              'tw-inline-flex tw-h-10 tw-items-center tw-gap-2 tw-rounded-full tw-border tw-px-4 tw-text-sm tw-transition-colors',
              company.userId === value ? 'tw-border-brand-orange tw-bg-brand-orange-soft tw-font-bold tw-text-brand-orange-ink' : 'tw-border-brand-line tw-bg-white hover:tw-border-brand-orange/40',
            )}
          >
            <Building2 size={15} aria-hidden /> {company.name}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function LoadsHistory() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: FactoryLoad[]; total: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => {
    setFailed(false);
    getFactoryLoads(page, PAGE_SIZE).then(setData, () => setFailed(true));
  }, [page]);
  useEffect(load, [load]);

  if (failed) return <LoadFailed onRetry={load} />;
  if (!data) return <CardSkeleton />;
  if (!data.items.length) return <EmptyState icon={Inbox} title="هنوز باری نفرستاده‌اید" hint="بارهایی که برای شرکت‌های حمل‌ونقل می‌فرستید اینجا فهرست می‌شوند." />;
  return (
    <div className="tw-space-y-3">
      {data.items.map((item) => (
        <article key={item.id} className="tw-space-y-2 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-4">
          <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-2 tw-text-xs tw-text-brand-muted">
            <span className="tw-inline-flex tw-items-center tw-gap-1.5 tw-font-bold tw-text-brand-navy">
              <Building2 size={14} aria-hidden /> {item.companyName ?? 'شرکت حمل‌ونقل'}
            </span>
            <span className="tw-inline-flex tw-items-center tw-gap-1"><Clock size={13} aria-hidden /> {faDateTime(item.createdAt)}</span>
          </div>
          <RouteLine origin={item.origin} destination={item.destination} />
          <p className="tw-m-0 tw-text-sm tw-text-brand-muted">
            {[item.cargoType, item.weight, item.vehicleType, item.price].filter(Boolean).join(' · ') || '—'}
          </p>
        </article>
      ))}
      <Pager page={page} total={data.total} pageSize={PAGE_SIZE} onChange={setPage} />
    </div>
  );
}

function PanelContent() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('single');
  const [companies, setCompanies] = useState<FactoryCompany[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [companyId, setCompanyId] = useState('');
  // a new form after each send (the fields start empty again)
  const [formKey, setFormKey] = useState(0);

  const loadCompanies = useCallback(() => {
    setFailed(false);
    getFactoryCompanies().then((rows) => {
      setCompanies(rows);
      setCompanyId((current) => (rows.some((row) => row.userId === current) ? current : rows.length === 1 ? rows[0].userId : ''));
    }, () => setFailed(true));
  }, []);
  useEffect(loadCompanies, [loadCompanies]);

  if (failed) return <LoadFailed onRetry={loadCompanies} />;
  if (!companies) return <CardSkeleton />;
  if (!companies.length) {
    return <EmptyState icon={Building2} title="هنوز شرکت حمل‌ونقلی شما را دعوت نکرده" hint="لینک دعوت را از شرکت حمل‌ونقل بگیرید و باز کنید؛ آن شرکت اینجا اضافه می‌شود." />;
  }
  const company = companies.find((item) => item.userId === companyId);

  return (
    <div className="tw-space-y-5">
      <FactoryName />
      <Segmented value={tab} onChange={setTab} options={tabs} label="بخش" />
      {(tab === 'single' || tab === 'excel') && <CompanyPicker companies={companies} value={companyId} onChange={setCompanyId} />}
      {(tab === 'single' || tab === 'excel') && !company && <p className="tw-m-0 tw-text-sm tw-text-brand-orange-ink">اول شرکت حمل‌ونقل را انتخاب کنید.</p>}

      {tab === 'single' && (
        <ListingForm
          key={formKey}
          variant="page"
          audience="company"
          disabled={!company}
          load={async () => ({ contactPhones: (await getFactoryDraft()).contactPhones })}
          submit={(input) => sendFactoryLoad(companyId, input)}
          submitLabel={company ? `ارسال برای ${company.name}` : 'ارسال برای شرکت'}
          onDone={() => {
            toast.success(`بار برای ${company?.name ?? 'شرکت'} فرستاده شد و در بارهای پیشنهادی آن است.`);
            setFormKey((value) => value + 1);
          }}
        />
      )}
      {tab === 'excel' && (
        <ExcelImport
          key={companyId}
          audience="company"
          disabled={!company}
          importFile={(file, dryRun) => importFactoryExcel(companyId, file, dryRun)}
          downloadTemplate={downloadFactoryTemplate}
          onDone={(created) => {
            toast.success(`${fa(created.length)} بار برای ${company?.name ?? 'شرکت'} فرستاده شد.`);
            setTab('history');
          }}
        />
      )}
      {tab === 'history' && <LoadsHistory />}
      {tab === 'profile' && <FactoryProfile />}
    </div>
  );
}

/**
 * A factory that signed up on its own works only after a parent company checks it: until then only its profile, with
 * «درخواست بررسی اعتبار». An invited (or approved) factory goes straight to sending loads.
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
  if (state.status !== 'APPROVED') return <FactoryProfile onVerification={(next) => next.status === 'APPROVED' && setState(next)} />;
  return <PanelContent />;
}

/** The factory's whole panel: send loads (one by one or with Excel) to the transport companies that invited it. */
export default function FactoryPanel() {
  const { username, isAuth, isAuthDataLoading, userRoles } = useAuth();
  const name = displayName(useProfile());
  if (isAuthDataLoading) return <Spinner />;
  if (!isAuth) return <Navigate to="/auth/login" replace />;
  if (!userRoles.some((role) => role.name === 'FACTORY')) return <Navigate to="/auth/404" replace />;
  return (
    <PageContainer title="پنل کارخانه | ترابوت" description="ثبت بار کارخانه برای شرکت‌های حمل‌ونقل">
      <div dir="rtl" lang="fa" className="tw-min-h-[100dvh] tw-overflow-x-clip tw-bg-brand-bg tw-text-brand-navy">
        <header className="tw-sticky tw-top-0 tw-z-20 tw-border-b tw-border-brand-line tw-bg-white/95 tw-pt-[env(safe-area-inset-top)] tw-backdrop-blur">
          <div className="tw-mx-auto tw-flex tw-h-16 tw-max-w-5xl tw-items-center tw-justify-between tw-gap-3 tw-px-4 sm:tw-px-6">
            <div className="tw-flex tw-min-w-0 tw-items-center tw-gap-2">
              <img src={trabotIcon} alt="" className="tw-h-9 tw-w-9 tw-shrink-0 tw-rounded-xl tw-object-cover" />
              <strong className="tw-truncate">{name || username}</strong>
              <span className="tw-inline-flex tw-shrink-0 tw-items-center tw-gap-1 tw-rounded-full tw-bg-brand-orange-soft tw-px-2.5 tw-py-0.5 tw-text-xs tw-font-medium tw-text-brand-orange-ink">
                <Factory size={12} aria-hidden /> کارخانه
              </span>
            </div>
            <SignOutButton />
          </div>
        </header>
        <main className="tw-mx-auto tw-max-w-5xl tw-space-y-5 tw-px-4 tw-pb-16 tw-pt-6 sm:tw-px-6">
          <SectionTitle title="ثبت بار" hint="بار شما به «بارهای پیشنهادی» شرکت حمل‌ونقلی که انتخاب می‌کنید می‌رود." />
          <VerifiedPanel />
        </main>
      </div>
    </PageContainer>
  );
}

