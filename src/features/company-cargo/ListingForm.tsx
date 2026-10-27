import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import axios from 'axios';
import { Banknote, Building2, Camera, Flag, LoaderCircle, MapPin, NotebookPen, Package, Phone, Plus, Send, Truck, Weight, X } from 'lucide-react';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { cn } from 'src/shared/utils/utils';
import { listingLimits, phonePattern, type CargoListing, type CargoListingInput } from './api';
import { uploadCargoPhoto } from './cargoDisplay';

type Fields = Omit<Required<CargoListingInput>, 'contactPhones' | 'photo'>;

// What the form can be prefilled with; null/missing values stay empty.
export type ListingDefaults = Partial<Record<keyof Fields, string | null>> & { contactPhones?: string[] | null; code?: string | null };

export type PublishedListing = CargoListing & { recipients: number; pending?: boolean; message?: string; nextAnnounceAt?: string | null };

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
  'tw-h-11 tw-w-full tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-3 tw-text-brand-navy tw-outline-none tw-transition-colors placeholder:tw-text-brand-muted/70 focus:tw-border-brand-orange';

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

// A white card on the page; a plain titled group inside the dialog, which is already a card.
function Group({ title, plain, children }: { title: string; plain: boolean; children: ReactNode }) {
  return (
    <section className={plain ? undefined : 'tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-5 tw-shadow-sm'}>
      <h3 className={cn('tw-font-bold', plain ? 'tw-mb-3 tw-text-sm tw-text-brand-muted' : 'tw-mb-4 tw-text-base')}>{title}</h3>
      {children}
    </section>
  );
}

// Mirrors buildCargoListingText in transport_backend so the company sees what drivers will receive.
function previewText(fields: Fields, phones: string[], code: string) {
  const rows: Array<[string, string]> = [
    ['کد بار', code],
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
    const response = error.response.data as { code?: string; message?: string } | undefined;
    if (response?.code === 'noCargoRecipients' && typeof response.message === 'string') return response.message;
    // the server's own Persian reason (e.g. a factory sending to a company that did not invite it)
    if (typeof response?.message === 'string' && /[\u0600-\u06FF]/.test(response.message)) return response.message;
    const { status } = error.response;
    if (status === 400) return 'اطلاعات بار معتبر نیست. فیلدها را بررسی کنید.';
    if (status === 401) return 'نشست شما منقضی شده است. دوباره وارد شوید.';
    if (status === 404) return 'بار پیدا نشد یا ثبت بار روی سرور فعال نیست.';
    if (status === 409) return 'این بار را قبلاً اعلام کرده‌اید.';
    return `خطای سرور (${status}). دوباره تلاش کنید.`;
  }
  return error instanceof Error ? error.message : 'ثبت بار انجام نشد.';
}

/**
 * Editable cargo listing with a live preview of the drivers' message. Used by the «ثبت بار» page and
 * the «اعلام بار» dialog; `initial` shows at once, `load` (company name, phones, cargo draft) fills
 * whatever the user has not typed yet. audience «company»: a factory sending its load to a transport company,
 * which announces it to drivers under its own name (no company name, no code, no drivers' preview).
 */
export default function ListingForm<T = PublishedListing>({
  variant,
  initial,
  load,
  submit,
  onDone,
  onCancel,
  submitLabel = 'ثبت و ارسال برای راننده‌ها',
  audience = 'drivers',
  disabled = false,
}: {
  variant: 'page' | 'dialog';
  initial?: ListingDefaults;
  load: () => Promise<ListingDefaults>;
  submit: (input: CargoListingInput) => Promise<T>;
  onDone: (result: T) => void;
  onCancel?: () => void;
  submitLabel?: string;
  audience?: 'drivers' | 'company';
  disabled?: boolean;
}) {
  const forCompany = audience === 'company';
  const [fields, setFields] = useState<Fields>(() => merge(empty, initial));
  const [phones, setPhones] = useState<string[]>(() => (initial?.contactPhones?.length ? initial.contactPhones.slice(0, listingLimits.phones) : ['']));
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  // Set by the server (the channel cargo's code, or a new one for a manual cargo); shown, never sent.
  const [code, setCode] = useState(initial?.code ?? '');
  const pending = useRef(false);
  const dialog = variant === 'dialog';
  // an optional photo of the load, uploaded as soon as it is chosen; without it a picture of its kind is shown
  const [photo, setPhoto] = useState<{ name: string; preview: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo.preview);
  }, [photo]);

  async function choosePhoto(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('فقط عکس (JPG، PNG یا WebP) را انتخاب کنید.');
    if (file.size > 8 * 1024 * 1024) return toast.error('حجم عکس بیشتر از ۸ مگابایت است.');
    setUploading(true);
    try {
      setPhoto({ name: await uploadCargoPhoto(file), preview: URL.createObjectURL(file) });
    } catch {
      toast.error('بارگذاری عکس انجام نشد؛ دوباره تلاش کنید.');
    } finally {
      setUploading(false);
      if (photoInput.current) photoInput.current.value = '';
    }
  }

  // The form stays usable if this fails; the user can fill the rest by hand.
  useEffect(() => {
    let active = true;
    load()
      .then((defaults) => {
        if (!active) return;
        setFields((current) => merge(current, defaults));
        if (defaults.code) setCode(defaults.code);
        setPhones((current) => (current.some((p) => p.trim()) || !defaults.contactPhones?.length ? current : defaults.contactPhones.slice(0, listingLimits.phones)));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
    // Loads once per mounted form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (name: keyof Fields) => (event: { target: { value: string } }) => setFields((current) => ({ ...current, [name]: event.target.value }));

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    const origin = fields.origin.trim();
    const destination = fields.destination.trim();
    const contactPhones = phones.map((p) => p.trim()).filter(Boolean);
    if (!origin || !destination) return toast.error('مبدأ و مقصد را وارد کنید.');
    if (!contactPhones.length) return toast.error('حداقل یک شماره تماس وارد کنید.');
    if (contactPhones.some((p) => !phonePattern.test(p))) return toast.error('شماره تماس معتبر نیست؛ فقط رقم و + - ( ) بین ۵ تا ۲۰ کاراکتر.');

    const optional = (value: string) => value.trim() || undefined;
    pending.current = true;
    setSaving(true);
    try {
      const listing = await submit({
        companyName: forCompany ? undefined : optional(fields.companyName),
        origin,
        destination,
        cargoType: optional(fields.cargoType),
        weight: optional(fields.weight),
        vehicleType: optional(fields.vehicleType),
        price: optional(fields.price),
        extraNotes: optional(fields.extraNotes),
        contactPhones,
        ...(photo && { photo: photo.name }),
      });
      onDone(listing);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  const inputs = (
    <fieldset disabled={saving || disabled || uploading} className={cn('tw-m-0 tw-min-w-0 tw-border-0 tw-p-0', dialog ? 'tw-space-y-5' : 'tw-space-y-6')}>
      {code && !forCompany && (
        <p className="tw-m-0 tw-flex tw-items-center tw-gap-2 tw-text-sm">
          <span className="tw-text-brand-muted">کد بار</span>
          <span dir="ltr" className="tw-rounded-lg tw-bg-brand-sky tw-px-2 tw-py-0.5 tw-font-bold">
            {code}
          </span>
          <span className="tw-text-xs tw-text-brand-muted">همین کد برای راننده‌ها فرستاده می‌شود</span>
        </p>
      )}

      <Group title="مسیر" plain={dialog}>
        <p className="tw-m-0 tw-mb-3 tw-text-xs tw-text-brand-muted">
          {forCompany
            ? 'بار به «بارهای پیشنهادی» شرکت حمل‌ونقل می‌رود و شرکت آن را برای رانندگان اعلام می‌کند.'
            : 'نوع حمل از مبدأ و مقصد تشخیص داده می‌شود (داخل ایران: داخلی، ایران به خارج: صادراتی، خارج به ایران: وارداتی) و بار فقط به راننده‌های همان نوع می‌رسد.'}
        </p>
        <div className="tw-grid tw-grid-cols-1 tw-gap-4 sm:tw-grid-cols-2">
          <Field label="مبدأ بارگیری" icon={MapPin} required>
            <input className={inputClass} value={fields.origin} onChange={set('origin')} maxLength={listingLimits.origin} placeholder="مثلاً تهران، انبار شادآباد" required />
          </Field>
          <Field label="مقصد تخلیه" icon={Flag} required>
            <input className={inputClass} value={fields.destination} onChange={set('destination')} maxLength={listingLimits.destination} placeholder="مثلاً اصفهان" required />
          </Field>
        </div>
      </Group>

      <Group title="مشخصات بار" plain={dialog}>
        <div className="tw-grid tw-grid-cols-1 tw-gap-4 sm:tw-grid-cols-2">
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
              className={cn(inputClass, 'tw-h-auto tw-py-2.5 tw-leading-7', dialog ? 'tw-min-h-[4.5rem]' : 'tw-min-h-[6rem]')}
              value={fields.extraNotes}
              onChange={set('extraNotes')}
              maxLength={listingLimits.extraNotes}
              placeholder="زمان بارگیری، شرایط پرداخت و…"
            />
          </Field>
        </div>
        <div className="tw-mt-4 tw-space-y-1.5">
          <span className="tw-flex tw-items-center tw-gap-1.5 tw-text-sm tw-font-medium">
            <Camera size={15} aria-hidden className="tw-text-brand-muted" /> عکس بار <span className="tw-text-xs tw-font-normal tw-text-brand-muted">(اختیاری؛ بدون آن تصویری از نوع بار نشان داده می‌شود)</span>
          </span>
          <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" className="tw-hidden" onChange={(e) => void choosePhoto(e.target.files?.[0])} />
          {photo ? (
            <div className="tw-flex tw-items-center tw-gap-3">
              <img src={photo.preview} alt="عکس بار" className="tw-h-20 tw-w-32 tw-rounded-xl tw-object-cover" />
              <button type="button" onClick={() => setPhoto(null)} className="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-lg tw-bg-transparent tw-px-1 tw-py-1 tw-text-sm tw-font-medium tw-text-red-600">
                <X size={16} aria-hidden /> حذف عکس
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => photoInput.current?.click()}
              className="tw-inline-flex tw-h-11 tw-items-center tw-gap-2 tw-rounded-xl tw-border tw-border-dashed tw-border-brand-line tw-bg-white tw-px-4 tw-text-sm tw-font-medium hover:tw-border-brand-orange"
            >
              {uploading ? <LoaderCircle size={16} className="tw-animate-spin" aria-hidden /> : <Camera size={16} aria-hidden />}
              {uploading ? 'در حال بارگذاری…' : 'انتخاب عکس'}
            </button>
          )}
        </div>
      </Group>

      <Group title="اطلاعات تماس" plain={dialog}>
        <div className="tw-space-y-4">
          {!forCompany && (
            <Field label="نام شرکت" icon={Building2}>
              <input className={inputClass} value={fields.companyName} onChange={set('companyName')} maxLength={listingLimits.companyName} />
            </Field>
          )}
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
      </Group>
    </fieldset>
  );

  const preview = <p className="tw-m-0 tw-whitespace-pre-wrap tw-rounded-xl tw-bg-brand-bg tw-p-3 tw-text-sm tw-leading-7">{previewText(fields, phones, code)}</p>;

  const submitButton = (
    <button
      type="submit"
      disabled={saving || disabled}
      className={cn(
        'tw-flex tw-items-center tw-justify-center tw-gap-2 tw-rounded-xl tw-bg-brand-orange tw-font-bold tw-text-white tw-shadow-sm tw-transition-colors hover:tw-bg-brand-orange-dark disabled:tw-cursor-not-allowed disabled:tw-opacity-50',
        dialog ? 'tw-h-11 tw-flex-1 tw-px-5 tw-text-sm sm:tw-flex-none' : 'tw-h-12 tw-w-full tw-text-base',
      )}
    >
      <Send size={18} aria-hidden className={saving ? 'tw-animate-pulse' : undefined} />
      {saving ? 'در حال ارسال…' : submitLabel}
    </button>
  );

  if (dialog)
    return (
      <form onSubmit={onSubmit} noValidate className="tw-flex tw-min-h-0 tw-flex-1 tw-flex-col">
        <div className="tw-min-h-0 tw-flex-1 tw-space-y-5 tw-overflow-y-auto tw-px-5 tw-py-4">
          {inputs}
          <details className="tw-group">
            <summary className="tw-cursor-pointer tw-text-sm tw-font-bold tw-text-brand-muted hover:tw-text-brand-navy">پیش‌نمایش پیام راننده</summary>
            <div className="tw-mt-3">{preview}</div>
          </details>
        </div>
        <div className="tw-space-y-3 tw-border-t tw-border-brand-line tw-px-5 tw-py-3">
          <div className="tw-flex tw-items-center tw-justify-end tw-gap-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={saving}
                className="tw-h-11 tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-4 tw-text-sm tw-font-medium tw-text-brand-navy hover:tw-bg-brand-sky"
              >
                انصراف
              </button>
            )}
            {submitButton}
          </div>
        </div>
      </form>
    );

  return (
    <form onSubmit={onSubmit} noValidate className="tw-grid tw-grid-cols-1 tw-gap-6 lg:tw-grid-cols-[1fr_20rem]">
      {inputs}
      <aside className="tw-space-y-4 lg:tw-sticky lg:tw-top-48 lg:tw-self-start">
        <section className="tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-5 tw-shadow-sm">
          <h2 className="tw-mb-3 tw-text-base tw-font-bold">{forCompany ? 'پیش‌نمایش بار' : 'پیش‌نمایش پیام راننده'}</h2>
          {preview}
        </section>
        {submitButton}
      </aside>
    </form>
  );
}

function merge(current: Fields, defaults?: ListingDefaults): Fields {
  const next = { ...current };
  for (const key of Object.keys(empty) as Array<keyof Fields>) next[key] = current[key] || defaults?.[key] || '';
  return next;
}
