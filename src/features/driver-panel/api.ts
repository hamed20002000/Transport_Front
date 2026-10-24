import axios from 'axios';
import endpoints from 'src/core/config/endpoints.json';
import type { CargoListing, Page, TripType } from 'src/features/company-cargo/api';

export type { CargoListing, Page };

// CargoRequestStatus in transport_backend; ACCEPTED is the driver's active trip.
// OFFERED: the company handed the load to this driver and waits for the driver to confirm (until offerExpiresAt).
export type RequestStatus = 'PENDING' | 'OFFERED' | 'ACCEPTED' | 'REJECTED' | 'DECLINED' | 'EXPIRED' | 'CANCELLED' | 'DELIVERED';

export interface OpenLoad extends CargoListing {
  // This driver's own request for the load, if any.
  myRequest: { id: string; status: RequestStatus; offerExpiresAt?: string | null } | null;
  // Handed to another driver who has not answered yet: no new requests meanwhile.
  reserved?: boolean;
}

export interface CargoRequest {
  id: string;
  status: RequestStatus;
  createdAt: string;
  decidedAt: string | null;
  deliveredAt: string | null;
  // the driver reported delivery; the trip stays ACCEPTED until the company confirms it
  deliveryReportedAt?: string | null;
  offerExpiresAt?: string | null;
  listing: CargoListing | null;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export type TrafficLevel = 'smooth' | 'moderate' | 'heavy';

// One driving option between origin and destination (CargoInsightService).
export interface RouteOption {
  distanceKm: number;
  truckMinutes: number;
  traffic: { delayMin: number; level: TrafficLevel } | null;
  fuelLiters: number;
  roads: string[];
  via: string | null;
  points: GeoPoint[];
}

export interface LoadInsight {
  listing: CargoListing;
  originPoint: GeoPoint | null;
  destinationPoint: GeoPoint | null;
  routes: RouteOption[];
  returnLoads: { fromDestination: number; toOrigin: number };
  // Driving distance from the driver's last location to the origin; null without a recent location.
  driver: { distanceKm: number; durationMin: number; locatedAt: string } | null;
}

export interface FuelStation {
  id: string;
  name: string | null;
  lat: number;
  lng: number;
  diesel: boolean | null;
  cng: boolean | null;
  petrol: boolean | null;
  atKm: number;
}

export interface RouteFuel {
  stations: FuelStation[];
  longestGap: { fromKm: number; toKm: number } | null;
  coverage: 'none' | 'partial' | 'complete';
}

export interface DriverLocation {
  latitude: number;
  longitude: number;
  liveUntil: string | null;
  receivedAt: string;
}

export interface ListingNotification {
  id: string;
  isRead: boolean;
  createdAt: string;
  listing: { id: string; status: 'OPEN' | 'TAKEN' } | null;
}

const config = (params?: Record<string, unknown>) => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
  params,
  timeout: 30000,
});

async function unwrap<T>(request: Promise<{ data: { success: boolean; data: T } }>) {
  const { data } = await request;
  if (!data.success || data.data === undefined) throw new Error('دریافت اطلاعات انجام نشد.');
  return data.data;
}

const url = (path: string) => `${endpoints.baseurl}driver/${path}`;

export interface LoadQuery {
  page: number;
  origin?: string;
  destination?: string;
  matchFilters?: boolean;
  pageSize?: number;
}

export function listLoads({ page, origin, destination, matchFilters, pageSize = 20 }: LoadQuery) {
  return unwrap<Page<OpenLoad>>(axios.get(url('loads'), config({ page, pageSize, origin: origin || undefined, destination: destination || undefined, matchFilters })));
}

export function getLoadInsight(id: string) {
  return unwrap<LoadInsight>(axios.get(url(`loads/${id}/insight`), config()));
}

export type FuelKind = 'diesel' | 'petrol' | 'cng';

// Only stations selling one of `fuels` (the server defaults to diesel).
export function getRouteFuel(id: string, route: number, fuels: FuelKind[]) {
  return unwrap<RouteFuel>(axios.get(url(`loads/${id}/fuel`), { ...config({ route, fuel: fuels.join(',') }), timeout: 60000 }));
}

// The same stations read out (mp3) for a driver behind the wheel.
export async function getRouteFuelVoice(id: string, route: number, fuels: FuelKind[]): Promise<Blob> {
  const { data } = await axios.get<Blob>(url(`loads/${id}/fuel/voice`), {
    ...config({ route, fuel: fuels.join(',') }),
    responseType: 'blob',
    timeout: 60000,
  });
  return data;
}

export function listReturnLoads(id: string, page = 1) {
  return unwrap<Page<CargoListing & { toOrigin: boolean }>>(axios.get(url(`loads/${id}/return-loads`), config({ page, pageSize: 5 })));
}

export function listMyRequests(page: number, pageSize = 20, status?: RequestStatus) {
  return unwrap<Page<CargoRequest>>(axios.get(url('requests'), config({ page, pageSize, status })));
}

// «سفرهای رفته»: delivered loads. days: delivered in the last N days; q: code, origin, destination or company.
export interface TripHistoryFilters {
  q?: string;
  tripType?: TripType;
  companyId?: string;
  days?: number;
  order?: 'newest' | 'oldest';
}

export interface TripHistory extends Page<CargoRequest> {
  // with the same filters except the trip type, so the type chips show what each would leave
  byTripType: Record<TripType, number>;
  // every company the driver has delivered for, for the company filter
  companies: Array<{ id: string; name: string | null; trips: number }>;
}

export function tripHistory(page: number, filters: TripHistoryFilters, pageSize = 20) {
  return unwrap<TripHistory>(axios.get(url('trips/history'), config({ page, pageSize, ...filters, q: filters.q?.trim() || undefined })));
}

export function requestLoad(listingId: string) {
  return unwrap<CargoRequest>(axios.post(url('requests'), { listingId }, config()));
}

// Answer to a load the company handed to this driver: accept starts the trip, otherwise the company picks someone else.
export function respondOffer(id: string, accept: boolean) {
  return unwrap<CargoRequest>(axios.patch(url(`requests/${id}/offer`), { accept }, config()));
}

export function cancelRequest(id: string) {
  return unwrap<CargoRequest>(axios.patch(url(`requests/${id}/cancel`), {}, config()));
}

export function markDelivered(id: string) {
  return unwrap<CargoRequest>(axios.patch(url(`requests/${id}/deliver`), {}, config()));
}

export function listActiveTrips() {
  return unwrap<CargoRequest[]>(axios.get(url('trips/active'), config()));
}

export function getLocation() {
  return unwrap<{ location: DriverLocation | null }>(axios.get(url('location'), config())).then((r) => r.location);
}

// Returns how many companies (active trip or a pending location request) received it.
export function sendLocation(latitude: number, longitude: number) {
  return unwrap<{ sent: number; receivedAt: string }>(axios.post(url('location'), { latitude, longitude }, config()));
}

// When the browser cannot locate the device: the server geocodes a city or address.
export function sendLocationByPlace(place: string) {
  return unwrap<{ sent: number; receivedAt: string; latitude: number; longitude: number; resolved: string | null }>(axios.post(url('location/place'), { place }, config()));
}

export function unreadLoadCount() {
  return unwrap<Page<ListingNotification>>(
    axios.get(`${endpoints.baseurl}cargo-notifications`, config({ kind: 'listing', unreadOnly: true, page: 1, pageSize: 1 })),
  ).then((page) => page.total);
}

export function markAllLoadsRead() {
  return unwrap(axios.patch(`${endpoints.baseurl}cargo-notifications/read-all`, {}, config()));
}

// Persian text for the 409 keys CargoTripService throws, and the other common failures.
const conflicts: Record<string, string> = {
  taken: 'این بار دیگر باز نیست (برداشته شده).',
  own: 'این بار را خودتان اعلام کرده‌اید.',
  already: 'برای این بار قبلاً درخواست داده‌اید.',
  rejected: 'شرکت قبلاً درخواست شما برای این بار را رد کرده است.',
  notPending: 'این درخواست دیگر در انتظار نیست.',
  notActive: 'این سفر دیگر فعال نیست.',
  reserved: 'این بار فعلاً به راننده‌ی دیگری سپرده شده و منتظر تأیید اوست.',
  notOffered: 'این بار دیگر منتظر تأیید شما نیست.',
  offerExpired: 'مهلت تأیید این بار تمام شده است.',
};

export function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'ارتباط با سرور برقرار نشد. اتصال را بررسی و دوباره تلاش کنید.';
    const { status, data } = error.response as { status: number; data?: { message?: unknown } };
    const key = typeof data?.message === 'string' ? data.message : '';
    if (status === 409 && conflicts[key]) return conflicts[key];
    if (status === 404 && key === 'placeNotFound') return 'این شهر یا آدرس پیدا نشد. نام شهر را دقیق‌تر بنویسید.';
    if (status === 400) return 'اطلاعات واردشده معتبر نیست. فیلدها را بررسی کنید.';
    if (status === 413) return 'حجم عکس زیاد است (حداکثر ۳ مگابایت).';
    if (status === 401) return 'نشست شما منقضی شده است. دوباره وارد شوید.';
    if (status === 403) return 'این بخش فقط برای حساب راننده است.';
    if (status === 404) return 'مورد پیدا نشد یا دیگر در دسترس نیست.';
    return `خطای سرور (${status}). دوباره تلاش کنید.`;
  }
  return error instanceof Error ? error.message : 'عملیات انجام نشد.';
}

// Driver profile (DriverProfileService): name/national code live on the user, the rest on DriverProfile.
export interface DriverProfile {
  username: string;
  mobile: string | null;
  firstName: string | null;
  lastName: string | null;
  nationalCode: string | null;
  smartCardNumber: string | null;
  licenseNumber: string | null;
  homeCity: string | null;
  vehicleType: string | null;
  vehicleModel: string | null;
  // "12-ع-345-67"
  plate: string | null;
  capacityTons: number | null;
  fleetCardNumber: string | null;
  // Domestic, export or import: announced loads reach only drivers of the same type.
  tripType: TripType;
  tripTypes: TripType[];
  companyUserIds: string[];
  // Stored file name when a photo exists; it changes on every upload, so it doubles as a cache key.
  photos: { face: string | null; vehicle: string | null; plate: string | null };
}

export type DriverPhotoKind = 'face' | 'vehicle' | 'plate';
export type DriverProfileInput = Partial<Omit<DriverProfile, 'username' | 'mobile' | 'photos'>>;

export function getDriverProfile() {
  return unwrap<DriverProfile>(axios.get(url('profile'), config()));
}

export function updateDriverProfile(input: DriverProfileInput) {
  return unwrap<DriverProfile>(axios.patch(url('profile'), input, config()));
}

export function uploadDriverPhoto(kind: DriverPhotoKind, file: File) {
  const body = new FormData();
  body.append('file', file);
  return unwrap<DriverProfile>(axios.put(url(`profile/photos/${kind}`), body, { ...config(), timeout: 60000 }));
}

export function deleteDriverPhoto(kind: DriverPhotoKind) {
  return unwrap<DriverProfile>(axios.delete(url(`profile/photos/${kind}`), config()));
}

// The photo endpoint needs the token, so it is fetched as a blob rather than used as an <img> src.
export async function fetchDriverPhoto(kind: DriverPhotoKind) {
  const { data } = await axios.get<Blob>(url(`profile/photos/${kind}`), { ...config(), responseType: 'blob' });
  return URL.createObjectURL(data);
}

// Border crossings from borderpark.ir (transport_backend BorderStatusService); labels as on borderpark.
export interface BorderQueue {
  title: string;
  inQueue: number;
  // Of inQueue: online turns whose truck is not at the border yet.
  notPresent: number;
  empty: number;
  called: number;
  customsCheckedIn: number;
  // Left the tirpark, waiting to enter customs.
  waitingCustoms: number;
  waitHours: number;
}

export interface BorderStatus {
  border: {
    id: string;
    name: string;
    country: string;
    countryCode: string;
    stats: { load: number; transit: number; export: number; unload: number; customsCheckedIn: number };
    // The Iranian terminal of the crossing, for the borders map; null for a crossing not mapped yet.
    location?: { lat: number; lng: number } | null;
  };
  // Jalali «1405-07-23 20:38» as borderpark gives it.
  lastUpdate: string | null;
  totals: { inQueue: number; called: number; customsCheckedIn: number };
  // Busiest first; queues with nothing in them are left out.
  queues: BorderQueue[];
  notices: string[];
  tirparks: Array<{ name: string; address: string; capacity: number; accepts: string[]; lat: number; lng: number }>;
  // borderpark did not answer; this is the last stored state.
  stale: boolean;
}

// Display order, as in the bots (transport_backend borderOrder): Turkey, Bashmaq, Azerbaijan, Armenia, the rest; busiest first within each.
export function borderOrder(a: BorderStatus, b: BorderStatus) {
  const rank = ({ border }: BorderStatus) =>
    border.countryCode === 'TR' ? 0 : border.id === 'bashmaq' ? 1 : border.countryCode === 'AZ' ? 2 : border.countryCode === 'AM' ? 3 : 4;
  return rank(a) - rank(b) || b.totals.inQueue - a.totals.inQueue;
}

// Iran's simplified outline as [lng, lat] rings (transport_backend iranBorder), to dim the map outside Iran; fixed.
let outline: Promise<[number, number][][]> | null = null;
export function getIranOutline() {
  outline ??= unwrap<{ rings: [number, number][][] }>(axios.get(`${endpoints.baseurl}borders/outline`, config()))
    .then((r) => r.rings)
    .catch((error) => {
      outline = null;
      throw error;
    });
  return outline;
}

export function listBorders() {
  return unwrap<BorderStatus[]>(axios.get(`${endpoints.baseurl}borders`, { ...config(), timeout: 60000 }));
}

// A border the load's route crosses (transport_backend BorderStatusService.onRoute), in route order.
export interface RouteBorder extends BorderStatus {
  crossing: { atKm: number; direction: 'exit' | 'entry'; offsetKm: number };
}

export function getRouteBorders(id: string, route: number) {
  return unwrap<RouteBorder[]>(axios.get(url(`loads/${id}/borders`), { ...config({ route }), timeout: 60000 }));
}

export interface DriverCompany { userId: string; name: string }
export function getDriverCompanies() {
  return unwrap<DriverCompany[]>(axios.get(url('profile/companies'), config()));
}
