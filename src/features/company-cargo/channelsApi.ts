import axios from 'axios';
import endpoints from 'src/core/config/endpoints.json';

export type ChannelPlatform = 'whatsapp' | 'telegram';

export interface Channel {
  id: string;
  platform: ChannelPlatform;
  identifier: string | null;
  type: 'group' | 'channel' | null;
  label: string | null;
  isActive: boolean;
  isMember: boolean;
  joinRequestPending: boolean;
  membershipStatus?: 'queued' | 'pending' | 'joined' | 'failed' | 'removed';
  lastError: string | null;
  createdAt: string;
}

// Served by tarabari_backend, which verifies the same user JWT; it does not wrap responses in {success, data}.
const url = `${endpoints.tarabariurl}my-channels`;
const config = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
  timeout: 20000,
});

// Same link shapes tarabari_backend accepts (parseChannelLink / TelegramChannelService.parseIdentifier).
export function detectPlatform(link: string): ChannelPlatform | null {
  const value = link.trim();
  if (/chat\.whatsapp\.com\/[A-Za-z0-9]+|whatsapp\.com\/channel\/[A-Za-z0-9]+/.test(value)) return 'whatsapp';
  const telegramHost = /^(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me|telegram\.dog)\//i;
  if (
    new RegExp(`${telegramHost.source}(?:\\+|joinchat\\/)[\\w-]+`, 'i').test(value) ||
    new RegExp(`${telegramHost.source}[A-Za-z][A-Za-z0-9_]{3,}`, 'i').test(value) ||
    /^\+[\w-]+$/.test(value) ||
    /^@?[A-Za-z][A-Za-z0-9_]{3,}$/.test(value)
  )
    return 'telegram';
  return null;
}

export async function listChannels() {
  const { data } = await axios.get<Channel[]>(url, config());
  if (!Array.isArray(data)) throw new Error('دریافت لینک‌ها انجام نشد.');
  return data;
}

export async function registerChannel(link: string, label?: string) {
  const { data } = await axios.post<{ created: boolean; channel: Channel; warning: string | null }>(
    url,
    { link, label },
    config(),
  );
  if (!data?.channel) throw new Error('ثبت لینک انجام نشد.');
  return data;
}

export async function removeChannel(channel: Channel) {
  await axios.delete(`${url}/${channel.platform}/${channel.id}`, config());
}
