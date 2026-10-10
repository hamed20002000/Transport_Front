import { useState } from 'react';
import { useAgentNotice } from 'src/features/ai-agent/helpers/useAgentNotice';
import type { CargoListing, CargoSuggestion } from 'src/features/company-cargo/api';
import { useListingToggle, useSuggestionActions } from 'src/features/company-cargo/cargoActions';
import { ListingCard, SuggestionCard } from 'src/features/company-cargo/cargoCards';
import { CARGO_CHANGED_EVENT } from 'src/features/company-cargo/cargoText';
import { isListing, isSuggestion, type AgentListItem } from 'src/features/ai-agent/helpers/agentCards';

// Above the chat panel (.agent-modal-shell is at 4000001).
const DIALOG_LAYER = 4000100;

/**
 * Cargo cards under an agent answer (e.g. «لیست بارهای مبدا بجنورد») with the same cards and buttons
 * as the company cargo tabs, so the user does not have to go there and filter. The cargo pages and
 * filters are not touched; the tabs refresh themselves from the server.
 */
export default function AgentCargoList({ items: initial }: { items: AgentListItem[] }) {
  const [items, setItems] = useState(initial);
  const { notify, element: notice } = useAgentNotice();

  const replace = (updated: CargoSuggestion | CargoListing, kind: AgentListItem['kind']) =>
    setItems((current) => current.map((row) => (row.id === updated.id ? ({ ...updated, kind } as AgentListItem) : row)));

  // An open company cargo page reloads too.
  const onChanged = () => window.dispatchEvent(new Event(CARGO_CHANGED_EVENT));

  const suggestions = useSuggestionActions({
    update: (item) => replace(item, 'cargo_suggestion'),
    onChanged,
    notify,
    dialogLayer: DIALOG_LAYER,
  });
  const listings = useListingToggle({ update: (listing) => replace(listing, 'cargo_listing'), onChanged, notify, dialogLayer: DIALOG_LAYER });

  return (
    // Clicks inside the cards must not trigger the clickable operation card around them.
    <div className="agent-card-area tw-mt-2 tw-w-full tw-min-w-0 tw-space-y-2" dir="rtl" onClick={(event) => event.stopPropagation()}>
      {notice}
      {/* Columns follow the width of this area (container query in AiAgentPage.css): a grid in the large panel, one column when minimized. */}
      <ul className="agent-card-list tw-m-0 tw-grid tw-min-w-0 tw-list-none tw-gap-3 tw-p-0">
        {items.map((item) =>
          isSuggestion(item) ? (
            <SuggestionCard
              key={item.id}
              item={item}
              onRead={() => suggestions.markRead(item)}
              onAnnounce={() => suggestions.announce(item)}
            />
          ) : isListing(item) ? (
            <ListingCard
              key={item.id}
              listing={item}
              saving={listings.savingId === item.id}
              disabled={!!listings.savingId}
              onToggle={() => listings.toggle(item)}
            />
          ) : null,
        )}
      </ul>
      {suggestions.dialog}
      {listings.dialog}
    </div>
  );
}
