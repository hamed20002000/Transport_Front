import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ExternalLink, MessageCircle } from 'lucide-react';
import { getDriverInviteInfo } from 'src/features/company-cargo/driverInvitesApi';
import { getJoinInfo } from 'src/features/company-cargo/invitesApi';
import { getInviteInfo, type MessengerInvites } from 'src/features/factory/api';
import { returnPath } from '../hooks/useEnterSession';

type Invite = { inviter: string | null; mobile: string | null; messengers: MessengerInvites | null };

// the invite pages send a signed-out user here with ?url=/invite/…, /join/… or /driver-invite/…
async function inviteOf(path: string): Promise<Invite | null> {
  const match = path.match(/^\/(invite|join|driver-invite)\/([^/?#]+)/);
  if (!match) return null;
  const token = decodeURIComponent(match[2]);
  if (match[1] === 'join') {
    const info = await getJoinInfo(token);
    return info.valid ? { inviter: info.parentName, mobile: info.mobile, messengers: info.messengers } : null;
  }
  const info = await (match[1] === 'invite' ? getInviteInfo(token) : getDriverInviteInfo(token));
  return info.valid ? { inviter: info.companyName, mobile: info.mobile, messengers: info.messengers } : null;
}

/**
 * Sign-in opened by an invite link: who invites, and the same invite in each messenger (the invite SMS carries only
 * the web link). Nothing for an ordinary sign-in.
 */
export default function InviteMessengers() {
  const { search } = useLocation();
  const [invite, setInvite] = useState<Invite | null>(null);

  useEffect(() => {
    inviteOf(returnPath(search, '')).then(setInvite, () => setInvite(null));
  }, [search]);

  if (!invite) return null;
  const { messengers } = invite;
  const links = messengers
    ? [
        { name: 'تلگرام', url: messengers.telegram },
        { name: 'بله', url: messengers.bale },
        { name: 'ایتا', url: messengers.eitaa },
        { name: 'روبیکا', url: messengers.rubika },
        { name: 'واتساپ', url: messengers.whatsapp },
      ].filter((item): item is { name: string; url: string } => !!item.url)
    : [];

  return (
    <section className="tw-mt-5 tw-space-y-3 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-brand-bg tw-p-4 tw-text-right">
      <p className="tw-m-0 tw-text-sm tw-leading-7">
        دعوت از طرف <strong>{invite.inviter}</strong>
        {invite.mobile && (
          <>
            {' '}
            برای شماره‌ی <bdi dir="ltr">{invite.mobile}</bdi>؛ با همین شماره وارد شوید.
          </>
        )}
      </p>
      {links.length > 0 && messengers && (
        <>
          <p className="tw-m-0 tw-flex tw-items-center tw-gap-1.5 tw-text-sm tw-font-bold">
            <MessageCircle size={16} aria-hidden /> یا در پیام‌رسان:
          </p>
          <div className="tw-flex tw-flex-wrap tw-gap-2">
            {links.map((item) => (
              <a
                key={item.name}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="tw-inline-flex tw-h-10 tw-items-center tw-gap-1.5 tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-px-3 tw-text-sm tw-font-bold tw-text-brand-navy tw-no-underline hover:tw-bg-brand-sky"
              >
                <ExternalLink size={15} aria-hidden /> {item.name}
              </a>
            ))}
          </div>
          <p className="tw-m-0 tw-text-xs tw-leading-6 tw-text-brand-muted">
            در ایتا و روبیکا این کد را در ربات بفرستید: <code dir="ltr" className="tw-select-all">{messengers.code}</code>
          </p>
        </>
      )}
    </section>
  );
}
