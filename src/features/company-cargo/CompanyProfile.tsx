import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import {
  AtSign,
  Building2,
  FileBadge,
  Globe2,
  Hash,
  Mailbox,
  MapPinned,
  Phone,
  Save,
  Smartphone,
  User,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from 'src/core/auth/AuthContext';
import { useDomainRefresh } from 'src/features/ai-agent/hooks/Usedomainrefres';
import PageContainer from 'src/shared/components/container/PageContainer';
import Spinner from 'src/shared/components/spinner/Spinner';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { cn } from 'src/shared/utils/utils';
import {
  getUserProfile,
  profileRules,
  toLatinDigits,
  updateUserProfile,
  type ProfileTextField,
  type ProfileType,
  type UserProfile,
  type UserProfileInput,
} from './api';
import CompanyShell from './CompanyShell';
import VerificationCard from './VerificationCard';
import { reloadCompanyFeatures } from './featuresApi';
import { setCachedProfile } from './profileStore';
import { CardSkeleton, LoadFailed, SectionTitle } from './components';
import PushDeviceCard from 'src/shared/components/pwa/PushDeviceCard';
import EitaaLinkCard from 'src/shared/components/messenger/EitaaLinkCard';
import FloatingActions from 'src/shared/components/FloatingActions';

type Fields = Record<ProfileTextField, string> & { profileType: ProfileType | null };

// a company has no personal fields: it is known by its phone number, not by the person behind it
const personalFields: ProfileTextField[] = ['firstName', 'lastName', 'nationalCode'];
const textFields = (Object.keys(profileRules) as ProfileTextField[]).filter((key) => !personalFields.includes(key));

const saveClass =
  'tw-flex tw-items-center tw-justify-center tw-gap-2 tw-rounded-xl tw-bg-brand-orange tw-font-bold tw-text-white tw-shadow-sm tw-transition-colors hover:tw-bg-brand-orange-dark disabled:tw-cursor-not-allowed';
const cancelClass = 'tw-rounded-xl tw-bg-transparent tw-text-sm tw-font-medium tw-text-brand-muted hover:tw-text-brand-navy';

const inputClass =
  'tw-h-11 tw-w-full tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-3 tw-text-brand-navy tw-outline-none tw-transition-colors placeholder:tw-text-brand-muted/70 focus:tw-border-brand-orange';

function toFields(profile: UserProfile): Fields {
  const fields = { profileType: profile.profileType } as Fields;
  for (const key of textFields) fields[key] = profile[key] ?? '';
  return fields;
}

function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'ارتباط با سرور برقرار نشد. اتصال را بررسی و دوباره تلاش کنید.';
    const { status } = error.response;
    if (status === 400) return 'اطلاعات واردشده معتبر نیست. فیلدها را بررسی کنید.';
    if (status === 401) return 'نشست شما منقضی شده است. دوباره وارد شوید.';
    if (status === 404) return 'حساب کاربری پیدا نشد.';
    return `خطای سرور (${status}). دوباره تلاش کنید.`;
  }
  return error instanceof Error ? error.message : 'عملیات انجام نشد.';
}

// required: what the parent company checks a company with before approving it (AccountVerificationService)
function Field({ label, icon: Icon, className, required, children }: { label: string; icon: LucideIcon; className?: string; required?: boolean; children: ReactNode }) {
  return (
    <label className={cn('tw-block tw-space-y-1.5', className)}>
      <span className="tw-flex tw-items-center tw-gap-1.5 tw-text-sm tw-font-medium">
        <Icon size={15} aria-hidden className="tw-text-brand-muted" />
        {label}
        {required && <span className="tw-text-brand-orange" aria-hidden>*</span>}
      </span>
      {children}
    </label>
  );
}

function Card({ title, side, children }: { title: string; side?: ReactNode; children: ReactNode }) {
  return (
    <section className="tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-5 tw-shadow-sm">
      <div className="tw-mb-4 tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-2">
        <h2 className="tw-text-base tw-font-bold">{title}</h2>
        {side}
      </div>
      {children}
    </section>
  );
}

function ReadOnly({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string | null }) {
  return (
    <div className="tw-flex tw-items-center tw-gap-2">
      <Icon size={15} aria-hidden className="tw-shrink-0 tw-text-brand-muted" />
      <span className="tw-text-brand-muted">{label}</span>
      <span dir="ltr" className="tw-min-w-0 tw-flex-1 tw-truncate tw-text-left tw-font-medium">
        {value || '—'}
      </span>
    </div>
  );
}

function ProfileContent() {
  const toast = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fields, setFields] = useState<Fields | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [version, setVersion] = useState(0);
  // each save: the verification card checks again what is still missing
  const [saves, setSaves] = useState(0);
  // پروفایلی که با agent ویرایش شد همین‌جا دیده شود
  useDomainRefresh('company_profile', () => setVersion((v) => v + 1), 'account');
  const pending = useRef(false);
  // which kinds of work the company does; ticking one opens its name box, untick clears it
  const [kinds, setKinds] = useState({ domestic: false, international: false });

  useEffect(() => {
    let active = true;
    setLoadFailed(false);
    getUserProfile()
      .then((result) => {
        if (!active) return;
        setProfile(result);
        setFields(toFields(result));
        setKinds({ domestic: !!result.domesticCompanyName, international: !!result.internationalCompanyName });
        setCachedProfile(result);
      })
      .catch((e) => {
        if (!active) return;
        setLoadFailed(true);
        toast.error(errorMessage(e));
      });
    return () => {
      active = false;
    };
  }, [version, toast]);

  if (loadFailed) return <LoadFailed onRetry={() => setVersion((v) => v + 1)} />;

  if (!profile || !fields)
    return (
      <div className="tw-space-y-4" role="status" aria-label="در حال دریافت پروفایل">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );

  const saved = toFields(profile);
  const changed = (key: ProfileTextField) => toLatinDigits(fields[key].trim()) !== saved[key];
  const dirty = textFields.some(changed);

  const input = (key: ProfileTextField, extra?: { ltr?: boolean; numeric?: boolean; placeholder?: string }) => (
    <input
      className={cn(inputClass, extra?.ltr && 'tw-text-left')}
      dir={extra?.ltr ? 'ltr' : undefined}
      inputMode={extra?.numeric ? 'numeric' : undefined}
      value={fields[key]}
      maxLength={profileRules[key].max}
      placeholder={extra?.placeholder}
      onChange={(e) => setFields((current) => current && { ...current, [key]: e.target.value })}
    />
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending.current || !fields) return;

    // Only changed fields are sent; a cleared field goes as null so the server removes it.
    const body: UserProfileInput = {};
    // a transport company is always a legal entity; an old «حقیقی» profile is corrected on save
    if (saved.profileType !== 1) body.profileType = 1;
    if (kinds.domestic && !fields.domesticCompanyName.trim()) return toast.error('نام شرکت داخلی را بنویسید، یا تیک «داخلی» را بردارید.');
    if (kinds.international && !fields.internationalCompanyName.trim())
      return toast.error('نام شرکت بین‌المللی را بنویسید، یا تیک «بین‌المللی» را بردارید.');
    for (const key of textFields) {
      if (!changed(key)) continue;
      const value = toLatinDigits(fields[key].trim());
      const { pattern, message } = profileRules[key];
      if (value && pattern && !pattern.test(value)) return toast.error(message ?? 'مقدار واردشده معتبر نیست.');
      body[key] = value || null;
    }

    pending.current = true;
    setSaving(true);
    try {
      const updated = await updateUserProfile(body);
      setProfile(updated);
      setFields(toFields(updated));
      setKinds({ domestic: !!updated.domesticCompanyName, international: !!updated.internationalCompanyName });
      setCachedProfile(updated); // header and home greeting pick up the new name
      setSaves((value) => value + 1);
      toast.success('پروفایل ذخیره شد.');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="tw-space-y-6">
      <SectionTitle title="پروفایل" hint="اطلاعات شرکت را تکمیل یا اصلاح کنید" />
      {/* a company that signed up on its own: the parent company checks it before anything else opens */}
      <VerificationCard dirty={dirty} version={saves} onChange={(state) => state.status === 'APPROVED' && void reloadCompanyFeatures()} />
      <div className="tw-grid tw-grid-cols-1 tw-gap-6 lg:tw-grid-cols-[1fr_20rem]">
        <fieldset disabled={saving} className="tw-m-0 tw-min-w-0 tw-space-y-6 tw-border-0 tw-p-0">
          <Card title="اطلاعات شرکت">
            <div className="tw-grid tw-grid-cols-1 tw-gap-4 sm:tw-grid-cols-2">
              <Field label="نام تجاری شرکت" icon={Building2} className="sm:tw-col-span-2" required>
                {input('companyName')}
              </Field>
              <Field label="شناسه ملی شرکت" icon={FileBadge}>
                {input('companyNationalId', { ltr: true, numeric: true, placeholder: '10101234567' })}
              </Field>
              <Field label="شماره ثبت" icon={Hash}>
                {input('registrationNo', { ltr: true })}
              </Field>
              <Field label="کد اقتصادی" icon={Hash} required>
                {input('economicCode', { ltr: true })}
              </Field>
            </div>
          </Card>

          <Card title="زمینه‌ی کاری شرکت">
            <p className="tw-m-0 tw-mb-4 tw-text-sm tw-text-brand-muted">
              هر کدام را که کار می‌کنید انتخاب کنید و نام شرکت را برای آن بنویسید. راننده‌های داخلی شرکت را زیر «داخلی» و راننده‌های
              بین‌المللی زیر «بین‌المللی» با همین نام می‌بینند و عضو می‌شوند.
            </p>
            <div className="tw-grid tw-grid-cols-1 tw-gap-3 sm:tw-grid-cols-2">
              {(
                [
                  { kind: 'domestic', field: 'domesticCompanyName', label: 'داخلی', hint: 'بار داخل ایران', icon: MapPinned, placeholder: 'مثلاً باربری ستاره' },
                  { kind: 'international', field: 'internationalCompanyName', label: 'بین‌المللی', hint: 'صادرات و واردات', icon: Globe2, placeholder: 'مثلاً ترابر بین‌المللی ستاره' },
                ] as const
              ).map(({ kind, field, label, hint, icon: Icon, placeholder }) => (
                <div key={kind} className={cn('tw-space-y-3 tw-rounded-xl tw-border tw-p-3', kinds[kind] ? 'tw-border-brand-orange tw-bg-brand-orange-soft/50' : 'tw-border-brand-line')}>
                  <label className="tw-flex tw-cursor-pointer tw-items-center tw-gap-2">
                    <input
                      type="checkbox"
                      checked={kinds[kind]}
                      onChange={(e) => {
                        const on = e.target.checked;
                        setKinds((current) => ({ ...current, [kind]: on }));
                        if (!on) setFields((current) => current && { ...current, [field]: '' });
                      }}
                      className="tw-h-4 tw-w-4 tw-accent-brand-orange"
                    />
                    <Icon size={16} aria-hidden className="tw-text-brand-muted" />
                    <span className="tw-text-sm tw-font-bold">{label}</span>
                    <span className="tw-text-xs tw-text-brand-muted">({hint})</span>
                  </label>
                  {kinds[kind] && (
                    <Field label={`نام شرکت ${label}`} icon={Building2}>
                      {input(field, { placeholder })}
                    </Field>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card title="راه‌های ارتباطی">
            <div className="tw-grid tw-grid-cols-1 tw-gap-4 sm:tw-grid-cols-2">
              <Field label="شماره شرکت" icon={Phone} required>
                {input('phone', { ltr: true, placeholder: '021 1234 5678' })}
              </Field>
              <Field label="کد پستی" icon={Mailbox}>
                {input('postalCode', { ltr: true, numeric: true, placeholder: '1234567890' })}
              </Field>
              <Field label="نشانی" icon={MapPinned} className="sm:tw-col-span-2">
                <textarea
                  className={cn(inputClass, 'tw-h-auto tw-min-h-[5rem] tw-py-2.5 tw-leading-7')}
                  value={fields.address}
                  maxLength={profileRules.address.max}
                  onChange={(e) => setFields((current) => current && { ...current, address: e.target.value })}
                />
              </Field>
            </div>
          </Card>
        </fieldset>

        <aside className="tw-space-y-4 lg:tw-sticky lg:tw-top-48 lg:tw-self-start">
          <section className="tw-space-y-3 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-5 tw-text-sm tw-shadow-sm">
            <p className="tw-truncate tw-text-base tw-font-bold">{profile.companyName || profile.username}</p>
            <ReadOnly icon={User} label="نام کاربری" value={profile.username} />
            <ReadOnly icon={Smartphone} label="موبایل" value={profile.mobile} />
            <ReadOnly icon={Hash} label="کد اختصاصی حساب" value={profile.accountCode} />
            <ReadOnly icon={AtSign} label="ایمیل" value={profile.email} />
          </section>
          {/* wide screens: the aside is sticky, so the buttons stay in view next to the form */}
          <div className="tw-hidden tw-space-y-4 lg:tw-block">
            <button type="submit" disabled={saving || !dirty} className={cn(saveClass, 'tw-h-12 tw-w-full tw-text-base')}>
              <Save size={18} aria-hidden className={saving ? 'tw-animate-pulse' : undefined} />
              {saving ? 'در حال ذخیره…' : dirty ? 'ذخیره تغییرات' : 'تغییری ثبت نشده'}
            </button>
            {dirty && !saving && (
              <button type="button" onClick={() => setFields(saved)} className={cn(cancelClass, 'tw-w-full tw-py-2')}>
                لغو تغییرات
              </button>
            )}
          </div>
        </aside>
      </div>
      {/* phones: the aside comes after the whole form, so the buttons float instead */}
      <FloatingActions className="lg:tw-hidden">
        {dirty && !saving && (
          <button type="button" onClick={() => setFields(saved)} className="tw-h-10 tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-4 tw-text-sm tw-font-medium tw-text-brand-navy hover:tw-bg-brand-sky">
            لغو
          </button>
        )}
        <button type="submit" disabled={saving || !dirty} className={cn(saveClass, 'tw-h-10 tw-px-5 tw-text-sm')}>
          <Save size={16} aria-hidden className={saving ? 'tw-animate-pulse' : undefined} />
          {saving ? 'در حال ذخیره…' : dirty ? 'ذخیره تغییرات' : 'تغییری ثبت نشده'}
        </button>
      </FloatingActions>
    </form>
  );
}

export default function CompanyProfile() {
  const { isAuth, isAuthDataLoading, userRoles } = useAuth();
  if (isAuthDataLoading) return <Spinner />;
  if (!isAuth) return <Navigate to="/auth/login" replace />;
  if (!userRoles.some((role) => role.name === 'COMPANY')) return <Navigate to="/account/company" replace />;
  return (
    <PageContainer title="پروفایل | ترابوت" description="ویرایش اطلاعات شخصی و شرکتی">
      <CompanyShell>
        <div className="tw-space-y-6">
          <ProfileContent />
          <PushDeviceCard />
          <EitaaLinkCard />
        </div>
      </CompanyShell>
    </PageContainer>
  );
}
