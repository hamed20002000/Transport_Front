import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Building2, ChevronDown, CircleCheck, Clock, LoaderCircle, UserPlus } from 'lucide-react';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { cn } from 'src/shared/utils/utils';
import { factoryError, inviteSmsText } from 'src/features/factory/api';
import CompanyShell from './CompanyShell';
import { CardSkeleton, EmptyState, LoadFailed, SectionTitle } from './components';
import InviteLinks from './InviteLinks';
import { useCompanyFeatures } from './featuresApi';
import { createCompanyInvite, getCompanyInvites, joinUrl, type CompanyInvite } from './invitesApi';

const fa = (value: number) => value.toLocaleString('fa-IR');
const faDate = (value: string) => new Date(value).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
const inputClass =
  'tw-h-11 tw-w-full tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-3 tw-text-brand-navy tw-outline-none tw-transition-colors placeholder:tw-text-brand-muted/70 focus:tw-border-brand-orange';
const digits = (value: string) =>
  value.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

/** One invited company: its state, and (opened) the link and codes that work only for its number. */
function InviteCard({ invite, open, onToggle, featureCount }: { invite: CompanyInvite; open: boolean; onToggle: () => void; featureCount: number }) {
  const link = joinUrl(invite.token);
  return (
    <article className="tw-space-y-4 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-4">
      <button type="button" onClick={onToggle} aria-expanded={open} className="tw-flex tw-w-full tw-flex-wrap tw-items-center tw-justify-between tw-gap-3 tw-border-0 tw-bg-transparent tw-p-0 tw-text-start">
        <span className="tw-min-w-0">
          <span className="tw-flex tw-items-center tw-gap-2 tw-font-bold">
            <Building2 size={16} aria-hidden className="tw-text-brand-muted" /> {invite.name}
          </span>
          <span className="tw-mt-1 tw-block tw-text-xs tw-text-brand-muted">
            <span dir="ltr">{invite.mobile}</span> · دعوت {faDate(invite.createdAt)}
          </span>
        </span>
        <span className="tw-flex tw-items-center tw-gap-2">
          {invite.usedAt ? (
            <span className="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-full tw-bg-emerald-50 tw-px-2.5 tw-py-1 tw-text-xs tw-font-bold tw-text-emerald-700">
              <CircleCheck size={13} aria-hidden /> وارد شده · {invite.openFeatures ? `${fa(invite.openFeatures)} از ${fa(featureCount)} بخش باز` : 'هنوز بخشی نخریده'}
            </span>
          ) : (
            <span className="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-full tw-bg-brand-sky tw-px-2.5 tw-py-1 tw-text-xs tw-font-bold">
              <Clock size={13} aria-hidden /> هنوز وارد نشده
            </span>
          )}
          <ChevronDown size={18} aria-hidden className={cn('tw-text-brand-muted tw-transition-transform', open && 'tw-rotate-180')} />
        </span>
      </button>
      {open && (
        <InviteLinks
          link={link}
          messengers={invite.messengers}
          who="شرکت حمل‌ونقل"
          note={`این لینک فقط برای شماره‌ی ${invite.mobile} کار می‌کند؛ شرکت حمل‌ونقل با همین شماره و کد پیامکی وارد می‌شود.`}
          messengerNote={`اگر شرکت حمل‌ونقل با پیام‌رسان کار می‌کند، لینک همان پیام‌رسان را باز کند یا این کد را بفرستد و بعد شماره‌ی ${invite.mobile} را بدهد.`}
        />
      )}
    </article>
  );
}

/**
 * The parent company invites a transport company by its number: the company's account is made right away (approved
 * by the parent company), every menu locked until bought. The company signs in with that number on the web, or gives
 * it in a bot or WhatsApp; the link and code work only for that number. Apart from the factories' link.
 */
function InvitesContent() {
  const toast = useToast();
  const featureCount = useCompanyFeatures()?.features.length ?? 0;
  const [invites, setInvites] = useState<CompanyInvite[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [mobile, setMobile] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [opened, setOpened] = useState('');

  const load = useCallback(() => {
    setFailed(false);
    getCompanyInvites().then(setInvites, () => setFailed(true));
  }, []);
  useEffect(load, [load]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const number = digits(mobile).replace(/[\s-]/g, '');
    if (!/^(\+98|0098|98|0)?9\d{9}$/.test(number)) return toast.error('شماره موبایل معتبر وارد کنید؛ مثلاً 09121234567.');
    setSaving(true);
    try {
      const invite = await createCompanyInvite(number, name.trim() || undefined);
      setInvites((current) => [invite, ...(current ?? []).filter((item) => item.token !== invite.token)]);
      setOpened(invite.token);
      setMobile('');
      setName('');
      const smsNote = inviteSmsText(invite.sms, 'شرکت حمل‌ونقل');
      if (invite.sms.status === 'sent') toast.success(`حساب شرکت حمل‌ونقل ساخته شد. ${smsNote}`);
      else toast.info(`حساب شرکت حمل‌ونقل ساخته شد. ${smsNote}`);
    } catch (error) {
      toast.error(factoryError(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="tw-space-y-6">
      <SectionTitle
        title="دعوت شرکت‌های حمل‌ونقل"
        hint="شماره‌ی شرکت حمل‌ونقل را وارد کنید تا حسابش ساخته شود؛ بعد لینک یا کد دعوت را برایش بفرستید. همه‌ی بخش‌های پنلش تا وقتی آن‌ها را نخرد قفل‌اند."
      />

      <form onSubmit={submit} className="tw-space-y-3 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-5 tw-shadow-sm" aria-busy={saving}>
        <h3 className="tw-m-0 tw-flex tw-items-center tw-gap-2 tw-text-base tw-font-bold">
          <UserPlus size={18} aria-hidden /> دعوت شرکت حمل‌ونقل تازه
        </h3>
        <div className="tw-grid tw-gap-3 sm:tw-grid-cols-2">
          <label className="tw-space-y-1.5 tw-text-sm tw-font-medium">
            شماره موبایل شرکت حمل‌ونقل <span className="tw-text-brand-orange" aria-hidden>*</span>
            <input value={mobile} onChange={(event) => setMobile(event.target.value)} inputMode="tel" dir="ltr" placeholder="0912 123 4567" maxLength={20} className={cn(inputClass, 'tw-text-left')} />
          </label>
          <label className="tw-space-y-1.5 tw-text-sm tw-font-medium">
            نام شرکت حمل‌ونقل (اختیاری)
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={200} placeholder="مثلاً باربری آسا" className={inputClass} />
          </label>
        </div>
        <p className="tw-m-0 tw-text-xs tw-text-brand-muted">شماره‌ای که از قبل در سامانه حساب دارد را نمی‌شود دعوت کرد.</p>
        <button
          type="submit"
          disabled={saving || !mobile.trim()}
          className="tw-inline-flex tw-h-11 tw-items-center tw-gap-2 tw-rounded-xl tw-border-0 tw-bg-brand-orange tw-px-5 tw-font-bold tw-text-white hover:tw-bg-brand-orange-dark"
        >
          {saving ? <LoaderCircle size={18} className="tw-animate-spin" aria-hidden /> : <UserPlus size={18} aria-hidden />} ساخت حساب و لینک دعوت
        </button>
      </form>

      <section className="tw-space-y-3">
        <h3 className="tw-m-0 tw-text-base tw-font-bold">شرکت‌های حمل‌ونقل دعوت‌شده ({fa(invites?.length ?? 0)})</h3>
        {failed ? (
          <LoadFailed onRetry={load} />
        ) : !invites ? (
          <CardSkeleton />
        ) : !invites.length ? (
          <EmptyState icon={Building2} title="هنوز شرکت حمل‌ونقلی دعوت نکرده‌اید" hint="با شماره‌ی شرکت حمل‌ونقل، حسابش را بسازید و لینک دعوت را برایش بفرستید." />
        ) : (
          invites.map((invite) => (
            <InviteCard
              key={invite.token}
              invite={invite}
              featureCount={featureCount}
              open={opened === invite.token}
              onToggle={() => setOpened((current) => (current === invite.token ? '' : invite.token))}
            />
          ))
        )}
      </section>
    </div>
  );
}

export default function CompanyInvitesPage() {
  const features = useCompanyFeatures();
  // only the parent company invites companies
  if (features && !features.isParent) return <Navigate to="/account/company" replace />;
  return (
    <CompanyShell>
      <InvitesContent />
    </CompanyShell>
  );
}
