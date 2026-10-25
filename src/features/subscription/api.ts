import axios from 'axios';
import endpoints from 'src/core/config/endpoints.json';

// transport_backend SubscriptionController (api/subscription) and SubscriptionAccessService.
export type AccessReason = 'subscribed' | 'trial' | 'free' | 'required';
export type OrderStatus = 'WAITING_FOR_RECEIPT' | 'RECEIPT_SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface SubscriptionState {
  access: { allowed: boolean; reason: AccessReason; isDriver: boolean; trialEndsAt: string | null; expireAt: string | null };
  accountType: 'DRIVER' | 'COMPANY' | 'BROKER' | null;
  plans: { id: string; title: string; durationDays: number; price: string; currency: string }[];
  payment: { cardNumber: string; cardOwner: string };
  latestOrder: {
    id: string;
    status: OrderStatus;
    planTitle: string | null;
    amount: string;
    currency: string;
    createdAt: string;
    rejectionReason: string | null;
  } | null;
}

/** A purchase waiting for the admin: the page shows its state instead of the form. */
export const isUnderReview = (state: SubscriptionState) =>
  state.latestOrder?.status === 'RECEIPT_SUBMITTED' || state.latestOrder?.status === 'UNDER_REVIEW';

const url = `${endpoints.baseurl}subscription`;
const config = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }, timeout: 30000 });

async function unwrap<T>(request: Promise<{ data: { success: boolean; data: T } }>) {
  const { data } = await request;
  if (!data.success || !data.data) throw new Error('دریافت اطلاعات اشتراک انجام نشد.');
  return data.data;
}

export const getSubscription = () => unwrap(axios.get<{ success: boolean; data: SubscriptionState }>(url, config()));

/** Chooses the plan and sends the receipt photo together; the receipt goes to the admin's review queue. */
export function submitReceipt(planId: string, file: File) {
  const form = new FormData();
  form.append('planId', planId);
  form.append('file', file);
  return unwrap(axios.post<{ success: boolean; data: SubscriptionState }>(`${url}/orders`, form, config()));
}

/** The server's own Persian message (a pending receipt, a bad image, …) or a general one. */
export function subscriptionError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: unknown } | undefined)?.message;
    if (typeof message === 'string' && /[؀-ۿ]/.test(message)) return message;
    if (error.response?.status === 413) return 'حجم عکس رسید زیاد است (حداکثر ۸ مگابایت).';
  }
  return 'ارتباط با سرور برقرار نشد. دوباره تلاش کنید.';
}

// Any request answered 402 (SubscriptionGuard: the free period ran out while the panel was open) asks the
// panel to show the purchase page; DriverLayout listens.
export const SUBSCRIPTION_REQUIRED_EVENT = 'subscription-required';
let interceptorInstalled = false;
export function watchSubscriptionRequired() {
  if (interceptorInstalled) return;
  interceptorInstalled = true;
  axios.interceptors.response.use(undefined, (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 402) window.dispatchEvent(new Event(SUBSCRIPTION_REQUIRED_EVENT));
    return Promise.reject(error);
  });
}
