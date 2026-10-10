import {
  CircleCheck,
  Clock,
  Hourglass,
  RotateCcw,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import { cn } from 'src/shared/utils/utils';
import { platforms, roles, typeLabels } from './channelMeta';
import type { Channel, ChannelPlatform } from './channelsApi';
import { IconButton, timeAgo } from './components';

// Channel cards, shared by the channels page and the agent chat (list_company_channels).

export function PlatformLogo({ platform, size }: { platform: ChannelPlatform; size: number }) {
  return <img src={platforms[platform].logo} alt="" aria-hidden width={size} height={size} className="tw-shrink-0 tw-object-contain" />;
}

// Membership progress as tarabari reports it: joined, waiting for admin approval, failed, or still queued.
function Status({ channel }: { channel: Channel }) {
  const [label, Icon, tone] = channel.membershipStatus === 'failed'
    ? (['عضویت ناموفق', TriangleAlert, 'tw-bg-red-50 tw-text-red-700'] as const)
    : channel.membershipStatus === 'removed'
      ? (['ربات از گروه حذف شد', TriangleAlert, 'tw-bg-red-50 tw-text-red-700'] as const)
    : !channel.isActive
    ? (['غیرفعال', Clock, 'tw-bg-stone-100 tw-text-brand-muted'] as const)
    : channel.isMember
      ? (['فعال · در حال دریافت بار', CircleCheck, 'tw-bg-emerald-50 tw-text-emerald-700'] as const)
      : channel.lastError
        ? (['خطا در عضویت', TriangleAlert, 'tw-bg-red-50 tw-text-red-700'] as const)
        : channel.joinRequestPending
          ? (['در انتظار تأیید ادمین', Hourglass, 'tw-bg-brand-orange-soft tw-text-brand-orange-ink'] as const)
          : (['در صف عضویت', Hourglass, 'tw-bg-brand-sky tw-text-brand-navy'] as const);
  return (
    <span title={channel.lastError ?? undefined} className={cn('tw-inline-flex tw-items-center tw-gap-1 tw-whitespace-nowrap tw-rounded-full tw-px-2.5 tw-py-0.5 tw-text-xs tw-font-medium', tone)}>
      <Icon size={12} aria-hidden /> {label}
    </span>
  );
}

export function ChannelRow({ channel, removing, onRemove }: { channel: Channel; removing: boolean; onRemove: () => void }) {
  const platform = platforms[channel.platform];
  const title = channel.label || channel.identifier || 'بدون نام';
  return (
    <li className="tw-flex tw-items-center tw-gap-3 tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-p-4 tw-shadow-sm">
      <span className={cn('tw-flex tw-h-11 tw-w-11 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-xl', platform.tile)}>
        <PlatformLogo platform={channel.platform} size={26} />
      </span>
      <div className="tw-min-w-0 tw-flex-1 tw-space-y-1">
        <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
          <strong className="tw-truncate">{title}</strong>
          <Status channel={channel} />
        </div>
        <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-x-3 tw-gap-y-0.5 tw-text-xs tw-text-brand-muted">
          <span className={platform.text}>
            {platform.label}
            {channel.type && ` · ${typeLabels[channel.type]}`}
          </span>
          <span>{roles[channel.role ?? 'source'].label}</span>
          {channel.label && channel.identifier && (
            <span dir="ltr" className="tw-min-w-0 tw-max-w-full tw-truncate">
              {channel.identifier}
            </span>
          )}
          <span>{timeAgo(channel.createdAt)}</span>
        </div>
      </div>
      <IconButton icon={removing ? RotateCcw : Trash2} spinning={removing} label="حذف لینک" disabled={removing} onClick={onRemove} />
    </li>
  );
}
