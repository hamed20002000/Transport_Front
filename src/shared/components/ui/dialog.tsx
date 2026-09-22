import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from 'src/shared/utils/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;
export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <div className="admin-shell" dir="rtl" lang="fa">
      <DialogPrimitive.Overlay className="tw-fixed tw-inset-0 tw-z-50 tw-bg-slate-950/50 tw-backdrop-blur-sm" />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'tw-fixed tw-left-1/2 tw-top-1/2 tw-z-50 tw-grid tw-w-[calc(100%-2rem)] tw-max-w-lg -tw-translate-x-1/2 -tw-translate-y-1/2 tw-gap-5 tw-rounded-lg tw-border tw-bg-card tw-p-6 tw-shadow-xl',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className="tw-absolute tw-left-4 tw-top-4 tw-flex tw-size-8 tw-items-center tw-justify-center tw-rounded-md tw-bg-transparent hover:tw-bg-muted"
          aria-label="بستن"
        >
          <X size={18} />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </div>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = 'DialogContent';
