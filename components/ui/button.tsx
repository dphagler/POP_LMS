import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "btn font-semibold normal-case tracking-tight transition-transform duration-200 focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-60",
  {
    variants: {
      variant: {
        default: "btn-primary",
        primary: "btn-primary",
        secondary: "btn-secondary",
        accent: "btn-accent",
        outline: "btn-outline",
        ghost: "btn-ghost",
        destructive: "btn-error",
        neutral: "btn-neutral",
        error: "btn-error",
      },
      size: {
        default: "h-10 min-h-10 px-5",
        sm: "btn-sm px-4",
        lg: "btn-lg px-6",
        icon: "btn-square h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, isLoading = false, disabled, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    const resolvedDisabled = Boolean(disabled || isLoading);

    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), isLoading && "loading", className)}
        ref={ref as never}
        aria-disabled={resolvedDisabled || undefined}
        data-loading={isLoading || undefined}
        {...(!asChild
          ? {
              disabled: resolvedDisabled,
            }
          : {})}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
