import * as React from "react";
import { cn } from "@/lib/utils";

/** Joins adjacent buttons into one segmented control (works with tooltip-wrapped buttons too). */
export function ButtonGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="group"
      className={cn(
        "inline-flex [&>*]:rounded-none [&>*:first-child]:rounded-l-md [&>*:last-child]:rounded-r-md [&>*:not(:first-child)]:-ml-px",
        className,
      )}
      {...props}
    />
  );
}
