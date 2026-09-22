import { type HTMLAttributes } from 'react';
import { cn } from 'src/shared/utils/utils';

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-full tw-border tw-px-2.5 tw-py-0.5 tw-text-xs tw-font-medium',
        className,
      )}
      {...props}
    />
  );
}
