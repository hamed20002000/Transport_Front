import axios from 'axios';
import endpoints from 'src/core/config/endpoints.json';

// transport_backend CompanyBrokerLedgerController (api/company/broker-ledger): the company's account with each broker
// on its own loads: drivers, delivered trips, the broker's commission (the admin's percent of each fare), payments.
// Amounts are decimal strings, in the unit the fares were given in.
export interface BrokerAccount {
  broker: { userId: string; name: string; mobile: string | null; accountCode: string | null };
  drivers: number;
  trips: number;
  fares: string;
  /** delivered trips whose fare had a unit («1500 دلار»): no commission counted */
  unpriced: number;
  earned: string;
  paid: string;
  remaining: string;
}

export interface BrokerTrip {
  id: string;
  deliveredAt: string | null;
  origin: string;
  destination: string;
  code: string | null;
  exitBorder: string | null;
  driverName: string | null;
  driverMobile: string | null;
  fare: string | null;
  commission: string | null;
  percent: string | null;
}

export interface BrokerSettlement {
  id: string;
  amount: string;
  note: string | null;
  createdAt: string;
}

export interface BrokerAccountDetail {
  account: BrokerAccount;
  trips: BrokerTrip[];
  settlements: BrokerSettlement[];
}

const url = `${endpoints.baseurl}company/broker-ledger`;
const config = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }, timeout: 30000 });

async function unwrap<T>(request: Promise<{ data: { success: boolean; data: T } }>) {
  const { data } = await request;
  if (!data.success || data.data === undefined) throw new Error('درخواست انجام نشد.');
  return data.data;
}

export const listBrokerAccounts = () => unwrap(axios.get<{ success: boolean; data: { commissionPercent: number; accounts: BrokerAccount[] } }>(url, config()));
export const getBrokerAccount = (brokerUserId: string) => unwrap(axios.get<{ success: boolean; data: BrokerAccountDetail }>(`${url}/${brokerUserId}`, config()));
export const settleBroker = (brokerUserId: string, amount: string, note?: string) =>
  unwrap(axios.post<{ success: boolean; data: BrokerAccountDetail }>(`${url}/${brokerUserId}/settlements`, { amount, note: note || undefined }, config()));
export const removeBrokerSettlement = (id: string) => unwrap(axios.delete<{ success: boolean; data: BrokerAccountDetail }>(`${url}/settlements/${id}`, config()));
