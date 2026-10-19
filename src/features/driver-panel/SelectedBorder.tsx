import { useState } from 'react';
import { ChevronDown, LogOut } from 'lucide-react';
import { SecondaryButton } from 'src/features/company-cargo/components';
import type { BorderStatus } from './api';
import { BorderCard } from './borderCard';

// The border chosen on the map, shown on the map itself: basic info, «جزئیات» for the rest, «خروج» back to all of Iran.
export function SelectedBorder({ status, onExit }: { status: BorderStatus; onExit: () => void }) {
  const [details, setDetails] = useState(false);
  return (
    // Only the card scrolls (long details); the buttons stay at the bottom of the panel, always in view.
    <div className="tw-flex tw-min-h-0 tw-flex-col tw-gap-2 tw-rounded-2xl tw-bg-white/95 tw-p-2 tw-shadow-xl tw-backdrop-blur">
      <div className="tw-min-h-0 tw-flex-1 tw-overflow-y-auto tw-rounded-2xl">
        <BorderCard status={status} open={details} onToggle={() => setDetails((value) => !value)} />
      </div>
      <div className="tw-flex tw-shrink-0 tw-flex-wrap tw-gap-2 tw-px-1 tw-pb-1">
        <SecondaryButton onClick={() => setDetails((value) => !value)}>
          <ChevronDown size={16} aria-hidden className={details ? 'tw-rotate-180' : undefined} /> {details ? 'بستن جزئیات' : 'جزئیات'}
        </SecondaryButton>
        <SecondaryButton onClick={onExit}>
          <LogOut size={16} aria-hidden /> خروج از این مرز
        </SecondaryButton>
      </div>
    </div>
  );
}
