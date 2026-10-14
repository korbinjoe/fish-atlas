import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import type { ComponentProps } from "react";

// shadcn/ui Checkbox behavior, themed to match the atlas controls.
export function Checkbox({ className = "", ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root data-slot="checkbox" className={`ui-checkbox ${className}`.trim()} {...props}>
      <CheckboxPrimitive.Indicator className="ui-checkbox-indicator"><Check size={12} strokeWidth={3} /></CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
