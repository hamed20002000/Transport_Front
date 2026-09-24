import axios from 'axios';
import endpoints from 'src/core/config/endpoints.json';
import type { RegisterRequest } from '../types/register';

const base = `${endpoints.baseurl}${endpoints.login}register`;

export async function requestRegistrationOtp(payload: RegisterRequest) {
  const { data } = await axios.post<{
    success: boolean;
    data?: { phoneNumber?: string; expiresIn?: number; retryAfter?: number };
  }>(`${base}/request-otp`, payload, { timeout: 20000 });
  if (!data.success) throw new Error('ارسال کد انجام نشد. دوباره تلاش کنید.');
  return data.data;
}

export async function verifyRegistrationOtp(phoneNumber: string, code: string) {
  const { data } = await axios.post<{
    success: boolean;
    data?: { accessToken: string; refreshToken?: string };
  }>(`${base}/verify-otp`, { phoneNumber, code }, { timeout: 20000 });
  if (!data.success || !data.data?.accessToken) {
    throw new Error('تأیید شماره انجام نشد. دوباره تلاش کنید.');
  }
  return data.data;
}
