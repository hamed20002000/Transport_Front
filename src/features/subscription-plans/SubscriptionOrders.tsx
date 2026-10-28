import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Check, CircleCheck, CircleX, Clock, ImageOff, Inbox, LoaderCircle, Lock, LockOpen, X } from 'lucide-react';
import PageContainer from 'src/shared/components/container/PageContainer';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { useMessageBox } from 'src/shared/components/message-box/MessageBoxProvider';
import { cn } from 'src/shared/utils/utils';
import { CardSkeleton, EmptyState, LoadFailed, Segmented } from 'src/features/company-cargo/components';
import { useNotificationEvent } from 'src/features/company-cargo/notificationSocket';
import AdminGate from './AdminGate';
import { adminError, approveReceipt, listOrders, receiptImage, rejectReceipt, unlockReceipts, type Order, type Receipt, type ReceiptUnlock } from './adminApi';

type Tab = 'review' | 'APPROVED' | 'REJECTED';

const tabs = [
  { value: 'review' as const, label: 'منتظر بررسی', icon: Clock },
  { value: 'APPROVED' as const, label: 'تأییدشده', icon: CircleCheck },
  { value: 'REJECTED' as const, label: 'ردشده', icon: CircleX },
];
const providers: Record<Order['provider'], string> = { WEB: 'برنامه', TELEGRAM: 'تلگرام', BALE: 'بله', RUBIKA: 'روبیکا', WHATSAPP: 'واتساپ' };
const accounts: Record<Order['accountType'], string> = { DRIVER: 'راننده', COMPANY: 'شرکت حمل‌ونقل', BROKER: 'واسط' };
const currencyNames: Record<string, string> = { IRR: 'ریال', IRT: 'تومان' };

const faNumber = (value: number | string) => Number(value).toLocaleString('fa-IR');
const faDateTime = (value: string) => new Date(value).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' });
const latestReceipt = (order: Order): Receipt | undefined =>
  [...(order.receipts ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
// the analyzer reports rials; an order in tomans is shown converted, like the server compares it
const expectedRials = (order: Order) => Number(order.amount) * (order.currency === 'IRT' ? 10 : 1);

/** One automatic check on the receipt: passed, failed, or not known yet. */
function Check_({ ok, label, detail, warnWhenTrue }: { ok?: boolean | null; label: string; detail?: string | null; warnWhenTrue?: boolean }) {
  const passed = warnWhenTrue ? ok === false : ok === true;
  const unknown = ok === null || ok === undefined;
  return (
    <li
      className={cn(
        'tw-flex tw-items-center tw-gap-1.5 tw-rounded-lg tw-px-2.5 tw-py-1.5 tw-text-xs',
        unknown ? 'tw-bg-slate-100 tw-text-slate-500' : passed ? 'tw-bg-emerald-50 tw-text-emerald-800' : 'tw-bg-red-50 tw-text-red-700',
      )}
    >
      {unknown ? <Clock size={14} aria-hidden /> : passed ? <Check size={14} aria-hidden /> : warnWhenTrue ? <AlertTriangle size={14} aria-hidden /> : <X size={14} aria-hidden />}
      <span className="tw-font-bold">{label}</span>
      {detail && (
        <span dir="ltr" className="tw-text-[11px] tw-opacity-80">
          {detail}
        </span>
      )}
    </li>
  );
}

function ReceiptPhoto({ order, receipt, unlock, onLocked }: { order: Order; receipt: Receipt; unlock: ReceiptUnlock | null; onLocked: () => void }) {
  const [src, setSrc] = useState('');
  const [failed, setFailed] = useState(false);
  const token = unlock?.token;
  useEffect(() => {
    setSrc('');
    setFailed(false);
    if (!token) return;
    let url = '';
    let active = true;
    receiptImage(order.id, receipt.id, token)
      .then((value) => {
        url = value;
        if (active) setSrc(value);
        else URL.revokeObjectURL(value);
      })
      .catch((error) => {
        if (!active) return;
        // the unlock ran out (or was for another admin): ask for the password again
        if ((error as { response?: { status?: number } }).response?.status === 403) onLocked();
        else setFailed(true);
      });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [order.id, receipt.id, token, onLocked]);

  const box = 'tw-flex tw-h-56 tw-w-full tw-items-center tw-justify-center tw-overflow-hidden tw-rounded-xl tw-bg-slate-100 sm:tw-h-full sm:tw-min-h-[14rem] sm:tw-w-48';
  if (!token) {
    return (
      <div className={cn(box, 'tw-shrink-0 tw-flex-col tw-gap-2 tw-text-xs tw-text-slate-500')}>
        <Lock size={22} aria-hidden />
        عکس قفل است
      </div>
    );
  }
  if (failed) {
    return (
      <div className={cn(box, 'tw-flex-col tw-gap-2 tw-text-xs tw-text-slate-500')}>
        <ImageOff size={24} aria-hidden />
        عکس پیدا نشد
      </div>
    );
  }
  if (!src) return <div className={cn(box, 'tw-animate-pulse')} aria-hidden />;
  return (
    <a href={src} target="_blank" rel="noreferrer" className={cn(box, 'tw-shrink-0')} title="نمایش عکس در اندازه‌ی کامل">
      <img src={src} alt={`رسید ${order.phoneNumber}`} className="tw-h-full tw-w-full tw-object-cover" />
    </a>
  );
}

function OrderCard({ order, onDone, unlock, onLocked }: { order: Order; onDone: () => void; unlock: ReceiptUnlock | null; onLocked: () => void }) {
  const toast = useToast();
  const messageBox = useMessageBox();
  const receipt = latestReceipt(order);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const decidable = order.status === 'RECEIPT_SUBMITTED' || order.status === 'UNDER_REVIEW';
  const analyzing = receipt && (receipt.status === 'PENDING_ANALYSIS' || receipt.status === 'ANALYZING');
  const price = `${faNumber(order.amount)} ${currencyNames[order.currency] ?? order.currency}`;

  async function approve() {
    if (!receipt || busy) return;
    const confirmed = await messageBox.confirm({
      title: 'تأیید پرداخت',
      message: `اشتراک «${order.subscriptionPlan?.title ?? ''}» برای ${order.phoneNumber} فعال شود؟`,
      confirmText: 'تأیید و فعال‌سازی',
    });
    if (!confirmed) return;
    setBusy(true);
    try {
      const result = await approveReceipt(order.id, receipt.id);
      toast.success(result.notified ? 'اشتراک فعال شد و به کاربر خبر داده شد.' : 'اشتراک فعال شد؛ پیام به کاربر نرسید.');
      // this payment took the driver past a purchase-reward tier
      if (result.rewardDays) toast.info(`راننده به خاطر خریدهایش ${result.rewardDays.toLocaleString('fa-IR')} روز رایگان هدیه گرفت.`);
      onDone();
    } catch (error) {
      toast.error(adminError(error));
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    if (!receipt || busy || !reason.trim()) return;
    setBusy(true);
    try {
      await rejectReceipt(order.id, receipt.id, reason.trim());
      toast.success('رسید رد شد و دلیلش به کاربر گفته شد.');
      onDone();
    } catch (error) {
      toast.error(adminError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="tw-flex tw-flex-col tw-gap-4 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-4 sm:tw-flex-row">
      {receipt ? <ReceiptPhoto order={order} receipt={receipt} unlock={unlock} onLocked={onLocked} /> : null}
      <div className="tw-flex tw-min-w-0 tw-flex-1 tw-flex-col tw-gap-3">
        <div className="tw-flex tw-flex-wrap tw-items-start tw-justify-between tw-gap-2">
          <div>
            <h3 className="tw-m-0 tw-text-base tw-font-bold">{order.subscriptionPlan?.title ?? 'طرح اشتراک'}</h3>
            <p className="tw-m-0 tw-mt-1 tw-text-sm tw-text-brand-muted">
              <span dir="ltr">{order.phoneNumber}</span> · {accounts[order.accountType]} · {faDateTime(order.createdAt)}
            </p>
          </div>
          <div className="tw-flex tw-items-center tw-gap-2">
            <span className="tw-rounded-full tw-bg-brand-sky tw-px-2.5 tw-py-0.5 tw-text-xs tw-font-medium">{providers[order.provider]}</span>
            <span className="tw-rounded-full tw-bg-brand-orange-soft tw-px-2.5 tw-py-0.5 tw-text-sm tw-font-bold tw-text-brand-orange-ink">{price}</span>
          </div>
        </div>

        {receipt && (
          analyzing ? (
            <p className="tw-m-0 tw-flex tw-items-center tw-gap-2 tw-text-sm tw-text-brand-muted">
              <LoaderCircle size={16} className="tw-animate-spin" aria-hidden />
              رسید هنوز به‌صورت خودکار خوانده نشده؛ می‌توانید خودتان عکس را بررسی کنید.
            </p>
          ) : (
            <ul className="tw-m-0 tw-flex tw-list-none tw-flex-wrap tw-gap-2 tw-p-0" aria-label="بررسی خودکار رسید">
              <Check_ ok={receipt.amountMatched} label="مبلغ" detail={receipt.extractedAmount ? `${faNumber(receipt.extractedAmount)} / ${faNumber(expectedRials(order))} ریال` : null} />
              <Check_ ok={receipt.destinationCardMatched} label="کارت مقصد" detail={receipt.destinationCard} />
              <Check_ ok={receipt.destinationNameMatched} label="صاحب کارت" detail={receipt.destinationName} />
              <Check_ ok={receipt.duplicateTrackingCode} warnWhenTrue label={receipt.duplicateTrackingCode ? 'کد پیگیری تکراری' : 'کد پیگیری'} detail={receipt.trackingCode} />
              {receipt.transactionDate && <Check_ ok={null} label="تاریخ پرداخت" detail={`${receipt.transactionDate} ${receipt.transactionTime ?? ''}`} />}
            </ul>
          )
        )}

        {order.status === 'REJECTED' && order.rejectionReason && (
          <p className="tw-m-0 tw-rounded-lg tw-bg-red-50 tw-px-3 tw-py-2 tw-text-sm tw-text-red-700">دلیل رد: {order.rejectionReason}</p>
        )}
        {order.status === 'APPROVED' && order.approvedAt && (
          <p className="tw-m-0 tw-flex tw-items-center tw-gap-1.5 tw-text-sm tw-text-emerald-700">
            <CircleCheck size={16} aria-hidden /> تأیید شد · {faDateTime(order.approvedAt)}
          </p>
        )}

        {decidable && receipt && (
          <div className="tw-mt-auto tw-space-y-2">
            {rejecting && (
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={500}
                rows={2}
                autoFocus
                placeholder="دلیل رد (برای کاربر فرستاده می‌شود)، مثلاً: مبلغ واریزی با طرح یکی نیست."
                className="tw-w-full tw-resize-none tw-rounded-xl tw-border tw-border-brand-line tw-p-3 tw-text-sm focus:tw-border-red-300 focus:tw-outline-none"
              />
            )}
            <div className="tw-flex tw-flex-wrap tw-gap-2">
              {rejecting ? (
                <>
                  <button type="button" onClick={reject} disabled={busy || !reason.trim()} className="tw-inline-flex tw-h-10 tw-items-center tw-gap-1.5 tw-rounded-xl tw-border-0 tw-bg-red-600 tw-px-4 tw-text-sm tw-font-bold tw-text-white hover:tw-bg-red-700 disabled:tw-opacity-50">
                    <CircleX size={16} aria-hidden /> ثبت رد
                  </button>
                  <button type="button" onClick={() => setRejecting(false)} disabled={busy} className="tw-h-10 tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-4 tw-text-sm tw-font-bold">
                    انصراف
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={approve} disabled={busy} className="tw-inline-flex tw-h-10 tw-items-center tw-gap-1.5 tw-rounded-xl tw-border-0 tw-bg-emerald-600 tw-px-4 tw-text-sm tw-font-bold tw-text-white hover:tw-bg-emerald-700 disabled:tw-opacity-50">
                    {busy ? <LoaderCircle size={16} className="tw-animate-spin" aria-hidden /> : <CircleCheck size={16} aria-hidden />} تأیید پرداخت
                  </button>
                  <button type="button" onClick={() => setRejecting(true)} disabled={busy} className="tw-inline-flex tw-h-10 tw-items-center tw-gap-1.5 tw-rounded-xl tw-border tw-border-red-200 tw-bg-white tw-px-4 tw-text-sm tw-font-bold tw-text-red-700 hover:tw-bg-red-50">
                    <CircleX size={16} aria-hidden /> رد رسید
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

/**
 * Receipt photos carry names and card digits: besides the admin login they need the receipts password, which
 * opens them for 15 minutes in this tab only (kept in memory, gone on refresh).
 */
export function UnlockPanel({ unlock, onUnlock, onLock }: { unlock: ReceiptUnlock | null; onUnlock: (value: ReceiptUnlock) => void; onLock: () => void }) {
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    try {
      onUnlock(await unlockReceipts(password));
      setPassword('');
    } catch (error) {
      toast.error(adminError(error));
    } finally {
      setBusy(false);
    }
  }

  if (unlock) {
    const until = new Date(unlock.expiresAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    return (
      <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3 tw-rounded-2xl tw-border tw-border-emerald-200 tw-bg-emerald-50 tw-px-4 tw-py-3 tw-text-sm">
        <span className="tw-flex tw-items-center tw-gap-2 tw-text-emerald-800">
          <LockOpen size={18} aria-hidden /> عکس رسیدها تا ساعت {until} باز است.
        </span>
        <button type="button" onClick={onLock} className="tw-rounded-lg tw-border tw-border-emerald-300 tw-bg-white tw-px-3 tw-py-1.5 tw-text-xs tw-font-bold tw-text-emerald-800">
          قفل کردن
        </button>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="tw-flex tw-flex-wrap tw-items-center tw-gap-3 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-4">
      <span className="tw-flex tw-h-10 tw-w-10 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-xl tw-bg-brand-orange-soft tw-text-brand-orange-ink">
        <Lock size={20} aria-hidden />
      </span>
      <div className="tw-min-w-[12rem] tw-flex-1">
        <p className="tw-m-0 tw-font-bold">عکس رسیدها قفل است</p>
        <p className="tw-m-0 tw-text-xs tw-text-brand-muted">برای دیدن عکس‌ها رمز رسیدها را وارد کنید (۱۵ دقیقه باز می‌ماند).</p>
      </div>
      <input
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="off"
        placeholder="رمز رسیدها"
        aria-label="رمز رسیدها"
        className="tw-h-10 tw-w-48 tw-rounded-xl tw-border tw-border-brand-line tw-px-3 tw-text-sm"
      />
      <button type="submit" disabled={!password || busy} className="tw-inline-flex tw-h-10 tw-items-center tw-gap-1.5 tw-rounded-xl tw-border-0 tw-bg-brand-orange tw-px-4 tw-text-sm tw-font-bold tw-text-white disabled:tw-opacity-50">
        {busy ? <LoaderCircle size={16} className="tw-animate-spin" aria-hidden /> : <LockOpen size={16} aria-hidden />} باز کردن
      </button>
    </form>
  );
}

function OrdersContent() {
  const [tab, setTab] = useState<Tab>('review');
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [unlock, setUnlock] = useState<ReceiptUnlock | null>(null);
  const lock = useCallback(() => setUnlock(null), []);

  // the server forgets the token after 15 minutes; the page locks itself at the same moment
  useEffect(() => {
    if (!unlock) return;
    const timer = setTimeout(lock, Math.max(0, new Date(unlock.expiresAt).getTime() - Date.now()));
    return () => clearTimeout(timer);
  }, [unlock, lock]);

  const load = useCallback(() => {
    setFailed(false);
    listOrders(tab === 'review' ? undefined : tab)
      .then(setOrders)
      .catch(() => setFailed(true));
  }, [tab]);

  useEffect(() => {
    setOrders(null);
    load();
  }, [load]);

  // a receipt arrives while the page is open: it shows up at once (SubscriptionNotifier)
  const toast = useToast();
  useNotificationEvent('payment-receipt', () => {
    toast.info('رسید پرداخت تازه رسید.');
    if (tab === 'review') load();
  });

  return (
    <PageContainer title="رسیدهای پرداخت" description="بررسی و تأیید رسیدهای خرید اشتراک">
      <main dir="rtl" lang="fa" className="tw-mx-auto tw-max-w-5xl tw-space-y-5 tw-p-4 tw-text-brand-navy">
        <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3">
          <div>
            <Link to="/admin/subscription-plans" className="tw-text-sm tw-text-brand-orange-ink">
              پلن‌های اشتراک
            </Link>
            <h1 className="tw-m-0 tw-mt-1 tw-text-2xl tw-font-bold">رسیدهای پرداخت</h1>
            <p className="tw-m-0 tw-mt-1 tw-text-sm tw-text-brand-muted">رسیدهای ربات‌ها و برنامه؛ هر رسید خودکار خوانده و با کارت و مبلغ مقایسه می‌شود.</p>
          </div>
          <Segmented value={tab} onChange={setTab} options={tabs} label="وضعیت رسیدها" />
        </div>

        <UnlockPanel unlock={unlock} onUnlock={setUnlock} onLock={lock} />

        {failed ? (
          <LoadFailed onRetry={load} />
        ) : !orders ? (
          <div className="tw-space-y-3">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : orders.length === 0 ? (
          <EmptyState icon={Inbox} title={tab === 'review' ? 'رسیدی منتظر بررسی نیست' : 'موردی نیست'} hint="رسیدهای تازه همین‌جا نشان داده می‌شوند." />
        ) : (
          <div className="tw-space-y-3">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} onDone={load} unlock={unlock} onLocked={lock} />
            ))}
          </div>
        )}
      </main>
    </PageContainer>
  );
}

export default function SubscriptionOrders() {
  return (
    <AdminGate>
      <OrdersContent />
    </AdminGate>
  );
}
