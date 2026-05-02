import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const button = cva(
  // Base. Note: no rounded-lg default — radii vary by size.
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "font-medium tracking-[-0.01em] select-none",
    "transition-[border-color,background-color,color] duration-150",
    "disabled:opacity-50 disabled:pointer-events-none",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
    "focus-visible:outline-[var(--color-accent)]",
  ],
  {
    variants: {
      variant: {
        // Filled accent. No hover-lighten — we tighten the outer ring instead.
        primary: [
          "bg-[var(--color-accent)] text-[var(--color-accent-fg)]",
          "border border-[color-mix(in_oklch,var(--color-accent)_70%,#000_8%)]",
          "hover:border-[color-mix(in_oklch,var(--color-accent)_60%,#000_18%)]",
          "active:translate-y-px",
        ],
        // Paper surface, gains border-strong on hover.
        secondary: [
          "bg-[var(--color-surface)] text-[var(--color-text)]",
          "border border-[var(--color-border)]",
          "hover:border-[var(--color-border-strong)]",
          "active:translate-y-px",
        ],
        // Borderless until hover.
        ghost: [
          "bg-transparent text-[var(--color-text)]",
          "border border-transparent",
          "hover:border-[var(--color-border)]",
          "hover:bg-[var(--color-surface-2)]",
        ],
      },
      size: {
        sm: "h-7 px-2.5 text-xs rounded-[var(--radius-xs)]",
        md: "h-8 px-3 text-sm rounded-[var(--radius-sm)]",
        lg: "h-9 px-4 text-sm rounded-[var(--radius-md)]",
        icon: "h-8 w-8 rounded-[var(--radius-sm)]",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof button>;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ className, variant, size, ...props }, ref) {
    return (
      <button
        ref={ref}
        className={cn(button({ variant, size }), className)}
        {...props}
      />
    );
  },
);
