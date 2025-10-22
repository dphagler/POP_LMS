import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 hover:scale-[1.02] ring-offset-background",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/90",
        outline:
          "border border-input bg-background text-foreground shadow-sm hover:border-primary/40 hover:bg-primary/5",
        ghost: "bg-transparent text-foreground hover:bg-muted/60",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-10 rounded-full px-4",
        lg: "h-12 rounded-full px-6",
        icon: "h-11 w-11 rounded-full"
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
