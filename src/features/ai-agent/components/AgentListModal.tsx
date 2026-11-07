import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { List, X } from 'lucide-react';

// Above the chat panel (.agent-modal-shell is at 4000001), below the cards' own dialogs (4000100 and up).
const LIST_LAYER = 4000050;

/**
 * An agent answer that is a list (cards, or a text list): shown here, apart from the chat, which only says the list
 * is ready. Kept mounted while closed, so what was done on its cards (a request sent, a load closed) stays when it
 * is opened again.
 */
export default function AgentListModal({
  open,
  title,
  count,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  count: number;
  onClose: () => void;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      // a card's own dialog on top closes first
      if (event.key === 'Escape' && !event.defaultPrevented) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [open, onClose]);

  return createPortal(
    <div
      // closed by a class, not the hidden attribute: tw-flex (display: flex) would win over [hidden] and keep it shown
      aria-hidden={!open}
      style={{ zIndex: LIST_LAYER }}
      className={`tw-fixed tw-inset-0 tw-items-end tw-justify-center tw-bg-brand-navy/40 sm:tw-items-center sm:tw-p-6 ${open ? 'tw-flex' : 'tw-hidden'}`}
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        dir="rtl"
        className="tw-flex tw-max-h-[94vh] tw-w-full tw-flex-col tw-rounded-t-3xl tw-bg-brand-bg tw-text-brand-navy tw-shadow-2xl tw-outline-none sm:tw-max-w-5xl sm:tw-rounded-3xl"
      >
        <div className="tw-flex tw-items-start tw-justify-between tw-gap-3 tw-border-b tw-border-brand-line tw-p-4 sm:tw-px-6">
          <div className="tw-flex tw-min-w-0 tw-items-center tw-gap-2">
            <List size={18} aria-hidden className="tw-shrink-0 tw-text-brand-orange" />
            <h2 className="tw-m-0 tw-truncate tw-text-base tw-font-bold sm:tw-text-lg">{title}</h2>
            <span className="tw-shrink-0 tw-rounded-full tw-bg-brand-orange-soft tw-px-2 tw-py-0.5 tw-text-xs tw-font-bold">
              {count.toLocaleString('fa-IR')} مورد
            </span>
          </div>
          <button type="button" onClick={onClose} aria-label="بستن" className="tw-rounded-lg tw-border-0 tw-bg-transparent tw-p-1.5 tw-text-brand-muted hover:tw-bg-brand-sky">
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="chat-cards tw-min-h-0 tw-flex-1 tw-overflow-y-auto tw-overscroll-contain tw-p-4 sm:tw-px-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

/** A text list (lines of «•» or «۱.») as rows, for the answers that come without cards. */
export function AgentTextList({ items }: { items: string[] }) {
  return (
    <ul className="tw-m-0 tw-list-none tw-space-y-2 tw-p-0" dir="rtl">
      {items.map((item, index) => (
        <li key={index} className="tw-whitespace-pre-line tw-rounded-2xl tw-border tw-border-brand-line tw-bg-white tw-px-4 tw-py-3 tw-text-sm">
          {item}
        </li>
      ))}
    </ul>
  );
}
