import axios from 'axios';
import endpoints from 'src/core/config/endpoints.json';
import { config, unwrap } from '../api';
import type { BrokerPayModel, TripFareForm, TripFareInput, TripFareStage } from './tripFare';

// transport_backend CargoListingController: the company's fare forms and the actions that record a TripFare.
const base = `${endpoints.baseurl}cargo-listings`;

/** The form of a request (AGREED, when accepting it) or a trip (DELIVERED, when confirming its delivery). */
export function getFareForm(requestId: string, stage: TripFareStage) {
  return unwrap<TripFareForm>(axios.get(`${base}/requests/${requestId}/fare-form`, config({ stage })));
}

/** The form of a load handed to a driver: from the load's own price and weight. */
export function getOfferFareForm(listingId: string) {
  return unwrap<TripFareForm>(axios.get(`${base}/${listingId}/offer/fare-form`, config()));
}

/** Accept a request with the agreed fare and weight (and, for a broker's request, how the broker is paid). */
export function acceptRequest(requestId: string, fare: TripFareInput, payModel?: BrokerPayModel | null) {
  return unwrap<{ requestId: string; status: string }>(
    axios.patch(`${base}/requests/${requestId}/accept`, { fare, payModel: payModel ?? undefined }, config()),
  );
}

/** Confirm (or record) a delivery with the final fare and weight. */
export function deliverTrip(requestId: string, fare: TripFareInput) {
  return unwrap<{ requestId: string; status: string; deliveredAt: string }>(axios.patch(`${base}/trips/${requestId}/deliver`, { fare }, config()));
}

/** Hand the load to a driver with the agreed fare; it is taken once the driver confirms. */
export function offerLoad(listingId: string, driverUserId: string, fare: TripFareInput) {
  return unwrap<{ id: string; status: string; offerExpiresAt: string }>(axios.post(`${base}/${listingId}/offer`, { driverUserId, fare }, config()));
}
