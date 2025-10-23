import * as React from "react";

import { cn } from "@/lib/utils";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "select select-bordered w-full shadow-sm",
      "focus-visible:outline-none",
      className
    )}
    {...props}
  />
));
Select.displayName = "Select";

export { Select };
