import axios from 'axios';
import endpoints from 'src/core/config/endpoints.json';
import type { CargoListingInput, ExcelImportResult } from 'src/features/company-cargo/api';

// transport_backend FactoryController (api/factory), FactoryInviteController (api/factory-invites) and
// CompanyFactoryController (api/company/factories). A factory is invited personally: the company gives its number, the
// account is made right away, and the link (/invite/…) and code (inv_…) only let that number sign in.

export interface FactoryCompany {
  userId: string;
  name: string;
}

export interface FactoryLoad {
  id: string;
  companyUserId: string;
  companyName: string | null;
  origin: string;
  destination: string;
  cargoType: string | null;
  weight: string | null;
  vehicleType: string | null;
  price: string | null;
  extraNotes: string | null;
  contactPhones: string[];
  createdAt: string;
}

export type FactoryExcelResult = ExcelImportResult<{ row: number; id: string; origin: string; destination: string }>;

/** The same invite in each messenger; null where the bot (or WhatsApp number) is not configured on the server. */
export interface MessengerInvites {
  /** «inv_…»: sent to any of the bots or WhatsApp, it does what the link does */
  code: string;
  telegram: string | null;
  bale: string | null;
  rubika: string | null;
  whatsapp: string | null;
}

/** A factory of the company, with its personal invite (null for one that joined with an old shared link). */
export interface CompanyFactory {
  userId: string;
  name: string;
  mobile: string | null;
  /** the account's own code (transport_backend User.accountCode), e.g. 10023; null for accounts with no kind */
  accountCode: string | null;
  joinedAt: string;
  loads: number;
  token: string | null;
  /** the factory first came in with its invite */
  usedAt: string | null;
  messengers: MessengerInvites | null;
}

const config = (params?: Record<string, unknown>) => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
  params,
  timeout: 30000,
});

async function unwrap<T>(request: Promise<{ data: { success: boolean; data: T } }>) {
  const { data } = await request;
  if (!data.success || data.data === undefined) throw new Error('درخواست انجام نشد.');
  return data.data;
}

/** The invite link's address that the company shares. */
export const inviteUrl = (token: string) => `${window.location.origin}/invite/${token}`;

// before sign-in: no token header; the invited number comes back partly hidden (0912***4567)
export const getInviteInfo = (token: string) =>
  unwrap(axios.get<{ success: boolean; data: { valid: boolean; companyName: string | null; mobile: string | null } }>(`${endpoints.baseurl}factory-invites/${encodeURIComponent(token)}`, { timeout: 20000 }));

/** Signed in: this account is the invited factory (the same number)? */
export const getInviteMembership = (token: string) =>
  unwrap(axios.get<{ success: boolean; data: { member: boolean } }>(`${endpoints.baseurl}factory/invites/${encodeURIComponent(token)}/membership`, config()));

export const getFactoryCompanies = () => unwrap(axios.get<{ success: boolean; data: FactoryCompany[] }>(`${endpoints.baseurl}factory/companies`, config()));

export const getFactoryDraft = () =>
  unwrap(axios.get<{ success: boolean; data: { factoryName: string | null; contactPhones: string[] } }>(`${endpoints.baseurl}factory/draft`, config()));

export const getFactoryLoads = (page: number, pageSize = 20) =>
  unwrap(axios.get<{ success: boolean; data: { items: FactoryLoad[]; total: number; page: number; pageSize: number } }>(`${endpoints.baseurl}factory/loads`, config({ page, pageSize })));

export const sendFactoryLoad = (companyUserId: string, input: CargoListingInput) =>
  unwrap(axios.post<{ success: boolean; data: FactoryLoad }>(`${endpoints.baseurl}factory/loads`, { ...input, companyUserId }, config()));

export function importFactoryExcel(companyUserId: string, file: File, dryRun: boolean) {
  const form = new FormData();
  form.append('file', file);
  return unwrap(axios.post<{ success: boolean; data: FactoryExcelResult }>(`${endpoints.baseurl}factory/loads/excel`, form, { ...config({ companyUserId, dryRun }), timeout: 120000 }));
}

export async function downloadFactoryTemplate() {
  const { data } = await axios.get<Blob>(`${endpoints.baseurl}factory/loads/excel/template`, { ...config(), responseType: 'blob' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(data);
  link.download = 'cargo-template.xlsx';
  link.click();
  URL.revokeObjectURL(link.href);
}

export const getCompanyFactories = () => unwrap(axios.get<{ success: boolean; data: CompanyFactory[] }>(`${endpoints.baseurl}company/factories`, config()));

/** The company invites a factory by its number: the factory's account is made right away and joins the list. */
export const createFactoryInvite = (mobile: string, factoryName?: string) =>
  unwrap(axios.post<{ success: boolean; data: { token: string; mobile: string; factoryUserId: string; usedAt: string | null; name: string; messengers: MessengerInvites; sms: InviteSms } }>(
    `${endpoints.baseurl}company/factories`, { mobile, ...(factoryName && { factoryName }) }, config()));

export const removeFactory = (factoryUserId: string) =>
  unwrap(axios.delete<{ success: boolean; data: { factoryUserId: string } }>(`${endpoints.baseurl}company/factories/${factoryUserId}`, config()));

/** The invite SMS (transport_backend InviteSmsService): sent, or why the link must be sent by hand. */
export interface InviteSms {
  status: 'sent' | 'off' | 'notConfigured' | 'failed';
  count: number;
}

const fa = (value: number) => value.toLocaleString('fa-IR');

/** What to tell the company about the SMS; who: «راننده»، «کارخانه»، «شرکت». */
export function inviteSmsText(sms: InviteSms, who: string): string {
  if (sms.status === 'sent') return sms.count > 1 ? `پیامک دعوت برای ${fa(sms.count)} ${who} یک‌جا فرستاده شد.` : `پیامک دعوت برای ${who} فرستاده شد.`;
  const byHand = 'لینک دعوت را خودتان بفرستید.';
  if (sms.status === 'off') return `پیامک در سامانه فعلاً خاموش است؛ ${byHand}`;
  if (sms.status === 'notConfigured') return `پیامک دعوت تنظیم نشده است؛ ${byHand}`;
  return `ارسال پیامک انجام نشد؛ ${byHand}`;
}

/** The server's own Persian reason, or a general one. */
export function factoryError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'ارتباط با سرور برقرار نشد. اتصال را بررسی و دوباره تلاش کنید.';
    const message = (error.response.data as { message?: unknown } | undefined)?.message;
    if (typeof message === 'string' && /[؀-ۿ]/.test(message)) return message;
  }
  return 'درخواست انجام نشد. دوباره تلاش کنید.';
}
