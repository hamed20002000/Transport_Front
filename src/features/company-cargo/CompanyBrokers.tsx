import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { CalendarDays, ChevronDown, CircleCheck, ClipboardList, Clock, Handshake, LoaderCircle, Phone, Trash2, UserPlus } from 'lucide-react';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { useMessageBox } from 'src/shared/components/message-box/MessageBoxProvider';
import { cn } from 'src/shared/utils/utils';
import { factoryError, inviteSmsText } from 'src/features/factory/api';
import { brokerInviteUrl, createBrokerInvite, getCompanyBrokers, removeBroker, type CompanyBroker } from './brokerInvitesApi';
import CompanyShell from './CompanyShell';
import { CardSkeleton, EmptyState, LoadFailed, SectionTitle } from './components';
import InviteLinks from './InviteLinks';
import AccountCode from 'src/shared/components/account-code/AccountCode';
import { useNotificationEvent } from './notificationSocket';
import { InviteTimeLeft } from './inviteExpiry';

const fa = (value: number) => value.toLocaleString('fa-IR');
const faDate = (value: string) => new Date(value).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
const inputClass =
  'tw-h-11 tw-w-full tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-3 tw-text-brand-navy tw-outline-none tw-transition-colors placeholder:tw-text-brand-muted/70 focus:tw-border-brand-orange';
const outlineButton =
  'tw-inline-flex tw-h-10 tw-items-center tw-gap-1.5 tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-3 tw-text-sm tw-font-bold hover:tw-bg-brand-sky';
const digits = (value: string) =>
  value.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

/** One broker the company invited: its state and requests, and (opened) the invite that works only for its number. */
function BrokerCard({ broker, open, onToggle, onRemove, removing }: { broker: CompanyBroker; open: boolean; onToggle: () => void; onRemove: () => void; removing: boolean }) {
  const link = brokerInviteUrl(broker.token);
  const joined = !!broker.usedAt;
  return (
    <article className="tw-space-y-3 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-4 tw-shadow-sm">
      <div className="tw-flex tw-items-center tw-gap-3">
        <span className="tw-flex tw-h-10 tw-w-10 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-xl tw-bg-brand-sky tw-text-brand-navy" aria-hidden>
          <Handshake size={18} />
        </span>
        <div className="tw-min-w-0 tw-flex-1">
          <p className="tw-m-0 tw-truncate tw-font-bold">{broker.name}</p>
          <div className="tw-mt-1 tw-flex tw-flex-wrap tw-items-center tw-gap-1.5">
            <AccountCode code={broker.accountCode} />
            {joined ? (
              <span className="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-full tw-bg-emerald-50 tw-px-2 tw-py-0.5 tw-text-xs tw-font-bold tw-text-emerald-700">
                <CircleCheck size={12} aria-hidden /> وارد شده
              </span>
            ) : (
              <span className="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-full tw-bg-amber-50 tw-px-2 tw-py-0.5 tw-text-xs tw-font-bold tw-text-amber-700">
                <Clock size={12} aria-hidden /> هنوز وارد نشده
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          title="حذف"
          aria-label={`حذف ${broker.name}`}
          className="tw-flex tw-h-9 tw-w-9 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-xl tw-border tw-border-red-100 tw-bg-white tw-text-red-600 hover:tw-bg-red-50"
        >
          {removing ? <LoaderCircle size={16} className="tw-animate-spin" aria-hidden /> : <Trash2 size={16} aria-hidden />}
        </button>
      </div>

      <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-x-4 tw-gap-y-1 tw-text-xs tw-text-brand-muted">
        {broker.mobile && (
          <span className="tw-inline-flex tw-items-center tw-gap-1">
            <Phone size={13} aria-hidden /> <bdi dir="ltr">{broker.mobile}</bdi>
          </span>
        )}
        <span className="tw-inline-flex tw-items-center tw-gap-1">
          <CalendarDays size={13} aria-hidden /> دعوت از {faDate(broker.joinedAt)}
        </span>
        <span className="tw-inline-flex tw-items-center tw-gap-1">
          <ClipboardList size={13} aria-hidden /> {fa(broker.requests)} درخواست
        </span>
        {!joined && <InviteTimeLeft expiresAt={broker.expiresAt} />}
      </div>

      {!joined && (
        <button type="button" onClick={onToggle} aria-expanded={open} className={cn(outlineButton, 'tw-w-full tw-justify-center')}>
          لینک دعوت <ChevronDown size={16} aria-hidden className={cn('tw-transition-transform', open && 'tw-rotate-180')} />
        </button>
      )}
      {open && !joined && (
        <InviteLinks
          link={link}
          messengers={broker.messengers}
          who="واسط"
          note={`این لینک فقط برای شماره‌ی ${broker.mobile} کار می‌کند؛ واسط با همین شماره و کد پیامکی وارد می‌شود.`}
          messengerNote={`اگر واسط با پیام‌رسان کار می‌کند، لینک همان پیام‌رسان را باز کند یا این کد را بفرستد و بعد شماره‌ی ${broker.mobile} را بدهد.`}
        />
      )}
    </article>
  );
}

/**
 * The company invites brokers by their numbers, as it invites factories: the broker's account is made right away and
 * joins this list; it signs in with that number (web or a messenger), sees this company's loads and requests them.
 * The link and code of each work only for its number.
 */
function BrokersContent() {
  const toast = useToast();
  const messageBox = useMessageBox();
  const [brokers, setBrokers] = useState<CompanyBroker[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [mobile, setMobile] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState('');
  const [opened, setOpened] = useState('');

  const load = useCallback(() => {
    setFailed(false);
    getCompanyBrokers().then(setBrokers, () => setFailed(true));
  }, []);
  useEffect(load, [load]);
  // an invited broker came in (any way): its row says so without a refresh
  useNotificationEvent<{ kind: string }>('invite-used', (event) => event.kind === 'broker' && load());
  // an invite nobody used within its day: the broker it made leaves the list
  useNotificationEvent<{ kind: string }>('invite-expired', (event) => event.kind === 'broker' && load());

  async function submit(event: FormEvent) {
    event.preventDefault();
    const number = digits(mobile).replace(/[\s-]/g, '');
    if (!/^(\+98|0098|98|0)?9\d{9}$/.test(number)) return toast.error('شماره موبایل معتبر وارد کنید؛ مثلاً 09121234567.');
    setSaving(true);
    try {
      const invite = await createBrokerInvite(number, name.trim() || undefined);
      setMobile('');
      setName('');
      const smsNote = inviteSmsText(invite.sms, 'واسط');
      if (invite.sms.status === 'sent') toast.success(`واسط اضافه شد. ${smsNote}`);
      else toast.info(`واسط اضافه شد. ${smsNote}`);
      setBrokers(await getCompanyBrokers());
      setOpened(invite.brokerUserId);
    } catch (error) {
      toast.error(factoryError(error));
    } finally {
      setSaving(false);
    }
  }

  async function remove(broker: CompanyBroker) {
    const confirmed = await messageBox.confirm({
      message: `«${broker.name}» از لیست واسط‌ها حذف شود؟ دعوتش باطل می‌شود و شرکت شما از شرکت‌های انتخابی‌اش بیرون می‌رود.`,
      confirmText: 'حذف',
      tone: 'danger',
    });
    if (!confirmed) return;
    setBusy(broker.userId);
    try {
      await removeBroker(broker.userId);
      setBrokers((current) => current?.filter((item) => item.userId !== broker.userId) ?? null);
      toast.success('واسط حذف شد.');
    } catch (error) {
      toast.error(factoryError(error));
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="tw-space-y-6">
      <SectionTitle title="واسط‌ها" hint="شماره‌ی واسط را وارد کنید تا حسابش ساخته شود؛ بعد لینک یا کد دعوت را برایش بفرستید. واسط بارهای شما را می‌بیند و برایشان درخواست می‌دهد." />

      <form onSubmit={submit} className="tw-space-y-3 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-5 tw-shadow-sm" aria-busy={saving}>
        <h3 className="tw-m-0 tw-flex tw-items-center tw-gap-2 tw-text-base tw-font-bold">
          <UserPlus size={18} aria-hidden /> دعوت واسط
        </h3>
        <div className="tw-grid tw-gap-3 sm:tw-grid-cols-2">
          <label className="tw-space-y-1.5 tw-text-sm tw-font-medium">
            شماره موبایل واسط <span className="tw-text-brand-orange" aria-hidden>*</span>
            <input value={mobile} onChange={(event) => setMobile(event.target.value)} inputMode="tel" dir="ltr" placeholder="0912 123 4567" maxLength={20} className={cn(inputClass, 'tw-text-left')} />
          </label>
          <label className="tw-space-y-1.5 tw-text-sm tw-font-medium">
            نام واسط یا دفتر (اختیاری)
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={200} placeholder="مثلاً دفتر باربری امید" className={inputClass} />
          </label>
        </div>
        <p className="tw-m-0 tw-text-xs tw-text-brand-muted">دعوت یک روز اعتبار دارد؛ اگر واسط تا آن موقع وارد نشود، دعوت و حسابش پاک می‌شود. واسطی که خودش در ترابوت است، یا شرکت دیگری دعوتش کرده و هنوز وقت دارد، دعوت نمی‌شود؛ شماره‌ی راننده، شرکت یا کارخانه هم همین‌طور.</p>
        <button
          type="submit"
          disabled={saving || !mobile.trim()}
          className="tw-inline-flex tw-h-11 tw-items-center tw-gap-2 tw-rounded-xl tw-border-0 tw-bg-brand-orange tw-px-5 tw-font-bold tw-text-white hover:tw-bg-brand-orange-dark"
        >
          {saving ? <LoaderCircle size={18} className="tw-animate-spin" aria-hidden /> : <UserPlus size={18} aria-hidden />} افزودن واسط و ساخت لینک دعوت
        </button>
      </form>

      <section className="tw-space-y-3">
        <h3 className="tw-m-0 tw-text-base tw-font-bold">واسط‌های شما ({fa(brokers?.length ?? 0)})</h3>
        {failed ? (
          <LoadFailed onRetry={load} />
        ) : !brokers ? (
          <CardSkeleton />
        ) : !brokers.length ? (
          <EmptyState icon={Handshake} title="هنوز واسطی دعوت نکرده‌اید" hint="با شماره‌ی واسط، حسابش را بسازید و لینک دعوت را برایش بفرستید." />
        ) : (
          brokers.map((broker) => (
            <BrokerCard
              key={broker.userId}
              broker={broker}
              open={opened === broker.userId}
              onToggle={() => setOpened((current) => (current === broker.userId ? '' : broker.userId))}
              onRemove={() => remove(broker)}
              removing={busy === broker.userId}
            />
          ))
        )}
      </section>
    </div>
  );
}

export default function CompanyBrokers() {
  return (
    <CompanyShell>
      <BrokersContent />
    </CompanyShell>
  );
}
