import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "btn transition-transform duration-200 focus-visible:outline-none focus-visible:ring-0",
  {
    variants: {
      variant: {
        primary: "btn-primary",
        secondary: "btn-secondary",
        accent: "btn-accent",
        outline: "btn-outline",
        ghost: "btn-ghost",
        destructive: "btn-error",
        neutral: "btn-neutral",
        default: "btn-primary"
      },
      size: {
        default: "",
        sm: "btn-sm",
        lg: "btn-lg",
        icon: "btn-icon"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref as never}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
