import axios from 'axios';
import { FileText, Image } from 'lucide-react';
import endpoints from 'src/core/config/endpoints.json';
import { useToast } from 'src/shared/components/toast/ToastProvider';
import { updateUserProfile } from './api';
import { Segmented } from './components';
import { setCachedProfile, useProfile } from './profileStore';

// Loads shown as text (their fields) or with a picture too: the load's photo, or one of its kind of cargo made by the
// server (transport_backend CargoImageService). One choice per user, the same in the messengers.

export type CargoDisplay = 'TEXT' | 'IMAGE';

// A load's picture keeps its address, so browsers and the app keep it a day (Cache-Control, service worker): raise
// this when the stock photos change (transport_backend src/assets/cargo-kinds) and every card asks for the new one.
const PICTURES_VERSION = 2;

// the picture across the top of a load's card: the messengers' size (640×400), sharp at a card's full width
export const listingImageUrl = (listingId: string) => `${endpoints.baseurl}cargo-images/listing/${listingId}?v=${PICTURES_VERSION}`;
export const suggestionImageUrl = (notificationId: string) => `${endpoints.baseurl}cargo-images/suggestion/${notificationId}?v=${PICTURES_VERSION}`;

/** A photo of a load, before registering it; its name goes with the load (CargoListingInput.photo). */
export async function uploadCargoPhoto(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await axios.post<{ success: boolean; data: { photo: string } }>(`${endpoints.baseurl}cargo-photos`, form, {
    headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
    timeout: 60000,
  });
  if (!data.success || !data.data?.photo) throw new Error('بارگذاری عکس انجام نشد.');
  return data.data.photo;
}

/** The user's choice (from the shared profile) and a setter that saves it. */
export function useCargoDisplay(): [CargoDisplay, (mode: CargoDisplay) => Promise<void>] {
  const profile = useProfile();
  const mode: CargoDisplay = profile?.cargoDisplay === 'IMAGE' ? 'IMAGE' : 'TEXT';
  const set = async (next: CargoDisplay) => {
    if (next !== mode) setCachedProfile(await updateUserProfile({ cargoDisplay: next }));
  };
  return [mode, set];
}

/** «متنی | تصویری» above a list of loads. */
export function CargoDisplayToggle() {
  const toast = useToast();
  const [mode, setMode] = useCargoDisplay();
  return (
    <Segmented
      label="نحوه‌ی نمایش بار"
      value={mode}
      onChange={(next) => setMode(next).catch(() => toast.error('ذخیره‌ی نحوه‌ی نمایش انجام نشد.'))}
      options={[
        { value: 'TEXT' as const, label: 'متنی', icon: FileText },
        { value: 'IMAGE' as const, label: 'تصویری', icon: Image },
      ]}
    />
  );
}

/** The picture across the top of a load's card, its details below (16:10, loaded only when scrolled to). */
export function CargoPicture({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} loading="lazy" width={640} height={400} className="tw-block tw-aspect-[16/10] tw-h-auto tw-w-full tw-bg-brand-sky tw-object-cover" />;
}
