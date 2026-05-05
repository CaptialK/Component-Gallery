"use client";

import * as React from "react";
import { Dialog } from "@base-ui-components/react/dialog";
import { cn } from "@/lib/cn";

/**
 * Modal — Base UI Dialog wrapped to fold center / right / left / bottom
 * placements into one primitive (no separate `drawer.tsx`). Motion is
 * compositor-only: opacity + transform. Backdrop scrim leads the popup
 * by ~80ms on open. 320ms paper-ease in / 200ms ease-in out.
 */

const PAPER_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

export type ModalPlacement = "center" | "right" | "left" | "bottom";
export type ModalSize = "sm" | "md" | "lg";

export type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placement?: ModalPlacement;
  size?: ModalSize;
  children: React.ReactNode;
  ariaLabel?: string;
  className?: string;
};

const SIZE_MAX_W: Record<ModalSize, string> = {
  sm: "min(420px, 92vw)",
  md: "min(560px, 92vw)",
  lg: "min(720px, 96vw)",
};

const SIDE_W: Record<ModalSize, string> = {
  sm: "min(380px, 92vw)",
  md: "min(480px, 92vw)",
  lg: "min(640px, 96vw)",
};

export function Modal({
  open,
  onOpenChange,
  placement = "center",
  size = "md",
  children,
  ariaLabel,
  className,
}: ModalProps) {
  // Per-placement transforms — Base UI exposes data-starting-style /
  // data-ending-style hooks; we drive transform + opacity from inline
  // styles so we can keep transitions consistent across placements.
  const popupBaseStyle: React.CSSProperties = {
    transition: `opacity 320ms ${PAPER_EASE}, transform 320ms ${PAPER_EASE}`,
    boxShadow:
      "0 18px 42px -18px color-mix(in oklch, var(--color-text) 30%, transparent), 0 2px 6px -2px color-mix(in oklch, var(--color-text) 20%, transparent)",
  };

  // Position + size per placement
  let positionClasses = "";
  let extraStyle: React.CSSProperties = {};
  let startingStyle = "";
  let endingStyle = "";

  if (placement === "center") {
    positionClasses =
      "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-lg)]";
    extraStyle = { width: SIZE_MAX_W[size] };
    startingStyle =
      "data-[starting-style]:opacity-0 data-[starting-style]:[transform:translate(-50%,-50%)_scale(0.98)]";
    endingStyle =
      "data-[ending-style]:opacity-0 data-[ending-style]:[transform:translate(-50%,-50%)_scale(0.98)] data-[ending-style]:[transition-timing-function:ease-in] data-[ending-style]:duration-[200ms]";
  } else if (placement === "right") {
    positionClasses =
      "fixed right-0 top-0 h-full rounded-l-[var(--radius-lg)] border-r-0";
    extraStyle = { width: SIDE_W[size] };
    startingStyle =
      "data-[starting-style]:opacity-0 data-[starting-style]:translate-x-full";
    endingStyle =
      "data-[ending-style]:opacity-0 data-[ending-style]:translate-x-full data-[ending-style]:[transition-timing-function:ease-in] data-[ending-style]:duration-[200ms]";
  } else if (placement === "left") {
    positionClasses =
      "fixed left-0 top-0 h-full rounded-r-[var(--radius-lg)] border-l-0";
    extraStyle = { width: SIDE_W[size] };
    startingStyle =
      "data-[starting-style]:opacity-0 data-[starting-style]:-translate-x-full";
    endingStyle =
      "data-[ending-style]:opacity-0 data-[ending-style]:-translate-x-full data-[ending-style]:[transition-timing-function:ease-in] data-[ending-style]:duration-[200ms]";
  } else {
    // bottom
    positionClasses =
      "fixed bottom-0 left-1/2 -translate-x-1/2 w-full rounded-t-[var(--radius-lg)] border-b-0";
    extraStyle = { maxWidth: SIZE_MAX_W[size] };
    startingStyle =
      "data-[starting-style]:opacity-0 data-[starting-style]:[transform:translate(-50%,100%)]";
    endingStyle =
      "data-[ending-style]:opacity-0 data-[ending-style]:[transform:translate(-50%,100%)] data-[ending-style]:[transition-timing-function:ease-in] data-[ending-style]:duration-[200ms]";
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* Backdrop scrim — theme-aware via color-mix on --color-text. Leads
            popup by 80ms on open via Base UI's own staggered open transitions. */}
        <Dialog.Backdrop
          className={cn(
            "fixed inset-0 z-40",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
            "transition-opacity duration-[200ms] ease-out",
            "data-[ending-style]:duration-[200ms] data-[ending-style]:[transition-timing-function:ease-in]",
          )}
          style={{
            background:
              "color-mix(in oklch, var(--color-text) 18%, transparent)",
          }}
        />
        <Dialog.Popup
          aria-label={ariaLabel}
          className={cn(
            "z-50 border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text)]",
            "outline-none",
            positionClasses,
            startingStyle,
            endingStyle,
            className,
          )}
          style={{ ...popupBaseStyle, ...extraStyle }}
        >
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Convenience close-button hook — re-exports Dialog.Close for consumers
// who want the controlled close.
export const ModalClose = Dialog.Close;
export const ModalTitle = Dialog.Title;
export const ModalDescription = Dialog.Description;
