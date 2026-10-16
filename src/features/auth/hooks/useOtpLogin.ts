import { useEffect, useRef, useState, type FormEvent } from 'react';
import axios from 'axios';
import { hasStoredSession } from 'src/core/auth/session';
import { completeRegistration, requestOtp, verifyOtp } from '../api/otp';
import type { AccountType } from '../types/register';
import { useEnterSession } from './useEnterSession';
import { useFormError } from './useFormError';

export type OtpStep = 'phone' | 'code' | 'accountType';

const rememberedPhoneKey = 'transport.rememberedPhone';

function latinDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
}

export function normalizePhone(value: string) {
  return latinDigits(value)
    .trim()
    .replace(/[\s()-]/g, '')
    .replace(/^(?:\+98|0098|98)(?=9)/, '0');
}

const remember = (key: string, value?: string) => {
  try {
    if (value) localStorage.setItem(key, value);
    else return localStorage.getItem(key) ?? '';
  } catch {
    // Private mode: nothing to remember.
  }
  return '';
};

/**
 * One flow for signing in and signing up: mobile number → SMS code → (new number only) account type.
 * The tokens are kept, so the next visit opens the account without a code.
 */
export function useOtpLogin() {
  const [step, setStep] = useState<OtpStep>('phone');
  const [phone, setPhone] = useState(() => remember(rememberedPhoneKey));
  const [sentTo, setSentTo] = useState('');
  const [code, setCode] = useState('');
  const [deadline, setDeadline] = useState(0);
  const [retryDeadline, setRetryDeadline] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [retryRemaining, setRetryRemaining] = useState(0);
  const [registrationToken, setRegistrationToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [resuming, setResuming] = useState(hasStoredSession);
  const { error, setError, clearError } = useFormError();
  const pending = useRef(false);
  const { enter, resume } = useEnterSession();

  // Automatic sign-in with the stored refresh token.
  useEffect(() => {
    if (!hasStoredSession()) return;
    let active = true;
    resume()
      .catch(() => false)
      .finally(() => active && setResuming(false));
    return () => {
      active = false;
    };
  }, [resume]);

  useEffect(() => {
    const update = () => {
      setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
      setRetryRemaining(Math.max(0, Math.ceil((retryDeadline - Date.now()) / 1000)));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [deadline, retryDeadline]);

  function reportError(error: unknown) {
    if (!axios.isAxiosError(error)) {
      setError(error instanceof Error ? error.message : 'عملیات انجام نشد. دوباره تلاش کنید.');
      return;
    }
    if (!error.response) {
      setError('ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی و دوباره تلاش کنید.');
      return;
    }
    const { status } = error.response;
    const raw = (error.response.data as { message?: unknown } | undefined)?.message;
    const detail = (Array.isArray(raw) ? raw.join(' ') : typeof raw === 'string' ? raw : '').toLowerCase();
    if (status === 429) {
      setError(
        step === 'code'
          ? 'تعداد تلاش‌ها بیش از حد مجاز است. کد جدید درخواست کنید.'
          : 'برای ارسال دوباره‌ی کد کمی صبر کنید.',
      );
    } else if (status === 409) setError('درخواست دیگری برای این شماره در جریان است. چند لحظه بعد تلاش کنید.');
    else if (detail.includes('inactive')) setError('حساب این شماره غیرفعال است. با پشتیبانی تماس بگیرید.');
    else if (detail.includes('expired')) {
      setError(step === 'accountType' ? 'مهلت ثبت‌نام تمام شد؛ شماره را دوباره تأیید کنید.' : 'کد منقضی شده است. کد جدید بگیرید.');
      if (step === 'accountType') backToPhone();
    } else if (step === 'code' && (status === 400 || status === 401)) setError('کد واردشده درست نیست.');
    else if (step === 'phone' && status === 400) setError('شماره موبایل معتبر نیست؛ مثلاً 09121234567.');
    else setError(`خطای سرور (${status}). دوباره تلاش کنید.`);
  }

  async function run(action: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true;
    setLoading(true);
    clearError();
    try {
      await action();
    } catch (error) {
      reportError(error);
    } finally {
      pending.current = false;
      setLoading(false);
    }
  }

  const sendCode = () =>
    run(async () => {
      const normalized = normalizePhone(phone);
      if (!/^09\d{9}$/.test(normalized)) {
        setError('شماره موبایل معتبر وارد کنید؛ مثلاً 09121234567.');
        return;
      }
      if (normalized === sentTo && Date.now() < retryDeadline) {
        setStep('code');
        return;
      }
      const sent = await requestOtp(normalized);
      const ttl = sent?.expiresIn && sent.expiresIn > 0 ? sent.expiresIn : 300;
      const retryAfter = sent?.retryAfter && sent.retryAfter >= 0 ? sent.retryAfter : 60;
      setSentTo(sent?.phoneNumber || normalized);
      setDeadline(Date.now() + ttl * 1000);
      setRetryDeadline(Date.now() + retryAfter * 1000);
      setCode('');
      setStep('code');
    });

  const checkCode = () =>
    run(async () => {
      const normalized = latinDigits(code).trim();
      if (!/^\d{4,10}$/.test(normalized)) {
        setError('کد پیامک‌شده را وارد کنید.');
        return;
      }
      if (Date.now() >= deadline) {
        setError('کد منقضی شده است. کد جدید بگیرید.');
        return;
      }
      const result = await verifyOtp(sentTo, normalized);
      remember(rememberedPhoneKey, sentTo);
      if (result.registrationRequired) {
        setRegistrationToken(result.registrationToken);
        setStep('accountType');
        return;
      }
      await enter(result);
    });

  const chooseAccountType = (accountType: AccountType) =>
    run(async () => {
      await enter(await completeRegistration(registrationToken, accountType));
    });

  function backToPhone() {
    if (pending.current) return;
    clearError();
    setCode('');
    setRegistrationToken('');
    setStep('phone');
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === 'phone') void sendCode();
    else if (step === 'code') void checkCode();
  }

  return {
    step,
    phone,
    setPhone,
    sentTo,
    code,
    setCode,
    remaining,
    retryRemaining,
    loading,
    resuming,
    error,
    clearError,
    submit,
    resend: sendCode,
    chooseAccountType,
    backToPhone,
  };
}
