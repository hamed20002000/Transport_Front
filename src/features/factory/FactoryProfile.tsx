import { useEffect, useState, type FormEvent } from 'react';
import { LoaderCircle, Save } from 'lucide-react';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import FloatingActions from 'src/shared/components/FloatingActions';
import { getUserProfile, profileRules, updateUserProfile, type ProfileTextField, type UserProfile } from 'src/features/company-cargo/api';
import { CardSkeleton, LoadFailed } from 'src/features/company-cargo/components';
import { setCachedProfile } from 'src/features/company-cargo/profileStore';
import VerificationCard from 'src/features/company-cargo/VerificationCard';
import type { VerificationState } from 'src/features/company-cargo/verificationApi';
import { factoryError } from './api';

type Field = { key: ProfileTextField; label: string; ltr?: boolean; wide?: boolean; required?: boolean };

const FACTORY_FIELDS: Field[] = [
  { key: 'companyName', label: 'نام کارخانه', required: true },
  { key: 'phone', label: 'شماره کارخانه', ltr: true, required: true },
  { key: 'companyNationalId', label: 'شناسه ملی', ltr: true },
  { key: 'economicCode', label: 'کد اقتصادی', ltr: true },
  { key: 'registrationNo', label: 'شماره ثبت', ltr: true },
  { key: 'postalCode', label: 'کد پستی', ltr: true },
  { key: 'address', label: 'آدرس', wide: true },
];

// a broker (واسط): the required ones are what the parent company checks it with (AccountVerificationService)
const BROKER_FIELDS: Field[] = [
  { key: 'companyName', label: 'نام واسط یا دفتر', required: true },
  { key: 'phone', label: 'شماره تماس', ltr: true, required: true },
  { key: 'companyNationalId', label: 'کد ملی یا شناسه ملی', ltr: true },
  { key: 'address', label: 'آدرس', wide: true },
];

const KINDS = {
  FACTORY: { fields: FACTORY_FIELDS, title: 'اطلاعات کارخانه' },
  BROKER: { fields: BROKER_FIELDS, title: 'اطلاعات واسط' },
};
const inputClass =
  'tw-h-11 tw-w-full tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-3 tw-text-brand-navy tw-outline-none tw-transition-colors placeholder:tw-text-brand-muted/70 focus:tw-border-brand-orange';
const latin = (value: string) => value.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

type Values = Record<ProfileTextField, string>;
const valuesOf = (profile: UserProfile, fields: Field[]) => Object.fromEntries(fields.map(({ key }) => [key, profile[key] ?? ''])) as Values;

/**
 * The factory's (or broker's) profile: what a parent company checks it with (one that signed up on its own asks for
 * that here, «درخواست بررسی اعتبار») and the name transport companies see its loads or requests under.
 */
export default function FactoryProfile({
  onVerification,
  kind = 'FACTORY',
}: {
  onVerification?: (state: VerificationState) => void;
  kind?: keyof typeof KINDS;
}) {
  const { fields: FIELDS, title } = KINDS[kind];
  const toast = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [values, setValues] = useState<Values | null>(null);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saves, setSaves] = useState(0);

  const load = () => {
    setFailed(false);
    getUserProfile().then((result) => {
      setProfile(result);
      setValues(valuesOf(result, FIELDS));
    }, () => setFailed(true));
  };
  useEffect(load, []);

  if (failed) return <LoadFailed onRetry={load} />;
  if (!profile || !values) return <CardSkeleton />;
  const saved = valuesOf(profile, FIELDS);
  const dirty = FIELDS.some(({ key }) => latin(values[key].trim()) !== saved[key]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!values) return;
    const body: Partial<Record<ProfileTextField, string | null>> = {};
    for (const { key } of FIELDS) {
      const value = latin(values[key].trim());
      if (value === saved[key]) continue;
      const { pattern, message } = profileRules[key];
      if (value && pattern && !pattern.test(value)) return toast.error(message ?? 'مقدار واردشده معتبر نیست.');
      body[key] = value || null;
    }
    setSaving(true);
    try {
      const updated = await updateUserProfile({ ...body, profileType: 1 });
      setProfile(updated);
      setValues(valuesOf(updated, FIELDS));
      setCachedProfile(updated);
      setSaves((value) => value + 1);
      toast.success('پروفایل ذخیره شد.');
    } catch (error) {
      toast.error(factoryError(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="tw-space-y-5">
      <VerificationCard dirty={dirty} version={saves} onChange={onVerification} />
      <form onSubmit={submit} noValidate className="tw-space-y-4 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-5 tw-shadow-sm" aria-busy={saving}>
        <h3 className="tw-m-0 tw-text-base tw-font-bold">{title}</h3>
        <fieldset disabled={saving} className="tw-m-0 tw-grid tw-grid-cols-1 tw-gap-4 tw-border-0 tw-p-0 sm:tw-grid-cols-2">
          {FIELDS.map(({ key, label, ltr, wide, required }) => (
            <label key={key} className={`tw-space-y-1.5 tw-text-sm tw-font-medium ${wide ? 'sm:tw-col-span-2' : ''}`}>
              {label} {required && <span className="tw-text-brand-orange" aria-hidden>*</span>}
              {wide ? (
                <textarea
                  value={values[key]}
                  maxLength={profileRules[key].max}
                  rows={2}
                  onChange={(event) => setValues({ ...values, [key]: event.target.value })}
                  className={`${inputClass} tw-h-auto tw-py-2.5 tw-leading-7`}
                />
              ) : (
                <input
                  value={values[key]}
                  maxLength={profileRules[key].max}
                  dir={ltr ? 'ltr' : undefined}
                  inputMode={ltr ? 'numeric' : undefined}
                  onChange={(event) => setValues({ ...values, [key]: event.target.value })}
                  className={`${inputClass} ${ltr ? 'tw-text-left' : ''}`}
                />
              )}
            </label>
          ))}
        </fieldset>
        <FloatingActions>
          <button
            type="submit"
            disabled={saving || !dirty}
            className="tw-inline-flex tw-h-11 tw-items-center tw-gap-2 tw-rounded-xl tw-border-0 tw-bg-brand-orange tw-px-5 tw-font-bold tw-text-white tw-shadow-lg hover:tw-bg-brand-orange-dark"
          >
            {saving ? <LoaderCircle size={18} className="tw-animate-spin" aria-hidden /> : <Save size={18} aria-hidden />} ذخیره‌ی پروفایل
          </button>
        </FloatingActions>
      </form>
    </div>
  );
}
