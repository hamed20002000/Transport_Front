import axios from 'axios';
import type { Currency } from './currencies';
import endpoints from 'src/core/config/endpoints.json';

export interface PlanInput {
  title: string;
  accountType: 'DRIVER' | 'COMPANY' | 'BROKER';
  durationDays: number;
  price: string;
  currency: Currency;
  recordStatus: number;
  sortOrder: number;
}
export interface Plan extends PlanInput {
  id: string;
}
const url = `${endpoints.baseurl}admin/subscription-plans`;
const config = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
  timeout: 20000,
});
export async function listPlans() {
  const { data } = await axios.get<{ success: boolean; data: Plan[] }>(url, config());
  if (!data.success || !Array.isArray(data.data)) throw new Error('دریافت پلن‌ها انجام نشد.');
  return data.data;
}
export async function createPlan(input: PlanInput) {
  const { data } = await axios.post<{ success: boolean; data: Plan }>(url, input, config());
  if (!data.success || !data.data?.id) throw new Error('ثبت پلن انجام نشد.');
  return data.data;
}
