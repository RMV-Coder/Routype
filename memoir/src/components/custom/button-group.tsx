// src/components/ui/button-group.tsx
import * as React from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";

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

  const applyRounding = (
    element: React.ReactElement<{ className?: string }>,
    index: number
  ) => {
    const newClassName = cn(
      "rounded-none",
      direction === "horizontal" && index === 0 && "rounded-l-md",
      direction === "horizontal" && index === count - 1 && "rounded-r-md",
      direction === "vertical" && index === 0 && "rounded-t-md",
      direction === "vertical" && index === count - 1 && "rounded-b-md",
      direction === "horizontal" && index !== 0 && "-ml-px",
      direction === "vertical" && index !== 0 && "-mt-px",
      element.props.className
    );
    return React.cloneElement(element, { className: newClassName });
  };

  const isTooltipElement = (
    element: React.ReactElement
  ): element is React.ReactElement<React.ComponentProps<typeof Tooltip>> => {
    return element.type === Tooltip;
  };

  const isTooltipTriggerElement = (
    element: React.ReactElement
  ): element is React.ReactElement<React.ComponentProps<typeof TooltipTrigger>> => {
    return element.type === TooltipTrigger;
  };

  return (
    <div
      className={cn(
        "inline-flex",
        direction === "vertical" ? "flex-col" : "flex-row",
        "rounded-md overflow-hidden",
        "px-2",
        className
      )}
      {...props}
    >
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;

        // Case 1: Direct Button
        if (!isTooltipElement(child)) {
          return applyRounding(
            child as React.ReactElement<{ className?: string }>,
            index
          );
        }

        // Case 2: Tooltip containing a TooltipTrigger with a Button inside
        const updatedTooltipChildren = React.Children.map(
          child.props.children,
          (grandchild) => {
            if (React.isValidElement(grandchild) && isTooltipTriggerElement(grandchild)) {
              const updatedTriggerChildren = React.Children.map(
                grandchild.props.children,
                (btn) =>
                  React.isValidElement(btn)
                    ? applyRounding(
                        btn as React.ReactElement<{ className?: string }>,
                        index
                      )
                    : btn
              );
              return React.cloneElement(grandchild, {}, updatedTriggerChildren);
            }
            return grandchild;
          }
        );

        return React.cloneElement(child, {}, updatedTooltipChildren);
      })}
    </div>
  );
}
