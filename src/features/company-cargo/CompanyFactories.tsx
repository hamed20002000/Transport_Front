import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ChevronDown, CircleCheck, Clock, Factory, LoaderCircle, Trash2, UserPlus } from 'lucide-react';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { useMessageBox } from 'src/shared/components/message-box/MessageBoxProvider';
import { cn } from 'src/shared/utils/utils';
import { createFactoryInvite, factoryError, getCompanyFactories, inviteSmsText, inviteUrl, removeFactory, type CompanyFactory } from 'src/features/factory/api';
import CompanyShell from './CompanyShell';
import { CardSkeleton, EmptyState, LoadFailed, SectionTitle } from './components';
import InviteLinks from './InviteLinks';

const fa = (value: number) => value.toLocaleString('fa-IR');
const faDate = (value: string) => new Date(value).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
const inputClass =
  'tw-h-11 tw-w-full tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-3 tw-text-brand-navy tw-outline-none tw-transition-colors placeholder:tw-text-brand-muted/70 focus:tw-border-brand-orange';
const outlineButton =
  'tw-inline-flex tw-h-10 tw-items-center tw-gap-1.5 tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-3 tw-text-sm tw-font-bold hover:tw-bg-brand-sky disabled:tw-opacity-50';
const digits = (value: string) =>
  value.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

/** One factory of the company: its state and loads, and (opened) the invite that works only for its number. */
function FactoryCard({ factory, open, onToggle, onRemove, removing }: { factory: CompanyFactory; open: boolean; onToggle: () => void; onRemove: () => void; removing: boolean }) {
  const link = factory.token ? inviteUrl(factory.token) : null;
  return (
    <article className="tw-space-y-4 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-4">
      <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3">
        <button type="button" onClick={onToggle} disabled={!link} aria-expanded={open} className="tw-flex tw-min-w-0 tw-flex-1 tw-items-center tw-justify-between tw-gap-3 tw-border-0 tw-bg-transparent tw-p-0 tw-text-start">
          <span className="tw-min-w-0">
            <span className="tw-flex tw-items-center tw-gap-2 tw-font-bold">
              <Factory size={16} aria-hidden className="tw-text-brand-muted" /> {factory.name}
            </span>
            <span className="tw-mt-1 tw-block tw-text-xs tw-text-brand-muted">
              {factory.mobile && <span dir="ltr">{factory.mobile}</span>} · عضو از {faDate(factory.joinedAt)} · {fa(factory.loads)} بار
            </span>
          </span>
          <span className="tw-flex tw-items-center tw-gap-2">
            {factory.usedAt || !link ? (
              <span className="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-full tw-bg-emerald-50 tw-px-2.5 tw-py-1 tw-text-xs tw-font-bold tw-text-emerald-700">
                <CircleCheck size={13} aria-hidden /> وارد شده
              </span>
            ) : (
              <span className="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-full tw-bg-brand-sky tw-px-2.5 tw-py-1 tw-text-xs tw-font-bold">
                <Clock size={13} aria-hidden /> هنوز وارد نشده
              </span>
            )}
            {link && <ChevronDown size={18} aria-hidden className={cn('tw-text-brand-muted tw-transition-transform', open && 'tw-rotate-180')} />}
          </span>
        </button>
        <button type="button" onClick={onRemove} disabled={removing} className={cn(outlineButton, 'tw-text-red-700')}>
          {removing ? <LoaderCircle size={16} className="tw-animate-spin" aria-hidden /> : <Trash2 size={16} aria-hidden />} حذف
        </button>
      </div>
      {open && link && factory.messengers && (
        <InviteLinks
          link={link}
          messengers={factory.messengers}
          who="کارخانه"
          note={`این لینک فقط برای شماره‌ی ${factory.mobile} کار می‌کند؛ کارخانه با همین شماره و کد پیامکی وارد می‌شود.`}
          messengerNote={`اگر کارخانه با پیام‌رسان کار می‌کند، لینک همان پیام‌رسان را باز کند یا این کد را بفرستد و بعد شماره‌ی ${factory.mobile} را بدهد.`}
          shareText={`برای ثبت بارهای کارخانه‌تان این لینک را باز کنید و با شماره‌ی ${factory.mobile} وارد شوید؛ بار مستقیم به دست ما می‌رسد:\n${link}`}
        />
      )}
    </article>
  );
}

/**
 * The company invites factories (owners of loads) by their numbers: the factory's account is made right away and
 * joins this list; it signs in with that number (web or a messenger) and sends its loads straight into this
 * company's suggestions, instead of calling. The link and code of each work only for its number.
 */
function FactoriesContent() {
  const toast = useToast();
  const messageBox = useMessageBox();
  const [factories, setFactories] = useState<CompanyFactory[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [mobile, setMobile] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState('');
  const [opened, setOpened] = useState('');

  const load = useCallback(() => {
    setFailed(false);
    getCompanyFactories().then(setFactories, () => setFailed(true));
  }, []);
  useEffect(load, [load]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const number = digits(mobile).replace(/[\s-]/g, '');
    if (!/^(\+98|0098|98|0)?9\d{9}$/.test(number)) return toast.error('شماره موبایل معتبر وارد کنید؛ مثلاً 09121234567.');
    setSaving(true);
    try {
      const invite = await createFactoryInvite(number, name.trim() || undefined);
      setMobile('');
      setName('');
      const smsNote = inviteSmsText(invite.sms, 'کارخانه');
      if (invite.sms.status === 'sent') toast.success(`کارخانه اضافه شد. ${smsNote}`);
      else toast.info(`کارخانه اضافه شد. ${smsNote}`);
      setFactories(await getCompanyFactories());
      setOpened(invite.factoryUserId);
    } catch (error) {
      toast.error(factoryError(error));
    } finally {
      setSaving(false);
    }
  }

  async function remove(factory: CompanyFactory) {
    const confirmed = await messageBox.confirm({
      message: `«${factory.name}» از لیست کارخانه‌ها حذف شود؟ دعوتش باطل می‌شود و دیگر نمی‌تواند برای شما بار بفرستد مگر دوباره دعوتش کنید.`,
      confirmText: 'حذف',
      tone: 'danger',
    });
    if (!confirmed) return;
    setBusy(factory.userId);
    try {
      await removeFactory(factory.userId);
      setFactories((current) => current?.filter((item) => item.userId !== factory.userId) ?? null);
      toast.success('کارخانه حذف شد.');
    } catch (error) {
      toast.error(factoryError(error));
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="tw-space-y-6">
      <SectionTitle title="کارخانه‌ها" hint="شماره‌ی کارخانه را وارد کنید تا حسابش ساخته شود؛ بعد لینک یا کد دعوت را برایش بفرستید. بارهایش مستقیم به «بارهای پیشنهادی» شما می‌آید." />

      <form onSubmit={submit} className="tw-space-y-3 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-5 tw-shadow-sm" aria-busy={saving}>
        <h3 className="tw-m-0 tw-flex tw-items-center tw-gap-2 tw-text-base tw-font-bold">
          <UserPlus size={18} aria-hidden /> دعوت کارخانه
        </h3>
        <div className="tw-grid tw-gap-3 sm:tw-grid-cols-2">
          <label className="tw-space-y-1.5 tw-text-sm tw-font-medium">
            شماره موبایل کارخانه <span className="tw-text-brand-orange" aria-hidden>*</span>
            <input value={mobile} onChange={(event) => setMobile(event.target.value)} inputMode="tel" dir="ltr" placeholder="0912 123 4567" maxLength={20} className={cn(inputClass, 'tw-text-left')} />
          </label>
          <label className="tw-space-y-1.5 tw-text-sm tw-font-medium">
            نام کارخانه (اختیاری)
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={200} placeholder="مثلاً کارخانه سیمان تهران" className={inputClass} />
          </label>
        </div>
        <p className="tw-m-0 tw-text-xs tw-text-brand-muted">کارخانه‌ای که شرکت دیگری قبلاً دعوتش کرده، فقط به لیست شما هم اضافه می‌شود. شماره‌ی راننده یا شرکت را نمی‌شود دعوت کرد.</p>
        <button
          type="submit"
          disabled={saving || !mobile.trim()}
          className="tw-inline-flex tw-h-11 tw-items-center tw-gap-2 tw-rounded-xl tw-border-0 tw-bg-brand-orange tw-px-5 tw-font-bold tw-text-white hover:tw-bg-brand-orange-dark disabled:tw-opacity-50"
        >
          {saving ? <LoaderCircle size={18} className="tw-animate-spin" aria-hidden /> : <UserPlus size={18} aria-hidden />} افزودن کارخانه و ساخت لینک دعوت
        </button>
      </form>

      <section className="tw-space-y-3">
        <h3 className="tw-m-0 tw-text-base tw-font-bold">کارخانه‌های شما ({fa(factories?.length ?? 0)})</h3>
        {failed ? (
          <LoadFailed onRetry={load} />
        ) : !factories ? (
          <CardSkeleton />
        ) : !factories.length ? (
          <EmptyState icon={Factory} title="هنوز کارخانه‌ای اضافه نکرده‌اید" hint="با شماره‌ی کارخانه، حسابش را بسازید و لینک دعوت را برایش بفرستید." />
        ) : (
          factories.map((factory) => (
            <FactoryCard
              key={factory.userId}
              factory={factory}
              open={opened === factory.userId}
              onToggle={() => setOpened((current) => (current === factory.userId ? '' : factory.userId))}
              onRemove={() => remove(factory)}
              removing={busy === factory.userId}
            />
          ))
        )}
      </section>
    </div>
  );
}

export default function CompanyFactories() {
  return (
    <CompanyShell>
      <FactoriesContent />
    </CompanyShell>
  );
}
