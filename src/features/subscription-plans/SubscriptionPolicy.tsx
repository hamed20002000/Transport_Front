import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Gift, LoaderCircle, Plus, Trash2, Truck } from 'lucide-react';
import PageContainer from 'src/shared/components/container/PageContainer';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { cn } from 'src/shared/utils/utils';
import { CardSkeleton, LoadFailed } from 'src/features/company-cargo/components';
import AdminGate from './AdminGate';
import { adminError, getPolicy, updatePolicy, type Policy } from './adminApi';

const faDate = (value: string) => new Date(value).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
const toLatin = (value: string) => value.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
const fa = (value: number) => value.toLocaleString('fa-IR');
// «20,000,000» or «۲۰٬۰۰۰٬۰۰۰» → 20000000
const amount = (value: string) => Number(toLatin(value).replace(/[^\d]/g, '') || NaN);
const grouped = (value: string) => {
  const digits = toLatin(value).replace(/[^\d]/g, '');
  return digits ? Number(digits).toLocaleString('fa-IR') : '';
};

interface RewardRow {
  minTomans: string;
  freeDays: string;
}
const rowValid = (row: RewardRow) => {
  const min = amount(row.minTomans);
  const days = Number(toLatin(row.freeDays));
  return Number.isSafeInteger(min) && min > 0 && Number.isInteger(days) && days >= 1 && days <= 365;
};
const DAY_MS = 86_400_000;
// «free for n more days» instead of a calendar: the browser's date field is Gregorian, the app is Persian
const daysUntil = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / DAY_MS));

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn('tw-relative tw-h-7 tw-w-12 tw-shrink-0 tw-rounded-full tw-border-0 tw-transition-colors', checked ? 'tw-bg-brand-orange' : 'tw-bg-slate-300')}
    >
      <span className={cn('tw-absolute tw-top-1 tw-h-5 tw-w-5 tw-rounded-full tw-bg-white tw-shadow tw-transition-all', checked ? 'tw-right-1' : 'tw-right-6')} />
    </button>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof Truck; title: string; children: ReactNode }) {
  return (
    <section className="tw-space-y-4 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-5">
      <h2 className="tw-m-0 tw-flex tw-items-center tw-gap-2 tw-text-lg tw-font-bold">
        <span className="tw-flex tw-h-9 tw-w-9 tw-items-center tw-justify-center tw-rounded-xl tw-bg-brand-orange-soft tw-text-brand-orange-ink">
          <Icon size={18} aria-hidden />
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <div className="tw-flex tw-items-center tw-justify-between tw-gap-4">
      <div>
        <p className="tw-m-0 tw-font-bold">{title}</p>
        <p className="tw-m-0 tw-mt-1 tw-text-sm tw-leading-6 tw-text-brand-muted">{hint}</p>
      </div>
      {children}
    </div>
  );
}

function PolicyContent() {
  const toast = useToast();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  // edited copy: saved together with «ذخیره»
  const [draft, setDraft] = useState({ driversEnforced: true, driverTrialDays: '30', enforced: false, freeDays: '' });
  const [rewards, setRewards] = useState<RewardRow[]>([]);

  const load = () => {
    setFailed(false);
    getPolicy()
      .then((value) => {
        setPolicy(value);
        setDraft({
          driversEnforced: value.driversEnforced,
          driverTrialDays: String(value.driverTrialDays),
          enforced: value.enforced,
          freeDays: value.freeUntil && new Date(value.freeUntil).getTime() > Date.now() ? String(daysUntil(value.freeUntil)) : '',
        });
        setRewards(value.driverRewards.map((tier) => ({ minTomans: tier.minTomans.toLocaleString('fa-IR'), freeDays: String(tier.freeDays) })));
      })
      .catch(() => setFailed(true));
  };
  useEffect(load, []);

  const days = Number(toLatin(draft.driverTrialDays));
  const daysValid = Number.isInteger(days) && days >= 0 && days <= 365;
  const freeDays = draft.freeDays.trim() ? Number(toLatin(draft.freeDays)) : 0;
  const freeDaysValid = Number.isInteger(freeDays) && freeDays >= 0 && freeDays <= 3650;
  const freeUntil = freeDays > 0 ? new Date(Date.now() + freeDays * DAY_MS) : null;
  const rewardsValid = rewards.every(rowValid);

  async function save() {
    if (!daysValid || !freeDaysValid || !rewardsValid || saving) return;
    setSaving(true);
    try {
      const saved = await updatePolicy({
        driversEnforced: draft.driversEnforced,
        driverTrialDays: days,
        enforced: draft.enforced,
        freeUntil: draft.enforced && freeUntil ? freeUntil.toISOString() : null,
        driverRewards: rewards.map((row) => ({ minTomans: amount(row.minTomans), freeDays: Number(toLatin(row.freeDays)) })),
      });
      setPolicy(saved);
      toast.success('تنظیمات اشتراک ذخیره شد و همین حالا اعمال می‌شود.');
    } catch (error) {
      toast.error(adminError(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageContainer title="تنظیمات اشتراک" description="اجباری بودن اشتراک و دوره‌ی رایگان">
      <main dir="rtl" lang="fa" className="tw-mx-auto tw-max-w-3xl tw-space-y-5 tw-p-4 tw-text-brand-navy">
        <div>
          <Link to="/admin/subscription-plans" className="tw-text-sm tw-text-brand-orange-ink">
            پلن‌های اشتراک
          </Link>
          <h1 className="tw-m-0 tw-mt-1 tw-text-2xl tw-font-bold">تنظیمات اشتراک</h1>
          <p className="tw-m-0 tw-mt-1 tw-text-sm tw-text-brand-muted">تغییرها بدون ری‌استارت، همین حالا در ربات‌ها، واتساپ و برنامه اعمال می‌شوند.</p>
        </div>

        {failed ? (
          <LoadFailed onRetry={load} />
        ) : !policy ? (
          <CardSkeleton />
        ) : (
          <>
            <Section icon={Truck} title="راننده‌ها">
              <Row
                title="بعد از دوره‌ی رایگان، اشتراک لازم است"
                hint="خاموش باشد، همه‌ی راننده‌ها بدون اشتراک کار می‌کنند. روشن باشد، راننده بعد از دوره‌ی رایگان کاری جز خرید اشتراک ندارد."
              >
                <Switch checked={draft.driversEnforced} onChange={(value) => setDraft({ ...draft, driversEnforced: value })} label="اشتراک اجباری راننده" />
              </Row>
              <label className={cn('tw-block tw-space-y-2', !draft.driversEnforced && 'tw-opacity-50')}>
                <span className="tw-font-bold">روزهای رایگان هر راننده</span>
                <input
                  value={draft.driverTrialDays}
                  onChange={(event) => setDraft({ ...draft, driverTrialDays: event.target.value })}
                  inputMode="numeric"
                  dir="ltr"
                  disabled={!draft.driversEnforced}
                  className={cn('tw-h-11 tw-w-32 tw-rounded-xl tw-border tw-px-3 tw-text-center', daysValid ? 'tw-border-brand-line' : 'tw-border-red-400')}
                />
                <span className="tw-block tw-text-sm tw-leading-6 tw-text-brand-muted">
                  از روز ثبت‌نام هر راننده. رانندگانی که قبل از {faDate(policy.driverTrialStartedAt)} ثبت‌نام کرده بودند، از همان تاریخ حساب می‌شوند.
                </span>
              </label>
            </Section>

            <Section icon={Gift} title="هدیه‌ی رانندگان پرخرید">
              <p className="tw-m-0 tw-text-sm tw-leading-6 tw-text-brand-muted">
                وقتی جمع خریدهای تأییدشده‌ی یک راننده به مبلغ یک پله برسد، همان لحظه روزهای رایگانش را هدیه می‌گیرد (هر پله فقط یک بار)
                و در برنامه، ربات‌ها و واتساپ خبردار می‌شود. هدیه بعد از اشتراک فعلی‌اش شروع می‌شود. با ذخیره، رانندگانی که از قبل به
                این مبلغ رسیده‌اند هم هدیه را می‌گیرند.
              </p>
              {rewards.length === 0 && <p className="tw-m-0 tw-rounded-lg tw-bg-brand-bg tw-px-3 tw-py-2 tw-text-sm">هنوز پله‌ای تعریف نشده است.</p>}
              {rewards.map((row, index) => (
                <div key={index} className="tw-flex tw-flex-wrap tw-items-center tw-gap-2 tw-rounded-xl tw-border tw-border-brand-line tw-p-3">
                  <span className="tw-text-sm">اگر جمع خرید به</span>
                  <input
                    value={row.minTomans}
                    onChange={(event) => setRewards(rewards.map((item, i) => (i === index ? { ...item, minTomans: grouped(event.target.value) } : item)))}
                    inputMode="numeric"
                    dir="ltr"
                    placeholder="۲۰٬۰۰۰٬۰۰۰"
                    aria-label="حداقل جمع خرید (تومان)"
                    className={cn('tw-h-10 tw-w-40 tw-rounded-xl tw-border tw-px-3 tw-text-center', amount(row.minTomans) > 0 ? 'tw-border-brand-line' : 'tw-border-red-400')}
                  />
                  <span className="tw-text-sm">تومان رسید،</span>
                  <input
                    value={row.freeDays}
                    onChange={(event) => setRewards(rewards.map((item, i) => (i === index ? { ...item, freeDays: event.target.value } : item)))}
                    inputMode="numeric"
                    dir="ltr"
                    placeholder="30"
                    aria-label="روزهای رایگان"
                    className={cn('tw-h-10 tw-w-20 tw-rounded-xl tw-border tw-px-3 tw-text-center', rowValid(row) || !row.freeDays ? 'tw-border-brand-line' : 'tw-border-red-400')}
                  />
                  <span className="tw-text-sm">روز رایگان هدیه بگیرد.</span>
                  <button
                    type="button"
                    onClick={() => setRewards(rewards.filter((_, i) => i !== index))}
                    aria-label="حذف این پله"
                    title="حذف این پله"
                    className="tw-ms-auto tw-flex tw-h-9 tw-w-9 tw-items-center tw-justify-center tw-rounded-lg tw-border-0 tw-bg-transparent tw-text-red-600 hover:tw-bg-red-50"
                  >
                    <Trash2 size={16} aria-hidden />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setRewards([...rewards, { minTomans: '', freeDays: '30' }])}
                className="tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-xl tw-border tw-border-dashed tw-border-brand-orange/50 tw-bg-white tw-px-4 tw-py-2 tw-text-sm tw-font-bold tw-text-brand-orange-ink hover:tw-bg-brand-orange-soft"
              >
                <Plus size={16} aria-hidden /> افزودن پله
              </button>
              {policy.driverRewards.length > 0 && (
                <p className="tw-m-0 tw-text-xs tw-text-brand-muted">
                  ذخیره‌شده: {policy.driverRewards.map((tier) => `${fa(tier.minTomans)} تومان ← ${fa(tier.freeDays)} روز`).join('، ')}
                </p>
              )}
            </Section>

            <Section icon={Building2} title="شرکت‌های حمل‌ونقل و واسط‌ها">
              <Row title="اشتراک لازم است" hint="برای پیشنهاد بار، ثبت گروه و کانال و منوی ربات‌ها.">
                <Switch checked={draft.enforced} onChange={(value) => setDraft({ ...draft, enforced: value })} label="اشتراک اجباری شرکت حمل‌ونقل" />
              </Row>
              <label className={cn('tw-block tw-space-y-2', !draft.enforced && 'tw-opacity-50')}>
                <span className="tw-font-bold">چند روز دیگر رایگان باشد؟ (اختیاری)</span>
                <input
                  value={draft.freeDays}
                  onChange={(event) => setDraft({ ...draft, freeDays: event.target.value })}
                  inputMode="numeric"
                  dir="ltr"
                  disabled={!draft.enforced}
                  placeholder="0"
                  className={cn('tw-h-11 tw-w-32 tw-rounded-xl tw-border tw-px-3 tw-text-center', freeDaysValid ? 'tw-border-brand-line' : 'tw-border-red-400')}
                />
                <span className="tw-block tw-text-sm tw-text-brand-muted">
                  {freeUntil ? `رایگان تا ${faDate(freeUntil.toISOString())}، بعد اجباری.` : 'خالی یا صفر یعنی از همین حالا اجباری.'}
                </span>
              </label>
              <p className="tw-m-0 tw-rounded-lg tw-bg-brand-sky tw-px-3 tw-py-2 tw-text-sm">
                الان برای شرکت‌های حمل‌ونقل اشتراک {policy.required ? 'لازم است' : 'لازم نیست'}.
              </p>
            </Section>

            <button
              type="button"
              onClick={save}
              disabled={!daysValid || !freeDaysValid || !rewardsValid || saving}
              className="tw-flex tw-h-12 tw-w-full tw-items-center tw-justify-center tw-gap-2 tw-rounded-xl tw-border-0 tw-bg-brand-orange tw-text-base tw-font-bold tw-text-white hover:tw-bg-brand-orange-dark disabled:tw-opacity-50"
            >
              {saving && <LoaderCircle size={18} className="tw-animate-spin" aria-hidden />}
              ذخیره‌ی تنظیمات
            </button>
          </>
        )}
      </main>
    </PageContainer>
  );
}

export default function SubscriptionPolicy() {
  return (
    <AdminGate>
      <PolicyContent />
    </AdminGate>
  );
}
