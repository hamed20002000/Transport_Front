import axios from 'axios';
import endpoints from 'src/core/config/endpoints.json';

// transport_backend admin/subscription-orders (SubscriptionOrder with its PaymentReceipts) and admin/subscription-policy.
export type OrderStatus = 'WAITING_FOR_RECEIPT' | 'RECEIPT_SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type ReceiptStatus = 'PENDING_ANALYSIS' | 'ANALYZING' | 'ANALYZED' | 'NEEDS_REVIEW' | 'APPROVED' | 'REJECTED';

export interface Receipt {
  id: string;
  status: ReceiptStatus;
  createdAt: string;
  // read from the image by the receipt analyzer; empty until it has run
  extractedAmount?: string | null;
  trackingCode?: string | null;
  transactionDate?: string | null;
  transactionTime?: string | null;
  sourceCard?: string | null;
  destinationCard?: string | null;
  destinationName?: string | null;
  aiConfidence?: number | null;
  amountMatched?: boolean | null;
  destinationCardMatched?: boolean | null;
  destinationNameMatched?: boolean | null;
  duplicateTrackingCode?: boolean | null;
  reviewNote?: string | null;
}

export interface Order {
  id: string;
  provider: 'TELEGRAM' | 'WHATSAPP' | 'WEB' | 'BALE' | 'RUBIKA';
  phoneNumber: string;
  accountType: 'DRIVER' | 'COMPANY' | 'BROKER';
  amount: string;
  currency: string;
  status: OrderStatus;
  createdAt: string;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  subscriptionPlan?: { title: string; durationDays: number } | null;
  receipts: Receipt[];
}

export interface Policy {
  enforced: boolean;
  freeUntil: string | null;
  required: boolean;
  driversEnforced: boolean;
  driverTrialDays: number;
  driverTrialStartedAt: string;
  /** purchase rewards: once a driver's approved purchases reach minTomans, freeDays free days (once per tier) */
  driverRewards: { minTomans: number; freeDays: number }[];
}

const base = `${endpoints.baseurl}admin/`;
const config = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }, timeout: 20000 });

async function unwrap<T>(request: Promise<{ data: { success: boolean; data: T } }>) {
  const { data } = await request;
  if (!data.success || data.data === undefined) throw new Error('درخواست انجام نشد.');
  return data.data;
}

/** Waiting for a decision (default), or the approved / rejected history. */
export const listOrders = (status?: 'APPROVED' | 'REJECTED') =>
  unwrap(axios.get<{ success: boolean; data: Order[] }>(`${base}subscription-orders`, { ...config(), params: status ? { status } : undefined }));

/** The receipts password (ReceiptAccessService): a token that shows the photos to this admin for a short while. */
export interface ReceiptUnlock {
  token: string;
  expiresAt: string;
}

export const unlockReceipts = (password: string) =>
  unwrap(axios.post<{ success: boolean; data: ReceiptUnlock }>(`${base}subscription-orders/receipts/unlock`, { password }, config()));

/**
 * The receipt photo as an object URL: the endpoint wants the admin's login and the receipts token, so an
 * <img src> cannot fetch it. Kept only in memory; never written to the browser's storage.
 */
export async function receiptImage(orderId: string, receiptId: string, token: string): Promise<string> {
  const request = config();
  const { data } = await axios.get<Blob>(`${base}subscription-orders/${orderId}/receipts/${receiptId}/image`, {
    ...request,
    headers: { ...request.headers, 'X-Receipt-Token': token },
    responseType: 'blob',
  });
  return URL.createObjectURL(data);
}

export const approveReceipt = (orderId: string, receiptId: string) =>
  unwrap(axios.post<{ success: boolean; data: { expireAt: string; notified: boolean; rewardDays: number } }>(`${base}subscription-orders/${orderId}/receipts/${receiptId}/approve`, {}, config()));

export const rejectReceipt = (orderId: string, receiptId: string, reason: string) =>
  unwrap(axios.post<{ success: boolean; data: { notified: boolean } }>(`${base}subscription-orders/${orderId}/receipts/${receiptId}/reject`, { reason }, config()));

export const getPolicy = () => unwrap(axios.get<{ success: boolean; data: Policy }>(`${base}subscription-policy`, config()));

export const updatePolicy = (policy: Pick<Policy, 'enforced' | 'freeUntil' | 'driversEnforced' | 'driverTrialDays' | 'driverRewards'>) =>
  unwrap(axios.put<{ success: boolean; data: Policy }>(`${base}subscription-policy`, policy, config()));

/** transport_backend admin/stats: amounts are in rials (tomans converted); other currencies are listed apart. */
export interface AdminStats {
  users: {
    drivers: { total: number; subscribed: number; inTrial: number; mustSubscribe: number; newThisMonth: number };
    companies: { total: number; subscribed: number; newThisMonth: number };
  };
  revenue: { periods: { days: number; rials: string; payments: number }[]; total: { rials: string; payments: number } };
  otherCurrencies: { currency: string; amount: string; payments: number }[];
  pendingReceipts: number;
  topDrivers: { userId: string; name: string | null; mobile: string | null; rials: string; payments: number; lastPaidAt: string }[];
  /** loads by trip type; freight is that of the loads a driver took (tomans, other currencies apart) */
  loads: { periods: { days: number; byType: Record<TripTypeKey, LoadTotals> }[]; total: Record<TripTypeKey, LoadTotals> };
  generatedAt: string;
}

export type TripTypeKey = 'DOMESTIC' | 'EXPORT' | 'IMPORT' | 'UNKNOWN';
export interface LoadTotals {
  loads: number;
  taken: number;
  freightTomans: number;
  freightOther: Record<string, number>;
  takenUnpriced: number;
}

export const getAdminStats = () => unwrap(axios.get<{ success: boolean; data: AdminStats }>(`${base}stats`, config()));

export function adminError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const message = (error.response?.data as { message?: unknown } | undefined)?.message;
    // the server's own Persian reason (wrong receipts password, too many tries, …)
    if (typeof message === 'string' && /[\u0600-\u06FF]/.test(message)) return message;
    if (status === 403) return 'این کار فقط برای مدیر سیستم مجاز است.';
    if (status === 409) return 'این رسید قبلاً بررسی شده یا کد پیگیری‌اش تکراری است.';
    if (typeof message === 'string' && message) return message;
  }
  return 'ارتباط با سرور برقرار نشد. دوباره تلاش کنید.';
}
