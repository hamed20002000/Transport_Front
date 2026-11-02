import { Hourglass } from 'lucide-react';

const fa = (value: number) => value.toLocaleString('fa-IR');

/** «۵ ساعت تا انقضا», «۲۰ دقیقه تا انقضا» (an invite waits a day: transport_backend INVITE_EXPIRY_HOURS) */
function inviteTimeLeft(expiresAt: string): string {
  const minutes = Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 60_000));
  return minutes < 60 ? `${fa(minutes)} دقیقه تا انقضا` : `${fa(Math.floor(minutes / 60))} ساعت تا انقضا`;
}

/** The time an invite not used yet has left, on its card (driver, factory, company). */
export function InviteTimeLeft({ expiresAt }: { expiresAt?: string | null }) {
  if (!expiresAt) return null;
  return (
    <span className="tw-inline-flex tw-items-center tw-gap-1" title="اگر تا این زمان وارد نشود، دعوت و حسابش پاک می‌شود">
      <Hourglass size={13} aria-hidden /> {inviteTimeLeft(expiresAt)}
    </span>
  );
}
