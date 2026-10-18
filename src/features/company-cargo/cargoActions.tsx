import { useCallback, useState } from 'react';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { announceListing, markSuggestionRead, setListingStatus, type CargoListing, type CargoSuggestion, type DriverCard } from './api';
import AssignDriverDialog from './AssignDriverDialog';
import { AnnounceDialog } from './cargoCards';
import { errorMessage } from './cargoText';
import type { PublishedListing } from './ListingForm';

// Actions on the cargo cards, shared by the company cargo tabs and the agent chat.

/** What happened, for the user: the tabs use toasts; the chat shows it on the card (toasts sit under the chat panel). */
export interface CargoNotify {
  success: (message: string) => void;
  error: (message: string) => void;
}

function useNotify(notify?: CargoNotify): CargoNotify {
  const toast = useToast();
  return notify ?? { success: (message) => toast.success(message), error: (message) => toast.error(message) };
}

/**
 * «اعلام بار» and «خوانده شد» on a suggestion. `update` puts the changed item back into the caller's
 * list; render `dialog` somewhere in the caller.
 */
export function useSuggestionActions({
  update,
  onChanged,
  notify,
  dialogLayer,
}: {
  update: (item: CargoSuggestion) => void;
  onChanged?: () => void;
  notify?: CargoNotify;
  dialogLayer?: number;
}) {
  const say = useNotify(notify);
  const [announcing, setAnnouncing] = useState<CargoSuggestion | null>(null);
  const close = useCallback(() => setAnnouncing(null), []);

  async function markRead(item: CargoSuggestion) {
    try {
      await markSuggestionRead(item.id);
      update({ ...item, isRead: true });
      onChanged?.();
    } catch (e) {
      say.error(errorMessage(e));
    }
  }

  function published(item: CargoSuggestion, listing: PublishedListing) {
    setAnnouncing(null);
    update({ ...item, published: { id: listing.id, status: listing.status, announcedAt: listing.announcedAt } });
    say.success(listing.message ?? (listing.pending ? 'بار ثبت شد و هنوز اعلام نشده است.' : `بار اعلام شد و برای ${listing.recipients.toLocaleString('fa-IR')} راننده ارسال شد.`));
    onChanged?.();
  }

  const dialog = announcing && (
    <AnnounceDialog item={announcing} layer={dialogLayer} onClose={close} onPublished={(listing) => published(announcing, listing)} />
  );
  async function announce(item: CargoSuggestion) {
    if (item.published?.announcedAt === null && item.published.status === 'OPEN') {
      try {
        published(item, await announceListing(item.published.id));
      } catch (error) {
        say.error(errorMessage(error));
      }
      return;
    }
    setAnnouncing(item);
  }
  return { markRead, announce, dialog };
}

/**
 * «برداشته شد» opens the driver picker (AssignDriverDialog): the company picks the driver, the driver
 * confirms, and only then the load is taken. «بازگرداندن» reopens a taken load as before. `update` gets
 * the listing as it should now look; render `dialog` somewhere in the caller.
 */
export function useListingToggle({
  update,
  onChanged,
  notify,
  dialogLayer,
}: {
  update: (listing: CargoListing) => void;
  onChanged?: () => void;
  notify?: CargoNotify;
  dialogLayer?: number;
}) {
  const say = useNotify(notify);
  const [savingId, setSavingId] = useState('');
  const [assigning, setAssigning] = useState<CargoListing | null>(null);
  const close = useCallback(() => setAssigning(null), []);

  async function toggle(listing: CargoListing) {
    if (listing.status === 'OPEN') {
      setAssigning(listing);
      return;
    }
    setSavingId(listing.id);
    try {
      update(await setListingStatus(listing.id, 'OPEN'));
      say.success('بار دوباره باز شد.');
      onChanged?.();
    } catch (e) {
      say.error(errorMessage(e));
    } finally {
      setSavingId('');
    }
  }

  function offered(listing: CargoListing, driver: DriverCard, expiresAt: string) {
    setAssigning(null);
    update({ ...listing, assignment: { requestId: '', status: 'OFFERED', at: new Date().toISOString(), offerExpiresAt: expiresAt, driver } });
    say.success(`پیام تأیید برای ${driver.name} رفت؛ بعد از تأیید راننده، بار «برداشته شد» می‌شود.`);
    onChanged?.();
  }

  const dialog = assigning && (
    <AssignDriverDialog
      listing={assigning}
      layer={dialogLayer}
      onClose={close}
      onOffered={(driver, expiresAt) => offered(assigning, driver, expiresAt)}
    />
  );
  return { toggle, savingId, dialog };
}
