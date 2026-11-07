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

/** A list written as text: the lines before it (its title) and its items. */
export interface AgentTextList {
  title: string;
  items: string[];
}

// a line that starts an item: «•», «-», «▪️», «۱.»، «2)», «۳-»
const ITEM_LINE = /^\s*(?:[•●▪▫◾◽\-–*]️?|[0-9۰-۹]+\s*[.)\-ـ](?!\d))\s*/;
// fewer than this is an answer with a few points, not a list
const MIN_TEXT_ITEMS = 3;

/**
 * An answer without cards that is still a list (the borders of a crossing, the filters, the plans): its item lines
 * and the title above them; null for any other answer. The lines under an item (not items themselves) stay with it.
 */
export function textList(message?: string): AgentTextList | null {
  if (!message) return null;
  const title: string[] = [];
  const items: string[] = [];
  for (const raw of message.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (ITEM_LINE.test(line)) items.push(line.replace(ITEM_LINE, ''));
    else if (items.length) items[items.length - 1] += `\n${line}`;
    else title.push(line);
  }
  return items.length >= MIN_TEXT_ITEMS ? { title: title.join(' '), items } : null;
}
