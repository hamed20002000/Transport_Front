import axios from 'axios';
import { useEffect, useSyncExternalStore } from 'react';
import endpoints from 'src/core/config/endpoints.json';

// transport_backend CompanyFeatureController (api/company/features) and CompanyFeatureGuard.
export type CompanyFeature = 'SUGGESTIONS' | 'CREATE_LOAD' | 'PUBLISHED_LOADS' | 'DRIVER_REQUESTS' | 'TRIPS' | 'DRIVERS' | 'CHANNELS' | 'AGENT' | 'FACTORIES';
export type FeatureOrderStatus = 'RECEIPT_SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface FeaturePlan {
  id: string;
  title: string;
  durationDays: number;
  price: string;
  currency: string;
}

export interface FeatureState {
  feature: CompanyFeature;
  title: string;
  /** has an active plan; otherwise free for every company */
  paid: boolean;
  /** closed now: must be bought */
  locked: boolean;
  expireAt: string | null;
  plans: FeaturePlan[];
}

export interface FeatureOrder {
  id: string;
  feature: CompanyFeature;
  title: string;
  durationDays: number;
  amount: string;
  currency: string;
  status: FeatureOrderStatus;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

export interface CompanyFeatures {
  /** the parent company: every menu, nothing to buy */
  isParent: boolean;
  /** signed up with the parent company's invite link: every menu locked until bought, priced or not */
  invited: boolean;
  /** a company that signed up on its own and is not checked by a parent company yet: only its profile works */
  verified: boolean;
  features: FeatureState[];
  orders: FeatureOrder[];
  payment: { cardNumber: string; cardOwner: string };
}

/** The company panel page each paid menu guards (the server answers its endpoints 402 while it is locked). */
export const featureByPath: Record<string, CompanyFeature> = {
  '/account/company/cargo': 'SUGGESTIONS',
  '/account/company/cargo/new': 'CREATE_LOAD',
  '/account/company/published': 'PUBLISHED_LOADS',
  '/account/company/requests': 'DRIVER_REQUESTS',
  '/account/company/trips': 'TRIPS',
  '/account/company/drivers': 'DRIVERS',
  '/account/company/channels': 'CHANNELS',
  '/account/company/factories': 'FACTORIES',
};

export const COMPANY_FEATURES_PATH = '/account/company/features';

const url = `${endpoints.baseurl}company/features`;
const config = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }, timeout: 30000 });

async function unwrap<T>(request: Promise<{ data: { success: boolean; data: T } }>) {
  const { data } = await request;
  if (!data.success || !data.data) throw new Error('دریافت اطلاعات امکانات انجام نشد.');
  return data.data;
}

export const getCompanyFeatures = () => unwrap(axios.get<{ success: boolean; data: CompanyFeatures }>(url, config()));

/** Chooses a menu's plan and sends the receipt photo together; the admin reviews it. */
export function submitFeatureReceipt(planId: string, file: File) {
  const form = new FormData();
  form.append('planId', planId);
  form.append('file', file);
  return unwrap(axios.post<{ success: boolean; data: CompanyFeatures }>(`${url}/orders`, form, config()));
}

/** The 402 of a menu the company has not bought (CompanyFeatureGuard), apart from the subscription's 402. */
export const COMPANY_FEATURE_REQUIRED_CODE = 'COMPANY_FEATURE_REQUIRED';
export const isFeatureRequired = (error: unknown) =>
  axios.isAxiosError(error) && error.response?.status === 402 && (error.response.data as { code?: string } | undefined)?.code === COMPANY_FEATURE_REQUIRED_CODE;

// One copy of the company's menus for the whole panel: the menu shows the locks, a locked page shows the purchase
// card, and a 402 met anywhere (bought time ran out while the panel was open) refreshes it.
let current: CompanyFeatures | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export function setCompanyFeatures(next: CompanyFeatures) {
  current = next;
  emit();
}

export function reloadCompanyFeatures(): Promise<void> {
  loading ??= getCompanyFeatures()
    .then(setCompanyFeatures)
    // unknown (offline, server down): nothing is shown locked; the server still refuses with 402
    .catch(() => undefined)
    .finally(() => {
      loading = null;
    });
  return loading;
}

let interceptorInstalled = false;
function watchFeatureRequired() {
  if (interceptorInstalled) return;
  interceptorInstalled = true;
  axios.interceptors.response.use(undefined, (error) => {
    if (isFeatureRequired(error)) void reloadCompanyFeatures();
    return Promise.reject(error);
  });
}

/** The company's menus, loaded once for the panel; null until known. */
export function useCompanyFeatures(): CompanyFeatures | null {
  useEffect(() => {
    watchFeatureRequired();
    if (!current) void reloadCompanyFeatures();
  }, []);
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
  );
}

export const lockedFeature = (state: CompanyFeatures | null, feature: CompanyFeature | undefined) =>
  !!feature && !!state?.features.find((item) => item.feature === feature)?.locked;
