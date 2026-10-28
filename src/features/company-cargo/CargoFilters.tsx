import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import {
  Banknote,
  Building2,
  ChevronDown,
  Flag,
  Info,
  MapPin,
  Package,
  Plus,
  Save,
  SlidersHorizontal,
  Tag,
  Trash2,
  Truck,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from 'src/core/auth/AuthContext';
import { useDomainRefresh } from 'src/features/ai-agent/hooks/Usedomainrefres';
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
import { useMessageBox } from 'src/shared/components/message-box/MessageBoxProvider';

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
  { key: 'companies', label: 'شرکت حمل‌ونقل اعلام‌کننده', icon: Building2, placeholder: 'مثلاً باربری ستاره' },
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
      <div className="tw-flex tw-h-11 tw-items-center tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-3 focus-within:tw-border-brand-orange">
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
      <div className="tw-flex tw-min-h-[2.75rem] tw-flex-wrap tw-items-center tw-gap-1.5 tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-2 tw-py-1.5 focus-within:tw-border-brand-orange">
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
    <li id={`filter-${row.key}`} className={cn('tw-scroll-mt-24 tw-rounded-2xl tw-border tw-bg-white tw-shadow-sm', draft.isActive ? 'tw-border-brand-line' : 'tw-border-dashed tw-border-brand-line tw-opacity-80')}>
      <div className="tw-flex tw-items-center tw-gap-3 tw-border-b tw-border-brand-line tw-px-5 tw-py-3">
        <h3 className="tw-m-0 tw-min-w-0 tw-flex-1 tw-truncate tw-text-base tw-font-bold tw-text-brand-navy">
          {draft.label.trim() || (saved ? 'فیلتر بدون عنوان' : 'فیلتر جدید')}
        </h3>
        {/* A saved filter switches on/off at once; a new one keeps the choice until it is saved. */}
        <Toggle label="فعال بودن فیلتر" checked={draft.isActive} disabled={busy} onChange={(value) => (saved ? onToggle(value) : set({ isActive: value }))} />
      </div>
      <fieldset disabled={busy} className="tw-m-0 tw-grid tw-grid-cols-1 tw-min-w-0 tw-gap-4 tw-border-0 tw-p-5 sm:tw-grid-cols-2">
        {/* A real labelled field (it used to be the bare card heading, which nobody recognised as editable). */}
        <label className="tw-block tw-space-y-1.5 sm:tw-col-span-2">
          <span className="tw-flex tw-items-center tw-gap-1.5 tw-text-sm tw-font-medium">
            <Tag size={15} aria-hidden className="tw-text-brand-muted" />
            عنوان فیلتر
            <span className="tw-text-xs tw-font-normal tw-text-brand-muted">(اختیاری)</span>
          </span>
          <input
            value={draft.label}
            maxLength={filterLimits.label}
            placeholder="مثلاً مسیر تهران به مشهد"
            onChange={(e) => set({ label: e.target.value })}
            className="tw-h-11 tw-w-full tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-3 tw-text-sm tw-text-brand-navy tw-outline-none placeholder:tw-text-brand-muted/70 focus:tw-border-brand-orange"
          />
        </label>
        {listsFor(audience).map(({ key, label, icon, placeholder }) => (
          <TagInput key={key} label={label} icon={icon} placeholder={placeholder} values={draft[key]} onChange={(values) => set({ [key]: values })} />
        ))}
        <div className="tw-space-y-1.5 sm:tw-col-span-2">
          <span className="tw-flex tw-items-center tw-gap-1.5 tw-text-sm tw-font-medium">
            <Banknote size={15} aria-hidden className="tw-text-brand-muted" />
            بازه کرایه
            {!draft.minPrice && !draft.maxPrice && <span className="tw-text-xs tw-font-normal tw-text-brand-muted">(همه)</span>}
          </span>
          {/* side by side once both amounts fit (۱۲۰,۰۰۰,۰۰۰ was cut on a 360px phone) */}
          <div className="tw-flex tw-flex-col tw-gap-3 min-[420px]:tw-flex-row">
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

const HELP_OPEN_KEY = 'cargo-filters-help-open';

export function FiltersContent({ audience = 'company' }: { audience?: FilterAudience }) {
  const toast = useToast();
  const messageBox = useMessageBox();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busyKey, setBusyKey] = useState('');
  const [version, setVersion] = useState(0);
  // فیلتری که با agent ساخته/عوض شد همین‌جا دیده شود
  useDomainRefresh('company_cargo_display_filters', () => setVersion((v) => v + 1), 'account');
  const newKey = useRef(0);
  // the card just added, brought into view once it is drawn
  const [addedKey, setAddedKey] = useState('');
  // the help box: only its first line (the active filter) unless opened; the choice is remembered
  const [helpOpen, setHelpOpen] = useState(() => {
    try {
      return localStorage.getItem(HELP_OPEN_KEY) === '1';
    } catch {
      return false;
    }
  });
  const toggleHelp = () =>
    setHelpOpen((open) => {
      try {
        localStorage.setItem(HELP_OPEN_KEY, open ? '0' : '1');
      } catch {
        // private mode: it just is not remembered
      }
      return !open;
    });

  useEffect(() => {
    if (!addedKey) return;
    document.getElementById(`filter-${addedKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setAddedKey('');
  }, [addedKey]);

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
  // Only one filter is active at a time: when this one is saved as active the server switched the others off.
  const settle = (key: string, next: Row) =>
    setRows(
      (current) =>
        current &&
        current.map((row) => {
          if (row.key === key) return next;
          if (!next.saved?.isActive || !row.saved?.isActive) return row;
          return { ...row, saved: { ...row.saved, isActive: false }, draft: { ...row.draft, isActive: false } };
        }),
    );

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
      settle(row.key, { key: row.key, saved, draft: toDraft(saved) });
      toast.success(saved.isActive ? 'فیلتر ذخیره شد و همین فیلتر فعال است؛ از بارهای بعدی اعمال می‌شود.' : 'فیلتر ذخیره شد.');
    });

  const toggle = (row: Row, isActive: boolean) =>
    run(row.key, async () => {
      const saved = await updateCargoFilter(row.saved!.id, { isActive });
      // Only the switch is saved here; unsaved edits to the lists stay in the draft.
      settle(row.key, { key: row.key, saved, draft: { ...row.draft, isActive: saved.isActive } });
    });

  const remove = async (row: Row) => {
    if (!row.saved) return replace(row.key, null);
    if (!(await messageBox.confirm({ message: 'این فیلتر حذف شود؟', tone: 'danger', confirmText: 'حذف' }))) return;
    run(row.key, async () => {
      await deleteCargoFilter(row.saved!.id);
      replace(row.key, null);
      toast.success('فیلتر حذف شد.');
    });
  };

  // a new filter goes first, where the user is looking, not under all the saved ones
  const add = () => {
    const key = `new-${++newKey.current}`;
    setRows((current) => [{ key, saved: null, draft: toDraft(null) }, ...(current ?? [])]);
    setAddedKey(key);
  };

  const active = rows?.find((row) => row.saved?.isActive)?.saved ?? null;

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

      <div className="tw-flex tw-gap-3 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-brand-sky/60 tw-px-4 tw-py-3 tw-text-sm tw-leading-7">
        <Info size={20} aria-hidden className="tw-mt-1 tw-shrink-0 tw-text-brand-navy" />
        <div className="tw-min-w-0 tw-flex-1">
          <ul id="filters-help" className="tw-m-0 tw-list-disc tw-space-y-0.5 tw-ps-4">
          <li>
            {active ? (
              <>
                فیلتر فعال: <strong>«{active.label || 'فیلتر بدون عنوان'}»</strong>؛ فقط بارهایی که با همین فیلتر جور باشند نمایش داده می‌شوند.
              </>
            ) : (
              <>
                <strong>فیلتر فعالی ندارید</strong>؛ {audience === 'driver' ? 'همه بارهای اعلام‌شده' : 'همه بارهای کانال‌های شما'} نمایش داده می‌شود.
              </>
            )}
          </li>
          <li hidden={!helpOpen}>در هر لحظه فقط یک فیلتر فعال است؛ با روشن کردن یک فیلتر، بقیه خاموش می‌شوند (ذخیره می‌مانند).</li>
          <li hidden={!helpOpen}>در هر فیلتر، خانه خالی یعنی «همه». چند مقدار در یک خانه یعنی «هر کدام».</li>
          <li hidden={!helpOpen}>جست‌وجو «شامل بودن» است؛ مثلاً «تهران» با «تهران - میدان آزادی» هم جور می‌شود.</li>
          <li hidden={!helpOpen}>تغییرات روی بارهایی اعمال می‌شود که از این به بعد می‌رسند.</li>
          </ul>
          <button
            type="button"
            onClick={toggleHelp}
            aria-expanded={helpOpen}
            aria-controls="filters-help"
            className="tw-mt-1 tw-inline-flex tw-items-center tw-gap-1 tw-rounded-lg tw-border-0 tw-bg-transparent tw-p-0 tw-text-xs tw-font-bold tw-text-brand-orange-ink hover:tw-underline"
          >
            {helpOpen ? 'نمایش کمتر' : 'راهنمای فیلترها'}
            <ChevronDown size={14} aria-hidden className={cn('tw-transition-transform', helpOpen && 'tw-rotate-180')} />
          </button>
        </div>
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
    <PageContainer title="تنظیمات نمایش بار | ترابوت" description="فیلتر بارهای پیشنهادی">
      <CompanyShell>
        <FiltersContent />
      </CompanyShell>
    </PageContainer>
  );
}
