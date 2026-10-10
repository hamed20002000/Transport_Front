import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, type LucideIcon } from 'lucide-react';
import type { ChannelPlatform, ChannelRole } from './channelsApi';

// Logos are served from /public.
export const platforms: Record<ChannelPlatform, { label: string; logo: string; tile: string; text: string }> = {
  whatsapp: { label: 'واتساپ', logo: '/whatsapp.svg', tile: 'tw-bg-[#E7F8EE] tw-text-[#128C4B]', text: 'tw-text-[#128C4B]' },
  telegram: { label: 'تلگرام', logo: '/telegram.svg', tile: 'tw-bg-[#E6F4FB] tw-text-[#1C8AC4]', text: 'tw-text-[#1C8AC4]' },
  bale: { label: 'بله', logo: '/bale.svg', tile: 'tw-bg-[#E6F7F5] tw-text-[#0F8A7E]', text: 'tw-text-[#0F8A7E]' },
  rubika: { label: 'روبیکا', logo: '/rubika.svg', tile: 'tw-bg-[#F3ECFB] tw-text-[#7B3FC4]', text: 'tw-text-[#7B3FC4]' },
};

export const typeLabels = { group: 'گروه', channel: 'کانال' };

export const roles: Record<ChannelRole, { label: string; hint: string; icon: LucideIcon }> = {
  source: { label: 'منبع', hint: 'بارهای این گروه/کانال برای شما می‌آید', icon: ArrowDownToLine },
  destination: { label: 'مقصد', hint: 'بارهای پردازش‌شده در این گروه/کانال فرستاده می‌شود', icon: ArrowUpFromLine },
  both: { label: 'منبع و مقصد', hint: 'هم بار از آن خوانده و هم بار در آن فرستاده می‌شود', icon: ArrowLeftRight },
};
