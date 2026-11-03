import axios from 'axios';
import endpoints from 'src/core/config/endpoints.json';

// transport_backend BrokerAccessController (api/broker/access): the companies a broker picks (when the admin limits
// them) and the packages of load requests it buys with a card-to-card receipt the admin reviews.
export interface BrokerAccessPolicy {
  /** the companies a broker may pick; null: it sees every company's loads */
  maxCompanies: number | null;
  /** off: load requests are free */
  packagesEnabled: boolean;
  /** load requests in one package */
  packageSize: number;
  packagePrice: string;
  currency: string;
}

export interface AccessCompany {
  userId: string;
  name: string;
}

export interface AccessOrder {
  id: string;
  /** PACKAGE: load requests; NEW and ADD: older purchases of companies */
  kind: 'NEW' | 'ADD' | 'PACKAGE';
  /** «بسته‌ی ۱۰۰ درخواست بار» */
  title: string;
  companies: AccessCompany[];
  requests: number | null;
  amount: string;
  currency: string;
  status: 'RECEIPT_SUBMITTED' | 'APPROVED' | 'REJECTED';
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

export interface BrokerAccess {
  policy: BrokerAccessPolicy;
  /** the companies picked */
  selected: AccessCompany[];
  /** load requests left */
  remaining: number;
  /** what keeps the broker from the loads now */
  blocked: 'noCompanies' | null;
  companies: AccessCompany[];
  orders: AccessOrder[];
  payment: { cardNumber: string; cardOwner: string };
  /** the assistant is open: approved by the parent company and, while companies are limited, some picked */
  agent: boolean;
}

const url = `${endpoints.baseurl}broker/access`;
const config = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }, timeout: 30000 });

async function unwrap<T>(request: Promise<{ data: { success: boolean; data: T } }>) {
  const { data } = await request;
  if (!data.success || !data.data) throw new Error('دریافت اطلاعات انجام نشد.');
  return data.data;
}

export const getBrokerAccess = () => unwrap(axios.get<{ success: boolean; data: BrokerAccess }>(url, config()));

/** The companies whose loads the broker sees; a new pick replaces the old one. */
export const selectBrokerCompanies = (companyUserIds: string[]) =>
  unwrap(axios.put<{ success: boolean; data: BrokerAccess }>(`${url}/companies`, { companyUserIds }, config()));

/** Some packages of load requests, with the receipt photo. */
export function submitBrokerPackageOrder(packages: number, file: File) {
  const form = new FormData();
  form.append('packages', String(packages));
  form.append('file', file);
  return unwrap(axios.post<{ success: boolean; data: BrokerAccess }>(`${url}/package-orders`, form, config()));
}
