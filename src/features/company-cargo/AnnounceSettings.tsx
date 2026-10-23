import { useEffect, useState } from 'react';
import { Hand, Megaphone, Timer } from 'lucide-react';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { cn } from 'src/shared/utils/utils';
import { getAnnounceSettings, saveAnnounceSettings, type AnnounceMode, type AnnounceSettings as Settings } from './api';
import { formatDate } from './components';

// Same bounds as the server (15 minutes to a day).
const intervals = [
  { minutes: 30, label: 'هر ۳۰ دقیقه' },
  { minutes: 60, label: 'هر ۱ ساعت' },
  { minutes: 120, label: 'هر ۲ ساعت' },
  { minutes: 180, label: 'هر ۳ ساعت' },
  { minutes: 360, label: 'هر ۶ ساعت' },
  { minutes: 720, label: 'هر ۱۲ ساعت' },
  { minutes: 1440, label: 'روزی یک بار' },
];

const modes: Array<{ value: AnnounceMode; label: string; hint: string; icon: typeof Hand }> = [
  { value: 'MANUAL', label: 'دستی', hint: 'هر بار پیشنهادی را خودتان با «اعلام بار» می‌فرستید؛ بار ثبت‌شده همان لحظه اعلام می‌شود.', icon: Hand },
  {
    value: 'AUTO',
    label: 'خودکار',
    hint: 'در هر نوبت، بارهای پیشنهادی تازهٔ کانال‌ها (با مبدأ، مقصد و شماره) و بارهای ثبت‌شدهٔ در صف خودکار اعلام می‌شوند.',
    icon: Timer,
  },
];

/**
 * How the company's loads reach drivers: by hand, or automatically every N minutes. Either way each load
 * goes only to drivers of its own trip type (domestic, export, import).
 */
export default function AnnounceSettings({ onSaved }: { onSaved?: () => void }) {
  const toast = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAnnounceSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);

  // The server runs a due turn within a minute of nextRunAt; refetch after that (and keep retrying while it
  // is still in the past) so «نوبت بعدی» moves on without reloading the page.
  const nextRunAt = settings?.mode === 'AUTO' ? settings.nextRunAt : null;
  useEffect(() => {
    if (!nextRunAt) return;
    const wait = Math.max(new Date(nextRunAt).getTime() - Date.now(), 0) + 70_000;
    const timer = setTimeout(() => {
      getAnnounceSettings()
        .then((fresh) => setSettings(fresh.nextRunAt === nextRunAt ? { ...fresh } : fresh))
        .catch(() => undefined);
    }, wait);
    return () => clearTimeout(timer);
  }, [nextRunAt, settings]);

  async function save(mode: AnnounceMode, intervalMinutes: number) {
    setSaving(true);
    try {
      const saved = await saveAnnounceSettings(mode, intervalMinutes);
      setSettings(saved);
      toast.success(mode === 'AUTO' ? 'اعلام خودکار روشن شد.' : 'اعلام بار دستی شد.');
      onSaved?.();
    } catch {
      toast.error('ذخیرهٔ حالت اعلام انجام نشد. دوباره تلاش کنید.');
    } finally {
      setSaving(false);
    }
  }

  if (!settings) return null;
  const current = modes.find((mode) => mode.value === settings.mode)!;
  return (
    <section className="tw-space-y-4 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-5 tw-shadow-sm" aria-label="حالت اعلام بار">
      <div className="tw-flex tw-flex-wrap tw-items-start tw-justify-between tw-gap-3">
        <div className="tw-flex tw-items-start tw-gap-3">
          <Megaphone size={22} aria-hidden className="tw-mt-0.5 tw-shrink-0 tw-text-brand-orange" />
          <div className="tw-space-y-1">
            <h3 className="tw-m-0 tw-text-base tw-font-bold">اعلام بار به راننده‌ها</h3>
            <p className="tw-m-0 tw-text-sm tw-text-brand-muted">{current.hint} هر بار فقط به راننده‌های همان نوع (داخلی، صادراتی، وارداتی) می‌رسد.</p>
          </div>
        </div>
        <div role="radiogroup" aria-label="حالت اعلام" className="tw-flex tw-gap-1 tw-rounded-xl tw-bg-brand-sky/60 tw-p-1">
          {modes.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={settings.mode === value}
              disabled={saving}
              onClick={() => settings.mode !== value && save(value, settings.intervalMinutes)}
              className={cn(
                'tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-lg tw-px-3 tw-py-1.5 tw-text-sm tw-font-medium tw-transition-colors',
                settings.mode === value ? 'tw-bg-white tw-text-brand-orange-ink tw-shadow-sm' : 'tw-text-brand-navy hover:tw-bg-white/60',
              )}
            >
              <Icon size={15} aria-hidden /> {label}
            </button>
          ))}
        </div>
      </div>

      {settings.mode === 'AUTO' && (
        <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-3 tw-border-t tw-border-brand-line tw-pt-4 tw-text-sm">
          <label className="tw-flex tw-items-center tw-gap-2">
            <span className="tw-text-brand-muted">اعلام</span>
            <select
              className="tw-h-10 tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-3 tw-text-brand-navy tw-outline-none focus:tw-border-brand-orange"
              value={settings.intervalMinutes}
              disabled={saving}
              onChange={(event) => save('AUTO', Number(event.target.value))}
            >
              {!intervals.some((item) => item.minutes === settings.intervalMinutes) && (
                <option value={settings.intervalMinutes}>هر {settings.intervalMinutes.toLocaleString('fa-IR')} دقیقه</option>
              )}
              {intervals.map((item) => (
                <option key={item.minutes} value={item.minutes}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          {settings.lastRunAnnounced !== null && settings.lastRunAt && (
            <span className="tw-text-brand-muted">
              آخرین نوبت: {formatDate(settings.lastRunAt)} —{' '}
              {settings.lastRunAnnounced
                ? `${settings.lastRunAnnounced.toLocaleString('fa-IR')} بار اعلام شد`
                : 'بار تازه‌ای برای اعلام نبود'}
            </span>
          )}
          {settings.nextRunAt && <span className="tw-text-brand-muted">نوبت بعدی: {formatDate(settings.nextRunAt)}</span>}
        </div>
      )}
    </section>
  );
}
