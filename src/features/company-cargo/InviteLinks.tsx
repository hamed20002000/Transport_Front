import { useState } from 'react';
import { Check, Copy, ExternalLink, LoaderCircle, MessageCircle, RefreshCw, Share2 } from 'lucide-react';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { useMessageBox } from 'src/shared/components/message-box/MessageBoxProvider';
import type { MessengerInvites } from 'src/features/factory/api';
import { displayName, useProfile } from './profileStore';

const outlineButton =
  'tw-inline-flex tw-h-10 tw-items-center tw-gap-1.5 tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-3 tw-text-sm tw-font-bold hover:tw-bg-brand-sky';

/**
 * An invite link (web) and its code and links for the bots and WhatsApp, with copy, share and «لینک تازه». Used for
 * a company inviting factories (/invite/…, inv_…) and the parent company inviting transport companies (/join/…, cmp_…).
 * who: whom the link is for, as the texts name them («کارخانه»، «شرکت»). note / messengerNote replace the texts of a
 * shared link (a personal invite works for one number); «ارسال» sends the invite SMS's text; without onRenew there is no «لینک تازه».
 */
export default function InviteLinks({
  link,
  messengers,
  who,
  onRenew,
  note = 'این لینک را بفرستید؛ یک لینک برای همه کار می‌کند.',
  messengerNote,
}: {
  link: string;
  messengers: MessengerInvites;
  who: string;
  onRenew?: () => Promise<void>;
  note?: string;
  messengerNote?: string;
}) {
  const toast = useToast();
  // the inviting company is the one logged in (the server names it the same way in the SMS)
  const inviter = displayName(useProfile()) || 'شرکت حمل‌ونقل';
  const messageBox = useMessageBox();
  const [copied, setCopied] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const messengerLinks = [
    { name: 'تلگرام', url: messengers.telegram, hint: 'ربات با کد دعوت باز می‌شود' },
    { name: 'بله', url: messengers.bale, hint: 'ربات با کد دعوت باز می‌شود' },
    { name: 'ایتا', url: messengers.eitaa, hint: `${who} کد دعوت را در ایتا بفرستد` },
    { name: 'روبیکا', url: messengers.rubika, hint: `${who} کد دعوت را در ربات بفرستد` },
    { name: 'واتساپ', url: messengers.whatsapp, hint: 'کد دعوت آماده‌ی ارسال است' },
  ].filter((item): item is { name: string; url: string; hint: string } => !!item.url);

  async function copyText(text: string, done: () => void) {
    try {
      await navigator.clipboard.writeText(text);
      done();
    } catch {
      toast.error('کپی انجام نشد؛ متن را انتخاب و کپی کنید.');
    }
  }

  // the same text as the invite SMS (transport_backend inviteText): only the web link; it opens sign-in, which shows
  // this invite's messenger links
  const fullText = `لینک دعوت «${inviter}»:\n${link}`;

  async function share() {
    try {
      await navigator.share({ title: 'دعوت', text: fullText });
    } catch {
      // closed by the user, or sharing is not available: the copy button stays
    }
  }

  async function renew() {
    if (!onRenew) return;
    const confirmed = await messageBox.confirm({
      title: 'لینک دعوت تازه',
      message: `لینک و کد فعلی باطل می‌شوند و دیگر کسی با آن‌ها عضو نمی‌شود. ${who}‌هایی که تا حالا عضو شده‌اند می‌مانند. ادامه می‌دهید؟`,
      confirmText: 'ساخت لینک تازه',
      tone: 'danger',
    });
    if (!confirmed) return;
    setRenewing(true);
    try {
      await onRenew();
      toast.success('لینک تازه ساخته شد.');
    } catch {
      // the caller has said why
    } finally {
      setRenewing(false);
    }
  }

  return (
    <>
      <section className="tw-space-y-3 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-5 tw-shadow-sm">
        <h3 className="tw-m-0 tw-text-base tw-font-bold">لینک دعوت</h3>
        <p className="tw-m-0 tw-text-sm tw-text-brand-muted">{note}</p>
        <input
          readOnly
          dir="ltr"
          value={link}
          aria-label="لینک دعوت"
          onFocus={(event) => event.target.select()}
          className="tw-h-11 tw-w-full tw-rounded-xl tw-border tw-border-brand-line tw-bg-brand-bg tw-px-3 tw-text-left tw-text-sm tw-outline-none tw-transition-colors focus:tw-border-brand-orange"
        />
        <div className="tw-flex tw-flex-wrap tw-gap-2">
          <button
            type="button"
            onClick={() => copyText(link, () => { setCopied(true); setTimeout(() => setCopied(false), 1800); })}
            className="tw-inline-flex tw-h-10 tw-items-center tw-gap-1.5 tw-rounded-xl tw-border-0 tw-bg-brand-orange tw-px-4 tw-text-sm tw-font-bold tw-text-white hover:tw-bg-brand-orange-dark"
          >
            {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />} {copied ? 'کپی شد' : 'کپی لینک'}
          </button>
          {typeof navigator.share === 'function' ? (
            <button type="button" onClick={share} className={outlineButton}>
              <Share2 size={16} aria-hidden /> ارسال
            </button>
          ) : (
            // desktop browsers without a share sheet: the same full text to paste into any messenger
            <button type="button" onClick={() => copyText(fullText, () => toast.success('متن دعوت کپی شد.'))} className={outlineButton}>
              <Share2 size={16} aria-hidden /> کپی متن دعوت
            </button>
          )}
          {onRenew && (
            <button type="button" onClick={renew} disabled={renewing} className={outlineButton}>
              {renewing ? <LoaderCircle size={16} className="tw-animate-spin" aria-hidden /> : <RefreshCw size={16} aria-hidden />} لینک تازه
            </button>
          )}
        </div>
      </section>

      <section className="tw-space-y-3 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-5 tw-shadow-sm">
        <h3 className="tw-m-0 tw-flex tw-items-center tw-gap-2 tw-text-base tw-font-bold">
          <MessageCircle size={18} aria-hidden /> دعوت در ربات‌ها و واتساپ
        </h3>
        <p className="tw-m-0 tw-text-sm tw-text-brand-muted">
          {messengerNote ?? `${who}ی که با پیام‌رسان کار می‌کند، لینک همان پیام‌رسان را باز کند یا این کد را در ربات (یا واتساپ) بفرستد؛ با شماره‌اش ثبت‌نام و به لیست شما اضافه می‌شود.`}
        </p>
        <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
          <code dir="ltr" className="tw-select-all tw-rounded-lg tw-bg-brand-bg tw-px-3 tw-py-2 tw-text-sm">{messengers.code}</code>
          <button type="button" onClick={() => copyText(messengers.code, () => toast.success('کد دعوت کپی شد.'))} className={outlineButton}>
            <Copy size={16} aria-hidden /> کپی کد
          </button>
        </div>
        {messengerLinks.length > 0 && (
          <ul className="tw-m-0 tw-grid tw-list-none tw-gap-2 tw-p-0 sm:tw-grid-cols-2">
            {messengerLinks.map((item) => (
              <li key={item.name} className="tw-flex tw-items-center tw-justify-between tw-gap-2 tw-rounded-xl tw-border tw-border-brand-line tw-p-3">
                <span className="tw-min-w-0">
                  <strong className="tw-block tw-text-sm">{item.name}</strong>
                  <span className="tw-block tw-text-xs tw-text-brand-muted">{item.hint}</span>
                </span>
                <span className="tw-flex tw-shrink-0 tw-gap-1">
                  <button type="button" onClick={() => copyText(item.url, () => toast.success(`لینک ${item.name} کپی شد.`))} className={outlineButton} aria-label={`کپی لینک ${item.name}`} title="کپی لینک">
                    <Copy size={15} aria-hidden />
                  </button>
                  <a href={item.url} target="_blank" rel="noreferrer" className={outlineButton} aria-label={`باز کردن لینک ${item.name}`} title="باز کردن">
                    <ExternalLink size={15} aria-hidden />
                  </a>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
