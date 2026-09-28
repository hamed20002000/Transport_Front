import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import { cn } from 'src/shared/utils/utils';

type ToastKind = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  duration: number;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const MAX_TOASTS = 4;
const durations: Record<ToastKind, number> = { success: 4000, info: 4000, error: 6000 };

const styles: Record<ToastKind, { icon: typeof CircleCheck; accent: string; iconTone: string; bar: string }> = {
  success: { icon: CircleCheck, accent: 'tw-border-emerald-500', iconTone: 'tw-bg-emerald-50 tw-text-emerald-600', bar: 'tw-bg-emerald-500' },
  error: { icon: TriangleAlert, accent: 'tw-border-red-500', iconTone: 'tw-bg-red-50 tw-text-red-600', bar: 'tw-bg-red-500' },
  info: { icon: Info, accent: 'tw-border-sky-500', iconTone: 'tw-bg-sky-50 tw-text-sky-600', bar: 'tw-bg-sky-500' },
};

// Short-lived notifications shown on top of every page; each one closes itself after `duration`.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (kind: ToastKind, message: string) => {
      const toast = { id: ++nextId.current, kind, message, duration: durations[kind] };
      // Oldest toasts drop off first when too many pile up.
      setToasts((current) => [...current, toast].slice(-MAX_TOASTS));
      timers.current.set(toast.id, setTimeout(() => dismiss(toast.id), toast.duration));
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({ success: (m) => show('success', m), error: (m) => show('error', m), info: (m) => show('info', m) }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        dir="rtl"
        aria-live="polite"
        className="tw-pointer-events-none tw-fixed tw-inset-x-0 tw-top-4 tw-z-[1000] tw-flex tw-flex-col tw-items-center tw-gap-2 tw-px-4"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const { icon: Icon, accent, iconTone, bar } = styles[toast.kind];
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: -24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.96, transition: { duration: 0.15 } }}
                role={toast.kind === 'error' ? 'alert' : 'status'}
                className={cn(
                  'tw-pointer-events-auto tw-relative tw-flex tw-w-full tw-max-w-sm tw-items-start tw-gap-3 tw-overflow-hidden tw-rounded-2xl tw-border-r-4 tw-bg-white tw-p-3.5 tw-text-sm tw-text-slate-800 tw-shadow-lg tw-ring-1 tw-ring-black/5',
                  accent,
                )}
              >
                <span className={cn('tw-flex tw-h-8 tw-w-8 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full', iconTone)}>
                  <Icon size={18} aria-hidden />
                </span>
                <p className="tw-flex-1 tw-pt-1 tw-leading-6">{toast.message}</p>
                <button
                  type="button"
                  aria-label="بستن"
                  onClick={() => dismiss(toast.id)}
                  className="tw-flex tw-h-7 tw-w-7 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-bg-transparent tw-text-slate-400 hover:tw-bg-slate-100 hover:tw-text-slate-600"
                >
                  <X size={16} aria-hidden />
                </button>
                {/* Remaining time until the toast closes. */}
                <motion.span
                  aria-hidden
                  className={cn('tw-absolute tw-bottom-0 tw-right-0 tw-h-0.5', bar)}
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: toast.duration / 1000, ease: 'linear' }}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}
