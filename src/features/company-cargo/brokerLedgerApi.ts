import axios from 'axios';
import endpoints from 'src/core/config/endpoints.json';

// transport_backend CompanyBrokerLedgerController (api/company/broker-ledger): the company's account with each broker
// on its own loads: drivers, delivered trips and how the broker was paid for each (BrokerPayModel): COMMISSION, the
// admin's percent of the fare the company confirmed, owed by the company; MARGIN, the broker's own gap between the
// company's fare and the driver's, shown, not owed. Payments come off the commission. Amounts are decimal strings, tomans.
import type { BrokerPayModel, FareCurrency } from './trip-fare/tripFare';
export interface BrokerAccount {
  broker: { userId: string; name: string; mobile: string | null; accountCode: string | null };
  drivers: number;
  trips: number;
  fares: string;
  /** delivered COMMISSION trips whose commission could not be worked out (a fare in dollars) */
  unpriced: number;
  commissionTrips: number;
  marginTrips: number;
  /** commission owed on COMMISSION trips */
  earned: string;
  /** the broker's own margin on MARGIN trips: for the record, not owed */
  margin: string;
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
  /** the fare the broker gave the driver, as written */
  fare: string | null;
  payModel: BrokerPayModel;
  /** the fare the company confirmed at delivery; null for trips from before */
  companyFare: string | null;
  companyFareCurrency: FareCurrency | null;
  weightTons: number | null;
  commission: string | null;
  percent: string | null;
  margin: string | null;
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
