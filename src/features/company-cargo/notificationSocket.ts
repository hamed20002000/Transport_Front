import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import endpoints from 'src/core/config/endpoints.json';

// NotificationsGateway در transport_backend (namespace /notifications). کاربر از روی
// JWT شناخته می‌شود؛ یک اتصال مشترک برای کل پنل.
const origin = new URL(endpoints.baseurl).origin;
let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    socket = io(`${origin}/notifications`, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      // هر بار اتصال (یا اتصال دوباره) توکن فعلی خوانده می‌شود.
      auth: (cb) => cb({ token: localStorage.getItem('authToken') ?? '' }),
    });
  }
  return socket;
}

/** تا وقتی کامپوننت روی صفحه است، به رویداد socket گوش می‌دهد. */
export function useNotificationEvent<T>(event: string, handler: (payload: T) => void) {
  const latest = useRef(handler);
  latest.current = handler;

  useEffect(() => {
    const s = getSocket();
    const listener = (payload: T) => latest.current(payload);
    s.on(event, listener);
    return () => {
      s.off(event, listener);
    };
  }, [event]);
}

export type ChannelMembershipStatus = 'queued' | 'pending' | 'joined' | 'failed' | 'removed';

/** payload رویداد channel-status (ChannelMembershipNotifier در transport_backend). */
export interface ChannelStatusEvent {
  platform: 'whatsapp' | 'telegram';
  channelId: string;
  label: string | null;
  identifier: string | null;
  status: ChannelMembershipStatus;
  reason: string | null;
  text: string;
}
