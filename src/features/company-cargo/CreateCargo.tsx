import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Banknote,
  Building2,
  Flag,
  MapPin,
  NotebookPen,
  Package,
  Phone,
  Plus,
  Send,
  TriangleAlert,
  Truck,
  Weight,
  X,
} from 'lucide-react';
import { useAuth } from 'src/core/auth/AuthContext';
import PageContainer from 'src/shared/components/container/PageContainer';
import Spinner from 'src/shared/components/spinner/Spinner';
import { cn } from 'src/shared/utils/utils';
import { createListing, getListingDefaults, listingLimits, phonePattern, type CargoListingInput } from './api';
import CompanyShell from './CompanyShell';
import { SectionTitle } from './components';

type Fields = Omit<Required<CargoListingInput>, 'contactPhones'>;

const empty: Fields = {
  companyName: '',
  origin: '',
  destination: '',
  cargoType: '',
  weight: '',
  vehicleType: '',
  price: '',
  extraNotes: '',
};

const inputClass =
  'tw-h-11 tw-w-full tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-3 tw-text-brand-navy tw-outline-none tw-transition-colors placeholder:tw-text-brand-muted/70 focus:tw-border-brand-orange focus:tw-ring-4 focus:tw-ring-brand-orange-soft';

function Field({ label, icon: Icon, required, children }: { label: string; icon: typeof MapPin; required?: boolean; children: ReactNode }) {
  return (
    <label className="tw-block tw-space-y-1.5">
      <span className="tw-flex tw-items-center tw-gap-1.5 tw-text-sm tw-font-medium">
        <Icon size={15} aria-hidden className="tw-text-brand-muted" />
        {label}
        {required && <span className="tw-text-brand-orange" aria-hidden>*</span>}
      </span>
      {children}
    </label>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-5 tw-shadow-sm">
      <h2 className="tw-mb-4 tw-text-base tw-font-bold">{title}</h2>
      {children}
    </section>
  );
}

// Mirrors buildCargoListingText in transport_backend so the company sees what drivers will receive.
function previewText(fields: Fields, phones: string[]) {
  const rows: Array<[string, string]> = [
    ['شرکت', fields.companyName],
    ['مبدا', fields.origin],
    ['مقصد', fields.destination],
    ['نوع بار', fields.cargoType],
    ['وزن', fields.weight],
    ['نوع ماشین', fields.vehicleType],
    ['کرایه', fields.price],
    ['توضیحات', fields.extraNotes],
    ['تماس', phones.map((p) => p.trim()).filter(Boolean).join(' - ')],
  ];
  return ['🚚 بار جدید', ...rows.filter(([, value]) => value.trim()).map(([title, value]) => `${title}: ${value.trim()}`)].join('\n');
}

function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'ارتباط با سرور برقرار نشد. اتصال را بررسی و دوباره تلاش کنید.';
    const { status } = error.response;
    if (status === 400) return 'اطلاعات بار معتبر نیست. فیلدها را بررسی کنید.';
    if (status === 401) return 'نشست شما منقضی شده است. دوباره وارد شوید.';
    if (status === 404) return 'ثبت بار روی سرور فعال نیست.';
    return `خطای سرور (${status}). دوباره تلاش کنید.`;
  }
  return error instanceof Error ? error.message : 'ثبت بار انجام نشد.';
}

function CreateForm() {
  const navigate = useNavigate();
  const [fields, setFields] = useState<Fields>(empty);
  const [phones, setPhones] = useState<string[]>(['']);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);

  // Prefill company name and phones; the form stays usable if this fails.
  useEffect(() => {
    let active = true;
    getListingDefaults()
      .then((defaults) => {
        if (!active) return;
        setFields((current) => ({ ...current, companyName: current.companyName || defaults.companyName || '' }));
        setPhones((current) => (current.some((p) => p.trim()) || !defaults.contactPhones.length ? current : defaults.contactPhones.slice(0, listingLimits.phones)));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const set = (name: keyof Fields) => (event: { target: { value: string } }) =>
    setFields((current) => ({ ...current, [name]: event.target.value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    setError('');
    const origin = fields.origin.trim();
    const destination = fields.destination.trim();
    const contactPhones = phones.map((p) => p.trim()).filter(Boolean);
    if (!origin || !destination) return setError('مبدأ و مقصد را وارد کنید.');
    if (!contactPhones.length) return setError('حداقل یک شماره تماس وارد کنید.');
    if (contactPhones.some((p) => !phonePattern.test(p))) return setError('شماره تماس معتبر نیست؛ فقط رقم و + - ( ) بین ۵ تا ۲۰ کاراکتر.');

    const optional = (value: string) => value.trim() || undefined;
    pending.current = true;
    setSaving(true);
    try {
      const listing = await createListing({
        companyName: optional(fields.companyName),
        origin,
        destination,
        cargoType: optional(fields.cargoType),
        weight: optional(fields.weight),
        vehicleType: optional(fields.vehicleType),
        price: optional(fields.price),
        extraNotes: optional(fields.extraNotes),
        contactPhones,
      });
      navigate('/account/company/cargo?tab=listings', { state: { createdRecipients: listing.recipients } });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="tw-space-y-6">
      <SectionTitle title="ثبت بار جدید" hint="بار به نام شرکت شما برای راننده‌های مشترک فرستاده می‌شود" />
      <div className="tw-grid tw-gap-6 lg:tw-grid-cols-[1fr_20rem]">
        <fieldset disabled={saving} className="tw-m-0 tw-min-w-0 tw-space-y-6 tw-border-0 tw-p-0">
          <Card title="مسیر">
            <div className="tw-grid tw-gap-4 sm:tw-grid-cols-2">
              <Field label="مبدأ بارگیری" icon={MapPin} required>
                <input className={inputClass} value={fields.origin} onChange={set('origin')} maxLength={listingLimits.origin} placeholder="مثلاً تهران، انبار شادآباد" required />
              </Field>
              <Field label="مقصد تخلیه" icon={Flag} required>
                <input className={inputClass} value={fields.destination} onChange={set('destination')} maxLength={listingLimits.destination} placeholder="مثلاً اصفهان" required />
              </Field>
            </div>
          </Card>

          <Card title="مشخصات بار">
            <div className="tw-grid tw-gap-4 sm:tw-grid-cols-2">
              <Field label="نوع بار" icon={Package}>
                <input className={inputClass} value={fields.cargoType} onChange={set('cargoType')} maxLength={listingLimits.cargoType} placeholder="مثلاً کاشی و سرامیک" />
              </Field>
              <Field label="وزن" icon={Weight}>
                <input className={inputClass} value={fields.weight} onChange={set('weight')} maxLength={listingLimits.weight} placeholder="مثلاً ۲۲ تن" />
              </Field>
              <Field label="نوع خودرو" icon={Truck}>
                <input className={inputClass} value={fields.vehicleType} onChange={set('vehicleType')} maxLength={listingLimits.vehicleType} placeholder="مثلاً تریلی کفی" />
              </Field>
              <Field label="کرایه" icon={Banknote}>
                <input className={inputClass} value={fields.price} onChange={set('price')} maxLength={listingLimits.price} placeholder="مثلاً ۴۵ میلیون تومان" />
              </Field>
            </div>
            <div className="tw-mt-4">
              <Field label="توضیحات" icon={NotebookPen}>
                <textarea
                  className={cn(inputClass, 'tw-h-auto tw-min-h-[6rem] tw-py-2.5 tw-leading-7')}
                  value={fields.extraNotes}
                  onChange={set('extraNotes')}
                  maxLength={listingLimits.extraNotes}
                  placeholder="زمان بارگیری، شرایط پرداخت و…"
                />
              </Field>
            </div>
          </Card>

          <Card title="اطلاعات تماس">
            <div className="tw-space-y-4">
              <Field label="نام شرکت" icon={Building2}>
                <input className={inputClass} value={fields.companyName} onChange={set('companyName')} maxLength={listingLimits.companyName} />
              </Field>
              <div className="tw-space-y-1.5">
                <span className="tw-flex tw-items-center tw-gap-1.5 tw-text-sm tw-font-medium">
                  <Phone size={15} aria-hidden className="tw-text-brand-muted" />
                  شماره‌های تماس
                  <span className="tw-text-brand-orange" aria-hidden>*</span>
                </span>
                {phones.map((phone, index) => (
                  <div key={index} className="tw-flex tw-gap-2">
                    <input
                      className={cn(inputClass, 'tw-text-left')}
                      dir="ltr"
                      inputMode="tel"
                      value={phone}
                      aria-label={`شماره تماس ${index + 1}`}
                      maxLength={20}
                      placeholder="0912 123 4567"
                      onChange={(e) => setPhones((current) => current.map((p, i) => (i === index ? e.target.value : p)))}
                    />
                    {phones.length > 1 && (
                      <button
                        type="button"
                        aria-label="حذف شماره"
                        title="حذف شماره"
                        onClick={() => setPhones((current) => current.filter((_, i) => i !== index))}
                        className="tw-flex tw-h-11 tw-w-11 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-text-brand-muted hover:tw-border-red-300 hover:tw-text-red-600"
                      >
                        <X size={18} aria-hidden />
                      </button>
                    )}
                  </div>
                ))}
                {phones.length < listingLimits.phones && (
                  <button
                    type="button"
                    onClick={() => setPhones((current) => [...current, ''])}
                    className="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-lg tw-bg-transparent tw-px-1 tw-py-1 tw-text-sm tw-font-medium tw-text-brand-orange-ink hover:tw-text-brand-orange"
                  >
                    <Plus size={16} aria-hidden /> افزودن شماره
                  </button>
                )}
              </div>
            </div>
          </Card>
        </fieldset>

        <aside className="tw-space-y-4 lg:tw-sticky lg:tw-top-36 lg:tw-self-start">
          <section className="tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-5 tw-shadow-sm">
            <h2 className="tw-mb-3 tw-text-base tw-font-bold">پیش‌نمایش پیام راننده</h2>
            <p className="tw-whitespace-pre-wrap tw-rounded-xl tw-bg-brand-bg tw-p-3 tw-text-sm tw-leading-7">{previewText(fields, phones)}</p>
          </section>
          {error && (
            <div role="alert" className="tw-flex tw-items-start tw-gap-2 tw-rounded-2xl tw-border tw-border-red-200 tw-bg-red-50 tw-p-4 tw-text-sm tw-text-red-800">
              <TriangleAlert size={18} aria-hidden className="tw-mt-0.5" />
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={saving}
            className="tw-flex tw-h-12 tw-w-full tw-items-center tw-justify-center tw-gap-2 tw-rounded-xl tw-bg-brand-orange tw-text-base tw-font-bold tw-text-white tw-shadow-sm tw-transition-colors hover:tw-bg-brand-orange-dark"
          >
            <Send size={18} aria-hidden className={saving ? 'tw-animate-pulse' : undefined} />
            {saving ? 'در حال ثبت…' : 'ثبت و ارسال برای راننده‌ها'}
          </button>
        </aside>
      </div>
    </form>
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
