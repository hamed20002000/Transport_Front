import axios from 'axios';
import endpoints from 'src/core/config/endpoints.json';

export type ListingStatus = 'OPEN' | 'TAKEN';

// CargoTripType in transport_backend: a load (and a driver) is domestic, export (Iran → abroad) or import (abroad → Iran);
// a load is announced only to drivers of its own type.
export type TripType = 'DOMESTIC' | 'EXPORT' | 'IMPORT';
export const tripTypeLabels: Record<TripType, string> = { DOMESTIC: 'داخلی', EXPORT: 'صادراتی', IMPORT: 'وارداتی' };
// A driver is domestic or international (DriverKind in transport_backend): an international driver takes export
// and import loads. A load keeps its own type; this is who it goes to.
export type DriverKind = 'DOMESTIC' | 'INTERNATIONAL';
export const driverKindLabels: Record<DriverKind, string> = { DOMESTIC: 'داخلی', INTERNATIONAL: 'بین‌المللی' };
export const driverKindHints: Record<DriverKind, string> = {
  DOMESTIC: 'بار را داخل ایران جابه‌جا می‌کنند؛ بارهای داخلی را می‌گیرند',
  INTERNATIONAL: 'بار را از ایران به خارج یا از خارج به ایران می‌برند؛ بارهای صادراتی و وارداتی را می‌گیرند',
};
export const driverKindTripTypes: Record<DriverKind, TripType[]> = { DOMESTIC: ['DOMESTIC'], INTERNATIONAL: ['EXPORT', 'IMPORT'] };
export const driverKindOf = (types: readonly TripType[]): DriverKind => (types.some((type) => type !== 'DOMESTIC') ? 'INTERNATIONAL' : 'DOMESTIC');
/** «داخلی» / «بین‌المللی»: the drivers a load of this type goes to */
export const driversOfLoad = (type: TripType) => driverKindLabels[driverKindOf([type])];

export const tripTypeHints: Record<TripType, string> = {
  DOMESTIC: 'بار را داخل ایران جابه‌جا می‌کنند',
  EXPORT: 'بار را از ایران به خارج می‌برند',
  IMPORT: 'بار را از خارج به ایران می‌آورند',
};

// Mirrors CargoDetectedEvent in transport_backend (domain/constants/cargoEvents.ts).
export interface CargoDetails {
  // Tracking code tarabari gives each cargo (e.g. TRB100123); older cargo has none.
  code?: string | null;
  rawText?: string;
  receivedAt?: string;
  origin?: string | null;
  destination?: string | null;
  cargoType?: string | null;
  weight?: string | null;
  vehicleType?: string | null;
  price?: string | null;
  extraNotes?: string | null;
  // Worked out from origin and destination when the cargo arrived; missing when it could not be.
  tripType?: TripType | null;
}

export interface CargoSuggestion {
  id: string;
  sourceMessageId: string;
  text: string;
  cargo: CargoDetails;
  // The copy of this cargo that the company has already published, if any.
  published: { id: string; status: ListingStatus; announcedAt?: string | null } | null;
  isRead: boolean;
  createdAt: string;
}

export interface CargoListing {
  id: string;
  // Same code as the channel cargo it came from, or a new TRB… code for a manual one.
  code: string;
  companyName: string | null;
  origin: string;
  destination: string;
  cargoType: string | null;
  weight: string | null;
  vehicleType: string | null;
  price: string | null;
  extraNotes: string | null;
  contactPhones: string[];
  text: string;
  status: ListingStatus;
  takenAt: string | null;
  tripType: TripType;
  // null: waiting in the company's automatic announcement queue.
  announcedAt: string | null;
  createdAt: string;
  // The driver the load was handed to («برداشته شد»): waiting for them (OFFERED), on the trip or delivered.
  assignment?: CargoAssignment | null;
  // drivers' requests still waiting for an answer («بارهای من» card)
  pendingRequests?: number;
}

// A driver as the company sees them when handing over a load (DriverProfileService.cards).
export interface DriverCard {
  userId: string;
  name: string;
  mobile: string | null;
  vehicleType: string | null;
  vehicleModel: string | null;
  plate: string | null;
  capacityTons: number | null;
  homeCity: string | null;
  tripType: TripType;
  photos: { face: boolean; vehicle: boolean };
  // When this driver asked for the load; absent for drivers found by search.
  requestedAt?: string | null;
}

export interface CargoAssignment {
  requestId: string;
  status: 'OFFERED' | 'ACCEPTED' | 'DELIVERED';
  at: string;
  offerExpiresAt: string | null;
  driver: DriverCard | null;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

const config = (params?: Record<string, unknown>) => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
  params,
  timeout: 20000,
});

async function unwrap<T>(request: Promise<{ data: { success: boolean; data: T } }>) {
  const { data } = await request;
  if (!data.success || !data.data) throw new Error('دریافت اطلاعات انجام نشد.');
  return data.data;
}

export function listSuggestions(page: number, unreadOnly: boolean) {
  return unwrap<Page<CargoSuggestion>>(
    axios.get(
      `${endpoints.baseurl}cargo-notifications`,
      config({ kind: 'suggestion', unreadOnly, page, pageSize: 20 }),
    ),
  );
}

export function markSuggestionRead(id: string) {
  return unwrap(axios.patch(`${endpoints.baseurl}cargo-notifications/${id}/read`, {}, config()));
}

export function markAllSuggestionsRead() {
  return unwrap(axios.patch(`${endpoints.baseurl}cargo-notifications/read-all`, {}, config()));
}

// The company's own open loads not announced yet (no matching driver, or waiting for the automatic round).
export function listUnannounced() {
  return unwrap<CargoListing[]>(axios.get(`${endpoints.baseurl}cargo-listings/unannounced`, config()));
}

// Where a published load is (transport_backend ListingStage): open for drivers, on a driver's trip, or delivered.
export type ListingStage = 'published' | 'inTransit' | 'delivered';

export function listingStage(listing: Pick<CargoListing, 'assignment'>): ListingStage {
  if (listing.assignment?.status === 'DELIVERED') return 'delivered';
  if (listing.assignment?.status === 'ACCEPTED') return 'inTransit';
  return 'published';
}

export function listMyListings(page: number, stage?: ListingStage) {
  return unwrap<Page<CargoListing>>(
    axios.get(`${endpoints.baseurl}cargo-listings`, config({ stage, page, pageSize: 20 })),
  );
}

// Same fields and limits as PublishCargoListingDto in transport_backend.
export interface CargoListingInput {
  companyName?: string;
  origin: string;
  destination: string;
  cargoType?: string;
  weight?: string;
  vehicleType?: string;
  price?: string;
  extraNotes?: string;
  contactPhones: string[];
}

export const listingLimits = {
  companyName: 200,
  origin: 200,
  destination: 200,
  cargoType: 200,
  weight: 100,
  vehicleType: 200,
  price: 100,
  extraNotes: 1000,
  phones: 5,
};

export const phonePattern = /^[0-9۰-۹+\-\s()]{5,20}$/;

export function getListingDefaults() {
  return unwrap<{ companyName: string | null; contactPhones: string[] }>(
    axios.get(`${endpoints.baseurl}cargo-listings/draft`, config()),
  );
}

// pending: the company announces automatically, so the load waits for the next round at nextAnnounceAt.
export type PublishResult = CargoListing & { recipients: number; pending: boolean; nextAnnounceAt: string | null };

export function createListing(input: CargoListingInput) {
  return unwrap<PublishResult>(axios.post(`${endpoints.baseurl}cargo-listings`, input, config()));
}

// «اعلام همین الان»: a queued load, or again to drivers of its type who joined since.
export function announceListing(id: string) {
  return unwrap<PublishResult>(axios.post(`${endpoints.baseurl}cargo-listings/${id}/announce`, {}, config()));
}

export type AnnounceMode = 'MANUAL' | 'AUTO';

export interface AnnounceSettings {
  mode: AnnounceMode;
  intervalMinutes: number;
  nextRunAt: string | null;
  lastRunAt: string | null;
  /** Loads announced in the last automatic turn; null until the first turn has run. */
  lastRunAnnounced: number | null;
}

export function getAnnounceSettings() {
  return unwrap<AnnounceSettings>(axios.get(`${endpoints.baseurl}cargo-listings/announce-settings`, config()));
}

export function saveAnnounceSettings(mode: AnnounceMode, intervalMinutes: number) {
  return unwrap<AnnounceSettings>(axios.put(`${endpoints.baseurl}cargo-listings/announce-settings`, { mode, intervalMinutes }, config()));
}

// Active drivers of one trip type, for the company «رانندگان» page.
export function listDrivers(type: TripType, page: number, search?: string) {
  return unwrap<Page<DriverCard>>(
    axios.get(`${endpoints.baseurl}cargo-listings/drivers`, config({ type, page, pageSize: 20, search: search || undefined })),
  );
}

// Bulk «ثبت بار» from an Excel file (transport_backend CargoExcelService).
export interface ExcelCargoRow {
  // Row number as the user sees it in Excel (row 1 is the header).
  row: number;
  origin: string;
  destination: string;
  cargoType: string | null;
  weight: string | null;
  vehicleType: string | null;
  price: string | null;
  extraNotes: string | null;
  contactPhones: string[];
  // Domestic/export/import from origin and destination: which drivers will receive it.
  tripType?: TripType;
}

export interface ExcelImportResult {
  // Published loads; empty on dryRun or when any row has an error (then nothing is published).
  created: Array<{ row: number; id: string; code: string | null; origin: string; destination: string; recipients: number; tripType: TripType; pending: boolean; pendingReason: 'automatic' | 'noDrivers' | null }>;
  rows: ExcelCargoRow[];
  errors: Array<{ row: number; column?: string; message: string }>;
  dryRun: boolean;
}

export const excelUploadLimit = { bytes: 2 * 1024 * 1024, rows: 200 };

// The template is generated by the server, so its columns always match what the import reads.
export async function downloadExcelTemplate() {
  const { data } = await axios.get<Blob>(`${endpoints.baseurl}cargo-listings/excel/template`, { ...config(), responseType: 'blob' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(data);
  link.download = 'cargo-template.xlsx';
  link.click();
  URL.revokeObjectURL(link.href);
}

// dryRun only checks the file and returns the rows; without it every row is published (or none if any is invalid).
export function importExcelListings(file: File, dryRun: boolean) {
  const form = new FormData();
  form.append('file', file);
  return unwrap<ExcelImportResult>(
    axios.post(`${endpoints.baseurl}cargo-listings/excel`, form, { ...config({ dryRun }), timeout: 120000 }),
  );
}

// Nullable fields come back as null rather than omitted.
export type ListingDraft = { [K in keyof CargoListingInput]-?: CargoListingInput[K] | null } & { code: string | null };

// Prefilled fields for publishing a channel suggestion.
export function getSuggestionDraft(notificationId: string) {
  return unwrap<ListingDraft>(axios.get(`${endpoints.baseurl}cargo-notifications/${notificationId}/listing-draft`, config()));
}

// Publishes a suggestion; the backend links the listing to it (409 if already published).
export function publishSuggestion(notificationId: string, input: CargoListingInput) {
  return unwrap<PublishResult>(
    axios.post(`${endpoints.baseurl}cargo-notifications/${notificationId}/publish`, input, config()),
  );
}

export interface CargoSummary {
  suggestions: number;
  unread: number;
  published: number;
  inTransit: number;
  delivered: number;
}

// Totals for the header tiles; each list request asks for a single row and only reads `total`.
export async function getSummary(): Promise<CargoSummary> {
  const total = (path: string, params: Record<string, unknown>) =>
    unwrap<Page<unknown>>(axios.get(`${endpoints.baseurl}${path}`, config({ ...params, page: 1, pageSize: 1 }))).then(
      (page) => page.total,
    );
  const [suggestions, unread, published, inTransit, delivered] = await Promise.all([
    total('cargo-notifications', { kind: 'suggestion' }),
    total('cargo-notifications', { kind: 'suggestion', unreadOnly: true }),
    total('cargo-listings', { stage: 'published' }),
    total('cargo-listings', { stage: 'inTransit' }),
    total('cargo-listings', { stage: 'delivered' }),
  ]);
  return { suggestions, unread, published, inTransit, delivered };
}

// An active trip of the company (transport_backend CargoTripService.companyTripViews), newest first.
export interface CompanyTrip {
  requestId: string;
  startedAt: string;
  deliveryRemindedAt: string | null;
  // the driver reported delivery; «تأیید تحویل» makes it delivered
  deliveryReportedAt: string | null;
  cargo: Pick<CargoDetails, 'code' | 'origin' | 'destination' | 'cargoType' | 'weight' | 'vehicleType' | 'price'> & { id: string } | null;
  driver: DriverCard | null;
  location: { latitude: number; longitude: number; receivedAt: string; liveUntil: string | null } | null;
}

// A driver's pending request for one of the company's loads (CargoTripService.companyRequestViews), oldest first.
export interface CompanyRequest {
  requestId: string;
  requestedAt: string;
  cargo: CompanyTrip['cargo'];
  driver: DriverCard | null;
}

export function listCompanyRequests(page: number) {
  return unwrap<Page<CompanyRequest>>(axios.get(`${endpoints.baseurl}cargo-listings/requests`, config({ page, pageSize: 20 })));
}

export function countCompanyRequests() {
  return unwrap<{ count: number }>(axios.get(`${endpoints.baseurl}cargo-listings/requests/count`, config())).then((r) => r.count);
}

// accept: the driver's trip starts and the load is taken (the other requests are turned down); reject: the driver is told
export function decideCompanyRequest(requestId: string, decision: 'accept' | 'reject') {
  return unwrap<{ requestId: string; status: string }>(
    axios.patch(`${endpoints.baseurl}cargo-listings/requests/${requestId}/${decision}`, {}, config()),
  );
}

export function listCompanyTrips(page: number) {
  return unwrap<Page<CompanyTrip>>(axios.get(`${endpoints.baseurl}cargo-listings/trips`, config({ page, pageSize: 20 })));
}

// Active trips with no delivery registered for `days` days (the panel's reminder banner).
export function getOverdueTrips() {
  return unwrap<{ count: number; days: number }>(axios.get(`${endpoints.baseurl}cargo-listings/trips/overdue`, config()));
}

// «تحویل نشده»: turns the driver's delivery report down; the trip stays active.
export function rejectTripDelivery(requestId: string) {
  return unwrap<{ requestId: string; status: string; deliveryReportedAt: null }>(
    axios.patch(`${endpoints.baseurl}cargo-listings/trips/${requestId}/reject-delivery`, {}, config()),
  );
}

export function deliverTrip(requestId: string) {
  return unwrap<{ requestId: string; status: string; deliveredAt: string }>(
    axios.patch(`${endpoints.baseurl}cargo-listings/trips/${requestId}/deliver`, {}, config()),
  );
}

export function setListingStatus(id: string, status: ListingStatus) {
  return unwrap<CargoListing>(
    axios.patch(`${endpoints.baseurl}cargo-listings/${id}/status`, { status }, config()),
  );
}

// Personal/company profile of the logged-in user (transport_backend UserProfileController).
export type ProfileType = 0 | 1; // CustomerType: 0 = person, 1 = company

export interface UserProfile {
  id: string;
  username: string;
  email: string | null;
  mobile: string | null;
  profileType: ProfileType | null;
  firstName: string | null;
  lastName: string | null;
  nationalCode: string | null;
  companyName: string | null;
  // optional names for domestic and for international (export/import) work; drivers pick the company under each kind
  domesticCompanyName: string | null;
  internationalCompanyName: string | null;
  companyNationalId: string | null;
  economicCode: string | null;
  registrationNo: string | null;
  phone: string | null;
  postalCode: string | null;
  address: string | null;
}

export type ProfileTextField = Exclude<keyof UserProfile, 'id' | 'username' | 'email' | 'mobile' | 'profileType'>;

// null clears a field; omitted fields are left unchanged.
export type UserProfileInput = Partial<Record<ProfileTextField, string | null>> & { profileType?: ProfileType | null };

// Same rules as UpdateUserProfileDto.
export const profileRules: Record<ProfileTextField, { max: number; pattern?: RegExp; message?: string }> = {
  firstName: { max: 100 },
  lastName: { max: 100 },
  nationalCode: { max: 10, pattern: /^[0-9]{10}$/, message: 'کد ملی باید ۱۰ رقم باشد.' },
  companyName: { max: 200 },
  domesticCompanyName: { max: 200 },
  internationalCompanyName: { max: 200 },
  companyNationalId: { max: 11, pattern: /^[0-9]{11}$/, message: 'شناسه ملی شرکت باید ۱۱ رقم باشد.' },
  economicCode: { max: 30 },
  registrationNo: { max: 30 },
  phone: { max: 20, pattern: /^[0-9+\-\s]{4,20}$/, message: 'شماره تلفن معتبر نیست.' },
  postalCode: { max: 10, pattern: /^[0-9]{10}$/, message: 'کد پستی باید ۱۰ رقم باشد.' },
  address: { max: 1000 },
};

// The server does the same conversion; doing it here lets the patterns above check Persian digits too.
export const toLatinDigits = (value: string) =>
  value.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0)).replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));

export function getUserProfile() {
  return unwrap<UserProfile>(axios.get(`${endpoints.baseurl}users/me/profile`, config()));
}

export function updateUserProfile(input: UserProfileInput) {
  return unwrap<UserProfile>(axios.patch(`${endpoints.baseurl}users/me/profile`, input, config()));
}

// Which new cargo reaches this user (transport_backend CargoAlertFilterService): each list is matched by
// "contains", an empty list means any, all lists of a filter must match, and one matching filter is enough.
// With no active filter every cargo comes through. Filters apply to cargo that arrives after saving.
export interface CargoFilter {
  id: string;
  label: string | null;
  origins: string[];
  destinations: string[];
  cargoTypes: string[];
  vehicleTypes: string[];
  // Publishing company names; only drivers set this (channel cargo has no company).
  companies: string[];
  // Fare range in toman; null means no bound. Cargo whose fare cannot be read does not match a range.
  minPrice: number | null;
  maxPrice: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CargoFilterInput = Partial<Pick<CargoFilter, 'origins' | 'destinations' | 'cargoTypes' | 'vehicleTypes' | 'companies' | 'minPrice' | 'maxPrice' | 'isActive'>> & {
  label?: string | null;
};

// Same limits as CreateCargoAlertFilterDto.
export const filterLimits = { label: 150, items: 50, item: 100, price: 1_000_000_000_000 };

export function listCargoFilters() {
  return unwrap<CargoFilter[]>(axios.get(`${endpoints.baseurl}cargo-alert-filters`, config()));
}

export function createCargoFilter(input: CargoFilterInput) {
  return unwrap<CargoFilter>(axios.post(`${endpoints.baseurl}cargo-alert-filters`, input, config()));
}

export function updateCargoFilter(id: string, input: CargoFilterInput) {
  return unwrap<CargoFilter>(axios.put(`${endpoints.baseurl}cargo-alert-filters/${id}`, input, config()));
}

export function deleteCargoFilter(id: string) {
  return unwrap(axios.delete(`${endpoints.baseurl}cargo-alert-filters/${id}`, config()));
}

// «برداشته شد»: drivers who asked for this load, and the one currently waiting to confirm.
export function getCandidates(listingId: string) {
  return unwrap<{ drivers: DriverCard[]; offer: { requestId: string; expiresAt: string; driver: DriverCard | null } | null }>(
    axios.get(`${endpoints.baseurl}cargo-listings/${listingId}/candidates`, config()),
  );
}

// Another driver of the platform by full mobile number or plate.
export function searchDrivers(listingId: string, query: string) {
  return unwrap<DriverCard[]>(axios.get(`${endpoints.baseurl}cargo-listings/${listingId}/candidates/search`, config({ q: query })));
}

// Hand the load to a driver; it is taken once the driver confirms.
export function offerLoad(listingId: string, driverUserId: string) {
  return unwrap<{ id: string; status: string; offerExpiresAt: string }>(
    axios.post(`${endpoints.baseurl}cargo-listings/${listingId}/offer`, { driverUserId }, config()),
  );
}

// The photo endpoint needs the token, so it is fetched as a blob for an object URL.
export async function fetchDriverPhoto(driverUserId: string, kind: 'face' | 'vehicle') {
  const { data } = await axios.get<Blob>(`${endpoints.baseurl}cargo-listings/drivers/${driverUserId}/photos/${kind}`, {
    ...config(),
    responseType: 'blob',
  });
  return URL.createObjectURL(data);
}
