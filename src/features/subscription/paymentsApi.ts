import axios from 'axios';
import endpoints from 'src/core/config/endpoints.json';

// transport_backend PaymentsController (api/account/payments): everything the account paid for, newest first —
// a subscription, a company's menu, a broker's companies' loads.

export type PaymentKind = 'SUBSCRIPTION' | 'FEATURE' | 'BROKER';
export type PaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Payment {
  id: string;
  kind: PaymentKind;
  title: string;
  detail: string | null;
  amount: string;
  currency: string;
  status: PaymentStatus;
  durationDays: number | null;
  createdAt: string;
  decidedAt: string | null;
  rejectionReason: string | null;
}

const config = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }, timeout: 30000 });

export async function getPayments(): Promise<Payment[]> {
  const { data } = await axios.get<{ success: boolean; data: Payment[] }>(`${endpoints.baseurl}account/payments`, config());
  if (!data.success || !Array.isArray(data.data)) throw new Error('دریافت پرداخت‌ها انجام نشد.');
  return data.data;
}
