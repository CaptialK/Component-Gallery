"use client";

import * as React from "react";
import { Popover as BasePopover } from "@base-ui-components/react/popover";
import { cn } from "@/lib/cn";

/**
 * Popover — Base UI Popover wrapped to share the catalogue's overlay vocab
 * with `<Modal>` and `<Menu>`. Cream paper bg, hairline strong border, the
 * locked elevated-shadow recipe (8px y, 24px blur, color-mix on text 22%),
 * 200ms paper-ease in / 120ms ease-in out via Base UI's data-starting-style
 * / data-ending-style hooks (mirrors `command-palette.tsx`).
 *
 * Compositor-only motion (opacity + transform). Translate seed varies by
 * placement so the popup nudges 2px toward its anchor on enter/exit.
 */

const PAPER_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

export type PopoverPlacement = "top" | "bottom" | "left" | "right";
export type PopoverAlign = "start" | "center" | "end";

export type PopoverProps = {
  trigger: React.ReactNode;
  children: React.ReactNode;
  placement?: PopoverPlacement;
  align?: PopoverAlign;
  ariaLabel?: string;
  className?: string;
  /** Pixels between the trigger edge and the popup. Default 6. */
  sideOffset?: number;
};

const PLACEMENT_TO_SIDE: Record<PopoverPlacement, "top" | "bottom" | "left" | "right"> = {
  top: "top",
  bottom: "bottom",
  left: "left",
  right: "right",
};

/** Per-placement starting/ending transform Tailwind class. */
const TRANSFORM_VARIANT: Record<PopoverPlacement, string> = {
  top:
    "data-[starting-style]:translate-y-[2px] data-[ending-style]:translate-y-[2px]",
  bottom:
    "data-[starting-style]:-translate-y-[2px] data-[ending-style]:-translate-y-[2px]",
  left:
    "data-[starting-style]:translate-x-[2px] data-[ending-style]:translate-x-[2px]",
  right:
    "data-[starting-style]:-translate-x-[2px] data-[ending-style]:-translate-x-[2px]",
};

export function Popover({
  trigger,
  children,
  placement = "bottom",
  align = "start",
  ariaLabel,
  className,
  sideOffset = 6,
}: PopoverProps) {
  return (
    <BasePopover.Root>
      <BasePopover.Trigger
        render={
          React.isValidElement(trigger) ? (trigger as React.ReactElement) : <span>{trigger}</span>
        }
      />
      <BasePopover.Portal>
        <BasePopover.Positioner
          side={PLACEMENT_TO_SIDE[placement]}
          align={align}
          sideOffset={sideOffset}
        >
          <BasePopover.Popup
            aria-label={ariaLabel}
            className={cn(
              "z-50 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text)]",
              "outline-none",
              "transition-[opacity,transform]",
              "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
              "data-[ending-style]:duration-[120ms] data-[ending-style]:[transition-timing-function:ease-in]",
              TRANSFORM_VARIANT[placement],
              className,
            )}
            style={{
              boxShadow:
                "0 8px 24px -12px color-mix(in oklch, var(--color-text) 22%, transparent)",
              transitionDuration: "200ms",
              transitionTimingFunction: PAPER_EASE,
            }}
          >
            {children}
          </BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    </BasePopover.Root>
  );
}

export const PopoverClose = BasePopover.Close;
export const PopoverTitle = BasePopover.Title;
export const PopoverDescription = BasePopover.Description;
