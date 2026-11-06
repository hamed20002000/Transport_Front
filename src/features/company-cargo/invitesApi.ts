import axios from 'axios';
import endpoints from 'src/core/config/endpoints.json';
import type { InviteInfo, InviteSms, MessengerInvites } from 'src/features/factory/api';

// transport_backend CompanyInviteController (api/company/invites) and CompanyInviteInfoController (api/company-invites):
// the parent company invites a transport company by its number (its account is made right away); the link
// (/join/…) and code (cmp_…) work only for that number. Apart from the factories' link.

export interface CompanyInvite {
  token: string;
  mobile: string;
  /** the company first came in with the link */
  usedAt: string | null;
  /** an invite not used yet is over at this time (a day after it was made) */
  expiresAt?: string | null;
  createdAt: string;
  companyUserId: string;
  name: string;
  openFeatures: number;
  messengers: MessengerInvites;
}

const config = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }, timeout: 30000 });

async function unwrap<T>(request: Promise<{ data: { success: boolean; data: T } }>) {
  const { data } = await request;
  if (!data.success || data.data === undefined) throw new Error('درخواست انجام نشد.');
  return data.data;
}

export const joinUrl = (token: string) => `${window.location.origin}/join/${token}`;

export const getCompanyInvites = () => unwrap(axios.get<{ success: boolean; data: CompanyInvite[] }>(`${endpoints.baseurl}company/invites`, config()));

/** One transport company of the platform, as the parent company sees it (CompanyInviteService.companies). */
export interface PlatformCompany {
  userId: string;
  name: string;
  mobile: string | null;
  accountCode: string | null;
  createdAt: string;
  isParent: boolean;
  verificationStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  /** invite: came with an invite link; approved: signed up and a parent company approved it; self: on its own */
  source: 'invite' | 'approved' | 'self';
  /** invited or approved by this parent company */
  mine: boolean;
  openFeatures: number;
}

export const getPlatformCompanies = () => unwrap(axios.get<{ success: boolean; data: PlatformCompany[] }>(`${endpoints.baseurl}company/invites/companies`, config()));

export const createCompanyInvite = (mobile: string, companyName?: string) =>
  unwrap(axios.post<{ success: boolean; data: CompanyInvite & { sms: InviteSms } }>(`${endpoints.baseurl}company/invites`, { mobile, ...(companyName && { companyName }) }, config()));

// before sign-in: no token header; the invited number comes back partly hidden (0912***4567)
export const getJoinInfo = (token: string) =>
  unwrap(axios.get<{ success: boolean; data: Omit<InviteInfo, 'companyName'> & { parentName: string | null } }>(`${endpoints.baseurl}company-invites/${encodeURIComponent(token)}`, { timeout: 20000 }));

export const getJoinMembership = (token: string) =>
  unwrap(axios.get<{ success: boolean; data: { member: boolean } }>(`${endpoints.baseurl}company/invites/${encodeURIComponent(token)}/membership`, config()));
