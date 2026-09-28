import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, MapPin, type LucideIcon as Icon } from 'lucide-react';
import { cn } from 'src/shared/utils/utils';

const faNumber = (value: number) => value.toLocaleString('fa-IR');

export function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }) : '';
}

// "۵ دقیقه پیش"; falls back to the full date after a week.
export function timeAgo(value?: string | null) {
  if (!value) return '';
  const seconds = (new Date(value).getTime() - Date.now()) / 1000;
  const format = new Intl.RelativeTimeFormat('fa', { numeric: 'auto' });
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['second', 60],
    ['minute', 60],
    ['hour', 24],
    ['day', 7],
  ];
  let amount = seconds;
  for (const [unit, size] of units) {
    if (Math.abs(amount) < size) return format.format(Math.round(amount), unit);
    amount /= size;
  }
  return formatDate(value);
}

// Round white action button with a navy icon (the call/locate buttons in the design).
export function IconButton({
  icon: IconComponent,
  label,
  onClick,
  disabled,
  spinning,
}: {
  icon: Icon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  spinning?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="tw-inline-flex tw-h-10 tw-w-10 tw-items-center tw-justify-center tw-rounded-full tw-border tw-border-brand-line tw-bg-white tw-text-brand-navy tw-shadow-sm tw-transition-colors hover:tw-border-brand-orange hover:tw-text-brand-orange"
    >
      <IconComponent size={18} aria-hidden className={spinning ? 'tw-animate-spin' : undefined} />
    </button>
  );
}

export function PrimaryButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-xl tw-bg-brand-orange tw-px-4 tw-py-2 tw-text-sm tw-font-bold tw-text-white tw-shadow-sm tw-transition-colors hover:tw-bg-brand-orange-dark"
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-4 tw-py-2 tw-text-sm tw-font-medium tw-text-brand-navy tw-transition-colors hover:tw-bg-brand-sky"
    >
      {children}
    </button>
  );
}

// Light-blue icon square, as on the vehicle cards of the design.
export function IconTile({ icon: IconComponent, size = 'md' }: { icon: Icon; size?: 'md' | 'lg' }) {
  return (
    <span
      className={cn(
        'tw-flex tw-items-center tw-justify-center tw-rounded-xl tw-bg-brand-sky tw-text-brand-navy',
        size === 'lg' ? 'tw-h-14 tw-w-14' : 'tw-h-11 tw-w-11',
      )}
    >
      <IconComponent size={size === 'lg' ? 26 : 22} aria-hidden />
    </span>
  );
}

export function StatTile({ icon, label, value, accent }: { icon: Icon; label: string; value?: number; accent?: boolean }) {
  return (
    <div className="tw-flex tw-items-center tw-gap-3 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-4 tw-shadow-sm">
      <IconTile icon={icon} />
      <div className="tw-min-w-0">
        <div className={cn('tw-text-xl tw-font-bold tw-leading-tight', accent ? 'tw-text-brand-orange' : 'tw-text-brand-navy')}>
          {value === undefined ? <span className="tw-inline-block tw-h-5 tw-w-8 tw-animate-pulse tw-rounded tw-bg-brand-sky" /> : faNumber(value)}
        </div>
        <div className="tw-truncate tw-text-xs tw-text-brand-muted">{label}</div>
      </div>
    </div>
  );
}

// Vertical origin → destination: orange ring, dotted connector, navy pin.
export function RouteLine({ origin, destination }: { origin?: string | null; destination?: string | null }) {
  return (
    <div className="tw-flex tw-gap-3">
      <div className="tw-flex tw-flex-col tw-items-center tw-pt-1.5" aria-hidden>
        <span className="tw-h-4 tw-w-4 tw-rounded-full tw-border-[3px] tw-border-brand-orange tw-bg-white" />
        <span className="tw-my-1 tw-w-0 tw-flex-1 tw-border-r-2 tw-border-dotted tw-border-brand-line" />
        <MapPin size={18} className="tw-fill-brand-navy tw-text-white" />
      </div>
      <dl className="tw-m-0 tw-min-w-0 tw-flex-1 tw-space-y-3">
        <div>
          <dt className="tw-text-xs tw-text-brand-muted">مبدأ بارگیری</dt>
          <dd className="tw-m-0 tw-truncate tw-text-base tw-font-bold">{origin || 'نامشخص'}</dd>
        </div>
        <div>
          <dt className="tw-text-xs tw-text-brand-muted">مقصد تخلیه</dt>
          <dd className="tw-m-0 tw-truncate tw-text-base tw-font-bold">{destination || 'نامشخص'}</dd>
        </div>
      </dl>
    </div>
  );
}

export function Spec({ icon: IconComponent, label, value, highlight }: { icon: Icon; label: string; value?: string | null; highlight?: boolean }) {
  if (!value) return null;
  return (
    <div
      title={label}
      className={cn(
        'tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-lg tw-px-2.5 tw-py-1 tw-text-xs tw-font-medium',
        highlight ? 'tw-bg-brand-orange-soft tw-text-brand-orange-ink' : 'tw-bg-brand-sky tw-text-brand-navy',
      )}
    >
      <IconComponent size={14} aria-hidden />
      <span className="tw-sr-only">{label}: </span>
      {value}
    </div>
  );
}

export function Badge({ children, tone }: { children: ReactNode; tone: 'orange' | 'sky' | 'muted' }) {
  const tones = {
    orange: 'tw-bg-brand-orange-soft tw-text-brand-orange-ink',
    sky: 'tw-bg-brand-sky tw-text-brand-navy',
    muted: 'tw-bg-stone-100 tw-text-brand-muted',
  };
  return (
    <span className={cn('tw-inline-flex tw-items-center tw-gap-1 tw-whitespace-nowrap tw-rounded-full tw-px-3 tw-py-1 tw-text-xs tw-font-bold', tones[tone])}>
      {children}
    </span>
  );
}

export function CardSkeleton() {
  return (
    <div className="tw-animate-pulse tw-overflow-hidden tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white" aria-hidden>
      <div className="tw-h-12 tw-bg-brand-sky/60" />
      <div className="tw-space-y-4 tw-p-5">
        <div className="tw-h-4 tw-w-40 tw-rounded tw-bg-brand-sky" />
        <div className="tw-h-4 tw-w-32 tw-rounded tw-bg-brand-sky" />
        <div className="tw-flex tw-gap-2">
          {[16, 20, 14].map((width) => (
            <div key={width} className="tw-h-6 tw-rounded-lg tw-bg-brand-sky" style={{ width: `${width * 4}px` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, hint }: { icon: Icon; title: string; hint: string }) {
  return (
    <div className="tw-flex tw-flex-col tw-items-center tw-gap-3 tw-rounded-2xl tw-border tw-border-dashed tw-border-brand-line tw-bg-white tw-px-6 tw-py-14 tw-text-center">
      <IconTile icon={icon} size="lg" />
      <p className="tw-font-bold">{title}</p>
      <p className="tw-max-w-sm tw-text-sm tw-text-brand-muted">{hint}</p>
    </div>
  );
}

export function Pager({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav aria-label="صفحه‌بندی" className="tw-flex tw-items-center tw-justify-center tw-gap-3 tw-pt-2">
      {/* In RTL "previous" points right. */}
      <IconButton icon={ChevronRight} label="صفحه قبل" disabled={page <= 1} onClick={() => onChange(page - 1)} />
      <span className="tw-rounded-full tw-bg-white tw-px-4 tw-py-2 tw-text-sm tw-font-medium tw-shadow-sm">
        {faNumber(page)} / {faNumber(pages)}
      </span>
      <IconButton icon={ChevronLeft} label="صفحه بعد" disabled={page >= pages} onClick={() => onChange(page + 1)} />
    </nav>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; icon: Icon }>;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="tw-inline-flex tw-gap-1 tw-rounded-full tw-border tw-border-brand-line tw-bg-white tw-p-1">
      {options.map(({ value: optionValue, label: optionLabel, icon: IconComponent }) => {
        const active = optionValue === value;
        return (
          <button
            key={optionValue}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(optionValue)}
            className={cn(
              'tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-full tw-px-3.5 tw-py-1.5 tw-text-xs tw-transition-colors',
              active ? 'tw-bg-brand-orange-soft tw-font-bold tw-text-brand-orange-ink' : 'tw-bg-transparent tw-text-brand-muted hover:tw-text-brand-navy',
            )}
          >
            <IconComponent size={15} aria-hidden />
            {optionLabel}
          </button>
        );
      })}
    </div>
  );
}

// Section title in the design's style: bold navy heading with an orange dot, optional side slot.
export function SectionTitle({ title, hint, side }: { title: string; hint?: string; side?: ReactNode }) {
  return (
    <div className="tw-flex tw-flex-wrap tw-items-end tw-justify-between tw-gap-3">
      <div>
        <h2 className="tw-flex tw-items-center tw-gap-2 tw-text-lg tw-font-bold">
          <span className="tw-h-2.5 tw-w-2.5 tw-rounded-full tw-bg-brand-orange tw-ring-4 tw-ring-brand-orange-soft" aria-hidden />
          {title}
        </h2>
        {hint && <p className="tw-mt-1 tw-text-sm tw-text-brand-muted">{hint}</p>}
      </div>
      {side}
    </div>
  );
}
