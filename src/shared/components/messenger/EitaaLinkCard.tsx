import { useEffect, useState } from 'react';
import axios from 'axios';
import { Copy, MessageCircle } from 'lucide-react';
import endpoints from 'src/core/config/endpoints.json';

// The profile's «اتصال ایتا» card. Eitaa's bot is an ordinary Eitaa account (transport_backend EitaaBotService), so it
// cannot ask for a verified number like the Telegram/Bale/Rubika «share number» button: the user, signed in here with
// their number and SMS code, takes a one-time code and sends it to that account.

interface Status {
  enabled: boolean;
  account: string | null;
  linked: boolean;
}

const authConfig = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
  timeout: 15000,
});
const unwrap = <T,>(data: T | { data?: T }): T => ((data as { data?: T }).data ?? data) as T;
const persianDigits = (value: string) =>
  value.replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);

/** an @username opens the chat in Eitaa; a number is only shown */
function accountLink(account: string): string | null {
  const username = account.match(/^@?([A-Za-z][A-Za-z0-9_]{3,})$/)?.[1];
  return username ? `https://eitaa.com/${username}` : null;
}

export default function EitaaLinkCard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [code, setCode] = useState<{ value: string; until: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    axios
      .get(`${endpoints.baseurl}messenger/eitaa`, authConfig())
      .then(({ data }) => setStatus(unwrap<Status>(data)))
      .catch(() => setStatus(null));
  }, []);

  useEffect(() => {
    if (!code) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [code]);

  if (!status?.enabled || !status.account) return null;

  const getCode = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const { data } = await axios.post(
        `${endpoints.baseurl}messenger/eitaa/link-code`,
        {},
        authConfig(),
      );
      const result = unwrap<{ code: string; expiresIn: number }>(data);
      setCode({ value: result.code, until: Date.now() + result.expiresIn * 1000 });
      setNow(Date.now());
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const secondsLeft = code ? Math.max(0, Math.round((code.until - now) / 1000)) : 0;
  const link = accountLink(status.account);

  return (
    <section
      aria-label="اتصال ایتا"
      className="tw-flex tw-items-start tw-gap-3 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-5 tw-shadow-sm"
    >
      <span className="tw-flex tw-h-9 tw-w-9 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-lg tw-bg-brand-sky tw-text-brand-navy">
        <MessageCircle size={18} aria-hidden />
      </span>
      <div className="tw-min-w-0 tw-flex-1 tw-space-y-2">
        <h3 className="tw-m-0 tw-text-base tw-font-bold">اتصال ایتا</h3>
        {status.linked ? (
          <p className="tw-m-0 tw-text-sm tw-leading-6 tw-text-brand-muted">
            ایتای شما به این حساب وصل است؛ اعلام بار و خبرها در ایتا هم می‌آید.
          </p>
        ) : (
          <p className="tw-m-0 tw-text-sm tw-leading-6 tw-text-brand-muted">
            اعلام بار، درخواست‌ها و منوی ترابوت را در ایتا هم داشته باشید: کد بگیرید و برای حساب
            ایتای ترابوت{' '}
            {link ? (
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                dir="ltr"
                className="tw-font-bold tw-text-brand-navy tw-underline"
              >
                {status.account}
              </a>
            ) : (
              <bdi dir="ltr" className="tw-font-bold">
                {status.account}
              </bdi>
            )}{' '}
            بفرستید.
          </p>
        )}
        {code && secondsLeft > 0 && (
          <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-3 tw-rounded-xl tw-bg-brand-sky tw-p-3">
            <bdi dir="ltr" className="tw-text-2xl tw-font-bold tw-tracking-widest tw-tabular-nums">
              {persianDigits(code.value)}
            </bdi>
            <button
              type="button"
              onClick={() => void navigator.clipboard?.writeText(code.value)}
              className="tw-inline-flex tw-items-center tw-gap-1 tw-rounded-lg tw-border tw-border-brand-line tw-bg-white tw-px-2.5 tw-py-1 tw-text-xs"
            >
              <Copy size={13} aria-hidden /> کپی
            </button>
            <span className="tw-text-xs tw-text-brand-muted">
              تا {persianDigits(String(Math.floor(secondsLeft / 60)))}:
              {persianDigits(String(secondsLeft % 60).padStart(2, '0'))} معتبر است؛ فقط یک بار کار
              می‌کند.
            </span>
          </div>
        )}
        {code && secondsLeft === 0 && (
          <p className="tw-m-0 tw-text-xs tw-text-red-700">وقت کد تمام شد؛ کد تازه بگیرید.</p>
        )}
        {failed && (
          <p className="tw-m-0 tw-text-xs tw-text-red-700">
            کد گرفته نشد. اتصال را بررسی کنید و دوباره امتحان کنید.
          </p>
        )}
        {!status.linked && (
          <button
            type="button"
            onClick={() => void getCode()}
            disabled={busy}
            className="tw-rounded-xl tw-border-0 tw-bg-brand-orange tw-px-4 tw-py-2 tw-text-sm tw-font-bold tw-text-white hover:tw-bg-brand-orange-dark disabled:tw-opacity-60"
          >
            {busy ? 'در حال گرفتن کد…' : code ? 'کد تازه' : 'گرفتن کد اتصال'}
          </button>
        )}
      </div>
    </section>
  );
}
