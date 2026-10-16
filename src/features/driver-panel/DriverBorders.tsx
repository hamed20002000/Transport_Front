import { useState } from 'react';
import { AlertTriangle, RefreshCw, ShieldCheck } from 'lucide-react';
import { CardSkeleton, EmptyState, IconButton, LoadFailed, SectionTitle } from 'src/features/company-cargo/components';
import { borderOrder, listBorders } from './api';
import { BorderCard } from './borderCard';
import { useAsync } from './components';
import DriverShell from './DriverShell';

function Borders() {
  const { data, loading, failed, reload } = useAsync(listBorders, []);
  const [open, setOpen] = useState<string | null>(null);
  const borders = [...(data ?? [])].sort(borderOrder);
  const stale = borders.some((status) => status.stale);
  return (
    <div className="tw-space-y-5">
      <SectionTitle
        title="وضعیت مرزها"
        hint="صف کامیون‌ها، زمان انتظار، اطلاعیه‌ها و تیرپارک‌های مرزهای زمینی"
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
