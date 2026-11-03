import axios from 'axios';
import endpoints from 'src/core/config/endpoints.json';
import type { InviteInfo, InviteSms, MessengerInvites } from 'src/features/factory/api';

// transport_backend CompanyBrokerInviteController (api/company/broker-invites) and BrokerInviteInfoController
// (api/broker-invites): a company invites a broker by its number, like a factory; the broker's account is made right
// away and, while the admin limits a broker's companies, the inviting company joins its pick. The link
// (/broker-invite/…) and code (brk_…) work only for that number.

export interface CompanyBroker {
  userId: string;
  name: string;
  mobile: string | null;
  accountCode: string | null;
  joinedAt: string;
  /** the broker's requests on this company's loads */
  requests: number;
  token: string;
  /** the broker first came in with its invite */
  usedAt: string | null;
  /** an invite not used yet is over at this time (a day after it was made) */
  expiresAt?: string | null;
  messengers: MessengerInvites;
}

const config = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }, timeout: 30000 });

async function unwrap<T>(request: Promise<{ data: { success: boolean; data: T } }>) {
  const { data } = await request;
  if (!data.success || data.data === undefined) throw new Error('درخواست انجام نشد.');
  return data.data;
}

export const brokerInviteUrl = (token: string) => `${window.location.origin}/broker-invite/${token}`;

export const getCompanyBrokers = () => unwrap(axios.get<{ success: boolean; data: CompanyBroker[] }>(`${endpoints.baseurl}company/broker-invites`, config()));

export const createBrokerInvite = (mobile: string, brokerName?: string) =>
  unwrap(axios.post<{ success: boolean; data: { brokerUserId: string; token: string; sms: InviteSms } }>(`${endpoints.baseurl}company/broker-invites`, { mobile, brokerName }, config()));

export const removeBroker = (brokerUserId: string) =>
  unwrap(axios.delete<{ success: boolean; data: { brokerUserId: string } }>(`${endpoints.baseurl}company/broker-invites/${brokerUserId}`, config()));

export const getBrokerInviteInfo = (token: string) =>
  unwrap(axios.get<{ success: boolean; data: InviteInfo }>(`${endpoints.baseurl}broker-invites/${encodeURIComponent(token)}`, { timeout: 20000 }));

export const getBrokerInviteMembership = (token: string) =>
  unwrap(axios.get<{ success: boolean; data: { member: boolean } }>(`${endpoints.baseurl}broker-invites/${encodeURIComponent(token)}/membership`, config()));
