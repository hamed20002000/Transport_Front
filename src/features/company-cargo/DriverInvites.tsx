import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { CalendarDays, CircleCheck, CircleX, Clock, Download, FileSpreadsheet, Link2, LoaderCircle, Phone, Trash2, Truck, UserPlus } from 'lucide-react';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { useMessageBox } from 'src/shared/components/message-box/MessageBoxProvider';
import { cn } from 'src/shared/utils/utils';
import { factoryError, inviteSmsText, type InviteSms } from 'src/features/factory/api';
import { CardSkeleton, LoadFailed } from './components';
import { useNotificationEvent } from './notificationSocket';
import { InviteTimeLeft } from './inviteExpiry';
import {
  downloadDriverTemplate,
  driverInviteUrl,
  getDriverInvites,
  inviteDrivers,
  MAX_DRIVER_INVITES,
  parseDriverLines,
  readDriverExcel,
  removeDriverInvite,
  type DriverExcelResult,
  type DriverInvite,
  type DriverInviteOutcome,
} from './driverInvitesApi';

const fa = (value: number) => value.toLocaleString('fa-IR');
const faDate = (value: string) => new Date(value).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
const outlineButton =
  'tw-inline-flex tw-h-10 tw-items-center tw-gap-1.5 tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-3 tw-text-sm tw-font-bold hover:tw-bg-brand-sky';

function InviteRow({ invite, onRemove, removing }: { invite: DriverInvite; onRemove: () => void; removing: boolean }) {
  const link = driverInviteUrl(invite.token);
  const joined = !!invite.usedAt;
  return (
    <article
      className={cn(
        'tw-space-y-3 tw-rounded-2xl tw-border tw-bg-white tw-p-4 tw-shadow-sm tw-transition-colors',
        joined ? 'tw-border-emerald-300 tw-bg-emerald-50/40' : 'tw-border-brand-line',
      )}
    >
      <div className="tw-flex tw-items-center tw-gap-3">
        <span className="tw-flex tw-h-10 tw-w-10 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-xl tw-bg-brand-sky tw-text-brand-navy" aria-hidden>
          <Truck size={18} />
        </span>
        <p className="tw-m-0 tw-min-w-0 tw-flex-1 tw-truncate tw-font-bold">{invite.name}</p>
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          title="حذف"
          aria-label={`حذف دعوت ${invite.name}`}
          className="tw-flex tw-h-9 tw-w-9 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-xl tw-border tw-border-red-100 tw-bg-white tw-text-red-600 hover:tw-bg-red-50"
        >
          {removing ? <LoaderCircle size={16} className="tw-animate-spin" aria-hidden /> : <Trash2 size={16} aria-hidden />}
        </button>
      </div>

      <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-x-4 tw-gap-y-1.5 tw-text-xs tw-text-brand-muted">
        {joined ? (
          <span className="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-full tw-bg-emerald-50 tw-px-2 tw-py-0.5 tw-font-bold tw-text-emerald-700">
            <CircleCheck size={12} aria-hidden /> وارد شد
          </span>
        ) : (
          <span className="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-full tw-bg-amber-50 tw-px-2 tw-py-0.5 tw-font-bold tw-text-amber-700">
            <Clock size={12} aria-hidden /> هنوز وارد نشده
          </span>
        )}
        <span className="tw-inline-flex tw-items-center tw-gap-1">
          <Phone size={13} aria-hidden /> <bdi dir="ltr">{invite.mobile}</bdi>
        </span>
        <span className="tw-inline-flex tw-items-center tw-gap-1">
          <CalendarDays size={13} aria-hidden /> دعوت {faDate(invite.createdAt)}
        </span>
        {!joined && <InviteTimeLeft expiresAt={invite.expiresAt} />}
      </div>

      {!joined && (
        // to see, not to pass on: the invite SMS carries it to the driver's own number
        <p
          dir="ltr"
          onCopy={(event) => event.preventDefault()}
          onContextMenu={(event) => event.preventDefault()}
          className="tw-m-0 tw-flex tw-select-none tw-items-center tw-gap-1.5 tw-truncate tw-rounded-xl tw-bg-brand-bg tw-px-3 tw-py-2 tw-text-xs tw-text-brand-muted"
          title="لینک دعوت (فقط برای دیدن)"
        >
          <Link2 size={13} aria-hidden className="tw-shrink-0" />
          <span className="tw-truncate">{link}</span>
        </p>
      )}
    </article>
  );
}

/** What happened to each number of the last batch. */
function Outcomes({ outcomes, sms }: { outcomes: DriverInviteOutcome[]; sms: InviteSms }) {
  const invited = outcomes.filter((outcome) => outcome.status !== 'refused').length;
  return (
    <div className="tw-space-y-2 tw-rounded-xl tw-bg-brand-bg tw-p-3 tw-text-sm">
      <p className="tw-m-0 tw-font-bold">
        {fa(invited)} راننده دعوت شد{outcomes.length > invited ? ` · ${fa(outcomes.length - invited)} شماره رد شد` : ''}
      </p>
      {invited > 0 && <p className={cn('tw-m-0', sms.status === 'sent' ? 'tw-text-emerald-700' : 'tw-text-brand-orange-ink')}>{inviteSmsText(sms, 'راننده')}</p>}
      <ul className="tw-m-0 tw-max-h-48 tw-list-none tw-space-y-1 tw-overflow-y-auto tw-p-0">
        {outcomes.map((outcome) => (
          <li key={outcome.mobile} className="tw-flex tw-items-center tw-gap-1.5">
            {outcome.status === 'refused' ? <CircleX size={14} className="tw-shrink-0 tw-text-red-600" aria-hidden /> : <CircleCheck size={14} className="tw-shrink-0 tw-text-emerald-600" aria-hidden />}
            <span dir="ltr">{outcome.mobile}</span>
            <span className="tw-text-brand-muted">
              {outcome.status === 'refused' ? outcome.reason : outcome.status === 'created' ? 'حساب راننده ساخته شد' : 'راننده‌ی سامانه بود؛ شرکت حمل‌ونقل شما به لیستش اضافه شد'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Inviting drivers by their numbers, one or many: each driver's account is made right away (or an existing driver
 * found) and the company's loads reach it. Each one's link and code work only for its number.
 */
export default function DriverInvites() {
  const toast = useToast();
  const messageBox = useMessageBox();
  const [invites, setInvites] = useState<DriverInvite[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [outcomes, setOutcomes] = useState<{ outcomes: DriverInviteOutcome[]; sms: InviteSms } | null>(null);
  const [busy, setBusy] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [reading, setReading] = useState(false);
  const [excelErrors, setExcelErrors] = useState<DriverExcelResult['errors']>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  // drivers who came in are drivers of the list below, not invites any more
  const load = useCallback(() => {
    setFailed(false);
    getDriverInvites().then((rows) => setInvites(rows.filter((row) => !row.usedAt)), () => setFailed(true));
  }, []);
  useEffect(load, [load]);

  // an invited driver came in (any way: the link, the panel, a messenger): «وارد شد» at once, gone 5 seconds later
  useNotificationEvent<{ kind: string; userId: string }>('invite-used', ({ kind, userId }) => {
    if (kind !== 'driver') return;
    const invite = invites?.find((item) => item.driverUserId === userId);
    if (!invite) return;
    toast.success(`«${invite.name}» وارد شد.`);
    setInvites((current) => current?.map((item) => (item.driverUserId === userId ? { ...item, usedAt: new Date().toISOString() } : item)) ?? null);
    setTimeout(() => setInvites((current) => current?.filter((item) => item.driverUserId !== userId) ?? null), 5000);
  });
  // an invite nobody used within its day: gone, its account too when only the invite made it
  useNotificationEvent<{ kind: string; userId: string }>('invite-expired', ({ kind, userId }) => {
    if (kind !== 'driver') return;
    const invite = invites?.find((item) => item.driverUserId === userId);
    if (!invite) return;
    toast.info(`دعوت «${invite.name}» منقضی شد؛ در مهلتش وارد نشد.`);
    setInvites((current) => current?.filter((item) => item.driverUserId !== userId) ?? null);
  });

  const lines = parseDriverLines(text);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!lines.length) return;
    if (lines.length > MAX_DRIVER_INVITES) return toast.error(`حداکثر ${fa(MAX_DRIVER_INVITES)} راننده در هر بار.`);
    setSaving(true);
    try {
      const result = await inviteDrivers(lines);
      setOutcomes(result);
      setExcelErrors([]);
      if (!result.outcomes.some((outcome) => outcome.status === 'refused')) setText('');
      load();
    } catch (error) {
      toast.error(factoryError(error));
    } finally {
      setSaving(false);
    }
  }

  // the file's drivers go into the box as lines, so the company sees and can fix them before inviting
  async function readExcel(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setReading(true);
    try {
      const result = await readDriverExcel(file);
      setExcelErrors(result.errors);
      setOutcomes(null);
      if (result.drivers.length) {
        setText(result.drivers.map((driver) => (driver.name ? `${driver.mobile} ${driver.name}` : driver.mobile)).join('\n'));
        toast.success(`${fa(result.drivers.length)} راننده از فایل خوانده شد؛ بررسی کنید و «دعوت» را بزنید.`);
      }
    } catch (error) {
      toast.error(factoryError(error));
    } finally {
      setReading(false);
    }
  }

  async function template() {
    try {
      await downloadDriverTemplate();
    } catch (error) {
      toast.error(factoryError(error));
    }
  }

  async function remove(invite: DriverInvite) {
    const confirmed = await messageBox.confirm({
      message: `دعوت «${invite.name}» باطل و شرکت حمل‌ونقل شما از لیست شرکت‌های حمل‌ونقل این راننده برداشته شود؟ دیگر بارهای شما برایش اعلام نمی‌شود.`,
      confirmText: 'حذف',
      tone: 'danger',
    });
    if (!confirmed) return;
    setBusy(invite.driverUserId);
    try {
      await removeDriverInvite(invite.driverUserId);
      setInvites((current) => current?.filter((item) => item.driverUserId !== invite.driverUserId) ?? null);
      toast.success('دعوت راننده حذف شد.');
    } catch (error) {
      toast.error(factoryError(error));
    } finally {
      setBusy('');
    }
  }

  const shown = showAll ? invites : invites?.slice(0, 5);

  return (
    <section className="tw-space-y-4 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-5 tw-shadow-sm">
      <form onSubmit={submit} className="tw-space-y-3" aria-busy={saving}>
        <h3 className="tw-m-0 tw-flex tw-items-center tw-gap-2 tw-text-base tw-font-bold">
          <UserPlus size={18} aria-hidden /> دعوت راننده
        </h3>
        <p className="tw-m-0 tw-text-sm tw-text-brand-muted">
          هر راننده در یک خط: شماره موبایل و اگر خواستید نامش (مثلاً «09121234567 علی رضایی»). می‌توانید یک راننده یا یک لیست را یک‌جا وارد کنید، یا لیست را از فایل اکسل بخوانید. حساب هر راننده همان لحظه ساخته می‌شود و بارهای شما برایش اعلام می‌شود. یک راننده پیامکی با لینک خودش می‌گیرد؛ یک لیست، یک پیامک گروهی با آدرس ورود.
        </p>
        <p className="tw-m-0 tw-text-xs tw-leading-6 tw-text-brand-muted">
          دعوت یک روز اعتبار دارد؛ اگر راننده تا آن موقع وارد نشود، دعوت و حسابش پاک می‌شود. راننده‌ای که خودش در ترابوت است، یا شرکت
          دیگری دعوتش کرده و هنوز وقت دارد، دعوت نمی‌شود.
        </p>
        <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
          <button type="button" onClick={() => fileInput.current?.click()} disabled={reading} className={outlineButton}>
            {reading ? <LoaderCircle size={16} className="tw-animate-spin" aria-hidden /> : <FileSpreadsheet size={16} aria-hidden />}
            بارگذاری از اکسل
          </button>
          <button type="button" onClick={template} className={outlineButton}>
            <Download size={16} aria-hidden /> فایل نمونه
          </button>
          <input ref={fileInput} type="file" accept=".xlsx,.xls" hidden onChange={readExcel} />
          <span className="tw-text-xs tw-text-brand-muted">ستون «شماره موبایل» و اگر خواستید «نام راننده»</span>
        </div>
        {excelErrors.length > 0 && (
          <div className="tw-space-y-1 tw-rounded-xl tw-bg-red-50 tw-p-3 tw-text-sm tw-text-red-700">
            <p className="tw-m-0 tw-font-bold">{fa(excelErrors.length)} ردیف فایل خوانده نشد (بقیه در کادر آمدند):</p>
            <ul className="tw-m-0 tw-max-h-32 tw-list-none tw-space-y-0.5 tw-overflow-y-auto tw-p-0">
              {excelErrors.map((error) => (
                <li key={error.row}>
                  ردیف {fa(error.row)}: {error.message}
                </li>
              ))}
            </ul>
          </div>
        )}
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={4}
          dir="auto"
          placeholder={'09121234567 علی رضایی\n09351234567'}
          aria-label="شماره و نام رانندگان"
          className="tw-w-full tw-resize-y tw-rounded-xl tw-border tw-border-brand-line tw-p-3 tw-text-sm tw-leading-7 tw-outline-none tw-transition-colors placeholder:tw-text-brand-muted/70 focus:tw-border-brand-orange"
        />
        <button
          type="submit"
          disabled={saving || !lines.length}
          className="tw-inline-flex tw-h-11 tw-items-center tw-gap-2 tw-rounded-xl tw-border-0 tw-bg-brand-orange tw-px-5 tw-font-bold tw-text-white hover:tw-bg-brand-orange-dark"
        >
          {saving ? <LoaderCircle size={18} className="tw-animate-spin" aria-hidden /> : <UserPlus size={18} aria-hidden />}
          {lines.length > 1 ? `دعوت ${fa(lines.length)} راننده` : 'دعوت راننده'}
        </button>
        {outcomes && <Outcomes outcomes={outcomes.outcomes} sms={outcomes.sms} />}
      </form>

      <div className="tw-space-y-3 tw-border-t tw-border-brand-line tw-pt-4">
        <h4 className="tw-m-0 tw-text-sm tw-font-bold">رانندگان دعوت‌شده ({fa(invites?.length ?? 0)})</h4>
        {failed ? (
          <LoadFailed onRetry={load} />
        ) : !invites ? (
          <CardSkeleton />
        ) : !invites.length ? (
          <p className="tw-m-0 tw-text-sm tw-text-brand-muted">هنوز راننده‌ای دعوت نکرده‌اید.</p>
        ) : (
          <>
            {shown!.map((invite) => (
              <InviteRow
                key={invite.driverUserId}
                invite={invite}
                onRemove={() => remove(invite)}
                removing={busy === invite.driverUserId}
              />
            ))}
            {invites.length > 5 && (
              <button type="button" onClick={() => setShowAll((value) => !value)} className={outlineButton}>
                {showAll ? 'نمایش کمتر' : `نمایش همه (${fa(invites.length)})`}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}
