import { forwardRef } from "react";
import type { ComponentProps } from "react";

// shadcn/ui Input, adapted to the atlas' existing CSS theme.
export const Input = forwardRef<HTMLInputElement, ComponentProps<"input">>(
  ({ className = "", type = "text", ...props }, ref) => (
    <input
      data-slot="input"
      ref={ref}
      type={type}
      className={`ui-input ${className}`.trim()}
      {...props}
    />
  ),
);
Input.displayName = "Input";
