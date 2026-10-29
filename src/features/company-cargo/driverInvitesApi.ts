import axios from 'axios';
import endpoints from 'src/core/config/endpoints.json';
import type { InviteSms, MessengerInvites } from 'src/features/factory/api';
import type { InviteInfo } from 'src/features/factory/api';

// transport_backend CompanyDriverInviteController (api/company/driver-invites) and DriverInviteInfoController
// (api/driver-invites): a company invites drivers by their numbers, one or many; each driver's account is made right
// away (or an existing driver found) and the company joins its companies. The link (/driver-invite/…) and code
// (drv_…) work only for that number.

export interface DriverInvite {
  driverUserId: string;
  name: string;
  mobile: string;
  token: string;
  /** the driver first came in with the link */
  usedAt: string | null;
  createdAt: string;
  messengers: MessengerInvites;
}

/** One line of a batch: invited (a new account, or an existing driver), or refused and why. */
export type DriverInviteOutcome =
  | { mobile: string; status: 'created' | 'added'; driverUserId: string; token: string; messengers: MessengerInvites }
  | { mobile: string; status: 'refused'; reason: string };

export const MAX_DRIVER_INVITES = 200;

const config = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }, timeout: 60000 });

async function unwrap<T>(request: Promise<{ data: { success: boolean; data: T } }>) {
  const { data } = await request;
  if (!data.success || data.data === undefined) throw new Error('درخواست انجام نشد.');
  return data.data;
}

export const driverInviteUrl = (token: string) => `${window.location.origin}/driver-invite/${token}`;

export const getDriverInvites = () => unwrap(axios.get<{ success: boolean; data: DriverInvite[] }>(`${endpoints.baseurl}company/driver-invites`, config()));

/** sms: one invited driver gets its own link, several one group SMS (InviteSmsService) */
export const inviteDrivers = (drivers: Array<{ mobile: string; name?: string }>) =>
  unwrap(axios.post<{ success: boolean; data: { outcomes: DriverInviteOutcome[]; sms: InviteSms } }>(`${endpoints.baseurl}company/driver-invites`, { drivers }, config()));

export const removeDriverInvite = (driverUserId: string) =>
  unwrap(axios.delete<{ success: boolean; data: { driverUserId: string } }>(`${endpoints.baseurl}company/driver-invites/${driverUserId}`, config()));

export interface DriverExcelResult {
  drivers: Array<{ row: number; mobile: string; name?: string }>;
  /** rows without a valid number; the others still come back */
  errors: Array<{ row: number; message: string }>;
}

/** Only reads the file (titled columns or not): the drivers go into the form, to check before inviting. */
export function readDriverExcel(file: File) {
  const form = new FormData();
  form.append('file', file);
  return unwrap(axios.post<{ success: boolean; data: DriverExcelResult }>(`${endpoints.baseurl}company/driver-invites/excel`, form, config()));
}

export async function downloadDriverTemplate() {
  const { data } = await axios.get<Blob>(`${endpoints.baseurl}company/driver-invites/excel/template`, { ...config(), responseType: 'blob' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(data);
  link.download = 'drivers-template.xlsx';
  link.click();
  URL.revokeObjectURL(link.href);
}

// before sign-in: no token header; the invited number comes back partly hidden (0912***4567)
export const getDriverInviteInfo = (token: string) =>
  unwrap(axios.get<{ success: boolean; data: InviteInfo }>(`${endpoints.baseurl}driver-invites/${encodeURIComponent(token)}`, { timeout: 20000 }));

export const getDriverInviteMembership = (token: string) =>
  unwrap(axios.get<{ success: boolean; data: { member: boolean } }>(`${endpoints.baseurl}driver-invites/${encodeURIComponent(token)}/membership`, config()));

/**
 * The lines the company typed or pasted: one driver a line, the number first and an optional name after it
 * («09121234567 علی رضایی» or «09121234567، علی رضایی»); empty lines are skipped.
 */
export function parseDriverLines(text: string): Array<{ mobile: string; name?: string }> {
  const latin = text.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  return latin
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\+?[\d\s-]{10,16})[\s,،;؛]*(.*)$/);
      if (!match) return { mobile: line };
      const name = match[2].trim();
      return { mobile: match[1].replace(/[\s-]/g, ''), ...(name && { name }) };
    });
}
