import axios from 'axios';
import endpoints from 'src/core/config/endpoints.json';

export type ListingStatus = 'OPEN' | 'TAKEN';

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
}

export interface CargoSuggestion {
  id: string;
  sourceMessageId: string;
  text: string;
  cargo: CargoDetails;
  // The copy of this cargo that the company has already published, if any.
  published: { id: string; status: ListingStatus } | null;
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
  createdAt: string;
  // The driver the load was handed to («برداشته شد»): waiting for them (OFFERED), on the trip or delivered.
  assignment?: CargoAssignment | null;
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

export function listMyListings(page: number, status?: ListingStatus) {
  return unwrap<Page<CargoListing>>(
    axios.get(`${endpoints.baseurl}cargo-listings`, config({ status, page, pageSize: 20 })),
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

export function createListing(input: CargoListingInput) {
  return unwrap<CargoListing & { recipients: number }>(
    axios.post(`${endpoints.baseurl}cargo-listings`, input, config()),
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
  return unwrap<CargoListing & { recipients: number }>(
    axios.post(`${endpoints.baseurl}cargo-notifications/${notificationId}/publish`, input, config()),
  );
}

export interface CargoSummary {
  suggestions: number;
  unread: number;
  open: number;
  taken: number;
}

// Totals for the header tiles; each list request asks for a single row and only reads `total`.
export async function getSummary(): Promise<CargoSummary> {
  const total = (path: string, params: Record<string, unknown>) =>
    unwrap<Page<unknown>>(axios.get(`${endpoints.baseurl}${path}`, config({ ...params, page: 1, pageSize: 1 }))).then(
      (page) => page.total,
    );
  const [suggestions, unread, open, taken] = await Promise.all([
    total('cargo-notifications', { kind: 'suggestion' }),
    total('cargo-notifications', { kind: 'suggestion', unreadOnly: true }),
    total('cargo-listings', { status: 'OPEN' }),
    total('cargo-listings', { status: 'TAKEN' }),
  ]);
  return { suggestions, unread, open, taken };
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
