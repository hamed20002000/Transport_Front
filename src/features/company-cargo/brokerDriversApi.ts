import axios from 'axios';
import endpoints from 'src/core/config/endpoints.json';
import type { BrokerDriver } from 'src/features/driver-panel/api';
import type { Page } from './api';

// transport_backend CompanyBrokerDriversController (api/company/broker-drivers): every driver the brokers requested
// loads for, gathered by mobile, for the parent company. No account is made for them; the parent company may
// register one as its own driver (registerDriver).
export interface BrokerDriverRow {
  mobile: string;
  /** the latest details a broker gave */
  driver: BrokerDriver;
  brokers: Array<{ userId: string; name: string; mobile: string | null; accountCode: string | null }>;
  requests: number;
  /** accepted or delivered */
  accepted: number;
  firstAt: string;
  lastAt: string;
  last: { origin: string; destination: string; code: string | null; status: string; exitBorder: string | null; company: string | null };
  /** a Trabot driver account with this mobile, and whether it is one of the parent company's drivers */
  account: { userId: string; companyDriver: boolean } | null;
}

const config = (params?: Record<string, unknown>) => ({ headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }, params, timeout: 30000 });

async function unwrap<T>(request: Promise<{ data: { success: boolean; data: T } }>) {
  const { data } = await request;
  if (!data.success || data.data === undefined) throw new Error('درخواست انجام نشد.');
  return data.data;
}

export const listBrokerDrivers = (page: number, search: string, pageSize = 20) =>
  unwrap(axios.get<{ success: boolean; data: Page<BrokerDriverRow> }>(`${endpoints.baseurl}company/broker-drivers`, config({ page, pageSize, search: search || undefined })));
