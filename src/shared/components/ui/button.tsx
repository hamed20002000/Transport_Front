import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'src/shared/utils/utils';

const buttonVariants = cva(
  'tw-inline-flex tw-items-center tw-justify-center tw-gap-2 tw-whitespace-nowrap tw-rounded-md tw-text-sm tw-font-medium tw-transition-colors focus-visible:tw-outline-none focus-visible:tw-ring-2 focus-visible:tw-ring-ring disabled:tw-pointer-events-none disabled:tw-opacity-50 [&_svg]:tw-size-4',
  {
    variants: {
      variant: {
        default: 'tw-bg-primary tw-text-primary-foreground hover:tw-bg-primary/90',
        outline: 'tw-border tw-border-input tw-bg-card hover:tw-bg-accent',
        secondary: 'tw-bg-secondary tw-text-secondary-foreground hover:tw-bg-secondary/80',
        ghost: 'tw-bg-transparent hover:tw-bg-accent',
      },
      size: { default: 'tw-h-10 tw-px-4 tw-py-2', sm: 'tw-h-9 tw-px-3', icon: 'tw-h-10 tw-w-10' },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';
