import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Building2, CircleCheck, CircleX, Clock, Factory, Handshake, Inbox, LoaderCircle } from 'lucide-react';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { cn } from 'src/shared/utils/utils';
import { useMessageBox } from 'src/shared/components/message-box/MessageBoxProvider';
import { factoryError } from 'src/features/factory/api';
import CompanyShell from './CompanyShell';
import { CardSkeleton, EmptyState, LoadFailed, SectionTitle, Segmented } from './components';
import { useCompanyFeatures } from './featuresApi';
import { useNotificationEvent } from './notificationSocket';
import { approveVerification, listVerifications, rejectVerification, type VerificationRequest } from './verificationApi';
import AccountCode from 'src/shared/components/account-code/AccountCode';

type Tab = 'PENDING' | 'APPROVED' | 'REJECTED';

const tabs = [
  { value: 'PENDING' as const, label: 'در انتظار', icon: Clock },
  { value: 'APPROVED' as const, label: 'تأییدشده', icon: CircleCheck },
  { value: 'REJECTED' as const, label: 'ردشده', icon: CircleX },
];
type FieldRow = { key: keyof VerificationRequest; title: string; ltr?: boolean; check?: boolean };
// check: what the account is verified by (required at its request): first and marked
const fieldsFor = (kind: VerificationRequest['kind']): FieldRow[] =>
  kind === 'BROKER'
    ? [
        { key: 'companyName', title: 'نام واسط یا دفتر', check: true },
        { key: 'phone', title: 'شماره تماس', ltr: true, check: true },
        { key: 'mobile', title: 'موبایل', ltr: true },
        { key: 'companyNationalId', title: 'کد ملی یا شناسه ملی', ltr: true },
        { key: 'address', title: 'آدرس' },
      ]
    : kind === 'FACTORY'
    ? [
        { key: 'companyName', title: 'نام کارخانه', check: true },
        { key: 'phone', title: 'شماره کارخانه', ltr: true, check: true },
        { key: 'mobile', title: 'موبایل', ltr: true },
        { key: 'companyNationalId', title: 'شناسه ملی', ltr: true },
        { key: 'economicCode', title: 'کد اقتصادی', ltr: true },
        { key: 'registrationNo', title: 'شماره ثبت', ltr: true },
        { key: 'postalCode', title: 'کد پستی', ltr: true },
        { key: 'address', title: 'آدرس' },
      ]
    : [
        { key: 'companyName', title: 'نام تجاری', check: true },
        { key: 'economicCode', title: 'کد اقتصادی', ltr: true, check: true },
        { key: 'phone', title: 'شماره شرکت', ltr: true, check: true },
        { key: 'mobile', title: 'موبایل', ltr: true },
        { key: 'companyNationalId', title: 'شناسه ملی', ltr: true },
        { key: 'registrationNo', title: 'شماره ثبت', ltr: true },
        { key: 'postalCode', title: 'کد پستی', ltr: true },
        { key: 'address', title: 'آدرس' },
      ];
const KIND_TITLES: Record<VerificationRequest['kind'], string> = { COMPANY: 'شرکت حمل‌ونقل', FACTORY: 'شرکت / کارخانه', BROKER: 'واسط' };
const fa = (value: number) => value.toLocaleString('fa-IR');
const faDateTime = (value: string) => new Date(value).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' });

/** One request: everything the parent company checks it with, and approve / reject (with a reason). */
function RequestCard({ request, onDone }: { request: VerificationRequest; onDone: () => void }) {
  const toast = useToast();
  const messageBox = useMessageBox();
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const kind = KIND_TITLES[request.kind];
  const name = request.companyName || request.mobile || '';

  async function approve() {
    const confirmed = await messageBox.confirm({
      title: 'تأیید اعتبار',
      message:
        request.kind === 'FACTORY'
          ? `شرکت / کارخانهی «${name}» تأیید شود؟ به شرکت‌ها / کارخانه‌های شما اضافه می‌شود و بارش را برای شما می‌فرستد.`
          : request.kind === 'BROKER'
            ? `واسط «${name}» تأیید شود؟ حسابش فعال می‌شود و می‌تواند روی بارها درخواست بدهد.`
            : `شرکت حمل‌ونقل «${name}» تأیید شود؟ حسابش فعال می‌شود و هر بخش پنل را باید بخرد.`,
      confirmText: 'تأیید',
    });
    if (!confirmed) return;
    setBusy(true);
    try {
      await approveVerification(request.userId);
      toast.success(`«${name}» تأیید شد و خبردار می‌شود.`);
      onDone();
    } catch (error) {
      toast.error(factoryError(error));
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    if (!reason.trim()) return;
    setBusy(true);
    try {
      const result = await rejectVerification(request.userId, reason.trim());
      toast.success(result.remaining ? `رد شد؛ می‌تواند ${fa(result.remaining)} بار دیگر اصلاح و درخواست کند.` : 'رد شد؛ دفعات درخواستش تمام شد.');
      onDone();
    } catch (error) {
      toast.error(factoryError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="tw-space-y-4 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-4">
      <div className="tw-flex tw-flex-wrap tw-items-start tw-justify-between tw-gap-2">
        <div className="tw-min-w-0">
          <h3 className="tw-m-0 tw-flex tw-items-center tw-gap-2 tw-text-base tw-font-bold">
            {request.kind === 'FACTORY' ? <Factory size={17} aria-hidden /> : request.kind === 'BROKER' ? <Handshake size={17} aria-hidden /> : <Building2 size={17} aria-hidden />} {name} <AccountCode code={request.accountCode} />
          </h3>
          <p className="tw-m-0 tw-mt-1 tw-text-xs tw-text-brand-muted">
            {kind} · درخواست {fa(request.requests)}
            {request.requestedAt ? ` · ${faDateTime(request.requestedAt)}` : ''}
          </p>
        </div>
      </div>
      <dl className="tw-m-0 tw-grid tw-grid-cols-1 tw-gap-x-6 tw-gap-y-2 tw-text-sm sm:tw-grid-cols-2">
        {fieldsFor(request.kind).map(({ key, title, ltr, check }) => (
          <div key={key} className={cn('tw-flex tw-gap-2', check && 'tw-rounded-lg tw-bg-brand-orange-soft/40 tw-px-2 tw-py-1')}>
            <dt className={cn('tw-shrink-0', check ? 'tw-font-bold' : 'tw-text-brand-muted')}>{title}:</dt>
            <dd className={cn('tw-m-0 tw-min-w-0 tw-break-words', check ? 'tw-font-bold' : 'tw-font-medium')} dir={ltr ? 'ltr' : undefined}>
              {(request[key] as string | null) || '—'}
            </dd>
          </div>
        ))}
      </dl>
      {request.status === 'REJECTED' && request.note && (
        <p className="tw-m-0 tw-rounded-lg tw-bg-red-50 tw-px-3 tw-py-2 tw-text-sm tw-text-red-700">
          دلیل رد: {request.note} · {request.remaining ? `${fa(request.remaining)} درخواست دیگر دارد` : 'دفعات درخواستش تمام شده'}
        </p>
      )}
      {request.status === 'PENDING' && (
        <div className="tw-space-y-2">
          {rejecting && (
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              rows={2}
              autoFocus
              placeholder="دلیل رد (برای کاربر فرستاده می‌شود)، مثلاً: شناسه ملی با نام شرکت نمی‌خواند."
              className="tw-w-full tw-resize-none tw-rounded-xl tw-border tw-border-brand-line tw-p-3 tw-text-sm tw-outline-none tw-transition-colors focus:tw-border-red-300"
            />
          )}
          <div className="tw-flex tw-flex-wrap tw-gap-2">
            {rejecting ? (
              <>
                <button type="button" onClick={reject} disabled={busy || !reason.trim()} className="tw-inline-flex tw-h-10 tw-items-center tw-gap-1.5 tw-rounded-xl tw-border-0 tw-bg-red-600 tw-px-4 tw-text-sm tw-font-bold tw-text-white">
                  <CircleX size={16} aria-hidden /> ثبت رد
                </button>
                <button type="button" onClick={() => setRejecting(false)} disabled={busy} className="tw-h-10 tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-4 tw-text-sm tw-font-bold">
                  انصراف
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={approve} disabled={busy} className="tw-inline-flex tw-h-10 tw-items-center tw-gap-1.5 tw-rounded-xl tw-border-0 tw-bg-emerald-600 tw-px-4 tw-text-sm tw-font-bold tw-text-white">
                  {busy ? <LoaderCircle size={16} className="tw-animate-spin" aria-hidden /> : <CircleCheck size={16} aria-hidden />} تأیید اعتبار
                </button>
                <button type="button" onClick={() => setRejecting(true)} disabled={busy} className="tw-inline-flex tw-h-10 tw-items-center tw-gap-1.5 tw-rounded-xl tw-border tw-border-red-200 tw-bg-white tw-px-4 tw-text-sm tw-font-bold tw-text-red-700">
                  <CircleX size={16} aria-hidden /> رد
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

/** The parent company checks the transport companies and factories that signed up on their own. */
function VerificationsContent() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('PENDING');
  const [requests, setRequests] = useState<VerificationRequest[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    listVerifications(tab).then(setRequests, () => setFailed(true));
  }, [tab]);
  useEffect(() => {
    setRequests(null);
    load();
  }, [load]);

  useNotificationEvent('verification-requested', () => {
    toast.info('درخواست بررسی اعتبار تازه رسید.');
    if (tab === 'PENDING') load();
  });

  return (
    <div className="tw-space-y-5">
      <SectionTitle
        title="بررسی اعتبار"
        hint="شرکت‌های حمل‌ونقل، شرکت‌ها / کارخانه‌ها و واسط‌هایی که خودشان ثبت‌نام کرده‌اند، با اطلاعات پروفایلشان. بعد از استعلام تأیید یا با دلیل رد کنید."
        side={<Segmented value={tab} onChange={setTab} options={tabs} label="وضعیت درخواست‌ها" />}
      />
      {failed ? (
        <LoadFailed onRetry={load} />
      ) : !requests ? (
        <CardSkeleton />
      ) : !requests.length ? (
        <EmptyState icon={Inbox} title={tab === 'PENDING' ? 'درخواستی در انتظار نیست' : 'موردی نیست'} hint="درخواست‌های تازه همین‌جا می‌آیند و خبرش به شما می‌رسد." />
      ) : (
        <div className="tw-space-y-3">
          {requests.map((request) => (
            <RequestCard key={request.userId} request={request} onDone={load} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CompanyVerifications() {
  const features = useCompanyFeatures();
  // only a parent company checks accounts
  if (features && !features.isParent) return <Navigate to="/account/company" replace />;
  return (
    <CompanyShell>
      <VerificationsContent />
    </CompanyShell>
  );
}
