import * as React from "react";

import { cn } from "@/lib/utils";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "select select-bordered h-10 min-h-10 w-full shadow-sm",
      "focus-visible:outline-none",
      className
    )}
    {...props}
  />
));
Select.displayName = "Select";

export { Select };
