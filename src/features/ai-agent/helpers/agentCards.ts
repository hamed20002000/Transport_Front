import type { CargoListing, CargoSuggestion } from 'src/features/company-cargo/api';
import type { Channel } from 'src/features/company-cargo/channelsApi';
import type { OpenLoad } from 'src/features/driver-panel/api';

/**
 * Items the agent returns in `list` (transport_backend AgentListItem). The cargo, channel and driver load tools send
 * the same shapes as their page APIs, tagged with `kind`; other tools send nothing for now.
 */
export type AgentListItem =
  | (CargoSuggestion & { kind: 'cargo_suggestion' })
  | (CargoListing & { kind: 'cargo_listing' })
  | (Channel & { kind: 'company_channel' })
  | (OpenLoad & { kind: 'driver_load' })
  | { kind: string; id: string };

export type SuggestionItem = CargoSuggestion & { kind: 'cargo_suggestion' };
export type ListingItem = CargoListing & { kind: 'cargo_listing' };
export type ChannelItem = Channel & { kind: 'company_channel' };
export type DriverLoadItem = OpenLoad & { kind: 'driver_load' };

export function isSuggestion(item: AgentListItem): item is SuggestionItem {
  return item.kind === 'cargo_suggestion';
}

export function isListing(item: AgentListItem): item is ListingItem {
  return item.kind === 'cargo_listing';
}

export function isChannel(item: AgentListItem): item is ChannelItem {
  return item.kind === 'company_channel';
}

export function isDriverLoad(item: AgentListItem): item is DriverLoadItem {
  return item.kind === 'driver_load';
}

/** True when the agent answer carries cards the chat knows how to draw. */
export function hasAgentCards(list?: unknown[]): list is AgentListItem[] {
  return !!list?.some((item) => [isSuggestion, isListing, isChannel, isDriverLoad].some((is) => is(item as AgentListItem)));
}
