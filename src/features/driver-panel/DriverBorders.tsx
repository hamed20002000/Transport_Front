import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, ShieldCheck } from 'lucide-react';
import { CardSkeleton, EmptyState, IconButton, LoadFailed, SectionTitle } from 'src/features/company-cargo/components';
import { borderOrder, getIranOutline, listBorders } from './api';
import { BorderCard } from './borderCard';
import { BordersMap } from './BordersMap';
import { SelectedBorder } from './SelectedBorder';
import { useAsync } from './components';
import DriverShell from './DriverShell';

function Borders() {
  const { data, loading, failed, reload } = useAsync(listBorders, []);
  // Only dims the map outside Iran; the map works without it. (Not useAsync: a failure here needs no error toast.)
  const [outline, setOutline] = useState<[number, number][][] | null>(null);
  useEffect(() => {
    getIranOutline().then(setOutline, () => setOutline(null));
  }, []);
  const [open, setOpen] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const borders = [...(data ?? [])].sort(borderOrder);
  const stale = borders.some((status) => status.stale);
  const selected = borders.find((status) => status.border.id === selectedId) ?? null;
  const mapped = borders.some((status) => status.border.location);
  return (
    <div className="tw-space-y-5">
      <SectionTitle
        title="وضعیت مرزها"
        hint="روی هر مرز در نقشه بزنید تا وضعیت صف، اطلاعیه‌ها و تیرپارک‌هایش را ببینید"
        side={<IconButton icon={RefreshCw} label="به‌روزرسانی" onClick={reload} spinning={loading} disabled={loading} />}
      />
      {stale && (
        <p className="tw-m-0 tw-flex tw-items-center tw-gap-2 tw-rounded-xl tw-bg-amber-50 tw-p-3 tw-text-sm tw-text-amber-900">
          <AlertTriangle size={16} aria-hidden /> بعضی مرزها الان جواب نمی‌دهند؛ آخرین وضعیت ذخیره‌شده‌شان نشان داده شده.
        </p>
      )}
      {loading && !data ? (
        <div className="tw-space-y-3">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : failed && !data ? (
        <LoadFailed onRetry={reload} />
      ) : borders.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="وضعیت مرزها در دسترس نیست" hint="کمی بعد دوباره امتحان کنید." />
      ) : (
        <>
          {/* Without coordinates the list below still has everything. */}
          {mapped && (
            <div className="tw-space-y-2">
              <BordersMap
                borders={borders}
                outline={outline}
                selected={selected}
                onSelect={setSelectedId}
                // key: a new border opens with its details closed
                overlay={selected && <SelectedBorder key={selected.border.id} status={selected} onExit={() => setSelectedId(null)} />}
              />
              <p className="tw-m-0 tw-flex tw-flex-wrap tw-items-center tw-gap-x-4 tw-gap-y-1 tw-text-xs tw-text-brand-muted">
                <span>رنگ دور پرچم، شلوغی صف:</span>
                <span className="tw-inline-flex tw-items-center tw-gap-1">
                  <span className="tw-h-2.5 tw-w-2.5 tw-rounded-full tw-bg-[#059669]" aria-hidden /> کمتر از ۱٬۰۰۰ در صف
                </span>
                <span className="tw-inline-flex tw-items-center tw-gap-1">
                  <span className="tw-h-2.5 tw-w-2.5 tw-rounded-full tw-bg-[#D97706]" aria-hidden /> ۱٬۰۰۰ تا ۳٬۰۰۰
                </span>
                <span className="tw-inline-flex tw-items-center tw-gap-1">
                  <span className="tw-h-2.5 tw-w-2.5 tw-rounded-full tw-bg-[#DC2626]" aria-hidden /> بیش از ۳٬۰۰۰
                </span>
                {selected && <span>P = تیرپارک</span>}
              </p>
            </div>
          )}
          {!selected && (
            <div className="tw-space-y-3">
              {borders.map((status) => (
                <BorderCard
                  key={status.border.id}
                  status={status}
                  open={open === status.border.id}
                  onToggle={() => setOpen((current) => (current === status.border.id ? null : status.border.id))}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function DriverBorders() {
  return (
    <DriverShell title="وضعیت مرزها">
      <Borders />
    </DriverShell>
  );
}
