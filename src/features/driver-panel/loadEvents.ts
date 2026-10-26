import { useEffect } from 'react';
import { useNotificationEvent } from 'src/features/company-cargo/notificationSocket';
import type { CargoListing, CargoRequest } from './api';

/**
 * Fired on window when a load is requested from outside the loads pages (the agent chat cards), so an
 * open loads page reloads.
 */
export const DRIVER_LOADS_CHANGED_EVENT = 'driver-loads-changed';

/** Reloads on a request from the chat cards and on any change to the driver's own requests (offers included). */
export function useLoadsChangedEvent(reload: () => void) {
  // CargoTripService: a company handed a load to this driver, or an offer ended
  useNotificationEvent('cargo-request-changed', reload);
  useEffect(() => {
    window.addEventListener(DRIVER_LOADS_CHANGED_EVENT, reload);
    return () => window.removeEventListener(DRIVER_LOADS_CHANGED_EVENT, reload);
  }, [reload]);
}

/** A load whose company changed the name or phone on its profile (CargoContactSync in transport_backend). */
export interface ListingContact {
  id: string;
  companyName: string | null;
  contactPhones: string[];
}

export type ContactUpdate = <T extends CargoListing>(listing: T) => T;

/**
 * A company changed the name or phone on its profile: the loads on screen show the new ones at once. The event
 * carries the changed loads themselves and reaches every driver, so nothing is fetched again (a thousand drivers
 * on the loads page cost no request).
 */
export function useListingContactEvent(apply: (update: ContactUpdate) => void) {
  useNotificationEvent<{ items: ListingContact[] }>('cargo-listing-contact', (event) => {
    const byId = new Map(event.items.map((item) => [item.id, item]));
    apply((listing) => {
      const next = byId.get(listing.id);
      return next ? { ...listing, companyName: next.companyName, contactPhones: next.contactPhones } : listing;
    });
  });
}

/** The same update for the load inside each request or trip. */
export const onRequest =
  (update: ContactUpdate) =>
  (request: CargoRequest): CargoRequest =>
    request.listing ? { ...request, listing: update(request.listing) } : request;
