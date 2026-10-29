import axios from 'axios';
import endpoints from 'src/core/config/endpoints.json';

// transport_backend BrokerAccessController (api/broker/access): the companies whose loads a broker sees, bought for a
// time with a card-to-card receipt the admin reviews.
export interface BrokerAccessPolicy {
  /** off: every company's loads are free to see */
  enabled: boolean;
  includedCompanies: number;
  basePrice: string;
  extraCompanyPrice: string;
  durationDays: number;
  currency: string;
}

export interface AccessCompany {
  userId: string;
  name: string;
}

export interface AccessPeriod {
  id: string;
  startAt: string;
  expireAt: string;
  companies: AccessCompany[];
}

export interface AccessOrder {
  id: string;
  kind: 'NEW' | 'ADD';
  companies: AccessCompany[];
  durationDays: number;
  amount: string;
  currency: string;
  status: 'RECEIPT_SUBMITTED' | 'APPROVED' | 'REJECTED';
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

export interface BrokerAccess {
  policy: BrokerAccessPolicy;
  /** open now */
  period: AccessPeriod | null;
  /** a renewal waiting for the open one to end */
  next: AccessPeriod | null;
  companies: AccessCompany[];
  orders: AccessOrder[];
  payment: { cardNumber: string; cardOwner: string };
  /** the assistant is open: approved by the parent company and, while brokers pay, companies bought */
  agent: boolean;
  /** companies added at once (room left in the base price) */
  added?: number;
}

const url = `${endpoints.baseurl}broker/access`;
const config = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }, timeout: 30000 });

async function unwrap<T>(request: Promise<{ data: { success: boolean; data: T } }>) {
  const { data } = await request;
  if (!data.success || !data.data) throw new Error('دریافت اطلاعات خرید انجام نشد.');
  return data.data;
}

export const getBrokerAccess = () => unwrap(axios.get<{ success: boolean; data: BrokerAccess }>(url, config()));

/** A new period (NEW) or companies added to the open one (ADD); file is needed unless the add is free. */
export function submitBrokerOrder(kind: 'NEW' | 'ADD', companyUserIds: string[], file: File | null) {
  const form = new FormData();
  form.append('kind', kind);
  form.append('companyUserIds', companyUserIds.join(','));
  if (file) form.append('file', file);
  return unwrap(axios.post<{ success: boolean; data: BrokerAccess }>(`${url}/orders`, form, config()));
}

// the same sums as BrokerAccessService
export const newPeriodPrice = (policy: BrokerAccessPolicy, count: number) =>
  (BigInt(policy.basePrice) + BigInt(Math.max(0, count - policy.includedCompanies)) * BigInt(policy.extraCompanyPrice)).toString();

export const addCompaniesPrice = (policy: BrokerAccessPolicy, existing: number, adding: number) =>
  (BigInt(Math.max(0, existing + adding - policy.includedCompanies) - Math.max(0, existing - policy.includedCompanies)) * BigInt(policy.extraCompanyPrice)).toString();
