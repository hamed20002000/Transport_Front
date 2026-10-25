import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { CircleCheck, Info, TriangleAlert, Trash2 } from 'lucide-react';
import { cn } from 'src/shared/utils/utils';

// danger: something is removed or undone (red button, Cancel focused); primary: an ordinary decision
type MessageTone = 'primary' | 'danger' | 'success' | 'info';

export interface MessageBoxOptions {
  message: ReactNode;
  title?: string;
  tone?: MessageTone;
  confirmText?: string;
  cancelText?: string;
}

interface MessageBoxApi {
  /** Asks a yes/no question; resolves true only when the user confirms (Esc, Cancel or a click outside → false). */
  confirm: (options: MessageBoxOptions | string) => Promise<boolean>;
  /** Shows a message with a single OK button; resolves when it is closed. */
  alert: (options: MessageBoxOptions | string) => Promise<void>;
}

interface Request extends MessageBoxOptions {
  id: number;
  kind: 'confirm' | 'alert';
  resolve: (confirmed: boolean) => void;
}

const MessageBoxContext = createContext<MessageBoxApi | null>(null);

const tones: Record<MessageTone, { icon: typeof Info; iconTone: string; button: string; title: string }> = {
  primary: {
    icon: Info,
    iconTone: 'tw-bg-brand-orange-soft tw-text-brand-orange-ink',
    button: 'tw-bg-brand-orange hover:tw-bg-brand-orange-dark',
    title: 'تأیید می‌کنید؟',
  },
  danger: {
    icon: Trash2,
    iconTone: 'tw-bg-red-50 tw-text-red-600',
    button: 'tw-bg-red-600 hover:tw-bg-red-700',
    title: 'مطمئن هستید؟',
  },
  success: {
    icon: CircleCheck,
    iconTone: 'tw-bg-emerald-50 tw-text-emerald-600',
    button: 'tw-bg-brand-orange hover:tw-bg-brand-orange-dark',
    title: 'انجام شد',
  },
  info: {
    icon: TriangleAlert,
    iconTone: 'tw-bg-amber-50 tw-text-amber-600',
    button: 'tw-bg-brand-orange hover:tw-bg-brand-orange-dark',
    title: 'توجه',
  },
};

/**
 * The app's own confirm/alert dialog, instead of the browser's: same look in every browser, Persian and RTL, and
 * above everything (the assistant panel too). Several requests wait their turn and are shown one after another.
 */
export function MessageBoxProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Request[]>([]);
  const nextId = useRef(0);

  const open = useCallback((kind: Request['kind'], options: MessageBoxOptions | string) => {
    const fields = typeof options === 'string' ? { message: options } : options;
    return new Promise<boolean>((resolve) => {
      setQueue((current) => [...current, { ...fields, id: ++nextId.current, kind, resolve }]);
    });
  }, []);

  const close = useCallback((confirmed: boolean) => {
    setQueue(([first, ...rest]) => {
      first?.resolve(confirmed);
      return rest;
    });
  }, []);

  const api = useMemo<MessageBoxApi>(
    () => ({
      confirm: (options) => open('confirm', options),
      alert: (options) => open('alert', options).then(() => undefined),
    }),
    [open],
  );

  const current = queue[0];
  const tone = tones[current?.tone ?? (current?.kind === 'alert' ? 'info' : 'primary')];
  const Icon = tone.icon;

  return (
    <MessageBoxContext.Provider value={api}>
      {children}
      <DialogPrimitive.Root open={!!current} onOpenChange={(isOpen) => !isOpen && close(false)}>
        <AnimatePresence>
          {current && (
            <DialogPrimitive.Portal forceMount key={current.id}>
              <div className="admin-shell" dir="rtl" lang="fa">
                <DialogPrimitive.Overlay asChild forceMount>
                  <motion.div
                    className="tw-fixed tw-inset-0 tw-z-[4000300] tw-bg-slate-950/40 tw-backdrop-blur-[2px]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  />
                </DialogPrimitive.Overlay>
                <DialogPrimitive.Content
                  asChild
                  forceMount
                  // a removal waits for a deliberate click: Enter must not confirm it
                  onOpenAutoFocus={(event) => {
                    event.preventDefault();
                    const target = current.tone === 'danger' ? '[data-message-cancel]' : '[data-message-confirm]';
                    (event.currentTarget as HTMLElement | null)?.querySelector<HTMLElement>(target)?.focus();
                  }}
                >
                  <div
                    className="tw-fixed tw-inset-0 tw-z-[4000301] tw-flex tw-items-center tw-justify-center tw-p-4"
                    onClick={(event) => event.target === event.currentTarget && close(false)}
                  >
                    <motion.div
                      className="tw-w-full tw-max-w-sm tw-rounded-3xl tw-bg-white tw-p-6 tw-text-center tw-shadow-2xl tw-ring-1 tw-ring-black/5"
                      initial={{ opacity: 0, y: 16, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.97, transition: { duration: 0.14 } }}
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    >
                      <span className={cn('tw-mx-auto tw-flex tw-h-14 tw-w-14 tw-items-center tw-justify-center tw-rounded-2xl', tone.iconTone)}>
                        <Icon size={26} aria-hidden />
                      </span>
                      <DialogPrimitive.Title className="tw-m-0 tw-mt-4 tw-text-lg tw-font-bold tw-text-brand-navy">
                        {current.title ?? tone.title}
                      </DialogPrimitive.Title>
                      <DialogPrimitive.Description asChild>
                        <div className="tw-mt-2 tw-text-sm tw-leading-7 tw-text-brand-muted">{current.message}</div>
                      </DialogPrimitive.Description>
                      <div className="tw-mt-6 tw-flex tw-gap-2">
                        <button
                          type="button"
                          data-message-confirm
                          onClick={() => close(true)}
                          className={cn(
                            'tw-h-11 tw-flex-1 tw-rounded-xl tw-border-0 tw-text-sm tw-font-bold tw-text-white tw-outline-none tw-transition-colors focus-visible:tw-ring-4 focus-visible:tw-ring-brand-orange/25',
                            tone.button,
                          )}
                        >
                          {current.confirmText ?? (current.kind === 'alert' ? 'متوجه شدم' : 'تأیید')}
                        </button>
                        {current.kind === 'confirm' && (
                          <button
                            type="button"
                            data-message-cancel
                            onClick={() => close(false)}
                            className="tw-h-11 tw-flex-1 tw-rounded-xl tw-border tw-border-brand-line tw-bg-white tw-text-sm tw-font-bold tw-text-brand-navy tw-outline-none tw-transition-colors hover:tw-bg-brand-bg focus-visible:tw-ring-4 focus-visible:tw-ring-brand-orange/20"
                          >
                            {current.cancelText ?? 'انصراف'}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  </div>
                </DialogPrimitive.Content>
              </div>
            </DialogPrimitive.Portal>
          )}
        </AnimatePresence>
      </DialogPrimitive.Root>
    </MessageBoxContext.Provider>
  );
}

export function useMessageBox(): MessageBoxApi {
  const context = useContext(MessageBoxContext);
  if (!context) throw new Error('useMessageBox must be used within a MessageBoxProvider');
  return context;
}
