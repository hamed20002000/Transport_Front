import { useFormError } from './useFormError';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth, decodeJwtToken } from 'src/core/auth/AuthContext';
import { saveRegistrationSession } from 'src/core/auth/registrationSession';
import { accountHome } from 'src/features/account';
import { requestRegistrationOtp, verifyRegistrationOtp } from '../api/register';
import { AccountType } from '../types/register';

function latinDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
}

export function useRegister() {
  const [loading, setLoading] = useState(false);
  const { error, setError, clearError } = useFormError();
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [deadline, setDeadline] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const identity = useRef({ username: '', accountType: AccountType.Driver });
  const navigate = useNavigate();
  const { search } = useLocation();
  const pending = useRef(false);
  const { loadAuthData } = useAuth();

  useEffect(() => {
    if (step !== 'otp') return;
    const update = () => setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [deadline, step]);

  function editDetails() {
    if (pending.current) return;
    clearError();
    setCode('');
    setStep('details');
  }

  function reportError(error: unknown, verifying: boolean) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      setError(
        status === 409
          ? 'نام کاربری یا شماره موبایل قبلاً ثبت شده است.'
          : status === 429
            ? 'تعداد تلاش‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.'
            : status === 410
              ? 'کد تأیید منقضی شده است. کد جدید درخواست کنید.'
              : status === 400 || status === 401 || status === 422
                ? verifying
                  ? 'کد تأیید نامعتبر یا منقضی شده است.'
                  : 'اطلاعات ثبت‌نام یا شماره موبایل معتبر نیست.'
                : 'ارتباط با سرور برقرار نشد. دوباره تلاش کنید.',
      );
    } else setError(error instanceof Error ? error.message : 'عملیات انجام نشد.');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    clearError();
    const form = event.currentTarget;
    if (step === 'otp') {
      const normalizedCode = latinDigits(code).trim();
      if (!/^\d+$/.test(normalizedCode)) {
        setError('کد تأیید پیامک‌شده را وارد کنید.');
        return;
      }
      if (Date.now() >= deadline) {
        setError('کد تأیید منقضی شده است. کد جدید درخواست کنید.');
        return;
      }
      pending.current = true;
      setLoading(true);
      let verified = false;
      try {
        const tokens = await verifyRegistrationOtp(phoneNumber, normalizedCode);
        verified = true;
        saveRegistrationSession(tokens);
        localStorage.removeItem('activeUserRoleName');
        localStorage.removeItem('activeUserRoleId');
        localStorage.removeItem('transport.rememberedUsername');
        await loadAuthData();
        if (!localStorage.getItem('authToken')) throw new Error('ورود خودکار انجام نشد.');
        const tokenIdentity = decodeJwtToken(tokens.accessToken);
        const home = tokenIdentity?.roles?.map((role) => accountHome(role)).find(Boolean);
        navigate(home || accountHome(identity.current.accountType) || '/dashboards/dashboard', {
          replace: true,
        });
      } catch (error) {
        if (verified) {
          navigate(`/auth/login${search}`, {
            replace: true,
            state: {
              registrationLoginFailed: true,
              registrationUsername: identity.current.username,
            },
          });
        } else reportError(error, true);
      } finally {
        pending.current = false;
        setLoading(false);
      }
      return;
    }

    const values = new FormData(form);
    const username = String(values.get('username') || '').trim();
    const password = String(values.get('password') || '');
    const accountType = String(values.get('accountType') || '') as AccountType;
    const phone = latinDigits(String(values.get('phoneNumber') || ''))
      .trim()
      .replace(/[\s()-]/g, '');
    if (!Object.values(AccountType).includes(accountType)) {
      setError('نوع حساب را انتخاب کنید.');
      return;
    }
    if (!username || Array.from(username).length > 100) {
      setError('نام کاربری باید بین ۱ تا ۱۰۰ کاراکتر باشد.');
      return;
    }
    if (!/^\+?\d{10,15}$/.test(phone)) {
      setError('شماره موبایل معتبر وارد کنید؛ برای مثال 09121234567.');
      return;
    }
    if (Array.from(password).length < 8 || new TextEncoder().encode(password).length > 72) {
      setError('رمز عبور باید حداقل ۸ کاراکتر و حداکثر ۷۲ بایت باشد.');
      return;
    }
    if (password !== values.get('confirmPassword')) {
      setError('رمز عبور و تکرار آن یکسان نیستند.');
      return;
    }
    pending.current = true;
    setLoading(true);
    try {
      const result = await requestRegistrationOtp({
        username,
        password,
        phoneNumber: phone,
        accountType,
      });
      identity.current = { username, accountType };
      setPhoneNumber(result?.phoneNumber || phone);
      const ttl =
        typeof result?.expiresIn === 'number' && result.expiresIn > 0 ? result.expiresIn : 120;
      setDeadline(Date.now() + ttl * 1000);
      setRemaining(ttl);
      setCode('');
      for (const name of ['password', 'confirmPassword']) {
        const input = form.elements.namedItem(name);
        if (input instanceof HTMLInputElement) input.value = '';
      }
      setStep('otp');
    } catch (error) {
      reportError(error, false);
    } finally {
      pending.current = false;
      setLoading(false);
    }
  }

  return {
    submit,
    loading,
    error,
    clearError,
    step,
    phoneNumber,
    code,
    setCode,
    remaining,
    editDetails,
  };
}
