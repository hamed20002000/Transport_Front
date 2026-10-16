import axios from 'axios';
import endpoints from 'src/core/config/endpoints.json';
import type { SessionTokens } from 'src/core/auth/session';
import type { AccountType } from '../types/register';

const base = `${endpoints.baseurl}${endpoints.login}otp`;

type Envelope<T> = { success: boolean; data?: T };

export interface OtpSent {
  phoneNumber?: string;
  expiresIn?: number;
  retryAfter?: number;
}

/** Existing account → tokens; a number without an account → a token to choose the account type with. */
export type OtpVerified =
  | (SessionTokens & { registrationRequired?: false })
  | { registrationRequired: true; registrationToken: string; phoneNumber: string; expiresIn: number };

export async function requestOtp(phoneNumber: string) {
  const { data } = await axios.post<Envelope<OtpSent>>(`${base}/request`, { phoneNumber }, { timeout: 20000 });
  if (!data.success) throw new Error('ارسال کد انجام نشد. دوباره تلاش کنید.');
  return data.data;
}

export async function verifyOtp(phoneNumber: string, code: string) {
  const { data } = await axios.post<Envelope<OtpVerified>>(`${base}/verify`, { phoneNumber, code }, { timeout: 20000 });
  if (!data.success || !data.data) throw new Error('تأیید کد انجام نشد. دوباره تلاش کنید.');
  return data.data;
}

export async function completeRegistration(registrationToken: string, accountType: AccountType) {
  const { data } = await axios.post<Envelope<SessionTokens>>(
    `${base}/complete`,
    { registrationToken, accountType },
    { timeout: 20000 },
  );
  if (!data.success || !data.data?.accessToken) throw new Error('ساخت حساب انجام نشد. دوباره تلاش کنید.');
  return data.data;
}
