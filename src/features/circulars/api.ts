import axios from 'axios';
import endpoints from 'src/core/config/endpoints.json';

// transport_backend AdminCircularController (api/admin/circulars) and DriverCircularController (api/driver/circulars):
// circulars the admin uploads for the drivers, announced to every driver (push and its messenger) at once.
export interface Circular {
  id: string;
  title: string;
  body: string | null;
  file: { name: string; mimeType: string; size: number } | null;
  createdAt: string;
}

/** The admin's view: how far the announcement got (drivers a messenger took it to; the push goes besides). */
export interface AdminCircular extends Circular {
  recipients: number;
  notified: number;
  notifiedAt: string | null;
}

const config = (timeout = 20000) => ({ headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }, timeout });

async function unwrap<T>(request: Promise<{ data: { success: boolean; data: T } }>) {
  const { data } = await request;
  if (!data.success || data.data === undefined) throw new Error('درخواست انجام نشد.');
  return data.data;
}

const admin = `${endpoints.baseurl}admin/circulars`;
const driver = `${endpoints.baseurl}driver/circulars`;

export const listAdminCirculars = () => unwrap(axios.get<{ success: boolean; data: AdminCircular[] }>(admin, config()));

export function createCircular(title: string, body: string, file: File | null) {
  const form = new FormData();
  form.append('title', title);
  if (body.trim()) form.append('body', body);
  if (file) form.append('file', file);
  return unwrap(axios.post<{ success: boolean; data: AdminCircular }>(admin, form, config(120000)));
}

export const removeCircular = (id: string) => unwrap(axios.delete<{ success: boolean; data: { id: string } }>(`${admin}/${id}`, config()));

export const listDriverCirculars = () => unwrap(axios.get<{ success: boolean; data: Circular[] }>(driver, config()));

/** Opens a circular's file in a new tab: it is fetched with the token, so the link itself carries no access. */
export async function openCircularFile(id: string, asAdmin = false): Promise<void> {
  // opened at once, before the download, so the browser does not block it as a popup
  const tab = window.open('', '_blank');
  try {
    const { data } = await axios.get<Blob>(`${asAdmin ? admin : driver}/${id}/file`, { ...config(120000), responseType: 'blob' });
    const url = URL.createObjectURL(data);
    if (tab) tab.location.href = url;
    else window.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    tab?.close();
    throw error;
  }
}

export const fileSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} مگابایت` : `${Math.max(1, Math.round(bytes / 1024)).toLocaleString('fa-IR')} کیلوبایت`;
