import { useState } from 'react';
import { useListingContactEvent } from 'src/features/driver-panel/loadEvents';
import { LoadCard, useLoadActions } from 'src/features/driver-panel/DriverLoads';
import { DRIVER_LOADS_CHANGED_EVENT } from 'src/features/driver-panel/loadEvents';
import type { OpenLoad } from 'src/features/driver-panel/api';
import type { DriverLoadItem } from 'src/features/ai-agent/helpers/agentCards';
import { useAgentNotice } from 'src/features/ai-agent/helpers/useAgentNotice';

// Above the chat panel (.agent-modal-shell is at 4000001).
const DIALOG_LAYER = 4000100;

/**
 * Open loads under an agent answer (list_driver_loads) with the same card and buttons as the driver
 * loads page: «مسیر و جزئیات» and «درخواست بار». An open loads page reloads after a request.
 */
export default function AgentDriverLoadList({ items: initial }: { items: DriverLoadItem[] }) {
  const [items, setItems] = useState(initial);
  // the company changed its phone or name while these cards are in the chat
  useListingContactEvent((contact) => setItems((current) => current.map(contact)));
  const { notify, element: notice } = useAgentNotice();
  const actions = useLoadActions(
    (id: string, patch: Partial<OpenLoad>) => setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item))),
    { notify, dialogLayer: DIALOG_LAYER, onChanged: () => window.dispatchEvent(new Event(DRIVER_LOADS_CHANGED_EVENT)) },
  );

  return (
    // Clicks inside the cards must not trigger the clickable operation card around them.
    <div className="agent-card-area tw-mt-2 tw-w-full tw-min-w-0 tw-space-y-2" dir="rtl" onClick={(event) => event.stopPropagation()}>
      {notice}
      {/* Columns follow the width of this area (container query in AiAgentPage.css): a grid in the large panel, one column when minimized. */}
      <ul className="agent-card-list tw-m-0 tw-grid tw-min-w-0 tw-list-none tw-gap-3 tw-p-0">
        {items.map((load) => (
          <LoadCard
            key={load.id}
            load={load}
            requesting={actions.requestingId === load.id}
            onDetails={() => actions.openDetails(load)}
            onRequest={() => actions.request(load)}
            onAnswered={(request) =>
              setItems((current) => current.map((item) => (item.id === load.id ? { ...item, myRequest: { id: request.id, status: request.status } } : item)))
            }
          />
        ))}
      </ul>
      {actions.dialog}
    </div>
  );
}
