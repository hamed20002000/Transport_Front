import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { BellRing, CalendarClock, Hand, MessagesSquare, MousePointerClick, RefreshCw, Smartphone, Users } from 'lucide-react';
import { cn } from 'src/shared/utils/utils';
import { Segmented } from 'src/features/company-cargo/components';
import { getUsageStats, type UsageStats as Stats } from 'src/features/subscription-plans/adminApi';

const PERIODS = [
  { value: '7', label: '۱ هفته', icon: CalendarClock },
  { value: '30', label: '۱ ماه', icon: CalendarClock },
  { value: '90', label: '۳ ماه', icon: CalendarClock },
] as const;
type Period = (typeof PERIODS)[number]['value'];

const CHANNELS: Record<string, string> = {
  pwa: 'برنامه‌ی نصب‌شده (PWA)',
  web: 'سایت در مرورگر',
  bale: 'بله',
  eitaa: 'ایتا',
  rubika: 'روبیکا',
  telegram: 'تلگرام',
  whatsapp: 'واتساپ',
  agent: 'دستیار هوشمند',
  push: 'اعلان گوشی',
  sms: 'پیامک',
  unknown: 'نامشخص (قبل از ثبت منبع)',
};

const fa = (value: number) => value.toLocaleString('fa-IR');
const percent = (value: number) => `٪${value.toLocaleString('fa-IR', { maximumFractionDigits: 1 })}`;
const channelName = (channel: string) => CHANNELS[channel] ?? channel;

function Metric({ icon: Icon, label, value, hint, children }: { icon: typeof Users; label: string; value: string; hint: ReactNode; children?: ReactNode }) {
  return (
    <div className="tw-flex tw-flex-col tw-gap-2 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-5">
      <div className="tw-flex tw-items-center tw-justify-between tw-gap-2">
        <span className="tw-text-sm tw-text-brand-muted">{label}</span>
        <span className="tw-flex tw-h-9 tw-w-9 tw-items-center tw-justify-center tw-rounded-xl tw-bg-brand-orange-soft tw-text-brand-orange-ink">
          <Icon size={18} aria-hidden />
        </span>
      </div>
      <strong className="tw-text-2xl tw-font-bold">{value}</strong>
      <span className="tw-text-xs tw-leading-6 tw-text-brand-muted">{hint}</span>
      {children}
    </div>
  );
}

/** A channel's share as a bar: its count, and its part of the whole. */
function Bars({ rows }: { rows: Array<{ label: string; value: number; note?: string }> }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0) || 1;
  if (!rows.length) return <p className="tw-m-0 tw-text-xs tw-text-brand-muted">هنوز داده‌ای ثبت نشده است.</p>;
  return (
    <ul className="tw-m-0 tw-list-none tw-space-y-2 tw-p-0">
      {rows.map((row) => (
        <li key={row.label} className="tw-space-y-1">
          <div className="tw-flex tw-items-center tw-justify-between tw-gap-2 tw-text-xs">
            <span className="tw-font-bold">{row.label}</span>
            <span className="tw-text-brand-muted">{row.note ?? `${fa(row.value)} · ${percent((row.value / total) * 100)}`}</span>
          </div>
          <div className="tw-h-2 tw-overflow-hidden tw-rounded-full tw-bg-brand-sky" aria-hidden>
            <div className="tw-h-full tw-rounded-full tw-bg-brand-orange" style={{ width: `${Math.min(100, (row.value / total) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * How drivers use Trabot (transport_backend AdminStatsController.usage): the installed app, phone notifications,
 * weekly activity, messengers leading to the app, where load requests come from, and how drivers answer each
 * channel's load notices. Recorded from the day the usage tables came; earlier days have nothing.
 */
export default function UsageStats() {
  const [period, setPeriod] = useState<Period>('30');
  const [stats, setStats] = useState<Stats | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getUsageStats(Number(period))
      .then((value) => {
        setStats(value);
        setFailed(false);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [period]);
  useEffect(load, [load]);

  if (failed && !stats) {
    return (
      <section className="tw-flex tw-items-center tw-justify-between tw-rounded-2xl tw-border tw-border-dashed tw-border-brand-line tw-bg-white tw-p-5 tw-text-sm tw-text-brand-muted">
        آمار استفاده دریافت نشد.
        <button type="button" onClick={load} className="tw-rounded-lg tw-border tw-border-brand-line tw-bg-white tw-px-3 tw-py-1.5 tw-text-xs tw-font-bold">تلاش دوباره</button>
      </section>
    );
  }
  if (!stats) return <div className="tw-h-64 tw-animate-pulse tw-rounded-2xl tw-bg-white" aria-label="در حال بارگذاری آمار استفاده" />;

  const periodLabel = PERIODS.find((item) => item.value === period)?.label ?? '';
  const sources = Object.entries(stats.requestSource).sort((a, b) => b[1] - a[1]);
  const requests = sources.reduce((sum, [, value]) => sum + value, 0);

  return (
    <section className="tw-space-y-4 tw-text-brand-navy" aria-label="آمار استفاده‌ی رانندگان">
      <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3">
        <h2 className="tw-flex tw-items-center tw-gap-2 tw-text-lg tw-font-bold">
          <span className="tw-h-2.5 tw-w-2.5 tw-rounded-full tw-bg-brand-orange tw-ring-4 tw-ring-brand-orange-soft" aria-hidden />
          آمار استفاده‌ی رانندگان
        </h2>
        <div className="tw-flex tw-items-center tw-gap-2">
          <Segmented label="بازه‌ی آمار استفاده" value={period} onChange={setPeriod} options={[...PERIODS]} />
          <button type="button" onClick={load} aria-label="به‌روزرسانی آمار استفاده" title="به‌روزرسانی" className="tw-flex tw-h-9 tw-w-9 tw-items-center tw-justify-center tw-rounded-full tw-border tw-border-brand-line tw-bg-white tw-text-brand-muted hover:tw-text-brand-navy">
            <RefreshCw size={16} className={cn(loading && 'tw-animate-spin')} aria-hidden />
          </button>
        </div>
      </div>

      <div className="tw-grid tw-grid-cols-1 tw-gap-3 sm:tw-grid-cols-2 xl:tw-grid-cols-4">
        <Metric icon={Smartphone} label="نصب برنامه (PWA)" value={percent(stats.pwa.rate)} hint={`${fa(stats.pwa.installed)} از ${fa(stats.drivers)} راننده برنامه را نصب کرده و دست‌کم یک بار از آن باز کرده‌اند`} />
        <Metric icon={BellRing} label="اعلان گوشی فعال" value={percent(stats.push.rate)} hint={`${fa(stats.push.subscribed)} از ${fa(stats.drivers)} راننده اعلان گوشی را روشن کرده‌اند`} />
        <Metric icon={Users} label="راننده‌های فعال هفته" value={percent(stats.weeklyActive.rate)} hint={`${fa(stats.weeklyActive.drivers)} راننده در ۷ روز گذشته از برنامه، سایت یا یکی از پیام‌رسان‌ها استفاده کرده‌اند`}>
          <Bars rows={Object.entries(stats.weeklyActive.byChannel).sort((a, b) => b[1] - a[1]).map(([channel, value]) => ({ label: channelName(channel), value, note: `${fa(value)} راننده` }))} />
        </Metric>
        <Metric
          icon={MessagesSquare}
          label="از پیام‌رسان به برنامه"
          value={percent(stats.messengerToApp.rate)}
          hint={`از ${fa(stats.messengerToApp.messengerDrivers)} راننده‌ای که در ${periodLabel} گذشته در پیام‌رسان‌ها فعال بودند، ${fa(stats.messengerToApp.alsoApp)} نفر برنامه یا سایت را هم باز کرده‌اند`}
        >
          <Bars rows={stats.messengerToApp.linkOpens.map((row) => ({ label: `لینک ${channelName(row.channel)}`, value: row.opens, note: `${fa(row.opens)} بار · ${fa(row.users)} راننده` }))} />
        </Metric>
      </div>

      <div className="tw-grid tw-grid-cols-1 tw-gap-3 lg:tw-grid-cols-2">
        <div className="tw-space-y-3 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-5">
          <h3 className="tw-m-0 tw-flex tw-items-center tw-gap-2 tw-text-sm tw-font-bold">
            <Hand size={16} aria-hidden /> منبع درخواست‌های بار · {fa(requests)} درخواست در {periodLabel} گذشته
          </h3>
          <Bars rows={sources.map(([source, value]) => ({ label: channelName(source), value }))} />
        </div>
        <div className="tw-space-y-3 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-5">
          <h3 className="tw-m-0 tw-flex tw-items-center tw-gap-2 tw-text-sm tw-font-bold">
            <MousePointerClick size={16} aria-hidden /> تعامل با اعلان بار در هر کانال
          </h3>
          {stats.engagement.length ? (
            <table className="tw-w-full tw-text-xs">
              <thead className="tw-text-brand-muted">
                <tr>
                  <th className="tw-py-1 tw-text-start tw-font-normal">کانال</th>
                  <th className="tw-py-1 tw-text-start tw-font-normal">اعلان رسیده</th>
                  <th className="tw-py-1 tw-text-start tw-font-normal">جزئیات یا درخواست</th>
                  <th className="tw-py-1 tw-text-start tw-font-normal">نرخ</th>
                </tr>
              </thead>
              <tbody>
                {stats.engagement.map((row) => (
                  <tr key={row.channel} className="tw-border-t tw-border-brand-line">
                    <td className="tw-py-2 tw-font-bold">{channelName(row.channel)}</td>
                    <td className="tw-py-2">{fa(row.delivered)}</td>
                    <td className="tw-py-2">{fa(row.interacted)}</td>
                    <td className="tw-py-2 tw-font-bold">{row.delivered ? percent(row.rate) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="tw-m-0 tw-text-xs tw-text-brand-muted">هنوز داده‌ای ثبت نشده است.</p>
          )}
          <p className="tw-m-0 tw-text-xs tw-leading-6 tw-text-brand-muted">
            هر راننده و هر بار یک بار شمرده می‌شود. برای پیام‌رسان‌ها: دیدن جزئیات یا درخواست همان بار در همان پیام‌رسان؛ برای اعلان گوشی: باز
            کردن اعلان؛ برای برنامه و سایت: دیدن جزئیات یا درخواست در آن‌ها (اعلانی برایشان شمرده نمی‌شود).
          </p>
        </div>
      </div>
    </section>
  );
}
