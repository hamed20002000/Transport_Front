import axios from 'axios';
import endpoints from 'src/core/config/endpoints.json';

export type ListingStatus = 'OPEN' | 'TAKEN';

// Mirrors CargoDetectedEvent in transport_backend (domain/constants/cargoEvents.ts).
export interface CargoDetails {
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
