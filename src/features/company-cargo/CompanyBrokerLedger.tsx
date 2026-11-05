import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ChevronDown, ChevronUp, HandCoins, Handshake, LoaderCircle, Trash2, Truck, Users, Wallet } from 'lucide-react';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { useMessageBox } from 'src/shared/components/message-box/MessageBoxProvider';
import { groupDigits } from 'src/shared/utils/digitGroups';
import { cn } from 'src/shared/utils/utils';
import { factoryError } from 'src/features/factory/api';
import AccountCode from 'src/shared/components/account-code/AccountCode';
import CompanyShell from './CompanyShell';
import { CardSkeleton, EmptyState, LoadFailed, PhoneLinks, SectionTitle } from './components';
import { getBrokerAccount, listBrokerAccounts, removeBrokerSettlement, settleBroker, type BrokerAccount, type BrokerAccountDetail, type BrokerTrip } from './brokerLedgerApi';
import { brokerPayModelLabels, fareCurrencyLabels } from './trip-fare';

const fa = (value: number) => value.toLocaleString('fa-IR');
const money = (value: string) => groupDigits(value);
const faDate = (value: string | null) => (value ? new Date(value).toLocaleDateString('fa-IR', { year: 'numeric', month: 'short', day: 'numeric' }) : '—');
const latin = (value: string) => value.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
const inputClass =
  'tw-h-10 tw-w-full tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-3 tw-text-sm tw-text-brand-navy tw-outline-none focus:tw-border-brand-orange';

function Figure({ label, value, tone }: { label: string; value: string; tone?: 'green' | 'orange' }) {
  return (
    <div className="tw-rounded-xl tw-bg-brand-bg tw-p-3">
      <p className="tw-m-0 tw-text-xs tw-text-brand-muted">{label}</p>
      <p className={cn('tw-m-0 tw-mt-1 tw-font-bold', tone === 'green' && 'tw-text-emerald-700', tone === 'orange' && 'tw-text-brand-orange-ink')}>{value}</p>
    </div>
  );
}

/** What one trip brought the broker: the commission owed (COMMISSION) or its own margin (MARGIN). */
function TripEarning({ trip }: { trip: BrokerTrip }) {
  if (trip.payModel === 'MARGIN') {
    return trip.margin !== null ? (
      <span className="tw-font-bold tw-text-brand-navy">اختلاف کرایه‌ی واسط {money(trip.margin)}</span>
    ) : (
      <span className="tw-text-brand-muted">اختلاف کرایه (کرایه‌ی راننده عدد نیست)</span>
    );
  }
  return trip.commission ? (
    <span className="tw-font-bold tw-text-emerald-700">کمیسیون {money(trip.commission)} ({fa(Number(trip.percent))}٪)</span>
  ) : (
    <span className="tw-text-brand-muted">بدون کمیسیون (کرایه عدد نیست)</span>
  );
}

/** One broker's delivered trips and payments, and recording a payment. */
function Detail({ brokerUserId, onChanged }: { brokerUserId: string; onChanged: () => void }) {
  const toast = useToast();
  const messageBox = useMessageBox();
  const [detail, setDetail] = useState<BrokerAccountDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    getBrokerAccount(brokerUserId).then(setDetail, () => setFailed(true));
  }, [brokerUserId]);
  useEffect(load, [load]);

  if (failed) return <LoadFailed onRetry={load} />;
  if (!detail) return <CardSkeleton />;
  const digits = latin(amount).replace(/\D/g, '');
  const valid = /^[1-9][0-9]{0,17}$/.test(digits) && BigInt(digits) <= BigInt(detail.account.remaining);

  async function settle(event: FormEvent) {
    event.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    try {
      setDetail(await settleBroker(brokerUserId, digits, note.trim()));
      setAmount('');
      setNote('');
      toast.success('تسویه ثبت شد.');
      onChanged();
    } catch (error) {
      toast.error(factoryError(error));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string, value: string) {
    const confirmed = await messageBox.confirm({ message: `تسویه‌ی ${money(value)} حذف شود؟ به مانده‌ی طلب واسط برمی‌گردد.`, confirmText: 'حذف', tone: 'danger' });
    if (!confirmed) return;
    try {
      setDetail(await removeBrokerSettlement(id));
      toast.success('تسویه حذف شد.');
      onChanged();
    } catch (error) {
      toast.error(factoryError(error));
    }
  }

  return (
    <div className="tw-space-y-4 tw-border-t tw-border-brand-line tw-pt-4">
      {BigInt(detail.account.remaining) > 0n && (
        <form onSubmit={settle} className="tw-grid tw-grid-cols-1 tw-gap-2 sm:tw-grid-cols-[1fr_2fr_auto] sm:tw-items-end" aria-busy={saving}>
          <label className="tw-space-y-1 tw-text-xs tw-font-bold">
            <span>مبلغ تسویه</span>
            <input className={cn(inputClass, 'tw-text-left')} dir="ltr" inputMode="numeric" value={digits ? money(digits) : ''} onChange={(event) => setAmount(event.target.value)} placeholder={money(detail.account.remaining)} />
          </label>
          <label className="tw-space-y-1 tw-text-xs tw-font-bold">
            <span>توضیح (اختیاری)</span>
            <input className={inputClass} value={note} maxLength={300} onChange={(event) => setNote(event.target.value)} placeholder="مثلاً کارت‌به‌کارت، شماره پیگیری…" />
          </label>
          <button type="submit" disabled={!valid || saving} className="tw-inline-flex tw-h-10 tw-items-center tw-justify-center tw-gap-1.5 tw-rounded-xl tw-border-0 tw-bg-brand-orange tw-px-4 tw-text-sm tw-font-bold tw-text-white hover:tw-bg-brand-orange-dark disabled:tw-opacity-50">
            {saving ? <LoaderCircle size={15} className="tw-animate-spin" aria-hidden /> : <HandCoins size={15} aria-hidden />} ثبت تسویه
          </button>
        </form>
      )}

      <div className="tw-space-y-2">
        <h4 className="tw-m-0 tw-text-sm tw-font-bold">سفرهای تحویل‌شده ({fa(detail.trips.length)})</h4>
        <ul className="tw-m-0 tw-list-none tw-space-y-1.5 tw-p-0 tw-text-sm">
          {detail.trips.map((trip) => (
            <li key={trip.id} className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-x-3 tw-gap-y-1 tw-rounded-xl tw-border tw-border-brand-line tw-p-2.5">
              <span className="tw-min-w-0">
                <span className="tw-font-medium">{trip.origin} ← {trip.destination}</span>
                <span className="tw-text-brand-muted">
                  {trip.code ? ` · ${trip.code}` : ''} · {faDate(trip.deliveredAt)} · {trip.driverName}
                </span>
              </span>
              <span className="tw-space-y-0.5 tw-text-xs">
                <span className="tw-block">
                  <span className="tw-rounded-full tw-bg-brand-sky tw-px-2 tw-py-0.5">{brokerPayModelLabels[trip.payModel]}</span>
                  {trip.companyFare && (
                    <>
                      {' '}
                      · کرایه‌ی شرکت {money(trip.companyFare)} {trip.companyFareCurrency ? fareCurrencyLabels[trip.companyFareCurrency] : ''}
                      {trip.weightTons ? ` · ${fa(trip.weightTons)} تن` : ''}
                    </>
                  )}
                  {' '}· کرایه‌ی راننده {trip.fare ? groupDigits(trip.fare) : '—'}
                </span>
                <span className="tw-block">
                  <TripEarning trip={trip} />
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="tw-space-y-2">
        <h4 className="tw-m-0 tw-text-sm tw-font-bold">تسویه‌ها ({fa(detail.settlements.length)})</h4>
        {!detail.settlements.length ? (
          <p className="tw-m-0 tw-text-sm tw-text-brand-muted">هنوز تسویه‌ای ثبت نشده است.</p>
        ) : (
          <ul className="tw-m-0 tw-list-none tw-space-y-1.5 tw-p-0 tw-text-sm">
            {detail.settlements.map((settlement) => (
              <li key={settlement.id} className="tw-flex tw-items-center tw-justify-between tw-gap-3 tw-rounded-xl tw-bg-brand-bg tw-p-2.5">
                <span>
                  <span className="tw-font-bold">{money(settlement.amount)}</span>
                  <span className="tw-text-brand-muted"> · {faDate(settlement.createdAt)}{settlement.note ? ` · ${settlement.note}` : ''}</span>
                </span>
                <button type="button" onClick={() => remove(settlement.id, settlement.amount)} aria-label="حذف تسویه" title="حذف تسویه" className="tw-flex tw-h-8 tw-w-8 tw-items-center tw-justify-center tw-rounded-lg tw-border-0 tw-bg-transparent tw-text-red-600 hover:tw-bg-red-50">
                  <Trash2 size={15} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function AccountCard({ account, onChanged }: { account: BrokerAccount; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const owed = BigInt(account.remaining) > 0n;
  return (
    <li className="tw-space-y-3 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-4 tw-shadow-sm">
      <div className="tw-flex tw-flex-wrap tw-items-start tw-justify-between tw-gap-3">
        <div className="tw-min-w-0 tw-space-y-1">
          <p className="tw-m-0 tw-flex tw-flex-wrap tw-items-center tw-gap-2 tw-font-bold">
            <Handshake size={17} aria-hidden /> {account.broker.name} <AccountCode code={account.broker.accountCode} />
          </p>
          {account.broker.mobile && <PhoneLinks phones={[account.broker.mobile]} />}
        </div>
        <button type="button" onClick={() => setOpen((value) => !value)} className="tw-inline-flex tw-h-9 tw-items-center tw-gap-1 tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-3 tw-text-sm tw-font-bold hover:tw-bg-brand-sky">
          {open ? <ChevronUp size={15} aria-hidden /> : <ChevronDown size={15} aria-hidden />} {open ? 'بستن' : 'جزئیات و تسویه'}
        </button>
      </div>
      <div className="tw-grid tw-grid-cols-2 tw-gap-2 sm:tw-grid-cols-3 lg:tw-grid-cols-6">
        <Figure label="رانندگان معرفی‌شده" value={fa(account.drivers)} />
        <Figure label="سفرهای تحویل‌شده" value={fa(account.trips)} />
        <Figure label="جمع کرایه" value={money(account.fares)} />
        <Figure label="طلب (کمیسیون)" value={money(account.earned)} />
        {account.marginTrips > 0 && <Figure label={`اختلاف کرایه (${fa(account.marginTrips)} سفر)`} value={money(account.margin)} />}
        <Figure label="پرداخت‌شده" value={money(account.paid)} tone="green" />
        <Figure label="مانده‌ی طلب" value={money(account.remaining)} tone={owed ? 'orange' : 'green'} />
      </div>
      {account.unpriced > 0 && (
        <p className="tw-m-0 tw-text-xs tw-text-brand-muted">{fa(account.unpriced)} سفر کرایه‌ی غیرعددی دارد (مثلاً با واحد ارز) و کمیسیونش حساب نشده است.</p>
      )}
      {open && <Detail brokerUserId={account.broker.userId} onChanged={onChanged} />}
    </li>
  );
}

function LedgerContent() {
  const [data, setData] = useState<{ commissionPercent: number; accounts: BrokerAccount[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => {
    setFailed(false);
    listBrokerAccounts().then(setData, () => setFailed(true));
  }, []);
  useEffect(load, [load]);

  const total = (key: 'earned' | 'paid' | 'remaining') => data?.accounts.reduce((sum, account) => sum + BigInt(account[key]), 0n).toString() ?? '0';

  return (
    <div className="tw-space-y-5">
      <SectionTitle
        title="حساب واسط‌ها"
        hint={`طلب هر واسط: ${data ? fa(data.commissionPercent) : '…'}٪ از کرایه‌ی سفرهای تحویل‌شده‌ی راننده‌هایی که برای بارهای شما معرفی کرده است. مبالغ به همان واحدی است که واسط کرایه را وارد کرده.`}
      />
      {failed ? (
        <LoadFailed onRetry={load} />
      ) : !data ? (
        <CardSkeleton />
      ) : !data.accounts.length ? (
        <EmptyState icon={Users} title="هنوز حسابی با واسطی ندارید" hint="وقتی سفری که واسط برای بار شما معرفی کرده تحویل شود، حسابش اینجا می‌آید." />
      ) : (
        <>
          <div className="tw-grid tw-grid-cols-1 tw-gap-2 sm:tw-grid-cols-3">
            <Figure label="کل طلب واسط‌ها" value={money(total('earned'))} />
            <Figure label="کل پرداخت‌شده" value={money(total('paid'))} tone="green" />
            <Figure label="کل مانده" value={money(total('remaining'))} tone="orange" />
          </div>
          <ul className="tw-m-0 tw-list-none tw-space-y-3 tw-p-0">
            {data.accounts.map((account) => (
              <AccountCard key={account.broker.userId} account={account} onChanged={load} />
            ))}
          </ul>
        </>
      )}
      <p className="tw-m-0 tw-flex tw-items-center tw-gap-1.5 tw-text-xs tw-text-brand-muted">
        <Truck size={13} aria-hidden /> فقط سفرهای تحویل‌شده حساب می‌شوند؛ کمیسیون هر سفر روز تحویل ثابت می‌شود.
        <Wallet size={13} aria-hidden className="tw-ms-2" /> تسویه‌ها را خود شما ثبت می‌کنید.
      </p>
    </div>
  );
}

/** A transport company's account with each broker on its own loads. */
export default function CompanyBrokerLedger() {
  return (
    <CompanyShell>
      <LedgerContent />
    </CompanyShell>
  );
}
