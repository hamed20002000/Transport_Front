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

// transport_backend AdminStatsController.usage: how drivers use the app and the messengers over the last `days`
export interface UsageStats {
  days: number;
  drivers: number;
  pwa: { installed: number; rate: number };
  push: { subscribed: number; rate: number };
  weeklyActive: { drivers: number; rate: number; byChannel: Record<string, number> };
  messengerToApp: { messengerDrivers: number; alsoApp: number; rate: number; linkOpens: Array<{ channel: string; opens: number; users: number }> };
  /** load requests by where they were made; unknown: before it was recorded */
  requestSource: Record<string, number>;
  engagement: Array<{ channel: string; delivered: number; interacted: number; rate: number }>;
}

export const getUsageStats = (days: number) =>
  unwrap(axios.get<{ success: boolean; data: UsageStats }>(`${base}stats/usage`, { ...config(), params: { days } }));

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

// transport_backend admin/company-features: the parent company, the prices of the company panel's menus and the
// receipts non-parent companies send to buy them.
export type CompanyFeature = 'SUGGESTIONS' | 'CREATE_LOAD' | 'PUBLISHED_LOADS' | 'DRIVER_REQUESTS' | 'TRIPS' | 'DRIVERS' | 'CHANNELS' | 'AGENT' | 'FACTORIES';
export const companyFeatureTitles: Record<CompanyFeature, string> = {
  SUGGESTIONS: 'پیشنهادها',
  CREATE_LOAD: 'ثبت بار',
  PUBLISHED_LOADS: 'بارهای منتشرشده',
  DRIVER_REQUESTS: 'درخواست‌ها',
  TRIPS: 'سفرها',
  DRIVERS: 'رانندگان',
  CHANNELS: 'کانال‌ها',
  AGENT: 'دستیار هوشمند',
  FACTORIES: 'کارخانه‌ها',
};

export interface AdminCompany {
  userId: string;
  name: string | null;
  mobile: string | null;
  accountCode: string | null;
  isParentCompany: boolean;
}

export interface CompanyFeaturePlan {
  id: string;
  feature: CompanyFeature;
  title: string;
  durationDays: number;
  price: string;
  currency: string;
  sortOrder: number;
}

export type CompanyTier = 'BRONZE' | 'SILVER' | 'GOLD';

export type TierMonths = 1 | 3 | 6 | 12;

/** برنزی، نقره‌ای، طلایی: the menus each opens and the price of each period (1, 3, 6, 12 months); sold only while active */
export interface CompanyTierPlan {
  tier: CompanyTier;
  title: string;
  features: Array<{ feature: CompanyFeature; title: string }>;
  options: Array<{ months: TierMonths; durationDays: number; title: string; price: string }>;
  currency: string;
  active: boolean;
}

export interface CompanyFeatureOrder {
  id: string;
  userId: string;
  company: string | null;
  mobile: string | null;
  accountCode: string | null;
  /** the menu bought; null for a tier */
  feature: CompanyFeature | null;
  tier: CompanyTier | null;
  /** a tier's menus as they were when bought */
  features: CompanyFeature[] | null;
  title: string;
  durationDays: number;
  amount: string;
  currency: string;
  status: 'RECEIPT_SUBMITTED' | 'APPROVED' | 'REJECTED';
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

const features = `${base}company-features`;

export const listCompanies = () => unwrap(axios.get<{ success: boolean; data: AdminCompany[] }>(`${features}/companies`, config()));

export const setParentCompany = (userId: string, isParent: boolean) =>
  unwrap(axios.patch<{ success: boolean; data: { userId: string; isParentCompany: boolean } }>(`${features}/companies/${userId}/parent`, { isParent }, config()));

/** Opens a menu for a company without a purchase (a gift or a make-good), after any time it already has. */
export const grantCompanyFeature = (userId: string, feature: CompanyFeature, days: number) =>
  unwrap(axios.post<{ success: boolean; data: { expireAt: string } }>(`${features}/companies/${userId}/grants`, { feature, days }, config()));

export const listCompanyTiers = () => unwrap(axios.get<{ success: boolean; data: CompanyTierPlan[] }>(`${features}/tiers`, config()));

export const updateCompanyTier = (
  tier: CompanyTier,
  plan: { features: CompanyFeature[]; options: Array<{ months: TierMonths; price: string }>; currency: string; active: boolean },
) =>
  unwrap(axios.put<{ success: boolean; data: CompanyTierPlan }>(`${features}/tiers/${tier}`, plan, config()));

export const listFeaturePlans = () => unwrap(axios.get<{ success: boolean; data: CompanyFeaturePlan[] }>(`${features}/plans`, config()));

export const createFeaturePlan = (plan: Omit<CompanyFeaturePlan, 'id'>) =>
  unwrap(axios.post<{ success: boolean; data: CompanyFeaturePlan }>(`${features}/plans`, plan, config()));

export const deleteFeaturePlan = (id: string) => unwrap(axios.delete<{ success: boolean; data: { id: string } }>(`${features}/plans/${id}`, config()));

export const listFeatureOrders = (status?: 'APPROVED' | 'REJECTED') =>
  unwrap(axios.get<{ success: boolean; data: CompanyFeatureOrder[] }>(`${features}/orders`, { ...config(), params: status ? { status } : undefined }));

/** The receipt photo, opened with the same receipts password as the subscription receipts. */
export async function featureReceiptImage(orderId: string, token: string): Promise<string> {
  const request = config();
  const { data } = await axios.get<Blob>(`${features}/orders/${orderId}/receipt`, {
    ...request,
    headers: { ...request.headers, 'X-Receipt-Token': token },
    responseType: 'blob',
  });
  return URL.createObjectURL(data);
}

export const approveFeatureOrder = (orderId: string) =>
  unwrap(axios.post<{ success: boolean; data: { expireAt: string } }>(`${features}/orders/${orderId}/approve`, {}, config()));

export const rejectFeatureOrder = (orderId: string, reason: string) =>
  unwrap(axios.post<{ success: boolean; data: { orderId: string } }>(`${features}/orders/${orderId}/reject`, { reason }, config()));

// transport_backend admin/broker-access: the broker's (واسط) rules — how many companies it may pick, and the packages
// of load requests it buys — and the receipts brokers send.
export interface BrokerAccessPolicy {
  /** the companies a broker may pick; null: every company's loads */
  maxCompanies: number | null;
  /** off: load requests are free */
  packagesEnabled: boolean;
  /** load requests in one package */
  packageSize: number;
  packagePrice: string;
  currency: string;
}

export interface BrokerAccessOrder {
  id: string;
  userId: string;
  broker: string | null;
  mobile: string | null;
  accountCode: string | null;
  /** PACKAGE: load requests; NEW and ADD: older purchases of companies */
  kind: 'NEW' | 'ADD' | 'PACKAGE' | 'SUGGESTION';
  /** «بسته‌ی ۱۰۰ درخواست بار» */
  title: string;
  companies: { userId: string; name: string }[];
  requests: number | null;
  amount: string;
  currency: string;
  status: 'RECEIPT_SUBMITTED' | 'APPROVED' | 'REJECTED';
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

const brokerAccess = `${base}broker-access`;

export const getBrokerPolicy = () => unwrap(axios.get<{ success: boolean; data: BrokerAccessPolicy }>(`${brokerAccess}/policy`, config()));

export const saveBrokerPolicy = (policy: BrokerAccessPolicy) =>
  unwrap(axios.put<{ success: boolean; data: BrokerAccessPolicy }>(`${brokerAccess}/policy`, policy, config()));

export const listBrokerOrders = (status?: 'APPROVED' | 'REJECTED') =>
  unwrap(axios.get<{ success: boolean; data: BrokerAccessOrder[] }>(`${brokerAccess}/orders`, { ...config(), params: status ? { status } : undefined }));

/** The receipt photo, opened with the same receipts password as the subscription receipts. */
export async function brokerReceiptImage(orderId: string, token: string): Promise<string> {
  const request = config();
  const { data } = await axios.get<Blob>(`${brokerAccess}/orders/${orderId}/receipt`, {
    ...request,
    headers: { ...request.headers, 'X-Receipt-Token': token },
    responseType: 'blob',
  });
  return URL.createObjectURL(data);
}

export const approveBrokerOrder = (orderId: string) =>
  unwrap(axios.post<{ success: boolean; data: { remaining: number } }>(`${brokerAccess}/orders/${orderId}/approve`, {}, config()));

export const rejectBrokerOrder = (orderId: string, reason: string) =>
  unwrap(axios.post<{ success: boolean; data: { orderId: string } }>(`${brokerAccess}/orders/${orderId}/reject`, { reason }, config()));

export interface AdminBroker {
  userId: string;
  name: string | null;
  mobile: string | null;
  accountCode: string | null;
  /** companies picked */
  companies: number;
  /** load requests left */
  remaining: number;
}

export const listBrokers = () => unwrap(axios.get<{ success: boolean; data: AdminBroker[] }>(`${brokerAccess}/brokers`, config()));

/** Load requests given to a broker without a purchase (a gift or a make-good). */
export const grantBrokerRequests = (userId: string, requests: number) =>
  unwrap(axios.post<{ success: boolean; data: { remaining: number } }>(`${brokerAccess}/brokers/${userId}/requests`, { requests }, config()));
