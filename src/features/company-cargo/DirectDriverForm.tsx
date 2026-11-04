import { useState, type FormEvent } from 'react';
import { CircleCheck, CircleX, LoaderCircle, UserRoundPlus } from 'lucide-react';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { factoryError } from 'src/features/factory/api';
import { registerDriver, type DriverInviteOutcome } from './driverInvitesApi';

const inputClass =
  'tw-h-11 tw-w-full tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-3 tw-text-brand-navy tw-outline-none tw-transition-colors placeholder:tw-text-brand-muted/70 focus:tw-border-brand-orange';
const latin = (value: string) => value.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

/**
 * The parent company registers a driver itself, by name and number (transport_backend DriverInviteService.register):
 * the account is made (or a driver found) and joins its drivers at once; no link, no SMS. The driver signs in to the
 * app or a messenger with that number. Inviting by link stays beside it.
 */
export default function DirectDriverForm({ onRegistered }: { onRegistered: () => void }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [saving, setSaving] = useState(false);
  const [outcome, setOutcome] = useState<DriverInviteOutcome | null>(null);
  const number = latin(mobile).replace(/[\s-]/g, '');
  const valid = name.trim().length >= 3 && /^(\+98|0098|98|0)?9[0-9]{9}$/.test(number);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    try {
      const { outcomes } = await registerDriver({ name: name.trim(), mobile: number });
      const result = outcomes[0] ?? null;
      setOutcome(result);
      if (result && result.status !== 'refused') {
        toast.success(`«${name.trim()}» به رانندگان شما اضافه شد؛ بعد از کامل کردن پروفایل و تأیید شرکت مادر فعال می‌شود.`);
        setName('');
        setMobile('');
        onRegistered();
      }
    } catch (error) {
      toast.error(factoryError(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="tw-space-y-3 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-5 tw-shadow-sm" aria-busy={saving}>
      <h3 className="tw-m-0 tw-flex tw-items-center tw-gap-2 tw-text-base tw-font-bold">
        <UserRoundPlus size={18} aria-hidden /> ثبت مستقیم راننده
      </h3>
      <p className="tw-m-0 tw-text-sm tw-text-brand-muted">
        راننده با نام و شماره‌اش همین حالا ثبت و جزو رانندگان شما می‌شود؛ لینک دعوت و پیامکی فرستاده نمی‌شود. راننده با همین شماره وارد
        برنامه یا ربات می‌شود، پروفایلش را کامل می‌کند (نام، کارت هوشمند و گواهینامه) و بعد از تأیید شرکت مادر فعال می‌شود.
      </p>
      <div className="tw-grid tw-grid-cols-1 tw-gap-3 sm:tw-grid-cols-2">
        <label className="tw-space-y-1.5 tw-text-sm tw-font-medium">
          نام و نام خانوادگی <span className="tw-text-brand-orange" aria-hidden>*</span>
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={200} placeholder="مثلاً علی رضایی" className={inputClass} />
        </label>
        <label className="tw-space-y-1.5 tw-text-sm tw-font-medium">
          شماره موبایل <span className="tw-text-brand-orange" aria-hidden>*</span>
          <input
            value={mobile}
            onChange={(event) => setMobile(event.target.value)}
            maxLength={20}
            inputMode="numeric"
            dir="ltr"
            placeholder="09121234567"
            className={`${inputClass} tw-text-left`}
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={!valid || saving}
        className="tw-inline-flex tw-h-11 tw-items-center tw-gap-2 tw-rounded-xl tw-border-0 tw-bg-brand-orange tw-px-5 tw-font-bold tw-text-white hover:tw-bg-brand-orange-dark disabled:tw-opacity-50"
      >
        {saving ? <LoaderCircle size={18} className="tw-animate-spin" aria-hidden /> : <UserRoundPlus size={18} aria-hidden />} ثبت راننده
      </button>
      {outcome && (
        <p className="tw-m-0 tw-flex tw-items-center tw-gap-1.5 tw-text-sm">
          {outcome.status === 'refused' ? (
            <>
              <CircleX size={15} className="tw-shrink-0 tw-text-red-600" aria-hidden /> <span className="tw-text-red-700">{outcome.reason}</span>
            </>
          ) : (
            <>
              <CircleCheck size={15} className="tw-shrink-0 tw-text-emerald-600" aria-hidden />
              <span className="tw-text-emerald-700">
                {outcome.status === 'created' ? 'حساب راننده ساخته شد و جزو رانندگان شماست.' : 'راننده‌ی سامانه بود؛ به رانندگان شما اضافه شد.'}
              </span>
            </>
          )}
        </p>
      )}
    </form>
  );
}
