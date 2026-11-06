// The fare of a trip (transport_backend TripFare, domain/helper/tripFare.ts): the company records the fare and weight
// when it closes the deal (AGREED: accepting a request, handing a load to a driver) and again when it confirms the
// delivery (DELIVERED). Each stage is kept apart, so the agreed values always stay for the figures.
// Same rules and wording as the backend helper; the server checks everything again.

export type TripFareStage = 'AGREED' | 'DELIVERED';
export type FareBasis = 'TOTAL' | 'PER_TON';
export type FareCurrency = 'IRT' | 'USD' | 'EUR' | 'AED' | 'TRY';
export type FareChangeReason = 'SHORTAGE' | 'WAITING' | 'OVERWEIGHT' | 'EXTRA_COST' | 'DISCOUNT' | 'WEIGHT' | 'OTHER';
// How a broker is paid for a load it brought: COMMISSION (the company owes it a percent of the fare) or MARGIN (it
// keeps the gap between the company's fare and the driver's).
export type BrokerPayModel = 'COMMISSION' | 'MARGIN';

export interface TripFareInput {
  basis: FareBasis;
  /** the whole fare (TOTAL) or the fare of one ton (PER_TON) */
  rate: number;
  weightTons: number;
  currency?: FareCurrency;
  changeReason?: FareChangeReason;
  note?: string;
}

export interface TripFareView {
  stage: TripFareStage;
  basis: FareBasis;
  rate: number;
  weightTons: number;
  total: number;
  currency: FareCurrency;
  changeReason: FareChangeReason | null;
  note: string | null;
  enteredAt: string;
}

export interface TripFareStages {
  agreed: TripFareView | null;
  delivered: TripFareView | null;
}

/** What the company's form starts from (TripFareService.form): prefilled values, the agreed ones at delivery. */
export interface TripFareForm {
  stage: TripFareStage;
  values: Partial<TripFareInput>;
  agreed: TripFareView | null;
  broker: boolean;
  payModel: BrokerPayModel | null;
}

export const MAX_WEIGHT_TONS = 200;

export const fareBasisLabels: Record<FareBasis, string> = { TOTAL: 'دربست', PER_TON: 'تنی' };
export const fareBasisHints: Record<FareBasis, string> = { TOTAL: 'یک مبلغ برای کل بار', PER_TON: 'مبلغ هر تن؛ جمع با وزن حساب می‌شود' };
export const fareCurrencyLabels: Record<FareCurrency, string> = { IRT: 'تومان', USD: 'دلار', EUR: 'یورو', AED: 'درهم', TRY: 'لیر' };
export const fareChangeReasonLabels: Record<FareChangeReason, string> = {
  SHORTAGE: 'کسری بار',
  WAITING: 'توقف و انتظار',
  OVERWEIGHT: 'اضافه‌بار',
  EXTRA_COST: 'هزینه‌ی جانبی',
  DISCOUNT: 'تخفیف',
  WEIGHT: 'وزن بارنامه فرق داشت',
  OTHER: 'سایر',
};
export const brokerPayModelLabels: Record<BrokerPayModel, string> = { COMMISSION: 'کمیسیون از شرکت', MARGIN: 'اختلاف کرایه' };
export const brokerPayModelHints: Record<BrokerPayModel, string> = {
  COMMISSION: 'کرایه کامل به راننده می‌رسد و شرکت درصدی از آن را به واسط بدهکار می‌شود.',
  MARGIN: 'واسط فرق کرایه‌ی شرکت و کرایه‌ای که به راننده داده را برمی‌دارد؛ شرکت چیزی جدا بدهکار نیست.',
};

const persian = (value: number | string) => String(value).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);

/** Persian or Arabic digits to Latin, separators dropped: what an amount input holds. */
export const latinDigits = (text: string) =>
  text.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

/** «۴۵۰۰۰۰۰۰» → «۴۵٬۰۰۰٬۰۰۰»; decimals as «۲۵٫۵». */
export function faNumber(value: number): string {
  const [whole, fraction] = String(value).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
  return persian(fraction ? `${grouped}٫${fraction}` : grouped);
}

export function fareTotal(basis: FareBasis, rate: number, weightTons: number): number {
  return basis === 'PER_TON' ? Math.round(rate * weightTons) : rate;
}

export function moneyText(amount: number, currency: FareCurrency = 'IRT'): string {
  return `${faNumber(amount)} ${fareCurrencyLabels[currency]}`;
}

/** «۴۵ میلیون و ۵۰۰ هزار تومان»: a missing or extra zero shows at a glance. */
export function moneyWords(amount: number, currency: FareCurrency = 'IRT'): string {
  if (currency !== 'IRT') return moneyText(amount, currency);
  const parts: string[] = [];
  let rest = amount;
  for (const [size, word] of [[1e9, 'میلیارد'], [1e6, 'میلیون'], [1e3, 'هزار']] as const) {
    const count = Math.floor(rest / size);
    if (count) parts.push(`${persian(count)} ${word}`);
    rest %= size;
  }
  if (rest) parts.push(persian(rest));
  return `${parts.join(' و ') || '۰'} تومان`;
}

/** «دربست · ۴۵٬۰۰۰٬۰۰۰ تومان · ۲۵ تن» or «تنی ۱٬۸۰۰٬۰۰۰ تومان × ۲۵ تن = ۴۵٬۰۰۰٬۰۰۰ تومان» */
export function fareLine(fare: Pick<TripFareView, 'basis' | 'rate' | 'weightTons' | 'currency' | 'total'>): string {
  const tons = `${faNumber(fare.weightTons)} تن`;
  return fare.basis === 'PER_TON'
    ? `تنی ${moneyText(fare.rate, fare.currency)} × ${tons} = ${moneyText(fare.total, fare.currency)}`
    : `دربست · ${moneyText(fare.total, fare.currency)} · ${tons}`;
}

/** Whether the delivered values differ from the agreed ones in what matters for the money (the server's rule). */
export function fareChanged(agreed: Pick<TripFareView, 'total' | 'currency' | 'weightTons'>, next: Pick<TripFareView, 'total' | 'currency' | 'weightTons'>) {
  return agreed.total !== next.total || agreed.currency !== next.currency || agreed.weightTons !== next.weightTons;
}

/** The form's fields as typed (strings), and what they make once read. */
export interface FareDraft {
  basis: FareBasis | null;
  rate: string;
  weight: string;
  /** the unit the weight is typed in; tons unless the company picks kilograms (sent as tons either way) */
  weightUnit: WeightUnit;
  currency: FareCurrency;
  changeReason: FareChangeReason | null;
  note: string;
}

export type WeightUnit = 'TON' | 'KG';

export const weightUnitLabels: Record<WeightUnit, string> = { TON: 'تن', KG: 'کیلوگرم' };

/** The weight typed, in tons (kilograms divided by 1000), to two decimals; NaN when there is no number. */
export function draftTons(draft: Pick<FareDraft, 'weight' | 'weightUnit'>): number {
  const value = Number(latinDigits(draft.weight).replace(/[٫/]/g, '.').replace(/[^0-9.]/g, ''));
  return Math.round((draft.weightUnit === 'KG' ? value / 1000 : value) * 100) / 100;
}

export function draftFrom(values: Partial<TripFareInput> | null | undefined): FareDraft {
  return {
    basis: values?.basis ?? null,
    rate: values?.rate ? String(values.rate) : '',
    weight: values?.weightTons ? String(values.weightTons) : '',
    weightUnit: 'TON',
    currency: values?.currency ?? 'IRT',
    changeReason: values?.changeReason ?? null,
    note: values?.note ?? '',
  };
}

/** The draft read: the values to send with their total, or the first thing missing (in Persian). */
export function readDraft(draft: FareDraft): { fare: TripFareInput & { total: number; currency: FareCurrency } } | { error: string } {
  if (!draft.basis) return { error: 'نوع کرایه را انتخاب کنید: دربست یا تنی.' };
  const rate = Number(latinDigits(draft.rate).replace(/\D/g, ''));
  if (!Number.isSafeInteger(rate) || rate <= 0) return { error: 'مبلغ کرایه را وارد کنید.' };
  const weightTons = draftTons(draft);
  if (!Number.isFinite(weightTons) || weightTons <= 0 || weightTons > MAX_WEIGHT_TONS) {
    return { error: `وزن بار را وارد کنید (بیشتر از صفر و تا ${persian(MAX_WEIGHT_TONS)} تن، یعنی ${faNumber(MAX_WEIGHT_TONS * 1000)} کیلوگرم).` };
  }
  const total = fareTotal(draft.basis, rate, weightTons);
  return {
    fare: {
      basis: draft.basis,
      rate,
      weightTons,
      currency: draft.currency,
      total,
      changeReason: draft.changeReason ?? undefined,
      note: draft.note.trim() || undefined,
    },
  };
}
