"use client";

import * as React from "react";
import { Menu as BaseMenu } from "@base-ui-components/react/menu";
import { cn } from "@/lib/cn";

/**
 * Menu — Base UI Menu wrapped to ship the gallery's row vocab. 28px row
 * height, accent-strip + surface bg on hover/highlight (canonical row hover
 * pattern from app-shell), mono-caps headings, hairline separators, mono
 * shortcut chips. Destructive items render in persimmon ink with a persimmon
 * left strip.
 *
 * Same shadow/border/paper-ease/120ms-exit envelope as `<Popover>`.
 */

const PAPER_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

export type MenuItem = {
  type?: "item" | "heading" | "separator";
  label: string;
  shortcut?: string[];
  onSelect?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  glyph?: React.ReactNode;
};

export type MenuPlacement = "bottom-start" | "bottom-end" | "top-start" | "top-end";

export type MenuProps = {
  trigger: React.ReactNode;
  items: MenuItem[];
  placement?: MenuPlacement;
  ariaLabel?: string;
  className?: string;
  /** Pixels between the trigger edge and the popup. Default 6. */
  sideOffset?: number;
};

function placementToBase(p: MenuPlacement): {
  side: "top" | "bottom";
  align: "start" | "end";
} {
  const [side, align] = p.split("-") as ["top" | "bottom", "start" | "end"];
  return { side, align };
}

const TRANSFORM_VARIANT: Record<"top" | "bottom", string> = {
  bottom:
    "data-[starting-style]:-translate-y-[2px] data-[ending-style]:-translate-y-[2px]",
  top:
    "data-[starting-style]:translate-y-[2px] data-[ending-style]:translate-y-[2px]",
};

export function Menu({
  trigger,
  items,
  placement = "bottom-start",
  ariaLabel,
  className,
  sideOffset = 6,
}: MenuProps) {
  const { side, align } = placementToBase(placement);
  return (
    <BaseMenu.Root>
      <BaseMenu.Trigger
        render={
          React.isValidElement(trigger) ? (trigger as React.ReactElement) : <span>{trigger}</span>
        }
      />
      <BaseMenu.Portal>
        <BaseMenu.Positioner side={side} align={align} sideOffset={sideOffset}>
          <BaseMenu.Popup
            aria-label={ariaLabel}
            className={cn(
              "z-50 min-w-[200px] rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text)]",
              "py-1 outline-none",
              "transition-[opacity,transform]",
              "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
              "data-[ending-style]:duration-[120ms] data-[ending-style]:[transition-timing-function:ease-in]",
              TRANSFORM_VARIANT[side],
              className,
            )}
            style={{
              boxShadow:
                "0 8px 24px -12px color-mix(in oklch, var(--color-text) 22%, transparent)",
              transitionDuration: "200ms",
              transitionTimingFunction: PAPER_EASE,
            }}
          >
            {items.map((it, i) => {
              if (it.type === "separator") {
                return (
                  <div
                    key={`sep-${i}`}
                    role="separator"
                    aria-hidden
                    className="my-1 h-px bg-[var(--color-border)]"
                  />
                );
              }
              if (it.type === "heading") {
                return (
                  <div
                    key={`head-${i}-${it.label}`}
                    className="px-2.5 pt-1.5 pb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]"
                  >
                    {it.label}
                  </div>
                );
              }
              return (
                <BaseMenu.Item
                  key={`item-${i}-${it.label}`}
                  disabled={it.disabled}
                  onClick={() => {
                    if (!it.disabled) it.onSelect?.();
                  }}
                  className={cn(
                    "relative mx-1 flex h-7 cursor-default select-none items-center gap-2 rounded-[var(--radius-sm)] px-2 text-[13px] outline-none",
                    "transition-[background-color,color] duration-[120ms] ease-out",
                    it.disabled && "opacity-50",
                    it.destructive
                      ? "text-[var(--color-accent)] data-[highlighted]:bg-[color-mix(in_oklch,var(--color-accent)_8%,var(--color-surface))]"
                      : "text-[var(--color-text)] data-[highlighted]:bg-[var(--color-bg)]",
                  )}
                >
                  {/* Left accent strip on hover/focus — Federal Blue for
                      regular items, persimmon for destructive. Drives off
                      the Item's [data-highlighted] via the descendant
                      selector built into Tailwind v4 arbitrary variants. */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-1 left-0 w-[2px] rounded-full opacity-0 transition-opacity duration-[120ms] ease-out [[data-highlighted]>&]:opacity-100"
                    style={{
                      background: it.destructive
                        ? "var(--color-accent)"
                        : "var(--color-accent-2)",
                    }}
                  />
                  {it.glyph && (
                    <span className="grid h-3.5 w-3.5 shrink-0 place-items-center text-[var(--color-text-muted)]">
                      {it.glyph}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate">{it.label}</span>
                  {it.shortcut && it.shortcut.length > 0 && (
                    <span className="ml-auto flex shrink-0 items-center gap-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
                      {it.shortcut.map((k, idx) => (
                        <React.Fragment key={`${k}-${idx}`}>
                          {idx > 0 && (
                            <span aria-hidden className="px-0.5 opacity-50">
                              ·
                            </span>
                          )}
                          <kbd className="rounded-[var(--radius-xs)] border border-[var(--color-border)] bg-[var(--color-bg)] px-1 py-px font-mono text-[10px]">
                            {k}
                          </kbd>
                        </React.Fragment>
                      ))}
                    </span>
                  )}
                </BaseMenu.Item>
              );
            })}
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  );
}
