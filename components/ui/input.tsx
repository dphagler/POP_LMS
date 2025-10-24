import * as React from "react";

import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type = "text", ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "input input-bordered h-10 min-h-10 w-full shadow-sm placeholder:text-muted-foreground",
        "focus-visible:outline-none",
        "file:me-3 file:btn file:btn-sm file:btn-primary file:font-semibold",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
