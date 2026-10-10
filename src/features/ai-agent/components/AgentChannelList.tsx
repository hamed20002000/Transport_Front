import { useState } from 'react';
import { useAgentNotice } from 'src/features/ai-agent/helpers/useAgentNotice';
import { useChannelRemove, CHANNELS_CHANGED_EVENT } from 'src/features/company-cargo/channelActions';
import { ChannelRow } from 'src/features/company-cargo/channelCards';
import type { ChannelItem } from 'src/features/ai-agent/helpers/agentCards';

/**
 * Channel cards under an agent answer (list_company_channels) with the same card and «حذف لینک» as the
 * channels page; an open channels page reloads after a change.
 */
export default function AgentChannelList({ items: initial }: { items: ChannelItem[] }) {
  const [items, setItems] = useState(initial);
  const { notify, element: notice } = useAgentNotice();
  const { remove, removingId } = useChannelRemove({
    onRemoved: (channel) => setItems((current) => current.filter((row) => row.id !== channel.id)),
    onChanged: () => window.dispatchEvent(new Event(CHANNELS_CHANGED_EVENT)),
    notify,
  });

  return (
    // Clicks inside the cards must not trigger the clickable operation card around them.
    <div className="agent-card-area tw-mt-2 tw-w-full tw-min-w-0 tw-space-y-2" dir="rtl" onClick={(event) => event.stopPropagation()}>
      {notice}
      {/* Columns follow the width of this area (container query in AiAgentPage.css): a grid in the large panel, one column when minimized. */}
      <ul className="agent-card-list tw-m-0 tw-grid tw-min-w-0 tw-list-none tw-gap-3 tw-p-0">
        {items.map((channel) => (
          <ChannelRow key={`${channel.platform}-${channel.id}`} channel={channel} removing={removingId === channel.id} onRemove={() => remove(channel)} />
        ))}
      </ul>
    </div>
  );
}
