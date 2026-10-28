import axios from 'axios';
import endpoints from 'src/core/config/endpoints.json';

// transport_backend AccountVerificationController (api/account/verification) and CompanyVerificationController
// (api/company/verifications): a transport company or factory that signed up on its own fills in its profile and asks
// to be checked; a parent company approves or (with a reason) rejects it.

export type VerificationStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface VerificationState {
  status: VerificationStatus;
  /** the «درخواست بررسی اعتبار» button is shown */
  canRequest: boolean;
  /** requests left, counting the next one */
  remaining: number;
  /** profile fields still empty */
  missing: string[];
  note: string | null;
  requestedAt: string | null;
  decidedAt: string | null;
}

export interface VerificationRequest {
  userId: string;
  kind: 'COMPANY' | 'FACTORY' | 'BROKER';
  mobile: string | null;
  /** the account's own code (transport_backend User.accountCode), e.g. 10023; null for accounts with no kind */
  accountCode: string | null;
  status: VerificationStatus;
  requests: number;
  remaining: number;
  note: string | null;
  requestedAt: string | null;
  decidedAt: string | null;
  createdAt: string;
  companyName: string | null;
  companyNationalId: string | null;
  economicCode: string | null;
  registrationNo: string | null;
  phone: string | null;
  postalCode: string | null;
  address: string | null;
}

const config = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }, timeout: 30000 });

async function unwrap<T>(request: Promise<{ data: { success: boolean; data: T } }>) {
  const { data } = await request;
  if (!data.success || data.data === undefined) throw new Error('درخواست انجام نشد.');
  return data.data;
}

export const getVerification = () => unwrap(axios.get<{ success: boolean; data: VerificationState }>(`${endpoints.baseurl}account/verification`, config()));

export const requestVerification = () => unwrap(axios.post<{ success: boolean; data: VerificationState }>(`${endpoints.baseurl}account/verification`, {}, config()));

export const listVerifications = (status: 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING') =>
  unwrap(axios.get<{ success: boolean; data: VerificationRequest[] }>(`${endpoints.baseurl}company/verifications`, { ...config(), params: { status } }));

export const approveVerification = (userId: string) =>
  unwrap(axios.post<{ success: boolean; data: { status: VerificationStatus } }>(`${endpoints.baseurl}company/verifications/${userId}/approve`, {}, config()));

export const rejectVerification = (userId: string, reason: string) =>
  unwrap(axios.post<{ success: boolean; data: { status: VerificationStatus; remaining: number } }>(`${endpoints.baseurl}company/verifications/${userId}/reject`, { reason }, config()));
