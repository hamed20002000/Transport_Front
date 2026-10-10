import { useState } from 'react';
import axios from 'axios';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { removeChannel, type Channel } from './channelsApi';
import type { CargoNotify } from './cargoActions';

/**
 * Fired on window when a channel is changed from outside the channels page (the agent chat cards),
 * so an open channels page reloads.
 */
export const CHANNELS_CHANGED_EVENT = 'company-channels-changed';

export function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'ارتباط با سرور برقرار نشد. اتصال را بررسی و دوباره تلاش کنید.';
    const { status, data } = error.response;
    const raw = (data as { message?: unknown } | undefined)?.message;
    const detail = Array.isArray(raw) ? raw.join(' ') : typeof raw === 'string' ? raw : '';
    if (status === 400) return detail && /[؀-ۿ]/.test(detail) ? detail : 'لینک معتبر نیست.';
    if (status === 401) return 'نشست شما منقضی شده است. دوباره وارد شوید.';
    if (status === 404) return 'لینک پیدا نشد یا قبلاً حذف شده است.';
    if (status === 502 || status === 503) return 'سرویس گروه‌ها و کانال‌ها در دسترس نیست. کمی بعد دوباره تلاش کنید.';
    return `خطای سرور (${status}). دوباره تلاش کنید.`;
  }
  return error instanceof Error ? error.message : 'عملیات انجام نشد.';
}

/** «حذف لینک» on a channel, shared by the channels page and the agent chat; `onRemoved` drops it from the caller's list. */
export function useChannelRemove({
  onRemoved,
  onChanged,
  notify,
}: {
  onRemoved: (channel: Channel) => void;
  onChanged?: () => void;
  notify?: CargoNotify;
}) {
  const toast = useToast();
  const say = notify ?? { success: (message: string) => toast.success(message), error: (message: string) => toast.error(message) };
  const [removingId, setRemovingId] = useState('');

  async function remove(channel: Channel) {
    if (removingId || !window.confirm(`«${channel.label || channel.identifier}» از لیست شما حذف شود؟ دیگر باری از آن دریافت نمی‌کنید.`)) return;
    setRemovingId(channel.id);
    try {
      await removeChannel(channel);
      onRemoved(channel);
      say.success(`«${channel.label || channel.identifier}» از لیست شما حذف شد.`);
      onChanged?.();
    } catch (e) {
      say.error(errorMessage(e));
    } finally {
      setRemovingId('');
    }
  }

  return { remove, removingId };
}
