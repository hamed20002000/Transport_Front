import { useState } from 'react';
import { cn } from 'src/shared/utils/utils';

/**
 * Outcome of an action taken on agent answer cards. Toasts sit under the chat panel, so the message is
 * shown above the cards instead; `notify` has the same shape the page action hooks take.
 */
export function useAgentNotice() {
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const notify = {
    success: (text: string) => setNotice({ tone: 'success', text }),
    error: (text: string) => setNotice({ tone: 'error', text }),
  };
  const element = notice && (
    <p
      role="status"
      className={cn(
        'tw-m-0 tw-rounded-xl tw-px-3 tw-py-2 tw-text-sm',
        notice.tone === 'success' ? 'tw-bg-emerald-50 tw-text-emerald-800' : 'tw-bg-red-50 tw-text-red-800',
      )}
    >
      {notice.text}
    </p>
  );
  return { notify, element };
}
