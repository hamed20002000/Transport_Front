import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import {
  Banknote,
  Building2,
  Flag,
  Info,
  MapPin,
  Package,
  Plus,
  Save,
  SlidersHorizontal,
  Trash2,
  Truck,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from 'src/core/auth/AuthContext';
import PageContainer from 'src/shared/components/container/PageContainer';
import Spinner from 'src/shared/components/spinner/Spinner';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { cn } from 'src/shared/utils/utils';
import {
  createCargoFilter,
  deleteCargoFilter,
  filterLimits,
  listCargoFilters,
  updateCargoFilter,
  type CargoFilter,
  type CargoFilterInput,
  toLatinDigits,
} from './api';
import CompanyShell from './CompanyShell';
import { CardSkeleton, EmptyState, IconButton, LoadFailed, SectionTitle } from './components';

type ListKey = 'origins' | 'destinations' | 'cargoTypes' | 'vehicleTypes' | 'companies';
export type FilterAudience = 'company' | 'driver';
// Prices are kept as the typed digits so the inputs can be edited freely.
type Draft = { label: string; isActive: boolean; minPrice: string; maxPrice: string } & Record<ListKey, string[]>;
// A filter on screen: `saved` is null until the new filter is created on the server.
type Row = { key: string; saved: CargoFilter | null; draft: Draft };

const lists: Array<{ key: ListKey; label: string; icon: LucideIcon; placeholder: string }> = [
  { key: 'origins', label: 'مبدأ', icon: MapPin, placeholder: 'مثلاً تهران' },
  { key: 'destinations', label: 'مقصد', icon: Flag, placeholder: 'مثلاً مشهد' },
  { key: 'cargoTypes', label: 'نوع بار', icon: Package, placeholder: 'مثلاً آهن‌آلات' },
  { key: 'vehicleTypes', label: 'نوع خودرو', icon: Truck, placeholder: 'مثلاً تریلی' },
  // Only cargo published by a company carries its name, so this list is offered to drivers alone.
  { key: 'companies', label: 'شرکت اعلام‌کننده', icon: Building2, placeholder: 'مثلاً باربری ستاره' },
];

const listsFor = (audience: FilterAudience) => lists.filter(({ key }) => key !== 'companies' || audience === 'driver');

const toDraft = (filter: CargoFilter | null): Draft => ({
  label: filter?.label ?? '',
  isActive: filter?.isActive ?? true,
  origins: filter?.origins ?? [],
  destinations: filter?.destinations ?? [],
  cargoTypes: filter?.cargoTypes ?? [],
  vehicleTypes: filter?.vehicleTypes ?? [],
  companies: filter?.companies ?? [],
  minPrice: filter?.minPrice == null ? '' : String(filter.minPrice),
  maxPrice: filter?.maxPrice == null ? '' : String(filter.maxPrice),
});

const same = (a: Draft, b: Draft) =>
  a.label.trim() === b.label.trim() &&
  a.isActive === b.isActive &&
  a.minPrice === b.minPrice &&
  a.maxPrice === b.maxPrice &&
  lists.every(({ key }) => a[key].join('\n') === b[key].join('\n'));

const toPrice = (digits: string) => (digits ? Number(digits) : null);

// "45000000" → "۴۵ میلیون تومان", to confirm the amount at a glance.
function priceInWords(digits: string) {
  const value = Number(digits);
  if (!digits || !value) return '';
  const units: Array<[number, string]> = [
    [1e9, 'میلیارد'],
    [1e6, 'میلیون'],
    [1e3, 'هزار'],
  ];
  const [size, name] = units.find(([unit]) => value >= unit) ?? [1, ''];
  const amount = (value / size).toLocaleString('fa-IR', { maximumFractionDigits: 2 });
  return `${amount}${name ? ` ${name}` : ''} تومان`;
}

function PriceInput({ label, value, onChange }: { label: string; value: string; onChange: (digits: string) => void }) {
  return (
    <label className="tw-block tw-min-w-0 tw-flex-1 tw-space-y-1">
      <span className="tw-text-xs tw-text-brand-muted">{label}</span>
      <div className="tw-flex tw-h-11 tw-items-center tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-3 focus-within:tw-border-brand-orange focus-within:tw-ring-4 focus-within:tw-ring-brand-orange-soft">
        <input
          dir="ltr"
          inputMode="numeric"
          value={value ? Number(value).toLocaleString('en-US') : ''}
          placeholder="—"
          onChange={(e) => onChange(toLatinDigits(e.target.value).replace(/\D/g, '').replace(/^0+/, '').slice(0, 13))}
          className="tw-min-w-0 tw-flex-1 tw-border-0 tw-bg-transparent tw-text-left tw-text-sm tw-text-brand-navy tw-outline-none"
        />
        <span className="tw-shrink-0 tw-ps-2 tw-text-xs tw-text-brand-muted">تومان</span>
      </div>
      <span className="tw-block tw-h-4 tw-text-xs tw-text-brand-orange-ink">{priceInWords(value)}</span>
    </label>
  );
}

function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'ارتباط با سرور برقرار نشد. اتصال را بررسی و دوباره تلاش کنید.';
    const { status } = error.response;
    if (status === 400) return 'مقادیر فیلتر معتبر نیست.';
    if (status === 401) return 'نشست شما منقضی شده است. دوباره وارد شوید.';
    if (status === 404) return 'فیلتر پیدا نشد؛ صفحه را تازه کنید.';
    return `خطای سرور (${status}). دوباره تلاش کنید.`;
  }
  return error instanceof Error ? error.message : 'عملیات انجام نشد.';
}

// Chips plus a text box; Enter, comma or leaving the box adds what was typed.
function TagInput({ label, icon: Icon, placeholder, values, onChange }: { label: string; icon: LucideIcon; placeholder: string; values: string[]; onChange: (values: string[]) => void }) {
  const [text, setText] = useState('');
  const full = values.length >= filterLimits.items;

  function commit() {
    const added = text
      .split(/[,،]/)
      .map((value) => value.trim())
      .filter((value) => value && !values.includes(value));
    if (added.length) onChange([...values, ...added].slice(0, filterLimits.items));
    setText('');
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',' || event.key === '،') {
      event.preventDefault();
      commit();
    } else if (event.key === 'Backspace' && !text && values.length) {
      onChange(values.slice(0, -1));
    }
  }

  return (
    <div className="tw-space-y-1.5">
      <span className="tw-flex tw-items-center tw-gap-1.5 tw-text-sm tw-font-medium">
        <Icon size={15} aria-hidden className="tw-text-brand-muted" />
        {label}
        {!values.length && <span className="tw-text-xs tw-font-normal tw-text-brand-muted">(همه)</span>}
      </span>
      <div className="tw-flex tw-min-h-[2.75rem] tw-flex-wrap tw-items-center tw-gap-1.5 tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-2 tw-py-1.5 focus-within:tw-border-brand-orange focus-within:tw-ring-4 focus-within:tw-ring-brand-orange-soft">
        {values.map((value) => (
          <span key={value} className="tw-inline-flex tw-max-w-full tw-items-center tw-gap-1 tw-rounded-lg tw-bg-brand-sky tw-py-1 tw-pe-1 tw-ps-2.5 tw-text-xs tw-font-medium">
            <span className="tw-truncate">{value}</span>
            <button
              type="button"
              aria-label={`حذف ${value}`}
              onClick={() => onChange(values.filter((v) => v !== value))}
              className="tw-flex tw-h-5 tw-w-5 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-md tw-bg-transparent tw-text-brand-muted hover:tw-bg-white hover:tw-text-red-600"
            >
              <X size={13} aria-hidden />
            </button>
          </span>
        ))}
        {!full && (
          <input
            aria-label={label}
            value={text}
            maxLength={filterLimits.item}
            placeholder={values.length ? 'افزودن…' : placeholder}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={commit}
            className="tw-h-7 tw-min-w-[6rem] tw-flex-1 tw-border-0 tw-bg-transparent tw-px-1 tw-text-sm tw-text-brand-navy tw-outline-none placeholder:tw-text-brand-muted/70"
          />
        )}
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (value: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="tw-inline-flex tw-items-center tw-gap-2 tw-bg-transparent tw-p-0 tw-text-xs tw-font-medium tw-text-brand-navy"
    >
      <span className={cn('tw-relative tw-h-6 tw-w-11 tw-rounded-full tw-transition-colors', checked ? 'tw-bg-brand-orange' : 'tw-bg-brand-line')}>
        <span className={cn('tw-absolute tw-top-0.5 tw-h-5 tw-w-5 tw-rounded-full tw-bg-white tw-shadow tw-transition-all', checked ? 'tw-right-[1.375rem]' : 'tw-right-0.5')} />
      </span>
      {checked ? 'فعال' : 'غیرفعال'}
    </button>
  );
}

function FilterCard({
  audience,
  row,
  busy,
  onDraft,
  onSave,
  onToggle,
  onRemove,
}: {
  audience: FilterAudience;
  row: Row;
  busy: boolean;
  onDraft: (draft: Draft) => void;
  onSave: () => void;
  onToggle: (active: boolean) => void;
  onRemove: () => void;
}) {
  const { draft, saved } = row;
  const dirty = !saved || !same(draft, toDraft(saved));
  const matchesAll = lists.every(({ key }) => !draft[key].length) && !draft.minPrice && !draft.maxPrice;
  const set = (patch: Partial<Draft>) => onDraft({ ...draft, ...patch });

  return (
    <li className={cn('tw-rounded-2xl tw-border tw-bg-white tw-shadow-sm', draft.isActive ? 'tw-border-brand-line' : 'tw-border-dashed tw-border-brand-line tw-opacity-80')}>
      <div className="tw-flex tw-items-center tw-gap-3 tw-border-b tw-border-brand-line tw-px-5 tw-py-3">
        <input
          aria-label="نام فیلتر"
          value={draft.label}
          maxLength={filterLimits.label}
          placeholder="نام فیلتر (اختیاری)، مثلاً مسیر تهران–مشهد"
          onChange={(e) => set({ label: e.target.value })}
          className="tw-h-9 tw-min-w-0 tw-flex-1 tw-rounded-lg tw-border-0 tw-bg-transparent tw-px-0 tw-text-base tw-font-bold tw-text-brand-navy tw-outline-none placeholder:tw-font-normal placeholder:tw-text-brand-muted/70"
        />
        {/* A saved filter switches on/off at once; a new one keeps the choice until it is saved. */}
        <Toggle label="فعال بودن فیلتر" checked={draft.isActive} disabled={busy} onChange={(value) => (saved ? onToggle(value) : set({ isActive: value }))} />
      </div>
      <fieldset disabled={busy} className="tw-m-0 tw-grid tw-min-w-0 tw-gap-4 tw-border-0 tw-p-5 sm:tw-grid-cols-2">
        {listsFor(audience).map(({ key, label, icon, placeholder }) => (
          <TagInput key={key} label={label} icon={icon} placeholder={placeholder} values={draft[key]} onChange={(values) => set({ [key]: values })} />
        ))}
        <div className="tw-space-y-1.5 sm:tw-col-span-2">
          <span className="tw-flex tw-items-center tw-gap-1.5 tw-text-sm tw-font-medium">
            <Banknote size={15} aria-hidden className="tw-text-brand-muted" />
            بازه کرایه
            {!draft.minPrice && !draft.maxPrice && <span className="tw-text-xs tw-font-normal tw-text-brand-muted">(همه)</span>}
          </span>
          <div className="tw-flex tw-gap-3">
            <PriceInput label="از" value={draft.minPrice} onChange={(minPrice) => set({ minPrice })} />
            <PriceInput label="تا" value={draft.maxPrice} onChange={(maxPrice) => set({ maxPrice })} />
          </div>
          {(draft.minPrice || draft.maxPrice) && <p className="tw-m-0 tw-text-xs tw-text-brand-muted">بارهایی که کرایه ندارند یا «توافقی» هستند با این فیلتر نمایش داده نمی‌شوند.</p>}
        </div>
      </fieldset>
      <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3 tw-border-t tw-border-brand-line tw-px-5 tw-py-3">
        <span className="tw-text-xs tw-text-brand-muted">{matchesAll ? 'بدون شرط؛ این فیلتر همه بارها را می‌پذیرد.' : 'فقط بارهایی که با همه شرط‌های پرشده جور باشند.'}</span>
        <div className="tw-flex tw-items-center tw-gap-2">
          {saved && dirty && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onDraft(toDraft(saved))}
              className="tw-rounded-xl tw-bg-transparent tw-px-3 tw-py-2 tw-text-sm tw-font-medium tw-text-brand-muted hover:tw-text-brand-navy"
            >
              لغو
            </button>
          )}
          {dirty && (
            <button
              type="button"
              disabled={busy}
              onClick={onSave}
              className="tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-xl tw-bg-brand-orange tw-px-4 tw-py-2 tw-text-sm tw-font-bold tw-text-white tw-shadow-sm hover:tw-bg-brand-orange-dark"
            >
              <Save size={16} aria-hidden className={busy ? 'tw-animate-pulse' : undefined} /> ذخیره
            </button>
          )}
          <IconButton icon={Trash2} label={saved ? 'حذف فیلتر' : 'کنار گذاشتن'} onClick={onRemove} disabled={busy} />
        </div>
      </div>
    </li>
  );
}

export function FiltersContent({ audience = 'company' }: { audience?: FilterAudience }) {
  const toast = useToast();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busyKey, setBusyKey] = useState('');
  const [version, setVersion] = useState(0);
  const newKey = useRef(0);

  useEffect(() => {
    let active = true;
    setLoadFailed(false);
    listCargoFilters()
      .then((filters) => active && setRows(filters.map((filter) => ({ key: filter.id, saved: filter, draft: toDraft(filter) }))))
      .catch((e) => {
        if (!active) return;
        setLoadFailed(true);
        toast.error(errorMessage(e));
      });
    return () => {
      active = false;
    };
  }, [version, toast]);

  const replace = (key: string, next: Row | null) => setRows((current) => current && current.flatMap((row) => (row.key === key ? (next ? [next] : []) : [row])));

  async function run(key: string, action: () => Promise<void>) {
    setBusyKey(key);
    try {
      await action();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusyKey('');
    }
  }

  const save = (row: Row) =>
    run(row.key, async () => {
      const minPrice = toPrice(row.draft.minPrice);
      const maxPrice = toPrice(row.draft.maxPrice);
      if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) throw new Error('در بازه کرایه، «از» نباید از «تا» بیشتر باشد.');
      const input: CargoFilterInput = { label: row.draft.label.trim() || null, isActive: row.draft.isActive, minPrice, maxPrice };
      for (const { key } of lists) input[key] = row.draft[key];
      const saved = row.saved ? await updateCargoFilter(row.saved.id, input) : await createCargoFilter(input);
      replace(row.key, { key: row.key, saved, draft: toDraft(saved) });
      toast.success('فیلتر ذخیره شد؛ از بارهای بعدی اعمال می‌شود.');
    });

  const toggle = (row: Row, isActive: boolean) =>
    run(row.key, async () => {
      const saved = await updateCargoFilter(row.saved!.id, { isActive });
      // Only the switch is saved here; unsaved edits to the lists stay in the draft.
      replace(row.key, { key: row.key, saved, draft: { ...row.draft, isActive: saved.isActive } });
    });

  const remove = (row: Row) => {
    if (!row.saved) return replace(row.key, null);
    if (!window.confirm('این فیلتر حذف شود؟')) return;
    run(row.key, async () => {
      await deleteCargoFilter(row.saved!.id);
      replace(row.key, null);
      toast.success('فیلتر حذف شد.');
    });
  };

  const add = () => setRows((current) => [...(current ?? []), { key: `new-${++newKey.current}`, saved: null, draft: toDraft(null) }]);

  const activeCount = rows?.filter((row) => row.saved?.isActive).length ?? 0;

  return (
    <div className="tw-space-y-6">
      <SectionTitle
        title="تنظیمات نمایش بار"
        hint={audience === 'driver' ? 'مشخص کنید کدام بارهای اعلام‌شده برای شما نمایش داده و اعلان شوند' : 'مشخص کنید کدام بارهای کانال‌ها برای شما نمایش داده و اعلان شوند'}
        side={
          rows && (
            <button
              type="button"
              onClick={add}
              className="tw-inline-flex tw-h-10 tw-items-center tw-gap-1.5 tw-rounded-xl tw-bg-brand-orange tw-px-4 tw-text-sm tw-font-bold tw-text-white tw-shadow-sm hover:tw-bg-brand-orange-dark"
            >
              <Plus size={18} aria-hidden /> فیلتر جدید
            </button>
          )
        }
      />

      <div className="tw-flex tw-gap-3 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-brand-sky/60 tw-p-4 tw-text-sm tw-leading-7">
        <Info size={20} aria-hidden className="tw-mt-1 tw-shrink-0 tw-text-brand-navy" />
        <ul className="tw-m-0 tw-list-disc tw-space-y-0.5 tw-ps-4">
          <li>
            {activeCount ? (
              <>
                <strong>{activeCount.toLocaleString('fa-IR')} فیلتر فعال</strong> دارید؛ باری نمایش داده می‌شود که دست‌کم با یکی از آن‌ها جور باشد.
              </>
            ) : (
              <>
                <strong>فیلتر فعالی ندارید</strong>؛ {audience === 'driver' ? 'همه بارهای اعلام‌شده' : 'همه بارهای کانال‌های شما'} نمایش داده می‌شود.
              </>
            )}
          </li>
          <li>در هر فیلتر، خانه خالی یعنی «همه». چند مقدار در یک خانه یعنی «هر کدام».</li>
          <li>جست‌وجو «شامل بودن» است؛ مثلاً «تهران» با «تهران - میدان آزادی» هم جور می‌شود.</li>
          <li>تغییرات روی بارهایی اعمال می‌شود که از این به بعد می‌رسند.</li>
        </ul>
      </div>

      {loadFailed ? (
        <LoadFailed onRetry={() => setVersion((v) => v + 1)} />
      ) : !rows ? (
        <div className="tw-space-y-4" role="status" aria-label="در حال دریافت فیلترها">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : !rows.length ? (
        <EmptyState icon={SlidersHorizontal} title="هنوز فیلتری نساخته‌اید" hint="با «فیلتر جدید» مثلاً فقط بارهای مبدأ تهران یا نوع خودروی تریلی را دریافت کنید." />
      ) : (
        <ul className="tw-m-0 tw-list-none tw-space-y-4 tw-p-0">
          {rows.map((row) => (
            <FilterCard
              key={row.key}
              audience={audience}
              row={row}
              busy={busyKey === row.key}
              onDraft={(draft) => replace(row.key, { ...row, draft })}
              onSave={() => save(row)}
              onToggle={(active) => toggle(row, active)}
              onRemove={() => remove(row)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export default function CargoFilters() {
  const { isAuth, isAuthDataLoading, userRoles } = useAuth();
  if (isAuthDataLoading) return <Spinner />;
  if (!isAuth) return <Navigate to="/auth/login" replace />;
  if (!userRoles.some((role) => role.name === 'COMPANY')) return <Navigate to="/account/company" replace />;
  return (
    <PageContainer title="تنظیمات نمایش بار | Setaş Transport" description="فیلتر بارهای پیشنهادی">
      <CompanyShell>
        <FiltersContent />
      </CompanyShell>
    </PageContainer>
  );
}
