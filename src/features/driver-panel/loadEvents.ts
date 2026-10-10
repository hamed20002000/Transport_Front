import { useEffect } from 'react';
import { useNotificationEvent } from 'src/features/company-cargo/notificationSocket';

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
