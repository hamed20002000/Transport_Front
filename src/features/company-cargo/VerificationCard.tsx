import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, Hourglass, LoaderCircle, ShieldCheck, TriangleAlert, XCircle } from 'lucide-react';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { cn } from 'src/shared/utils/utils';
import { factoryError } from 'src/features/factory/api';
import { useNotificationEvent } from './notificationSocket';
import { getVerification, requestVerification, type VerificationState } from './verificationApi';

const fa = (value: number) => value.toLocaleString('fa-IR');

/**
 * The verification of a transport company or factory that signed up on its own: what to fill in, the
 * «درخواست بررسی اعتبار» button, waiting, or the parent company's reason for a rejection. Nothing once approved.
 * dirty: the profile has unsaved changes (they must be saved before asking). onChange: the state changed (the
 * parent company decided while the page was open, or a request was sent).
 */
export default function VerificationCard({ dirty = false, version = 0, onChange }: { dirty?: boolean; version?: number; onChange?: (state: VerificationState) => void }) {
  const toast = useToast();
  const [state, setState] = useState<VerificationState | null>(null);
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    getVerification()
      .then((next) => {
        setState(next);
        onChange?.(next);
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // reloaded after each profile save (version), so «missing» follows what was just filled in
  useEffect(load, [load, version]);
  useNotificationEvent('verification-changed', () => load());

  if (!state || state.status === 'APPROVED') return null;

  async function send() {
    if (dirty) return toast.error('اول تغییرات پروفایل را ذخیره کنید.');
    setSending(true);
    try {
      const next = await requestVerification();
      setState(next);
      onChange?.(next);
      toast.success('درخواست شما برای شرکت مادر فرستاده شد.');
    } catch (error) {
      toast.error(factoryError(error));
    } finally {
      setSending(false);
    }
  }

  const tone = state.status === 'PENDING' ? 'info' : state.status === 'REJECTED' ? 'warn' : 'start';
  const tones = {
    start: 'tw-border-brand-orange/30 tw-bg-brand-orange-soft/40',
    info: 'tw-border-sky-200 tw-bg-sky-50',
    warn: 'tw-border-red-200 tw-bg-red-50',
  };
  const Icon = state.status === 'PENDING' ? Hourglass : state.status === 'REJECTED' ? XCircle : ShieldCheck;

  return (
    <section className={cn('tw-space-y-3 tw-rounded-2xl tw-border tw-p-4', tones[tone])} aria-live="polite">
      <div className="tw-flex tw-items-start tw-gap-3">
        <Icon size={22} aria-hidden className="tw-mt-0.5 tw-shrink-0" />
        <div className="tw-min-w-0 tw-space-y-1">
          <p className="tw-m-0 tw-font-bold">
            {state.status === 'PENDING'
              ? 'درخواست بررسی اعتبار شما در انتظار تأیید شرکت مادر است'
              : state.status === 'REJECTED'
                ? 'درخواست بررسی اعتبار شما تأیید نشد'
                : 'حساب شما تا بررسی اعتبار فعال نیست'}
          </p>
          <p className="tw-m-0 tw-text-sm tw-leading-7 tw-text-brand-muted">
            {state.status === 'PENDING'
              ? 'شرکت مادر اطلاعات پروفایل شما را بررسی می‌کند. نتیجه همین‌جا، با نوتیفیکیشن و در ربات‌ها اعلام می‌شود.'
              : state.status === 'REJECTED'
                ? `دلیل: ${state.note ?? '—'}`
                : 'اطلاعات پروفایل را کامل کنید و «درخواست بررسی اعتبار» را بزنید؛ بعد از تأیید شرکت مادر، حساب فعال می‌شود.'}
          </p>
          {state.status === 'REJECTED' && (
            <p className="tw-m-0 tw-text-sm tw-text-brand-muted">
              {state.remaining ? `اطلاعات را اصلاح کنید و دوباره درخواست بدهید (${fa(state.remaining)} بار دیگر).` : 'دفعات درخواست تمام شده است؛ با پشتیبانی تماس بگیرید.'}
            </p>
          )}
        </div>
      </div>

      {state.canRequest && state.missing.length > 0 && (
        <p className="tw-m-0 tw-flex tw-items-start tw-gap-1.5 tw-text-sm tw-text-brand-orange-ink">
          <TriangleAlert size={16} aria-hidden className="tw-mt-1 tw-shrink-0" /> اول این‌ها را پر و ذخیره کنید: {state.missing.join('، ')}
        </p>
      )}
      {state.canRequest && (
        <button
          type="button"
          onClick={send}
          disabled={sending || state.missing.length > 0}
          className="tw-inline-flex tw-h-11 tw-items-center tw-gap-2 tw-rounded-xl tw-border-0 tw-bg-brand-orange tw-px-5 tw-font-bold tw-text-white hover:tw-bg-brand-orange-dark"
        >
          {sending ? <LoaderCircle size={18} className="tw-animate-spin" aria-hidden /> : <BadgeCheck size={18} aria-hidden />} درخواست بررسی اعتبار
        </button>
      )}
    </section>
  );
}
