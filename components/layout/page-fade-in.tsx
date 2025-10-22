"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";

import { cn } from "@/lib/utils";

type PageFadeInProps = HTMLMotionProps<"div">;

export const PageFadeIn = forwardRef<HTMLDivElement, PageFadeInProps>(
  ({ children, className, transition, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ease: "easeInOut", duration: 0.18, ...transition }}
        className={cn("will-change-transform will-change-opacity", className)}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

PageFadeIn.displayName = "PageFadeIn";
