import type { ReactNode } from 'react';
import { cn } from 'src/shared/utils/utils';

/**
 * Save / update buttons that stay at the bottom of the screen while a long form or list scrolls, so the user
 * never has to scroll to the end to submit. Sticky inside its form (it stops at the form's end). The bottom-left
 * corner is left free for the floating AI button (AiLauncher: left-5, h-14).
 */
export default function FloatingActions({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'tw-pointer-events-none tw-sticky tw-bottom-[calc(1rem+env(safe-area-inset-bottom))] tw-z-30 tw-flex tw-justify-start tw-pl-20',
        className,
      )}
    >
      <div className="tw-pointer-events-auto tw-flex tw-min-w-0 tw-max-w-full tw-flex-wrap tw-items-center tw-gap-2 [&>button]:tw-shadow-lg">{children}</div>
    </div>
  );
}
