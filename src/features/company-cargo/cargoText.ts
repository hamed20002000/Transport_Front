import axios from 'axios';
import type { ListingStatus } from './api';

export const statusLabels: Record<ListingStatus, string> = { OPEN: 'باز', TAKEN: 'برداشته شد' };

// ConflictException codes of CargoTripService (handing a load to a driver)
const conflicts: Record<string, string> = {
  reserved: 'این بار الان به راننده‌ی دیگری سپرده شده و منتظر تأیید اوست.',
  taken: 'این بار دیگر باز نیست.',
  own: 'نمی‌توانید بار را به خودتان بسپارید.',
  notDriver: 'این کاربر راننده‌ی سامانه نیست.',
};

export function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'ارتباط با سرور برقرار نشد. اتصال را بررسی و دوباره تلاش کنید.';
    const response = error.response.data as { code?: string; message?: string } | undefined;
    if (response?.code === 'noCargoRecipients' && typeof response.message === 'string') return response.message;
    if (error.response.status === 401) return 'نشست شما منقضی شده است. دوباره وارد شوید.';
    const code = (error.response.data as { message?: unknown } | undefined)?.message;
    if (error.response.status === 409 && typeof code === 'string' && conflicts[code]) return conflicts[code];
    if (error.response.status === 404) return 'بار پیدا نشد.';
    return `خطای سرور (${error.response.status}). دوباره تلاش کنید.`;
  }
  return error instanceof Error ? error.message : 'عملیات انجام نشد.';
}

/**
 * Fired on window when a cargo is changed from outside the company cargo page (the agent chat cards),
 * so an open cargo page reloads its lists and counters.
 */
export const CARGO_CHANGED_EVENT = 'company-cargo-changed';
