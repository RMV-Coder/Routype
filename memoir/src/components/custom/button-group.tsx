// src/components/ui/button-group.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  direction?: "horizontal" | "vertical";
}

export function ButtonGroup({
  children,
  className,
  direction = "horizontal",
  ...props
}: ButtonGroupProps) {
  const count = React.Children.count(children);

  return (
    <div
      className={cn(
        "inline-flex",
        direction === "vertical" ? "flex-col" : "flex-row",
        "rounded-md overflow-hidden",
        className
      )}
      {...props}
    >
      {React.Children.map(children, (child, index) => {
        // keep non-elements as is (strings, null, etc.)
        if (!React.isValidElement(child)) return child;

        // Tell TS this element's props include className (optional)
        const el = child as React.ReactElement<{ className?: string }>;

        const existingClassName = el.props?.className;

        const newClassName = cn(
          "rounded-none",
          // horizontal corners
          direction === "horizontal" && index === 0 && "rounded-l-md",
          direction === "horizontal" && index === count - 1 && "rounded-r-md",
          // vertical corners
          direction === "vertical" && index === 0 && "rounded-t-md",
          direction === "vertical" && index === count - 1 && "rounded-b-md",
          // avoid double borders between outlined buttons
          direction === "horizontal" && index !== 0 && "-ml-px",
          direction === "vertical" && index !== 0 && "-mt-px",
          existingClassName
        );

        // clone with the narrowed prop type so TS is happy
        return React.cloneElement<{ className?: string }>(el, {
          className: newClassName,
        });
      })}
    </div>
  );
}
