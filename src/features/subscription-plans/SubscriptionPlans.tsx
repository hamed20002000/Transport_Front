import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from 'src/core/auth/AuthContext';
import { Button } from 'src/shared/components/ui/button';
import { Input } from 'src/shared/components/ui/input';
import PageContainer from 'src/shared/components/container/PageContainer';
import { createPlan, deletePlan, listPlans, type Plan, type PlanInput } from './api';

import { currencies, type Currency } from './currencies';

const accounts = { DRIVER: 'راننده', COMPANY: 'شرکت', BROKER: 'واسط' };
const digits = (value: string) =>
  value
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
// Groups an amount in threes with Persian digits, e.g. 1000000 → ۱٬۰۰۰٬۰۰۰
const groupAmount = (value: string) =>
  value.replace(/\B(?=(\d{3})+(?!\d))/g, '٬').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
function errorMessage(error: unknown) {
  if (axios.isAxiosError(error) && error.response?.status === 403)
    return 'اجازه مدیریت پلن‌های اشتراک را ندارید.';
  if (axios.isAxiosError(error) && error.response?.status === 404)
    return 'پلن پیدا نشد یا قبلاً حذف شده است.';
  if (axios.isAxiosError(error) && error.response?.status === 400)
    return 'اطلاعات پلن معتبر نیست. مقادیر را بررسی کنید.';
  return 'ارتباط با سرور برقرار نشد. دوباره تلاش کنید.';
}
function PlansContent() {
  const [currency, setCurrency] = useState<Currency>('IRR');
  const [price, setPrice] = useState('');
  const priceCaret = useRef<{ input: HTMLInputElement; caret: number } | null>(null);
  useLayoutEffect(() => {
    priceCaret.current?.input.setSelectionRange(priceCaret.current.caret, priceCaret.current.caret);
    priceCaret.current = null;
  });
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [listError, setListError] = useState('');
  const [success, setSuccess] = useState('');
  const [reload, setReload] = useState(0);
  const [deletingId, setDeletingId] = useState('');
  const pending = useRef(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setListError('');
    listPlans()
      .then((data) => {
        if (active) setPlans(data);
      })
      .catch((e) => {
        if (active) setListError(errorMessage(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reload]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get('title') || '').trim();
    const duration = digits(String(data.get('durationDays') || '')).trim();
    const order = digits(String(data.get('sortOrder') || '0')).trim();
    setError('');
    setSuccess('');
    if (
      !title ||
      Array.from(title).length > 150 ||
      !/^\d+$/.test(duration) ||
      Number(duration) < 1 ||
      Number(duration) > 2147483647 ||
      !/^(0|[1-9][0-9]{0,17})$/.test(price) ||
      !/^\d+$/.test(order) ||
      Number(order) > 2147483647
    ) {
      setError('عنوان، مدت مثبت، مبلغ صحیح (حداکثر ۱۸ رقم) و ترتیب نمایش نامنفی را وارد کنید.');
      return;
    }
    pending.current = true;
    setSaving(true);
    try {
      await createPlan({
        title,
        durationDays: Number(duration),
        price,
        currency,
        accountType: String(data.get('accountType')) as PlanInput['accountType'],
        recordStatus: 0,
        sortOrder: Number(order),
      });
      form.reset();
      setCurrency('IRR');
      setPrice('');
      setSuccess('پلن اشتراک با موفقیت ثبت شد.');
      setReload((value) => value + 1);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }
  async function remove(plan: Plan) {
    if (deletingId || !window.confirm(`پلن «${plan.title}» حذف شود؟`)) return;
    setDeletingId(plan.id);
    setError('');
    setSuccess('');
    try {
      await deletePlan(plan.id);
      setPlans((current) => current.filter((item) => item.id !== plan.id));
      setSuccess('پلن اشتراک حذف شد.');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setDeletingId('');
    }
  }
  function changePrice(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    // Keep the caret after the same number of digits once separators are re-inserted.
    const before = digits(input.value.slice(0, input.selectionStart ?? input.value.length)).replace(
      /\D/g,
      '',
    ).length;
    const next = digits(input.value).replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 18);
    if (next === price) return;
    setPrice(next);
    const formatted = groupAmount(next);
    let caret = 0;
    for (let seen = 0; caret < formatted.length && seen < before; caret++)
      if (formatted[caret] !== '٬') seen++;
    priceCaret.current = { input, caret };
  }
  const selectClass =
    'tw-h-10 tw-w-full tw-rounded-md tw-border tw-border-input tw-bg-background tw-px-3';
  return (
    <PageContainer title="پلن‌های اشتراک" description="ثبت، مشاهده و حذف پلن‌های اشتراک">
      <main dir="rtl" lang="fa" className="tw-mx-auto tw-max-w-6xl tw-space-y-6 tw-p-4">
        <Link to="/admin" className="tw-text-emerald-800">
          بازگشت به پنل مدیریت
        </Link>
        <h1 className="tw-text-2xl tw-font-bold">پلن‌های اشتراک</h1>
        <section className="tw-rounded-xl tw-border tw-bg-card tw-p-6">
          <h2 className="tw-mb-5 tw-text-lg tw-font-bold">ثبت پلن جدید</h2>
          <form onSubmit={submit} aria-busy={saving}>
            <fieldset
              disabled={saving}
              className="tw-grid tw-gap-5 sm:tw-grid-cols-2 lg:tw-grid-cols-3"
            >
              <label className="tw-space-y-2">
                عنوان پلن
                <Input name="title" required maxLength={150} />
              </label>
              <label className="tw-space-y-2">
                نوع حساب
                <select name="accountType" className={selectClass} defaultValue="DRIVER">
                  {Object.entries(accounts).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="tw-space-y-2">
                مدت اشتراک (روز)
                <Input name="durationDays" inputMode="numeric" required defaultValue="30" />
              </label>
              <label className="tw-space-y-2">
                {`مبلغ (${currencies[currency]})`}
                <Input
                  name="price"
                  inputMode="numeric"
                  dir="ltr"
                  required
                  value={groupAmount(price)}
                  onChange={changePrice}
                  placeholder="مثلاً ۱٬۰۰۰٬۰۰۰"
                />
              </label>
              <label className="tw-space-y-2">
                واحد پول
                <select
                  name="currency"
                  aria-label="واحد پول"
                  className={selectClass}
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value as Currency)}
                  required
                >
                  {Object.entries(currencies).map(([code, title]) => (
                    <option key={code} value={code}>
                      {title} ({code})
                    </option>
                  ))}
                </select>
              </label>
              <label className="tw-space-y-2">
                ترتیب نمایش
                <Input name="sortOrder" inputMode="numeric" required defaultValue="0" />
              </label>
            </fieldset>
            {error && (
              <p role="alert" className="tw-mt-4 tw-text-red-700">
                {error}
              </p>
            )}
            {success && (
              <p role="status" className="tw-mt-4 tw-text-emerald-800">
                {success}
              </p>
            )}
            <Button type="submit" disabled={saving || loading} className="tw-mt-5">
              {saving ? 'در حال ثبت…' : 'ثبت پلن'}
            </Button>
          </form>
        </section>
        <section className="tw-rounded-xl tw-border tw-bg-card tw-p-6">
          <h2 className="tw-mb-5 tw-text-lg tw-font-bold">فهرست پلن‌ها</h2>
          {loading ? (
            <p role="status">در حال دریافت پلن‌ها…</p>
          ) : listError ? (
            <div role="alert">
              {listError}
              <Button variant="outline" onClick={() => setReload((value) => value + 1)}>
                تلاش مجدد
              </Button>
            </div>
          ) : !plans.length ? (
            <p>هنوز پلنی ثبت نشده است.</p>
          ) : (
            <div className="tw-overflow-x-auto">
              <table className="tw-w-full tw-text-right tw-text-sm">
                <thead>
                  <tr>
                    {['عنوان', 'نوع حساب', 'مدت (روز)', 'مبلغ', 'واحد پول', 'ترتیب', 'عملیات'].map(
                      (label) => (
                        <th key={label} className="tw-p-3">
                          {label}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan) => (
                    <tr key={plan.id} className="tw-border-t">
                      <td className="tw-p-3">{plan.title}</td>
                      <td className="tw-p-3">{accounts[plan.accountType]}</td>
                      <td className="tw-p-3">{plan.durationDays.toLocaleString('fa-IR')}</td>
                      <td className="tw-p-3">
                        {groupAmount(plan.price)}
                      </td>
                      <td className="tw-p-3">
                        {currencies[plan.currency] || plan.currency} ({plan.currency})
                      </td>
                      <td className="tw-p-3">{plan.sortOrder.toLocaleString('fa-IR')}</td>
                      <td className="tw-p-3">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!!deletingId}
                          onClick={() => remove(plan)}
                          className="tw-text-red-700"
                          aria-label={`حذف ${plan.title}`}
                        >
                          {deletingId === plan.id ? 'در حال حذف…' : 'حذف'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </PageContainer>
  );
}
export default function SubscriptionPlans() {
  const { isAuth, isAuthDataLoading, userRoles } = useAuth();
  if (isAuthDataLoading) return <p role="status">در حال دریافت اطلاعات حساب…</p>;
  if (!isAuth) return <Navigate to="/auth/login" replace />;
  if (!userRoles.some((role) => role.name === 'ADMIN'))
    return (
      <p role="alert" dir="rtl">
        این بخش فقط برای مدیر سیستم در دسترس است.
      </p>
    );
  return <PlansContent />;
}
