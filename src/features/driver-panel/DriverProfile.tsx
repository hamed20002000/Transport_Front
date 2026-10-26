import { driverKindHints, driverKindLabels, driverKindOf, driverKindTripTypes, type DriverKind } from 'src/features/company-cargo/api';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Camera,
  CreditCard,
  IdCard,
  ImagePlus,
  Info,
  MapPin,
  RefreshCw,
  Save,
  Smartphone,
  Trash2,
  Truck,
  User,
  Weight,
  type LucideIcon,
} from 'lucide-react';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { cn } from 'src/shared/utils/utils';
import { shrinkImage } from 'src/shared/utils/image';
import { getUserProfile, toLatinDigits } from 'src/features/company-cargo/api';
import { setCachedProfile } from 'src/features/company-cargo/profileStore';
import { CardSkeleton, LoadFailed, SectionTitle } from 'src/features/company-cargo/components';
import {
  deleteDriverPhoto,
  errorMessage,
  fetchDriverPhoto,
  getDriverProfile,
  getDriverCompanies,
  type DriverCompany,
  updateDriverProfile,
  uploadDriverPhoto,
  type DriverPhotoKind,
  type DriverProfile,
  type DriverProfileInput,
} from './api';
import DriverShell from './DriverShell';
import { useDomainRefresh } from 'src/features/ai-agent/hooks/Usedomainrefres';
import { useMessageBox } from 'src/shared/components/message-box/MessageBoxProvider';

type TextKey = 'firstName' | 'lastName' | 'nationalCode' | 'smartCardNumber' | 'licenseNumber' | 'homeCity' | 'vehicleType' | 'vehicleModel' | 'fleetCardNumber';
type Plate = { left: string; letter: string; middle: string; region: string };
type Fields = Record<TextKey, string> & { capacityTons: string; plate: Plate };

const textKeys: TextKey[] = ['firstName', 'lastName', 'nationalCode', 'smartCardNumber', 'licenseNumber', 'homeCity', 'vehicleType', 'vehicleModel', 'fleetCardNumber'];

// Same rules as UpdateDriverProfileDto.
const rules: Partial<Record<TextKey, { pattern: RegExp; message: string }>> = {
  nationalCode: { pattern: /^[0-9]{10}$/, message: 'کد ملی باید ۱۰ رقم باشد.' },
  smartCardNumber: { pattern: /^[0-9]{5,20}$/, message: 'شماره کارت هوشمند فقط رقم است.' },
  licenseNumber: { pattern: /^[0-9]{5,20}$/, message: 'شماره گواهینامه فقط رقم است.' },
  fleetCardNumber: { pattern: /^[0-9]{5,20}$/, message: 'شماره کارت ناوگان فقط رقم است.' },
};

// Persian letters used on Iranian plates; «الف» is stored as «ا».
const plateLetters = ['ع', 'ب', 'پ', 'ت', 'ث', 'ج', 'د', 'ز', 'س', 'ش', 'ص', 'ط', 'ف', 'ق', 'ک', 'گ', 'ل', 'م', 'ن', 'و', 'ه', 'ی', 'ا'];
const vehicleTypes = ['تریلی کفی', 'تریلی چادری', 'تریلی کمپرسی', 'یخچال‌دار', 'تانکر', 'بونکر', 'ده‌چرخ', 'جفت', 'تک', 'خاور', 'نیسان', 'وانت'];

const emptyPlate: Plate = { left: '', letter: 'ع', middle: '', region: '' };

function parsePlate(value: string | null): Plate {
  const [left, letter, middle, region] = (value ?? '').split('-');
  return value ? { left, letter, middle, region } : emptyPlate;
}

const plateFilled = (p: Plate) => !!(p.left || p.middle || p.region);
const plateValid = (p: Plate) => /^\d{2}$/.test(p.left) && /^\d{3}$/.test(p.middle) && /^\d{2}$/.test(p.region) && !!p.letter;
const plateValue = (p: Plate) => (plateFilled(p) ? `${p.left}-${p.letter}-${p.middle}-${p.region}` : null);

function toFields(profile: DriverProfile): Fields {
  const fields = { capacityTons: profile.capacityTons == null ? '' : String(profile.capacityTons), plate: parsePlate(profile.plate) } as Fields;
  for (const key of textKeys) fields[key] = profile[key] ?? '';
  return fields;
}

const same = (a: Fields, b: Fields) => JSON.stringify(a) === JSON.stringify(b);

const inputClass =
  'tw-h-11 tw-w-full tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-3 tw-text-brand-navy tw-outline-none tw-transition-colors placeholder:tw-text-brand-muted/70 focus:tw-border-brand-orange aria-[invalid=true]:tw-border-red-400';

function Field({ label, icon: Icon, error, hint, className, children }: { label: string; icon: LucideIcon; error?: string; hint?: string; className?: string; children: ReactNode }) {
  return (
    <label className={cn('tw-block tw-space-y-1.5', className)}>
      <span className="tw-flex tw-items-center tw-gap-1.5 tw-text-sm tw-font-medium">
        <Icon size={15} aria-hidden className="tw-text-brand-muted" />
        {label}
      </span>
      {children}
      {error ? <span className="tw-block tw-text-xs tw-text-red-600">{error}</span> : hint && <span className="tw-block tw-text-xs tw-text-brand-muted">{hint}</span>}
    </label>
  );
}

function Card({ title, hint, icon: Icon, children }: { title: string; hint: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <section className="tw-overflow-hidden tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-shadow-sm">
      <header className="tw-flex tw-items-center tw-gap-3 tw-border-b tw-border-brand-line tw-bg-brand-sky/50 tw-px-5 tw-py-3">
        <span className="tw-flex tw-h-9 tw-w-9 tw-items-center tw-justify-center tw-rounded-lg tw-bg-white tw-text-brand-navy tw-shadow-sm">
          <Icon size={18} aria-hidden />
        </span>
        <div>
          <h3 className="tw-m-0 tw-text-base tw-font-bold">{title}</h3>
          <p className="tw-m-0 tw-text-xs tw-text-brand-muted">{hint}</p>
        </div>
      </header>
      <div className="tw-grid tw-grid-cols-1 tw-gap-4 tw-p-5 sm:tw-grid-cols-2">{children}</div>
    </section>
  );
}

// Looks like an Iranian plate: blue band, 2 digits, letter, 3 digits | «ایران» + region code. Reads left to right.
function PlateInput({ value, onChange, invalid }: { value: Plate; onChange: (plate: Plate) => void; invalid: boolean }) {
  const digits = (text: string, size: number) => toLatinDigits(text).replace(/\D/g, '').slice(0, size);
  const box = 'tw-h-full tw-min-w-0 tw-border-0 tw-bg-transparent tw-text-center tw-text-xl sm:tw-text-2xl tw-font-bold tw-tracking-widest tw-text-brand-navy tw-outline-none placeholder:tw-text-stone-300';
  return (
    <div
      dir="ltr"
      className={cn(
        'tw-flex tw-h-16 tw-w-full tw-max-w-sm tw-overflow-hidden tw-rounded-xl tw-border-[3px] tw-bg-white tw-shadow-sm',
        invalid ? 'tw-border-red-400' : 'tw-border-brand-navy focus-within:tw-border-brand-orange',
      )}
    >
      <div className="tw-flex tw-w-9 tw-shrink-0 tw-flex-col tw-items-center tw-justify-center tw-gap-1 tw-bg-[#1D4ED8] tw-text-white" aria-hidden>
        <span className="tw-flex tw-h-3.5 tw-w-5 tw-flex-col tw-overflow-hidden tw-rounded-[2px]">
          <span className="tw-flex-1 tw-bg-green-500" />
          <span className="tw-flex-1 tw-bg-white" />
          <span className="tw-flex-1 tw-bg-red-500" />
        </span>
        <span className="tw-text-[7px] tw-font-bold tw-leading-[1.1]">I.R.<br />IRAN</span>
      </div>
      <input aria-label="دو رقم اول پلاک" inputMode="numeric" placeholder="۱۲" value={value.left} onChange={(e) => onChange({ ...value, left: digits(e.target.value, 2) })} className={cn(box, 'tw-w-[22%]')} />
      <select aria-label="حرف پلاک" value={value.letter} onChange={(e) => onChange({ ...value, letter: e.target.value })} className={cn(box, 'tw-w-[18%] tw-cursor-pointer tw-appearance-none tw-tracking-normal')}>
        {plateLetters.map((letter) => (
          <option key={letter} value={letter}>
            {letter === 'ا' ? 'الف' : letter}
          </option>
        ))}
      </select>
      <input aria-label="سه رقم پلاک" inputMode="numeric" placeholder="۳۴۵" value={value.middle} onChange={(e) => onChange({ ...value, middle: digits(e.target.value, 3) })} className={cn(box, 'tw-w-[30%]')} />
      <div className="tw-flex tw-w-[22%] tw-shrink-0 tw-flex-col tw-items-center tw-justify-center tw-border-l-[3px] tw-border-brand-navy">
        <span className="tw-text-[10px] tw-font-bold tw-leading-none tw-text-brand-navy" aria-hidden>ایران</span>
        <input aria-label="کد استان پلاک" inputMode="numeric" placeholder="۶۷" value={value.region} onChange={(e) => onChange({ ...value, region: digits(e.target.value, 2) })} className={cn(box, 'tw-h-8 tw-w-full tw-text-xl')} />
      </div>
    </div>
  );
}

// The server's limit too (driverProfile.service MAX_PHOTO_BYTES); checked after the photo is scaled down.
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

function PhotoSlot({ kind, title, hint, version, onChange }: { kind: DriverPhotoKind; title: string; hint: string; version: string | null; onChange: (profile: DriverProfile) => void }) {
  const toast = useToast();
  const messageBox = useMessageBox();
  const input = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!version) return setSrc(null);
    let url = '';
    let active = true;
    fetchDriverPhoto(kind)
      .then((objectUrl) => {
        url = objectUrl;
        if (active) setSrc(objectUrl);
        else URL.revokeObjectURL(objectUrl);
      })
      .catch(() => active && setSrc(null));
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [kind, version]);

  async function run(action: () => Promise<DriverProfile>, done: string) {
    setBusy(true);
    try {
      onChange(await action());
      toast.success(done);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function pick(file: File | undefined) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return toast.error('فقط عکس JPG، PNG یا WebP قابل قبول است.');
    // scaled down on the phone first (shrinkImage): a camera photo of several MB uploads as a few hundred KB
    run(async () => {
      const photo = await shrinkImage(file);
      if (photo.size > MAX_PHOTO_BYTES) throw new Error('حجم عکس زیاد است (حداکثر ۳ مگابایت). عکس دیگری انتخاب کنید.');
      return uploadDriverPhoto(kind, photo);
    }, 'عکس ذخیره شد.');
  }

  return (
    <div className="tw-space-y-2">
      <div className="tw-flex tw-items-center tw-justify-between tw-gap-2">
        <span className="tw-flex tw-items-center tw-gap-1.5 tw-text-sm tw-font-medium">
          <Camera size={15} aria-hidden className="tw-text-brand-muted" /> {title}
          <span className="tw-text-xs tw-font-normal tw-text-brand-muted">(اختیاری)</span>
        </span>
        {version && (
          <div className="tw-flex tw-gap-1">
            <button type="button" disabled={busy} onClick={() => input.current?.click()} title="تعویض عکس" aria-label={`تعویض ${title}`} className="tw-flex tw-h-8 tw-w-8 tw-items-center tw-justify-center tw-rounded-lg tw-bg-transparent tw-text-brand-muted hover:tw-bg-brand-sky hover:tw-text-brand-navy">
              <RefreshCw size={15} aria-hidden />
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={async () => (await messageBox.confirm({ message: `${title} حذف شود؟`, tone: 'danger', confirmText: 'حذف' })) && run(() => deleteDriverPhoto(kind), 'عکس حذف شد.')}
              title="حذف عکس"
              aria-label={`حذف ${title}`}
              className="tw-flex tw-h-8 tw-w-8 tw-items-center tw-justify-center tw-rounded-lg tw-bg-transparent tw-text-brand-muted hover:tw-bg-red-50 hover:tw-text-red-600"
            >
              <Trash2 size={15} aria-hidden />
            </button>
          </div>
        )}
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          pick(e.dataTransfer.files[0]);
        }}
        className={cn(
          'tw-relative tw-flex tw-aspect-[4/3] tw-w-full tw-items-center tw-justify-center tw-overflow-hidden tw-rounded-2xl tw-transition-colors',
          version ? 'tw-border tw-border-brand-line tw-bg-brand-bg' : 'tw-border-2 tw-border-dashed tw-border-brand-line tw-bg-brand-bg/60 hover:tw-border-brand-orange/60 hover:tw-bg-brand-orange-soft/30',
        )}
      >
        {src ? (
          <img src={src} alt={title} className="tw-h-full tw-w-full tw-object-cover" />
        ) : version ? (
          <span className="tw-h-full tw-w-full tw-animate-pulse tw-bg-brand-sky" />
        ) : (
          <span className="tw-flex tw-flex-col tw-items-center tw-gap-2 tw-px-4 tw-text-center">
            <span className="tw-flex tw-h-12 tw-w-12 tw-items-center tw-justify-center tw-rounded-full tw-bg-white tw-text-brand-orange tw-shadow-sm">
              <ImagePlus size={22} aria-hidden />
            </span>
            <span className="tw-text-sm tw-font-bold">انتخاب یا رها کردن عکس</span>
            <span className="tw-text-xs tw-text-brand-muted">{hint}</span>
          </span>
        )}
        {busy && (
          <span className="tw-absolute tw-inset-0 tw-flex tw-items-center tw-justify-center tw-bg-white/70 tw-text-sm tw-font-bold" role="status">
            در حال ارسال…
          </span>
        )}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="tw-hidden"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}

function completion(fields: Fields, profile: DriverProfile) {
  const checks = [
    fields.firstName,
    fields.lastName,
    fields.nationalCode,
    fields.smartCardNumber,
    fields.licenseNumber,
    fields.homeCity,
    fields.vehicleType,
    fields.capacityTons,
    plateValid(fields.plate),
  ];
  const done = checks.filter(Boolean).length;
  return { percent: Math.round((done / checks.length) * 100), photos: +!!profile.photos.face + +!!profile.photos.vehicle + +!!profile.photos.plate };
}

function ProfileContent() {
  const toast = useToast();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [fields, setFields] = useState<Fields | null>(null);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [version, setVersion] = useState(0);
  // پروفایلی که با agent ویرایش شد همین‌جا دیده شود
  useDomainRefresh('driver_profile', () => setVersion((v) => v + 1), 'account');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    let active = true;
    setFailed(false);
    getDriverProfile()
      .then((loaded) => {
        if (!active) return;
        setProfile(loaded);
        setFields(toFields(loaded));
      })
      .catch((error) => {
        if (!active) return;
        setFailed(true);
        toast.error(errorMessage(error));
      });
    return () => {
      active = false;
    };
  }, [version, toast]);

  if (failed) return <LoadFailed onRetry={() => setVersion((v) => v + 1)} />;
  if (!profile || !fields)
    return (
      <div className="tw-space-y-4" role="status" aria-label="در حال دریافت پروفایل">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );

  const saved = toFields(profile);
  const dirty = !same(fields, saved);
  const errors: Partial<Record<TextKey | 'plate' | 'capacityTons', string>> = {};
  for (const [key, rule] of Object.entries(rules) as Array<[TextKey, { pattern: RegExp; message: string }]>) {
    if (fields[key] && !rule.pattern.test(fields[key])) errors[key] = rule.message;
  }
  if (plateFilled(fields.plate) && !plateValid(fields.plate)) errors.plate = 'پلاک را کامل وارد کنید: دو رقم، حرف، سه رقم و کد استان.';
  const tons = Number(fields.capacityTons);
  if (fields.capacityTons && (!Number.isFinite(tons) || tons < 0.5 || tons > 100)) errors.capacityTons = 'ظرفیت بین ۰٫۵ تا ۱۰۰ تن است.';
  const shownErrors = touched ? errors : {};
  const { percent, photos } = completion(fields, profile);
  const name = [fields.firstName, fields.lastName].filter(Boolean).join(' ');

  const set = (key: TextKey, value: string, digitsOnly = false) =>
    setFields({ ...fields, [key]: digitsOnly ? toLatinDigits(value).replace(/\D/g, '') : value });

  async function save(event?: FormEvent) {
    event?.preventDefault();
    setTouched(true);
    if (Object.keys(errors).length) return toast.error('چند فیلد نیاز به اصلاح دارد.');
    const input: DriverProfileInput = {};
    for (const key of textKeys) if (fields![key] !== saved[key]) input[key] = fields![key].trim() || null;
    if (fields!.capacityTons !== saved.capacityTons) input.capacityTons = fields!.capacityTons ? tons : null;
    if (JSON.stringify(fields!.plate) !== JSON.stringify(saved.plate)) input.plate = plateValue(fields!.plate);
    setSaving(true);
    try {
      const updated = await updateDriverProfile(input);
      setProfile(updated);
      setFields(toFields(updated));
      setTouched(false);
      toast.success('پروفایل ذخیره شد.');
      // نام در سربرگ پنل
      getUserProfile()
        .then(setCachedProfile)
        .catch(() => undefined);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  const text = (key: TextKey, placeholder: string, options: { digits?: boolean; max?: number; ltr?: boolean } = {}) => (
    <input
      value={fields[key]}
      onChange={(e) => set(key, e.target.value, options.digits)}
      onBlur={() => setTouched(true)}
      placeholder={placeholder}
      maxLength={options.max ?? 100}
      inputMode={options.digits ? 'numeric' : undefined}
      dir={options.ltr ? 'ltr' : undefined}
      aria-invalid={!!shownErrors[key]}
      className={cn(inputClass, options.ltr && 'tw-text-left')}
    />
  );

  return (
    <form onSubmit={save} className="tw-space-y-6" noValidate>
      <SectionTitle title="پروفایل راننده" hint="این اطلاعات به شرکت‌ها کمک می‌کند درخواست شما را سریع‌تر قبول کنند" />

      <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-5 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-5 tw-shadow-sm">
        <div
          className="tw-relative tw-flex tw-h-20 tw-w-20 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full"
          style={{ background: `conic-gradient(#F5761A ${percent * 3.6}deg, #E3E9F4 0)` }}
          role="img"
          aria-label={`پروفایل ${percent.toLocaleString('fa-IR')} درصد کامل است`}
        >
          <span className="tw-flex tw-h-[4.25rem] tw-w-[4.25rem] tw-items-center tw-justify-center tw-rounded-full tw-bg-brand-navy tw-text-xl sm:tw-text-2xl tw-font-bold tw-text-brand-orange">
            {name ? name.trim()[0] : <User size={28} aria-hidden />}
          </span>
        </div>
        <div className="tw-min-w-0 tw-flex-1 tw-space-y-1">
          <strong className="tw-block tw-truncate tw-text-lg">{name || profile.username}</strong>
          <span className="tw-flex tw-flex-wrap tw-items-center tw-gap-x-4 tw-gap-y-1 tw-text-sm tw-text-brand-muted">
            {profile.mobile && (
              <span className="tw-inline-flex tw-items-center tw-gap-1" dir="ltr">
                <Smartphone size={14} aria-hidden /> {profile.mobile}
              </span>
            )}
            {fields.vehicleType && (
              <span className="tw-inline-flex tw-items-center tw-gap-1">
                <Truck size={14} aria-hidden /> {fields.vehicleType}
              </span>
            )}
          </span>
        </div>
        <div className="tw-w-full tw-space-y-1.5 sm:tw-w-56">
          <div className="tw-flex tw-justify-between tw-text-xs">
            <span className="tw-text-brand-muted">تکمیل پروفایل</span>
            <strong className="tw-text-brand-orange-ink">{percent.toLocaleString('fa-IR')}٪</strong>
          </div>
          <div className="tw-h-2 tw-overflow-hidden tw-rounded-full tw-bg-brand-line">
            <div className="tw-h-full tw-rounded-full tw-bg-brand-orange tw-transition-all" style={{ width: `${percent}%` }} />
          </div>
          <p className="tw-m-0 tw-text-[11px] tw-text-brand-muted">{photos ? `${photos.toLocaleString('fa-IR')} عکس از ۳ عکس اختیاری` : 'عکس خودتان، ماشین و پلاک اختیاری است'}</p>
        </div>
      </div>

      <AnnouncementPreferences profile={profile} onSaved={setProfile} />

      <div className="tw-grid tw-grid-cols-1 tw-gap-6 lg:tw-grid-cols-2">
        <Card title="اطلاعات شخصی" hint="نام شما در درخواست بار به شرکت نمایش داده می‌شود" icon={User}>
          <Field label="نام" icon={User}>{text('firstName', 'مثلاً رضا')}</Field>
          <Field label="نام خانوادگی" icon={User}>{text('lastName', 'مثلاً کریمی')}</Field>
          <Field label="کد ملی" icon={IdCard} error={shownErrors.nationalCode}>{text('nationalCode', '۱۰ رقم', { digits: true, max: 10, ltr: true })}</Field>
          <Field label="موبایل" icon={Smartphone} hint="شماره حساب کاربری؛ قابل تغییر نیست">
            <input value={profile.mobile ?? ''} readOnly dir="ltr" className={cn(inputClass, 'tw-bg-brand-bg tw-text-left tw-text-brand-muted')} />
          </Field>
        </Card>

        <Card title="مدارک راننده" hint="برای اعتماد بیشتر شرکت‌ها" icon={CreditCard}>
          <Field label="شماره کارت هوشمند راننده" icon={CreditCard} error={shownErrors.smartCardNumber}>{text('smartCardNumber', 'فقط رقم', { digits: true, max: 20, ltr: true })}</Field>
          <Field label="شماره گواهینامه" icon={IdCard} error={shownErrors.licenseNumber}>{text('licenseNumber', 'فقط رقم', { digits: true, max: 20, ltr: true })}</Field>
          <Field label="شهر محل فعالیت" icon={MapPin} hint="برای پیشنهاد بار برگشتی" className="sm:tw-col-span-2">{text('homeCity', 'مثلاً تبریز')}</Field>
        </Card>
      </div>

      <Card title="ناوگان" hint="ماشینی که با آن بار می‌برید" icon={Truck}>
        <div className="tw-space-y-2 sm:tw-col-span-2">
          <Field label="نوع خودرو" icon={Truck}>{text('vehicleType', 'از گزینه‌ها انتخاب کنید یا بنویسید')}</Field>
          <div className="tw-flex tw-flex-wrap tw-gap-1.5">
            {vehicleTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => set('vehicleType', fields.vehicleType === type ? '' : type)}
                aria-pressed={fields.vehicleType === type}
                className={cn(
                  'tw-rounded-full tw-border tw-px-3 tw-py-1 tw-text-xs tw-font-medium tw-transition-colors',
                  fields.vehicleType === type ? 'tw-border-brand-orange tw-bg-brand-orange-soft tw-text-brand-orange-ink' : 'tw-border-brand-line tw-bg-white tw-text-brand-navy hover:tw-border-brand-orange/50',
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
        <Field label="برند و مدل" icon={Truck}>{text('vehicleModel', 'مثلاً ولوو FH500')}</Field>
        <Field label="ظرفیت بار (تن)" icon={Weight} error={shownErrors.capacityTons}>
          <input
            value={fields.capacityTons}
            onChange={(e) => setFields({ ...fields, capacityTons: toLatinDigits(e.target.value).replace(/[^\d.]/g, '').slice(0, 5) })}
            placeholder="مثلاً ۲۵"
            inputMode="decimal"
            dir="ltr"
            aria-invalid={!!shownErrors.capacityTons}
            className={cn(inputClass, 'tw-text-left')}
          />
        </Field>
        <div className="tw-space-y-1.5">
          <span className="tw-flex tw-items-center tw-gap-1.5 tw-text-sm tw-font-medium">
            <CreditCard size={15} aria-hidden className="tw-text-brand-muted" /> پلاک
          </span>
          <PlateInput value={fields.plate} invalid={!!shownErrors.plate} onChange={(plate) => setFields({ ...fields, plate })} />
          {shownErrors.plate && <span className="tw-block tw-text-xs tw-text-red-600">{shownErrors.plate}</span>}
          {plateFilled(fields.plate) && (
            <button type="button" onClick={() => setFields({ ...fields, plate: emptyPlate })} className="tw-bg-transparent tw-p-0 tw-text-xs tw-text-brand-muted hover:tw-text-red-600">
              پاک کردن پلاک
            </button>
          )}
        </div>
        <Field label="شماره کارت هوشمند ناوگان" icon={CreditCard} error={shownErrors.fleetCardNumber}>{text('fleetCardNumber', 'فقط رقم', { digits: true, max: 20, ltr: true })}</Field>
      </Card>

      <section className="tw-space-y-4 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-5 tw-shadow-sm">
        <div className="tw-flex tw-items-start tw-gap-3">
          <span className="tw-flex tw-h-9 tw-w-9 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-lg tw-bg-brand-sky tw-text-brand-navy">
            <Camera size={18} aria-hidden />
          </span>
          <div>
            <h3 className="tw-m-0 tw-text-base tw-font-bold">عکس خودتان، ماشین و پلاک</h3>
            <p className="tw-m-0 tw-flex tw-items-center tw-gap-1 tw-text-xs tw-text-brand-muted">
              <Info size={12} aria-hidden /> اختیاری. عکس خودتان و ماشین را شرکتی می‌بیند که می‌خواهد بار را به شما بسپارد؛ عکس پلاک فقط برای خودتان است. عکس بلافاصله بعد از انتخاب ذخیره می‌شود.
            </p>
          </div>
        </div>
        <div className="tw-grid tw-grid-cols-1 tw-gap-4 sm:tw-grid-cols-2">
          <PhotoSlot kind="face" title="عکس خودتان" hint="از روبه‌رو و واضح؛ شرکت‌ها هنگام سپردن بار می‌بینند" version={profile.photos.face} onChange={(p) => setProfile({ ...profile, photos: p.photos })} />
          <PhotoSlot kind="vehicle" title="عکس ماشین" hint="از کنار، طوری که کل ماشین دیده شود" version={profile.photos.vehicle} onChange={(p) => setProfile({ ...profile, photos: p.photos })} />
          <PhotoSlot kind="plate" title="عکس پلاک" hint="از روبه‌رو و خوانا" version={profile.photos.plate} onChange={(p) => setProfile({ ...profile, photos: p.photos })} />
        </div>
      </section>

      {dirty && (
        <div className="tw-sticky tw-bottom-4 tw-z-10 tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3 tw-rounded-2xl tw-border tw-border-brand-orange/40 tw-bg-white/95 tw-p-3 tw-shadow-lg tw-backdrop-blur">
          <span className="tw-text-sm tw-font-medium">تغییرات ذخیره‌نشده دارید</span>
          <div className="tw-flex tw-gap-2">
            <button type="button" onClick={() => setFields(saved)} className="tw-rounded-xl tw-bg-transparent tw-px-3 tw-py-2 tw-text-sm tw-font-medium tw-text-brand-muted hover:tw-text-brand-navy">
              لغو
            </button>
            <button
              type="submit"
              disabled={saving}
              className="tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-xl tw-bg-brand-orange tw-px-5 tw-py-2 tw-text-sm tw-font-bold tw-text-white tw-shadow-sm hover:tw-bg-brand-orange-dark disabled:tw-opacity-60"
            >
              <Save size={16} aria-hidden className={saving ? 'tw-animate-pulse' : undefined} /> {saving ? 'در حال ذخیره…' : 'ذخیره پروفایل'}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

const driverKinds: DriverKind[] = ['DOMESTIC', 'INTERNATIONAL'];
// the name a company goes by for this kind of work; none: the company does not do it
const companyNameFor = (company: DriverCompany, kind: DriverKind) => (kind === 'DOMESTIC' ? company.domesticName : company.internationalName);

// Saved on its own click: it decides which announced loads reach the driver, apart from the profile form.
function AnnouncementPreferences({ profile, onSaved }: { profile: DriverProfile; onSaved: (profile: DriverProfile) => void }) {
  const toast = useToast();
  const [kind, setKind] = useState<DriverKind>(driverKindOf(profile.tripTypes ?? [profile.tripType]));
  const [memberships, setMemberships] = useState<string[]>(profile.companyUserIds ?? []);
  const [companies, setCompanies] = useState<DriverCompany[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  // opened at #announcements (right after signing in): bring this section into view
  const section = useRef<HTMLElement>(null);
  const { hash } = useLocation();
  useEffect(() => {
    if (hash === '#announcements') section.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hash]);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    setKind(driverKindOf(profile.tripTypes ?? [profile.tripType]));
    setMemberships(profile.companyUserIds ?? []);
  }, [profile.tripTypes, profile.tripType, profile.companyUserIds]);
  useEffect(() => {
    let active = true;
    setFailed(false);
    getDriverCompanies().then((rows) => { if (active) setCompanies(rows); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [version]);
  const toggleCompany = (id: string) => setMemberships((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  async function savePreferences() {
    setSaving(true);
    try {
      // only the companies of the chosen kind (and an inactive one, kept until it is unticked)
      const companyUserIds = memberships.filter((id) => kindCompanies.some((company) => company.userId === id) || unavailable.includes(id));
      onSaved(await updateDriverProfile({ tripTypes: driverKindTripTypes[kind], companyUserIds }));
      toast.success(`شرکت‌ها و نوع راننده («${driverKindLabels[kind]}») ذخیره شدند.`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }
  const kindCompanies = companies?.filter((company) => companyNameFor(company, kind)) ?? [];
  const visible = kindCompanies.filter((company) => companyNameFor(company, kind)!.includes(search.trim()));
  const unavailable = memberships.filter((id) => companies && !companies.some((company) => company.userId === id));
  const joined = memberships.filter((id) => kindCompanies.some((company) => company.userId === id)).length;
  return (
    // scroll-mt: clear of the sticky header when opened at #announcements (right after signing in)
    <section
      ref={section}
      id="announcements"
      className="tw-scroll-mt-48 tw-space-y-4 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-5 tw-shadow-sm"
      aria-label="تنظیمات دریافت اعلام بار"
    >
      <div>
        <h3 className="tw-m-0 tw-text-base tw-font-bold">دریافت اعلام بار</h3>
        <p className="tw-m-0 tw-mt-1 tw-text-sm tw-text-brand-muted">فقط از شرکت‌هایی که عضو آن‌ها هستید و فقط بارهای نوع خودتان (داخلی یا بین‌المللی) اعلام می‌شود.</p>
      </div>
      {/* each kind with its own companies right under it: domestic companies under «داخلی», international under «بین‌المللی» */}
      <fieldset disabled={saving} className="tw-m-0 tw-min-w-0 tw-space-y-3 tw-border-0 tw-p-0">
        <legend className="tw-mb-3 tw-text-sm tw-font-bold">نوع راننده؛ یکی را انتخاب کنید، بعد شرکت‌های همان نوع را</legend>
        <div role="radiogroup" aria-label="نوع راننده" className="tw-space-y-3">
          {driverKinds.map((value) => (
            <div key={value} className={cn('tw-rounded-xl tw-border', kind === value ? 'tw-border-brand-orange tw-bg-brand-orange-soft/40' : 'tw-border-brand-line')}>
              <button type="button" role="radio" aria-checked={kind === value} onClick={() => { setKind(value); setSearch(''); }}
                className="tw-flex tw-w-full tw-items-start tw-gap-3 tw-rounded-xl tw-border-0 tw-bg-transparent tw-p-3 tw-text-start">
                <span aria-hidden className={cn('tw-mt-0.5 tw-flex tw-h-5 tw-w-5 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-border-2', kind === value ? 'tw-border-brand-orange' : 'tw-border-brand-line')}>
                  {kind === value && <span className="tw-h-2.5 tw-w-2.5 tw-rounded-full tw-bg-brand-orange" />}
                </span>
                <span>
                  <strong className="tw-block tw-text-sm">{driverKindLabels[value]}</strong>
                  <span className="tw-block tw-text-xs tw-text-brand-muted">{driverKindHints[value]}</span>
                </span>
              </button>
              {kind === value && (
                <div className="tw-space-y-3 tw-border-t tw-border-brand-line tw-p-3">
                  <h4 className="tw-m-0 tw-text-sm tw-font-bold">شرکت‌های {driverKindLabels[value]} ({joined.toLocaleString('fa-IR')} انتخاب)</h4>
                  <input aria-label={`جستجوی شرکت ${driverKindLabels[value]}`} placeholder="جستجوی نام شرکت…" value={search} onChange={(event) => setSearch(event.target.value)} className={inputClass} />
                  {failed ? <div role="alert">دریافت شرکت‌ها انجام نشد. <button type="button" onClick={() => setVersion((v) => v + 1)}>تلاش دوباره</button></div>
                    : companies === null ? <p role="status">در حال دریافت شرکت‌ها…</p>
                    : <div className="tw-max-h-64 tw-space-y-2 tw-overflow-y-auto">
                      {visible.map((company) => (
                        <label key={company.userId} className="tw-flex tw-cursor-pointer tw-items-center tw-gap-2 tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-p-3">
                          <input type="checkbox" disabled={saving} checked={memberships.includes(company.userId)} onChange={() => toggleCompany(company.userId)} />
                          <span>{companyNameFor(company, value)}</span>
                        </label>
                      ))}
                      {!visible.length && <p className="tw-text-sm tw-text-brand-muted">{kindCompanies.length ? 'شرکتی با این نام پیدا نشد.' : `هنوز شرکت ${driverKindLabels[value]}ی ثبت نشده است.`}</p>}
                      {unavailable.map((id) => <label key={id} className="tw-flex tw-items-center tw-gap-2 tw-p-3">
                        <input type="checkbox" disabled={saving} checked onChange={() => toggleCompany(id)} /> شرکت غیرفعال؛ برای حذف عضویت، تیک را بردارید
                      </label>)}
                    </div>}
                  {!joined && <p className="tw-m-0 tw-text-sm tw-text-brand-muted">هنوز عضو شرکت {driverKindLabels[value]}ی نیستید و اعلام باری دریافت نمی‌کنید.</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      </fieldset>
      <button type="button" disabled={saving || companies === null || failed} onClick={savePreferences}
        className="tw-rounded-xl tw-bg-brand-orange tw-px-4 tw-py-3 tw-font-bold tw-text-white disabled:tw-opacity-50">
        {saving ? 'در حال ذخیره…' : 'ذخیره شرکت‌ها و نوع راننده'}
      </button>
    </section>
  );
}


export default function DriverProfilePage() {
  return (
    <DriverShell title="پروفایل راننده">
      <ProfileContent />
    </DriverShell>
  );
}
