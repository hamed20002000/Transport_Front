import * as React from 'react';
import { cn } from 'src/shared/utils/utils';

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'tw-rounded-lg tw-border tw-bg-card tw-text-card-foreground tw-shadow-sm',
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = 'Card';
export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('tw-flex tw-flex-col tw-gap-1.5 tw-p-6', className)} {...props} />
);
export const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={cn('tw-text-base tw-font-semibold', className)} {...props} />
);
export const CardDescription = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('tw-text-sm tw-text-muted-foreground', className)} {...props} />
);
export const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('tw-p-6 tw-pt-0', className)} {...props} />
);
